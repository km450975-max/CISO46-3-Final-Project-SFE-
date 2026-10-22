import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage, mediaUrl } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatClock } from '../utils/format.js';

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', detail: '60 second clock' },
  { id: 'medium', label: 'Medium', detail: '45 second clock' },
  { id: 'hard', label: 'Hard', detail: '30 second clock' },
];

const ROUND_CHOICES = [3, 4, 5];
const BASE_POINT_CHOICES = [10, 20, 30];

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
  const [totalRounds, setTotalRounds] = useState(5);
  const [basePoints, setBasePoints] = useState(10);
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
      const response = await api.post('/games/start', {
        difficulty,
        mode,
        restart,
        totalRounds,
        basePoints,
      });
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

  async function quit() {
    if (!view?.game) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/games/${view.game.id}/quit`);
      setView(null);
      setNotice('');
      setAnswer('');
      setRemaining(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Loading the puzzle" />;

  if (!view) {
    return (
      <div className="machine machine-setup">
        <header className="marquee">
          <h1>Choose a challenge</h1>
          <span>Banana Math</span>
        </header>
        {error && <p className="deck-alert" role="alert">{error}</p>}
        <div className="setup-grid">
          <fieldset className="choice-grid">
            <legend>Clock</legend>
            {DIFFICULTIES.map((item) => (
              <label key={item.id} className={difficulty === item.id ? 'choice selected' : 'choice'}>
                <input type="radio" name="difficulty" value={item.id} checked={difficulty === item.id} onChange={() => setDifficulty(item.id)} />
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="choice-grid">
            <legend>Rounds</legend>
            {ROUND_CHOICES.map((count) => (
              <label key={count} className={totalRounds === count ? 'choice selected' : 'choice'}>
                <input type="radio" name="rounds" value={count} checked={totalRounds === count} onChange={() => setTotalRounds(count)} />
                <strong>{count}</strong>
                <span>rounds</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="choice-grid">
            <legend>Base points</legend>
            {BASE_POINT_CHOICES.map((points) => (
              <label key={points} className={basePoints === points ? 'choice selected' : 'choice'}>
                <input type="radio" name="basePoints" value={points} checked={basePoints === points} onChange={() => setBasePoints(points)} />
                <strong>{points}</strong>
                <span>points</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="choice-grid two">
            <legend>Mode</legend>
            <label className={mode === 'ranked' ? 'choice selected' : 'choice'}>
              <input type="radio" name="mode" value="ranked" checked={mode === 'ranked'} onChange={() => setMode('ranked')} />
              <strong>Ranked</strong>
              <span>Counts on the board</span>
            </label>
            <label className={mode === 'practice' ? 'choice selected' : 'choice'}>
              <input type="radio" name="mode" value="practice" checked={mode === 'practice'} onChange={() => setMode('practice')} />
              <strong>Practice</strong>
              <span>Rank stays put</span>
            </label>
          </fieldset>
        </div>
        <button className="arcade-btn start-btn" type="button" onClick={() => start(false)} disabled={busy}>Start game</button>
      </div>
    );
  }

  const finished = view.game.status === 'completed' || view.gameCompleted;
  const answered = Boolean(view.attempt);
  const lowTime = remaining !== null && remaining <= 10000;

  return (
    <div className="machine machine-play">
      <header className="marquee">
        <h1>Banana Math</h1>
        <span>{view.game.mode} · {view.game.difficulty} · career {user.totalScore}</span>
      </header>
      <div className="scoreboard">
        <div>
          <span>Round</span>
          <strong>{view.game.currentRound}/{view.game.totalRounds}</strong>
        </div>
        <div>
          <span>Score</span>
          <strong>{view.game.score}</strong>
        </div>
        <div>
          <span>Streak</span>
          <strong>{view.game.currentStreak}</strong>
        </div>
        <div>
          <span>Base</span>
          <strong>{view.game.basePoints}</strong>
        </div>
        <div className={lowTime ? 'timer-low' : undefined}>
          <span>Time</span>
          <strong aria-live="polite">{answered || finished ? 'DONE' : formatClock(remaining ?? 0)}</strong>
        </div>
      </div>

      <div className="play-bay">
        <section className="crt">
          <div className="crt-glass">
            {view.puzzle && (
              <img
                src={mediaUrl(view.puzzle.imagePath)}
                alt="Math puzzle. Type the integer the picture is asking for."
                onError={() => setImageError(true)}
              />
            )}
            {imageError && <p className="deck-alert">The puzzle picture did not load. The timer is still running.</p>}
          </div>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.game.progress * 100)} aria-label="Game progress">
            <span style={{ width: `${Math.round(view.game.progress * 100)}%` }} />
          </div>
        </section>

        <section className="control-deck">
          {error && <p className="deck-alert" role="alert">{error}</p>}
          {notice && <p className="deck-note">{notice}</p>}
          {view.puzzle?.simulated && <p className="deck-note">Simulated puzzle. Live mode uses Banana API pictures.</p>}
          {view.game.hintText && <p className="deck-note">{view.game.hintText} Hint costs 5 points if you are correct.</p>}
          {answered ? (
            <div className="feedback">
              <h2>{view.attempt.timedOut ? 'Time expired' : view.attempt.correct ? 'Correct' : 'Incorrect'}</h2>
              <p>Answer {view.attempt.solution} · {view.attempt.pointsAwarded} pts</p>
              {view.attempt.breakdown && (
                <p className="breakdown">
                  Base {view.attempt.breakdown.base} · speed {view.attempt.breakdown.speed} · streak {view.attempt.breakdown.streak} · hint {view.attempt.breakdown.hint}
                </p>
              )}
              {view.unlockedAchievements?.length > 0 && (
                <p className="breakdown">Badge: {view.unlockedAchievements.map((item) => item.title).join(', ')}</p>
              )}
              <div className="button-row">
                {finished ? (
                  <>
                    <Link className="arcade-btn" to="/history">History</Link>
                    <button className="arcade-btn arcade-btn-dim" type="button" onClick={() => setView(null)}>Play again</button>
                  </>
                ) : (
                  <button className="arcade-btn" type="button" onClick={next} disabled={busy}>Next puzzle</button>
                )}
              </div>
            </div>
          ) : (
            <form className="answer-dock" onSubmit={submit}>
              <label htmlFor="answer">Your answer</label>
              <input id="answer" inputMode="numeric" autoComplete="off" value={answer} onChange={(event) => setAnswer(event.target.value)} required />
              <div className="button-row">
                <button className="arcade-btn" type="submit" disabled={busy}>Enter</button>
                <button className="arcade-btn arcade-btn-dim" type="button" onClick={hint} disabled={busy || view.game.hintUsed}>Hint</button>
              </div>
            </form>
          )}
          {view.game.status === 'active' && !finished && (
            <button className="arcade-btn arcade-btn-stop" type="button" onClick={quit} disabled={busy}>Quit game</button>
          )}
        </section>
      </div>
    </div>
  );
}
