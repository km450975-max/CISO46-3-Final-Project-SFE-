import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotFoundPage from '../pages/NotFound.jsx';
import Spinner from './Spinner.jsx';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-center"><Spinner label="Checking your session" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-center"><Spinner label="Checking your session" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-center"><Spinner label="Loading" /></div>;
  if (!user || user.role !== 'admin') return <NotFoundPage />;
  return <Outlet />;
}
