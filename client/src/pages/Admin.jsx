import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDate } from '../utils/format.js';

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [users, setUsers] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    const [statsRes, healthRes, usersRes, activityRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/health'),
      api.get('/admin/users', { params: { limit: 20 } }),
      api.get('/admin/activity', { params: { limit: 12 } }),
    ]);
    setStats(statsRes.data.data);
    setHealth(healthRes.data.data);
    setUsers(usersRes.data.data);
    setActivity(activityRes.data.data);
  }

  useEffect(() => {
    let active = true;
    load().catch((err) => {
      if (active) setError(getErrorMessage(err));
    });
    return () => {
      active = false;
    };
  }, []);

  async function updateUser(id, changes) {
    setBusyId(id);
    setError('');
    try {
      await api.patch(`/admin/users/${id}`, changes);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId('');
    }
  }

  if (error && !stats) return <Alert>{error}</Alert>;
  if (!stats || !health || !users || !activity) return <Spinner label="Loading administration" />;

  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>System overview</h1>
          <p className="lede">Signed in as {user.displayName}. Role checks are enforced by the API.</p>
        </div>
      </div>
      <Alert>{error}</Alert>
      <section className="stat-grid" aria-label="System statistics">
        <article className="stat"><span>Students</span><strong>{stats.students}</strong></article>
        <article className="stat"><span>Active games</span><strong>{stats.activeGames}</strong></article>
        <article className="stat"><span>Completed games</span><strong>{stats.completedGames}</strong></article>
        <article className="stat"><span>Answers</span><strong>{stats.attempts}</strong></article>
        <article className="stat"><span>Accuracy</span><strong>{stats.accuracy}%</strong></article>
        <article className="stat"><span>Suspended</span><strong>{stats.suspended}</strong></article>
      </section>
      <section className="card">
        <h2>Banana API</h2>
        <p>Mode: {health.bananaApi.mode}. Status: {health.bananaApi.status}.</p>
        <p>{health.bananaApi.message}</p>
        <p className="field-help">{health.eventBus.note} Database: {health.database}. Uptime: {health.uptimeSeconds}s.</p>
      </section>
      <section className="card">
        <h2>Accounts</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Score</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.users.map((account) => (
                <tr key={account.id}>
                  <td>
                    <strong>{account.displayName}</strong>
                    <small>{account.email}</small>
                  </td>
                  <td>{account.role}</td>
                  <td>{account.accountStatus}</td>
                  <td>{account.totalScore}</td>
                  <td>
                    {account.id !== user.id && (
                      <button
                        className="button button-ghost"
                        type="button"
                        disabled={busyId === account.id}
                        onClick={() => updateUser(account.id, {
                          accountStatus: account.accountStatus === 'active' ? 'suspended' : 'active',
                        })}
                      >
                        {account.accountStatus === 'active' ? 'Suspend' : 'Reinstate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h2>Recent activity</h2>
        {activity.events.length === 0 ? <p>No events recorded yet.</p> : (
          <ul className="activity-list">
            {activity.events.map((event) => (
              <li key={event.id}>
                <code>{event.type}</code>
                <span>{event.message}</span>
                <small>{event.user?.username || 'system'} · {formatDate(event.createdAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
