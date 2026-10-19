import { useRef, useState } from 'react';
import { AuthShell } from './AuthScreen';
import { api, errorText, passwordProblem } from '../../shared/api';
import { useSession, teamHome } from '../../shared/session';
import './join.css';

export default function AccountAction() {
  const session = useSession();
  const mode = window.location.pathname.split('/')[1];
  const token = useRef(new URLSearchParams(window.location.search).get('token') || '').current;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const verify = mode === 'verify-email';
  const forgot = mode === 'forgot-password';
  return <AuthShell flow><a className="join-back" href="/">← Back to home</a><h2 id="auth-heading">{verify ? "Verify your email." : forgot ? "Forgot your password?" : "Your new password."}</h2>
    {done ? <div className="join-stage"><p role="status">{notice}</p><a className="login-form__submit join-primary-link" href={verify && session.user ? new URLSearchParams(window.location.search).get('return')?.startsWith('/invite/') ? new URLSearchParams(window.location.search).get('return')! : '/register/' : session.user && forgot ? teamHome(session.team) : '/'}>{verify ? "Continue" : "Go to sign in"} →</a></div> : <form className="login-form join-form" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setError(''); setBusy(true);
      try {
        if (verify) { if (!token) throw new Error("The link has no token. Request a new email."); await api('/auth/verify-email', { method: 'POST', body: { token } }); await session.reload(); setNotice("Email verified. You can continue in the original invitation tab or create a team."); }
        else if (forgot) { const result = await api<{ detail: string }>('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } }); setNotice(result.detail); }
        else { if (!token) throw new Error("The link has no token. Request another password reset."); const problem = passwordProblem(password); if (problem) throw new Error(problem); if (password !== repeat) throw new Error("Passwords do not match."); await api('/auth/reset-password', { method: 'POST', body: { token, new_password: password } }); setPassword(''); setRepeat(''); await session.reload(); setNotice("Password changed. Sign in with your new password."); }
        setDone(true); window.history.replaceState({}, '', window.location.pathname);
      } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
    }}>
      {verify ? <p>Click the button to verify the address from your email.</p> : forgot ? <><p>Enter your account email and we will send you a recovery link.</p><label>Email<input type="email" name="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label></> : <><label>New password<input type="password" name="new-password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></label><label>Confirm password<input type="password" name="repeat-password" required minLength={8} maxLength={128} value={repeat} onChange={e => setRepeat(e.target.value)} autoComplete="new-password" /></label><p className="join-hint">8–128 characters, at least one uppercase letter and one special character.</p></>}
      {error && <p className="login-form__notice login-form__notice--error" role="alert">{error}</p>}
      <button className="login-form__submit" disabled={busy}>{busy ? "Please wait…" : verify ? "Verify email" : forgot ? "Send link" : "Save password"}</button>
      {!forgot && <a className="join-secondary" href={verify ? '/register/' : '/forgot-password/'}>Request a new link</a>}
    </form>}
  </AuthShell>;
}
