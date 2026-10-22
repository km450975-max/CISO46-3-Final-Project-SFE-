import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../services/api.js';
import Alert from '../components/Alert.jsx';
import Avatar from '../components/Avatar.jsx';
import Spinner from '../components/Spinner.jsx';

export default function LeaderboardPage() {
  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/leaderboard', { params: { page, limit: 20 } }),
      api.get('/leaderboard/me'),
    ]).then(([board, mine]) => {
      if (!active) return;
      setData(board.data.data);
      setMe(mine.data.data);
    }).catch((err) => {
      if (active) setError(getErrorMessage(err));
    });
    return () => {
      active = false;
    };
  }, [page]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner label="Loading the leaderboard" />;

  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Ranked scores</p>
          <h1>Leaderboard</h1>
          <p className="lede">Sorted by total ranked score, then best streak. Practice games are not included.</p>
        </div>
      </div>
      {me?.entry && (
        <p className="card compact">You are rank {me.rank} with {me.entry.totalScore} points and a best streak of {me.entry.bestStreak}.</p>
      )}
      {data.players.length === 0 ? (
        <div className="card empty">
          <h2>No scores yet</h2>
          <p>The board stays empty until a student earns ranked points.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Student leaderboard</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Player</th>
                <th scope="col">Score</th>
                <th scope="col">Best streak</th>
                <th scope="col">Games</th>
              </tr>
            </thead>
            <tbody>
              {data.players.map((player) => (
                <tr key={player.id} className={player.isCurrentUser ? 'is-me' : undefined}>
                  <td>{player.rank}</td>
                  <td>
                    <span className="player-cell">
                      <Avatar name={player.displayName} avatarKey={player.avatarKey} size={36} />
                      <span>
                        <strong>{player.displayName}</strong>
                        <small>@{player.username}</small>
                      </span>
                    </span>
                  </td>
                  <td>{player.totalScore}</td>
                  <td>{player.bestStreak}</td>
                  <td>{player.gamesPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.pagination.pages > 1 && (
        <div className="button-row">
          <button className="button button-ghost" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span>Page {data.pagination.page} of {data.pagination.pages}</span>
          <button className="button button-ghost" type="button" disabled={page >= data.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
