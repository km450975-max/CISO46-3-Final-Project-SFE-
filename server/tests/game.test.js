import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ActivityEvent } from '../src/models/ActivityEvent.js';
import { GameAttempt } from '../src/models/GameAttempt.js';
import { GameSession } from '../src/models/GameSession.js';
import { Puzzle } from '../src/models/Puzzle.js';
import { User } from '../src/models/User.js';
import { setBananaProviderForTests } from '../src/services/banana/bananaService.js';

const app = createApp();

function stamp(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

async function register(agent, username = stamp('play')) {
  const credentials = {
    username,
    email: `${username}@school.test`,
    password: 'Password1',
  };
  const response = await agent
    .post('/api/v1/auth/register')
    .set('X-Requested-With', 'XMLHttpRequest')
    .send(credentials);
  expect(response.status).toBe(201);
  return credentials;
}

async function startGame(agent, body = { difficulty: 'easy', mode: 'ranked' }) {
  const response = await agent
    .post('/api/v1/games/start')
    .set('X-Requested-With', 'XMLHttpRequest')
    .send(body);
  return response;
}

describe('puzzle play', () => {
  it('loads a puzzle without revealing the solution', async () => {
    const agent = request.agent(app);
    await register(agent);
    const started = await startGame(agent);
    expect(started.status).toBe(201);
    expect(started.body.data.puzzle.solution).toBeUndefined();
    expect(started.body.data.puzzle.simulated).toBe(true);
    expect(JSON.stringify(started.body.data.puzzle)).not.toContain('solution');
    expect(started.body.data.game.currentRound).toBe(1);
    expect(started.body.data.game.totalRounds).toBe(10);

    const fetched = await agent.get('/api/v1/puzzles/new');
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.puzzle.id).toBe(started.body.data.puzzle.id);

    const image = await agent.get(started.body.data.puzzle.imagePath);
    expect(image.status).toBe(200);
    expect(image.headers['content-type']).toContain('image/svg+xml');
    const body = Buffer.isBuffer(image.body) ? image.body.toString('utf8') : String(image.text || '');
    expect(body).toContain('Simulated puzzle');
    expect(body).not.toContain('>7<');
  });

  it('scores a correct answer, persists it, and rejects a duplicate submission', async () => {
    const agent = request.agent(app);
    const credentials = await register(agent, 'scorer');
    const started = await startGame(agent);
    const gameId = started.body.data.game.id;
    const puzzle = await Puzzle.findById(started.body.data.puzzle.id);

    const correct = await agent
      .post(`/api/v1/games/${gameId}/submit`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ answer: puzzle.solution });
    expect(correct.status).toBe(200);
    expect(correct.body.data.correct).toBe(true);
    expect(correct.body.data.points).toBeGreaterThanOrEqual(10);
    expect(correct.body.data.streak).toBe(1);
    expect(correct.body.data.solution).toBe(puzzle.solution);

    const saved = await GameAttempt.findOne({ session: gameId, roundNumber: 1 });
    expect(saved.correct).toBe(true);
    expect(saved.pointsAwarded).toBe(correct.body.data.points);

    const player = await User.findOne({ username: credentials.username });
    expect(player.totalScore).toBe(correct.body.data.points);
    expect(player.currentStreak).toBe(1);
    expect(player.puzzlesCompleted).toBe(1);

    const duplicate = await agent
      .post(`/api/v1/games/${gameId}/submit`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ answer: puzzle.solution });
    expect(duplicate.status).toBe(409);
    const after = await User.findOne({ username: credentials.username });
    expect(after.totalScore).toBe(player.totalScore);

    const events = await ActivityEvent.find({ user: player._id }).distinct('type');
    expect(events).toEqual(expect.arrayContaining([
      'user.registered',
      'puzzle.loaded',
      'answer.submitted',
      'answer.correct',
      'score.updated',
      'streak.updated',
      'round.completed',
      'leaderboard.updated',
    ]));
  });

  it('resets the streak after an incorrect answer', async () => {
    const agent = request.agent(app);
    const credentials = await register(agent, 'streaker');
    const started = await startGame(agent);
    const gameId = started.body.data.game.id;
    const first = await Puzzle.findById(started.body.data.puzzle.id);

    await agent
      .post(`/api/v1/games/${gameId}/submit`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ answer: first.solution });

    const next = await agent
      .post(`/api/v1/games/${gameId}/next`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({});
    expect(next.status).toBe(200);
    expect(next.body.data.game.currentRound).toBe(2);
    expect(next.body.data.puzzle.solution).toBeUndefined();

    const missed = await agent
      .post(`/api/v1/games/${gameId}/submit`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ answer: -99 });
    expect(missed.status).toBe(200);
    expect(missed.body.data.correct).toBe(false);
    expect(missed.body.data.points).toBe(0);
    expect(missed.body.data.streak).toBe(0);

    const player = await User.findOne({ username: credentials.username });
    expect(player.currentStreak).toBe(0);
    expect(player.bestStreak).toBe(1);
    const session = await GameSession.findById(gameId);
    expect(session.score).toBeGreaterThan(0);
    expect(session.currentStreak).toBe(0);
  });

  it('does not award points when the server timer has expired', async () => {
    const agent = request.agent(app);
    const credentials = await register(agent, 'timeruser');
    const started = await startGame(agent, { difficulty: 'hard', mode: 'ranked' });
    const gameId = started.body.data.game.id;
    const puzzle = await Puzzle.findById(started.body.data.puzzle.id);
    await GameSession.updateOne({ _id: gameId }, { roundEndsAt: new Date(Date.now() - 5000) });

    const expired = await agent
      .post(`/api/v1/games/${gameId}/submit`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ answer: puzzle.solution });
    expect(expired.status).toBe(200);
    expect(expired.body.data.timedOut).toBe(true);
    expect(expired.body.data.correct).toBe(false);
    expect(expired.body.data.points).toBe(0);

    const player = await User.findOne({ username: credentials.username });
    expect(player.totalScore).toBe(0);
    expect(player.currentStreak).toBe(0);

    const events = await ActivityEvent.find({ user: player._id }).distinct('type');
    expect(events).toContain('round.expired');
  });

  it('completes a ranked game on the final round and stores the result', async () => {
    const agent = request.agent(app);
    const credentials = await register(agent, 'finalist');
    const started = await startGame(agent);
    const gameId = started.body.data.game.id;
    await GameSession.updateOne({ _id: gameId }, { currentRound: 1, totalRounds: 1 });
    const puzzle = await Puzzle.findById(started.body.data.puzzle.id);
    const submitted = await agent
      .post(`/api/v1/games/${gameId}/submit`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ answer: puzzle.solution });
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.gameCompleted).toBe(true);
    expect(submitted.body.data.game.status).toBe('completed');
    const player = await User.findOne({ username: credentials.username });
    expect(player.gamesPlayed).toBe(1);
    const session = await GameSession.findById(gameId);
    expect(session.status).toBe('completed');
    expect(session.endedAt).toBeTruthy();
  });

  it('keeps a ranked total unchanged in practice mode', async () => {
    const agent = request.agent(app);
    const credentials = await register(agent, 'practice');
    const started = await startGame(agent, { difficulty: 'medium', mode: 'practice' });
    const puzzle = await Puzzle.findById(started.body.data.puzzle.id);
    const submitted = await agent
      .post(`/api/v1/games/${started.body.data.game.id}/submit`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ answer: puzzle.solution });
    expect(submitted.body.data.correct).toBe(true);
    expect(submitted.body.data.points).toBeGreaterThan(0);
    const player = await User.findOne({ username: credentials.username });
    expect(player.totalScore).toBe(0);
    expect(player.currentStreak).toBe(0);
  });

  it('returns a predictable error when the Banana API is unavailable', async () => {
    setBananaProviderForTests(async () => {
      throw new Error('connection refused');
    });
    const agent = request.agent(app);
    await register(agent, 'offline');
    const started = await startGame(agent);
    expect(started.status).toBe(503);
    expect(started.body.error.code).toBe('BANANA_API_UNAVAILABLE');
    expect(await GameSession.countDocuments()).toBe(0);
  });

  it('does not let another player open the puzzle image', async () => {
    const owner = request.agent(app);
    await register(owner, 'owner');
    const started = await startGame(owner);
    const other = request.agent(app);
    await register(other, 'other');
    const image = await other.get(started.body.data.puzzle.imagePath);
    expect(image.status).toBe(404);
  });

  it('gives a hint that is not the solution', async () => {
    const agent = request.agent(app);
    await register(agent, 'hinter');
    const started = await startGame(agent);
    const puzzle = await Puzzle.findById(started.body.data.puzzle.id);
    const hint = await agent
      .post(`/api/v1/games/${started.body.data.game.id}/hint`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({});
    expect(hint.status).toBe(200);
    expect(hint.body.data.hint).not.toContain(String(puzzle.solution));
    expect(hint.body.data.game.hintUsed).toBe(true);
  });
});

describe('leaderboard', () => {
  it('ranks stored scores and highlights the current player', async () => {
    const higher = request.agent(app);
    const lower = request.agent(app);
    await register(higher, 'higher');
    await register(lower, 'lower');
    await User.updateOne({ username: 'higher' }, { totalScore: 90, bestStreak: 4, gamesPlayed: 2 });
    await User.updateOne({ username: 'lower' }, { totalScore: 40, bestStreak: 9, gamesPlayed: 1 });

    const board = await lower.get('/api/v1/leaderboard?limit=10');
    expect(board.status).toBe(200);
    expect(board.body.data.players.map((player) => player.username)).toEqual(['higher', 'lower']);
    expect(board.body.data.players[0].rank).toBe(1);
    expect(board.body.data.players[1].isCurrentUser).toBe(true);
    expect(board.body.data.players[0].email).toBeUndefined();

    const mine = await lower.get('/api/v1/leaderboard/me');
    expect(mine.body.data.rank).toBe(2);
    expect(mine.body.data.entry.totalScore).toBe(40);

    const tied = request.agent(app);
    await register(tied, 'tiedlow');
    await User.updateOne({ username: 'tiedlow' }, { totalScore: 90, bestStreak: 1 });
    const reranked = await tied.get('/api/v1/leaderboard');
    const names = reranked.body.data.players.map((player) => player.username);
    expect(names.indexOf('higher')).toBeLessThan(names.indexOf('tiedlow'));
  });

  it('shows an empty leaderboard when nobody has an account', async () => {
    const guest = request.agent(app);
    await register(guest, 'onlyadminview');
    await User.updateOne({ username: 'onlyadminview' }, { role: 'admin' });
    const board = await guest.get('/api/v1/leaderboard');
    expect(board.status).toBe(200);
    expect(board.body.data.players).toEqual([]);
    expect(board.body.data.pagination.total).toBe(0);
  });
});
