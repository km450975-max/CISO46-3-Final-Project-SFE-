import { Link } from 'react-router-dom';
import { Clock3, ShieldCheck, Trophy, Workflow } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const POINTS = [
  { icon: Clock3, title: 'Timed rounds', text: 'Each puzzle has a server-side countdown. Refreshing the page does not add time or points.' },
  { icon: Trophy, title: 'Scores and streaks', text: 'Correct answers earn points from a published rule. A miss or a timeout resets the streak.' },
  { icon: ShieldCheck, title: 'Your own identity', text: 'Register a username, choose an avatar, and keep a record of every ranked and practice game.' },
  { icon: Workflow, title: 'Real puzzle images', text: 'The server requests each picture from the Banana Game API and checks the answer itself.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="page-center"><p>Loading Banana Math…</p></div>;
  }
  return (
    <div className="landing">
      <header className="landing-bar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Banana Math
        </Link>
        <nav aria-label="Account">
          {user ? (
            <Link className="button button-primary" to="/dashboard">Go to dashboard</Link>
          ) : (
            <>
              <Link className="button button-ghost" to="/login">Log in</Link>
              <Link className="button button-primary" to="/register">Create account</Link>
            </>
          )}
        </nav>
      </header>
      <main id="main">
        <section className="hero">
          <p className="eyebrow">Educational puzzle game</p>
          <h1>Solve the picture. Keep the streak.</h1>
          <p className="lede">
            Banana Math Puzzle Challenge asks you to read a banana puzzle, type the integer it represents, and build a score that stays in the database.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to={user ? '/play' : '/register'}>{user ? 'Play a round' : 'Start playing'}</Link>
            <Link className="button button-ghost" to={user ? '/leaderboard' : '/login'}>View the leaderboard</Link>
          </div>
        </section>
        <section className="feature-grid" aria-label="How the game works">
          {POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <article key={point.title} className="card">
                <Icon aria-hidden="true" />
                <h2>{point.title}</h2>
                <p>{point.text}</p>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
