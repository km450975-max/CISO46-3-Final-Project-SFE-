import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import { AdminRoute, GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';
import SplashPage from './pages/Splash.jsx';
import LoginPage from './pages/Login.jsx';
import RegisterPage from './pages/Register.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import GamePage from './pages/Game.jsx';
import LeaderboardPage from './pages/Leaderboard.jsx';
import ProfilePage from './pages/Profile.jsx';
import HistoryPage from './pages/History.jsx';
import SettingsPage from './pages/Settings.jsx';
import AdminPage from './pages/Admin.jsx';
import NotFoundPage from './pages/NotFound.jsx';

function AppRoutes() {
  const location = useLocation();
  const path = location.pathname.replace(/[.\s]+$/g, '').replace(/\/+$/g, '') || '/';
  if (path !== location.pathname) {
    return <Navigate to={`${path}${location.search}`} replace />;
  }

  return (
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/play" element={<GamePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
