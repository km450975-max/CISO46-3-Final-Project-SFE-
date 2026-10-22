import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage, mediaUrl } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatClock } from '../utils/format.js';

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', detail: '60 seconds · 10 base points' },
  { id: 'medium', label: 'Medium', detail: '45 seconds · 20 base points' },
  { id: 'hard', label: 'Hard', detail: '30 seconds · 30 base points' },
];

export default function GamePage() {
  const { setUser, user } = useAuth();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');
  const [mode, setMode] = useState('ranked');
  const [remaining, setRemaining] = useState(null);
  const [imageError, setImageError] = useState(false);
  const expireLock = useRef(false);

  const applyView = useCallback((data) => {
    setView(data);
    setImageError(false);
    expireLock.current = false;
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await api.get('/auth/me');
    setUser(response.data.data.user);
  }, [setUser]);

  const loadActive = useCallback(async () => {
    const response = await api.get('/games/active');
    applyView(response.data.data.game ? response.data.data : null);
  }, [applyView]);

  useEffect(() => {
    let active = true;
    loadActive()
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadActive]);

  useEffect(() => {
    if (!view?.game?.roundEndsAt || view.attempt || view.game.status !== 'active') {
      setRemaining(null);
      return undefined;
    }
    const end = new Date(view.game.roundEndsAt).getTime();
    const offset = new Date(view.game.serverNow).getTime() - Date.now();
    const tick = () => {
      const left = Math.max(0, end - (Date.now() + offset));
      setRemaining(left);
      if (left <= 0) expireRound();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [view?.game?.id, view?.game?.roundEndsAt, view?.game?.serverNow, view?.attempt, view?.game?.status]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && view?.game?.status === 'active') {
        loadActive().catch(() => {});
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadActive, view?.game?.status]);

  async function expireRound() {
    if (!view?.game || view.attempt || expireLock.current || view.game.status !== 'active') return;
    expireLock.current = true;
    try {
      const response = await api.post(`/games/${view.game.id}/expire`);
      applyView(response.data.data);
      setNotice(response.data.data.timedOut ? 'Time is up. This round scored zero points.' : '');
      await refreshUser();
    } catch (err) {
      if (err.response?.data?.error?.code === 'ROUND_STILL_OPEN') {
        expireLock.current = false;
        return;
      }
      if (err.response?.status === 409) {
        await loadActive();
        return;
      }
      setError(getErrorMessage(err));
    }
  }

  async function start(restart = false) {
    setBusy(true);
    setError('');
    setNotice('');
    setAnswer('');
    try {
      const response = await api.post('/games/start', { difficulty, mode, restart });
      applyView(response.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await api.post(`/games/${view.game.id}/submit`, { answer: answer.trim() });
      applyView(response.data.data);
      setNotice(response.data.data.correct ? 'Correct.' : 'Not this time.');
      await refreshUser();
    } catch (err) {
      setError(getErrorMessage(err));
      if (err.response?.status === 409) await loadActive();
    } finally {
      setBusy(false);
    }
  }

  async function hint() {
    setBusy(true);
    setError('');
    try {
      const response = await api.post(`/games/${view.game.id}/hint`);
      applyView(response.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    setBusy(true);
    setError('');
    setNotice('');
    setAnswer('');
    try {
      const response = await api.post(`/games/${view.game.id}/next`);
      applyView(response.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Loading the puzzle" />;

  if (!view) {
    return (
      <div className="stack narrow">
        <div className="page-heading">
          <div>
            <p className="eyebrow">New game</p>
            <h1>Choose a challenge</h1>
            <p className="lede">Difficulty changes the timer and the points. The Banana API itself does not label puzzles as easy or hard.</p>
          </div>
        </div>
        <Alert>{error}</Alert>
        <fieldset className="choice-grid">
          <legend>Difficulty</legend>
          {DIFFICULTIES.map((item) => (
            <label key={item.id} className={difficulty === item.id ? 'choice selected' : 'choice'}>
              <input type="radio" name="difficulty" value={item.id} checked={difficulty === item.id} onChange={() => setDifficulty(item.id)} />
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="choice-grid two">
          <legend>Mode</legend>
          <label className={mode === 'ranked' ? 'choice selected' : 'choice'}>
            <input type="radio" name="mode" value="ranked" checked={mode === 'ranked'} onChange={() => setMode('ranked')} />
            <strong>Ranked</strong>
            <span>Points count on the leaderboard.</span>
          </label>
          <label className={mode === 'practice' ? 'choice selected' : 'choice'}>
            <input type="radio" name="mode" value="practice" checked={mode === 'practice'} onChange={() => setMode('practice')} />
            <strong>Practice</strong>
            <span>Play without changing your rank.</span>
          </label>
        </fieldset>
        <button className="button button-primary" type="button" onClick={() => start(false)} disabled={busy}>Start game</button>
      </div>
    );
  }

  const finished = view.game.status === 'completed' || view.gameCompleted;
  const answered = Boolean(view.attempt);
  const lowTime = remaining !== null && remaining <= 10000;

  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{view.game.mode} · {view.game.difficulty}</p>
          <h1>Round {view.game.currentRound} of {view.game.totalRounds}</h1>
        </div>
        <div className={`timer ${lowTime ? 'timer-low' : ''}`} aria-live="polite" aria-atomic="true">
          {answered || finished ? 'Answered' : formatClock(remaining ?? 0)}
        </div>
      </div>
      <Alert>{error}</Alert>
      {notice && <Alert tone="success">{notice}</Alert>}
      {view.puzzle?.simulated && (
        <Alert tone="info">This puzzle is simulated local data. Switch BANANA_API_MODE to live to use Banana API images.</Alert>
      )}

      <section className="play-grid">
        <article className="card puzzle-card">
          {view.puzzle && (
            <img
              src={mediaUrl(view.puzzle.imagePath)}
              alt="Math puzzle. Type the integer the picture is asking for."
              onError={() => setImageError(true)}
            />
          )}
          {imageError && <Alert>The puzzle image could not be displayed. The round timer is still running on the server.</Alert>}
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.game.progress * 100)} aria-label="Game progress">
            <span style={{ width: `${Math.round(view.game.progress * 100)}%` }} />
          </div>
        </article>
        <article className="card stack">
          <p>Session score <strong>{view.game.score}</strong> · streak <strong>{view.game.currentStreak}</strong> · career score <strong>{user.totalScore}</strong></p>
          {view.game.hintText && <p className="hint">{view.game.hintText} Using a hint costs 5 points if the answer is correct.</p>}
          {answered ? (
            <div className="feedback">
              <h2>{view.attempt.timedOut ? 'Time expired' : view.attempt.correct ? 'Correct' : 'Incorrect'}</h2>
              <p>The answer was {view.attempt.solution}. You scored {view.attempt.pointsAwarded} points.</p>
              {view.attempt.breakdown && (
                <p className="field-help">
                  Base {view.attempt.breakdown.base}, speed {view.attempt.breakdown.speed}, streak {view.attempt.breakdown.streak}, hint {view.attempt.breakdown.hint}.
                </p>
              )}
              {view.unlockedAchievements?.length > 0 && (
                <p>New badge: {view.unlockedAchievements.map((item) => item.title).join(', ')}</p>
              )}
              {finished ? (
                <div className="button-row">
                  <Link className="button button-primary" to="/history">Review history</Link>
                  <button className="button button-ghost" type="button" onClick={() => setView(null)}>Play again</button>
                </div>
              ) : (
                <button className="button button-primary" type="button" onClick={next} disabled={busy}>Next puzzle</button>
              )}
            </div>
          ) : (
            <form onSubmit={submit}>
              <label htmlFor="answer">Your answer</label>
              <input id="answer" inputMode="numeric" autoComplete="off" value={answer} onChange={(event) => setAnswer(event.target.value)} required />
              <div className="button-row">
                <button className="button button-primary" type="submit" disabled={busy}>Submit answer</button>
                <button className="button button-ghost" type="button" onClick={hint} disabled={busy || view.game.hintUsed}>Hint</button>
              </div>
            </form>
          )}
          {view.game.status === 'active' && !finished && (
            <button className="text-button" type="button" onClick={() => start(true)} disabled={busy}>Abandon and start over</button>
          )}
        </article>
      </section>
    </div>
  );
}
