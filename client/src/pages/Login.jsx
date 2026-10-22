import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api, { getErrorMessage, getFieldErrors } from '../services/api.js';
import Alert from '../components/Alert.jsx';
import { AuthScreen } from './Register.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setErrors({});
    try {
      const response = await api.post('/auth/login', form);
      setUser(response.data.data.user);
      navigate('/dashboard');
    } catch (error) {
      setErrors(getFieldErrors(error));
      setMessage(getErrorMessage(error, 'Login failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Log in to continue a game, check your streak, or see where you sit on the leaderboard."
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} noValidate>
        <Alert>{message}</Alert>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} required aria-describedby={errors.email ? 'email-error' : undefined} />
        {errors.email && <p id="email-error" className="field-error">{errors.email}</p>}

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={update} required />
        {errors.password && <p className="field-error">{errors.password}</p>}

        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </AuthScreen>
  );
}
