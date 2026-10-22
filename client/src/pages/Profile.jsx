import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import Avatar from '../components/Avatar.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDate } from '../utils/format.js';

export default function ProfilePage() {
  const { user: sessionUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/users/me')
      .then((response) => {
        if (active) setProfile(response.data.data.user);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [sessionUser.totalScore, sessionUser.currentStreak]);

  if (error) return <Alert>{error}</Alert>;
  if (!profile) return <Spinner label="Loading your profile" />;

  return (
    <div className="stack">
      <div className="page-heading">
        <div className="identity">
          <Avatar name={profile.displayName} avatarKey={profile.avatarKey} size={72} />
          <div>
            <p className="eyebrow">{profile.role}</p>
            <h1>{profile.displayName}</h1>
            <p className="lede">@{profile.username} · joined {formatDate(profile.createdAt)}</p>
          </div>
        </div>
      </div>
      <section className="stat-grid" aria-label="Profile statistics">
        <article className="stat"><span>Rank</span><strong>{profile.rank || '—'}</strong></article>
        <article className="stat"><span>Total score</span><strong>{profile.totalScore}</strong></article>
        <article className="stat"><span>Best streak</span><strong>{profile.bestStreak}</strong></article>
        <article className="stat"><span>Puzzles solved</span><strong>{profile.puzzlesCompleted}</strong></article>
        <article className="stat"><span>Games played</span><strong>{profile.gamesPlayed}</strong></article>
        <article className="stat"><span>Email</span><strong className="small-stat">{profile.email}</strong></article>
      </section>
      <section className="card">
        <h2>Badges</h2>
        {profile.achievements.length === 0 ? (
          <p>No badges yet. A correct ranked answer earns the first one.</p>
        ) : (
          <ul className="badge-list">
            {profile.achievements.map((badge) => (
              <li key={badge.type}>
                <strong>{badge.title}</strong>
                <span>{badge.description}</span>
                <small>{formatDate(badge.awardedAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
