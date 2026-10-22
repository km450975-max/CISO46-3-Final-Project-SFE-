import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api.js';
import Alert from '../components/Alert.jsx';
import Avatar from '../components/Avatar.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatClock } from '../utils/format.js';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [receivedAt, setReceivedAt] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    api.get('/users/me/stats')
      .then((response) => {
        if (active) {
          setData(response.data.data);
          setReceivedAt(Date.now());
        }
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      });
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner label="Loading your dashboard" />;

  const { stats, activeGame, leaderboardPreview, user } = data;
  const progress = activeGame ? Math.round(activeGame.game.progress * 100) : 0;
  let remaining = null;
  if (activeGame?.game.roundEndsAt && receivedAt) {
    const offset = new Date(activeGame.game.serverNow).getTime() - receivedAt;
    remaining = Math.max(0, new Date(activeGame.game.roundEndsAt).getTime() - (Date.now() + offset));
  }

  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Player dashboard</p>
          <h1>Hello, {user.displayName}</h1>
          <p className="lede">Rank {stats.rank || '—'} · {stats.accuracy}% accuracy over {stats.answersSubmitted} answers</p>
        </div>
        <Link className="button button-primary" to="/play">{activeGame ? 'Resume game' : 'Start game'}</Link>
      </div>

      <section className="stat-grid" aria-label="Your statistics">
        <Stat label="Total score" value={stats.totalScore} />
        <Stat label="Current streak" value={stats.currentStreak} />
        <Stat label="Best streak" value={stats.bestStreak} />
        <Stat label="Puzzles solved" value={stats.puzzlesCompleted} />
        <Stat label="Games played" value={stats.gamesPlayed} />
        <Stat label="Rank" value={stats.rank || '—'} />
      </section>

      <section className="split">
        <article className="card">
          <h2>Current game</h2>
          {activeGame ? (
            <>
              <p>
                Round {activeGame.game.currentRound} of {activeGame.game.totalRounds}
                {' · '}
                {activeGame.game.difficulty}
                {' · '}
                {activeGame.game.mode}
              </p>
              <p className="timer" aria-live="polite">{remaining === null ? '—' : formatClock(remaining)}</p>
              <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Game progress">
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="field-help">{activeGame.game.resolvedRounds} of {activeGame.game.totalRounds} rounds finished · session score {activeGame.game.score}</p>
            </>
          ) : (
            <p>No game is in progress. Start a ranked game to add points to the leaderboard, or use practice mode while you learn the puzzles.</p>
          )}
        </article>
        <article className="card">
          <h2>Leaderboard preview</h2>
          {leaderboardPreview.length === 0 ? (
            <p>No student scores yet. Finish a ranked puzzle and your name will appear here.</p>
          ) : (
            <ol className="mini-board">
              {leaderboardPreview.map((player) => (
                <li key={player.id} className={player.isCurrentUser ? 'is-me' : undefined}>
                  <span>{player.rank}</span>
                  <Avatar name={player.displayName} avatarKey={player.avatarKey} size={32} />
                  <strong>{player.displayName}</strong>
                  <em>{player.totalScore}</em>
                </li>
              ))}
            </ol>
          )}
          <Link to="/leaderboard">See the full board</Link>
        </article>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <article className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
