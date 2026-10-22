import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Timer,
  Trophy,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Avatar from './Avatar.jsx';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/play', label: 'Play', icon: Timer },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/history', label: 'History', icon: History },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [navigate]);

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
    navigate('/');
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <button className="icon-button menu-button" type="button" aria-expanded={open} aria-controls="app-nav" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={20} /> : <Menu size={20} />}
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
        <NavLink to="/dashboard" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Banana Math
        </NavLink>
        <div className="topbar-user">
          <Avatar name={user.displayName} avatarKey={user.avatarKey} size={36} />
          <div>
            <strong>{user.displayName}</strong>
            <span>{user.totalScore} pts</span>
          </div>
        </div>
      </header>
      <div className="shell-body">
        <nav id="app-nav" className={open ? 'sidenav open' : 'sidenav'} aria-label="Main">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)}>
                <Icon size={18} aria-hidden="true" />
                {link.label}
              </NavLink>
            );
          })}
          {user.role === 'admin' && (
            <NavLink to="/admin" onClick={() => setOpen(false)}>
              <Shield size={18} aria-hidden="true" />
              Admin
            </NavLink>
          )}
          <button type="button" className="nav-logout" onClick={logout}>
            <LogOut size={18} aria-hidden="true" />
            Log out
          </button>
        </nav>
        {open && <button className="scrim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />}
        <main id="main" className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
