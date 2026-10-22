import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api, { getErrorMessage, getFieldErrors } from '../services/api.js';
import Alert from '../components/Alert.jsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
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
      const response = await api.post('/auth/register', form);
      setUser(response.data.data.user);
      navigate('/dashboard');
    } catch (error) {
      setErrors(getFieldErrors(error));
      setMessage(getErrorMessage(error, 'Registration failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Create your player profile"
      subtitle="Your username is your public identity on the leaderboard. Your password stays hashed on the server."
      footer={<>Already registered? <Link to="/login">Log in</Link></>}
    >
      <form onSubmit={onSubmit} noValidate>
        <Alert>{message}</Alert>
        <label htmlFor="username">Username</label>
        <input id="username" name="username" autoComplete="username" value={form.username} onChange={update} required minLength={3} maxLength={20} aria-describedby={errors.username ? 'username-error' : undefined} />
        {errors.username && <p id="username-error" className="field-error">{errors.username}</p>}

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} required aria-describedby={errors.email ? 'email-error' : undefined} />
        {errors.email && <p id="email-error" className="field-error">{errors.email}</p>}

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={update} required aria-describedby="password-help" />
        <p id="password-help" className="field-help">At least 8 characters, with one letter and one number.</p>
        {errors.password && <p className="field-error">{errors.password}</p>}

        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthScreen>
  );
}

export function AuthScreen({ title, subtitle, footer, children }) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Banana Math
        </Link>
        <h1>{title}</h1>
        <p className="lede">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </div>
  );
}
