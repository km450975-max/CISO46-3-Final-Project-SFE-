import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then((response) => {
        if (!active) return;
        setUser(response.data.data.user);
        applyTheme(response.data.data.user.theme);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        const stored = localStorage.getItem('banana-theme');
        if (stored) applyTheme(stored);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    setUser(next) {
      setUser(next);
      if (next?.theme) applyTheme(next.theme);
    },
    applyTheme,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
