import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const HOLD_MS = 2400;

export default function SplashPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const gone = useRef(false);

  const continueOn = useCallback(() => {
    if (gone.current || loading) return;
    gone.current = true;
    navigate(user ? '/dashboard' : '/login', { replace: true });
  }, [loading, navigate, user]);

  useEffect(() => {
    if (loading) return undefined;
    const id = window.setTimeout(continueOn, HOLD_MS);
    return () => window.clearTimeout(id);
  }, [continueOn, loading]);

  return (
    <button className="splash" type="button" onClick={continueOn} autoFocus>
      <span className="splash-cabinet">
        <span className="marquee"><span>Banana Math</span></span>
        <span className="splash-mark" aria-hidden="true" />
        <strong>Puzzle Challenge</strong>
        <span className="splash-line">Solve the picture. Keep the streak.</span>
        <span className="splash-bar" aria-hidden="true"><span /></span>
        <span className="splash-hint">{loading ? 'Loading…' : 'Log in or sign up'}</span>
      </span>
    </button>
  );
}
