import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage, mediaUrl } from '../services/api.js';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDate, formatDurationSeconds } from '../utils/format.js';

export default function HistoryPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/users/me/history', { params: { page, limit: 8 } })
      .then((response) => {
        if (active) setData(response.data.data);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [page]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner label="Loading your games" />;

  return (
    <div className="stack hall">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Progress</p>
          <h1>Game history</h1>
          <p className="lede">Every started game is stored, including practice rounds and games you left unfinished.</p>
        </div>
      </div>
      {data.games.length === 0 ? (
        <div className="card empty">
          <h2>No games yet</h2>
          <p>Your completed rounds, scores, and answers will show up here.</p>
          <Link className="button button-primary" to="/play">Play the first puzzle</Link>
        </div>
      ) : (
        data.games.map((game) => (
          <article key={game.id} className="card">
            <div className="history-head">
              <div>
                <h2>{game.mode} · {game.difficulty}</h2>
                <p>{formatDate(game.startedAt)} · {game.status} · {formatDurationSeconds(game.durationSeconds)}</p>
              </div>
              <div className="history-score">
                <strong>{game.score}</strong>
                <span>score · best streak {game.bestStreak}</span>
              </div>
            </div>
            <p>{game.correctCount} correct of {game.resolvedRounds} answered rounds.</p>
            <button className="text-button" type="button" aria-expanded={openId === game.id} onClick={() => setOpenId(openId === game.id ? null : game.id)}>
              {openId === game.id ? 'Hide rounds' : 'Show rounds'}
            </button>
            {openId === game.id && (
              <ul className="round-list">
                {game.rounds.map((round) => (
                  <li key={round.id}>
                    {round.puzzle && <img src={mediaUrl(round.puzzle.imagePath)} alt="" />}
                    <div>
                      <strong>Round {round.roundNumber}</strong>
                      <span>{round.timedOut ? 'Timed out' : round.correct ? 'Correct' : 'Incorrect'} · {round.pointsAwarded} pts</span>
                      <span>You answered {round.submittedAnswer || '—'} · solution {round.solution}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))
      )}
      {data.pagination.pages > 1 && (
        <div className="button-row">
          <button className="button button-ghost" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span>Page {page} of {data.pagination.pages}</span>
          <button className="button button-ghost" type="button" disabled={page >= data.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
