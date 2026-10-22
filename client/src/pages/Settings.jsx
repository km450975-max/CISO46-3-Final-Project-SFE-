import { useState } from 'react';
import api, { getErrorMessage, getFieldErrors } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';

const AVATARS = ['banana', 'ocean', 'forest', 'sunset', 'grape', 'slate'];

export default function SettingsPage() {
  const { user, setUser, applyTheme } = useAuth();
  const [profile, setProfile] = useState({
    displayName: user.displayName,
    avatarKey: user.avatarKey,
    theme: user.theme,
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function chooseTheme(theme) {
    setProfile((current) => ({ ...current, theme }));
    applyTheme(theme);
    localStorage.setItem('banana-theme', theme);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await api.patch('/users/me', profile);
      setUser(response.data.data.user);
      setMessage('Profile saved.');
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setFieldErrors({});
    try {
      const response = await api.patch('/users/me/password', passwords);
      setUser(response.data.data.user);
      setPasswords({ currentPassword: '', newPassword: '' });
      setMessage('Password updated. Other sessions have been signed out.');
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack narrow">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Settings</h1>
          <p className="lede">Profile details are separate from your login email. Changing the password invalidates older sessions.</p>
        </div>
      </div>
      <Alert>{error}</Alert>
      {message && <Alert tone="success">{message}</Alert>}

      <form className="card stack" onSubmit={saveProfile}>
        <h2>Profile</h2>
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} required minLength={2} maxLength={40} />
        {fieldErrors.displayName && <p className="field-error">{fieldErrors.displayName}</p>}
        <fieldset>
          <legend>Avatar</legend>
          <div className="avatar-picker">
            {AVATARS.map((key) => (
              <label key={key} className={profile.avatarKey === key ? 'selected' : undefined}>
                <input type="radio" name="avatar" value={key} checked={profile.avatarKey === key} onChange={() => setProfile({ ...profile, avatarKey: key })} />
                <span className={`swatch swatch-${key}`} />
                {key}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Theme</legend>
          <div className="button-row">
            <button className={profile.theme === 'light' ? 'button button-primary' : 'button button-ghost'} type="button" onClick={() => chooseTheme('light')}>Light</button>
            <button className={profile.theme === 'dark' ? 'button button-primary' : 'button button-ghost'} type="button" onClick={() => chooseTheme('dark')}>Dark</button>
          </div>
        </fieldset>
        <button className="button button-primary" type="submit" disabled={busy}>Save profile</button>
      </form>

      <form className="card stack" onSubmit={savePassword}>
        <h2>Password</h2>
        <label htmlFor="currentPassword">Current password</label>
        <input id="currentPassword" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required />
        <label htmlFor="newPassword">New password</label>
        <input id="newPassword" type="password" autoComplete="new-password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} required />
        {fieldErrors.newPassword && <p className="field-error">{fieldErrors.newPassword}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>Update password</button>
      </form>
    </div>
  );
}
