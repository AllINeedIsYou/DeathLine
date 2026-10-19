import { useState, type FormEvent } from 'react';
import { AuthShell } from './AuthScreen';
import { inviteRoles, normalizeContacts } from './invitations';
import { api, errorText, localTimezone, passwordProblem, type Preview, type User, type Team } from '../../shared/api';
import { afterLogin, teamHome, useSession } from '../../shared/session';
import { useResource } from '../../shared/useResource';
import './join.css';

export default function JoinScreen({ token }: { token?: string }) {
  const session = useSession();
  const preview = useResource(token ? `invite:${token}` : null, signal => api<Preview>(`/invitations/${encodeURIComponent(token!)}`, { signal }), false);
  const [existing, setExisting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [timezone, setTimezone] = useState(localTimezone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const invite = preview.data;
  const user = session.user;
  const step = !user ? 1 : !user.email_verified_at ? 2 : 3;
  const unavailable = invite && invite.status !== 'pending';
  async function action(callback: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await callback(); } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  }
  function submitAccount(event: FormEvent) {
    event.preventDefault();
    void action(async () => {
      if (!existing) {
        const problem = passwordProblem(password); if (problem) throw new Error(problem);
        const contacts = normalizeContacts({ phone, telegram });
        const account = await api<User & { verification_email_sent: boolean }>('/auth/register', { method: 'POST', body: { name: name.trim(), username: username.trim(), email: invite?.email || email.trim(), password, phone: contacts.phone || null, telegram: contacts.telegram || null, timezone } });
        setExisting(true);
        setNotice(account.verification_email_sent ? "Account created. A verification email has been sent." : "Account created, but the email could not be sent. You can request it again.");
      }
      const result = await session.login(username.trim(), password);
      setPassword('');
      if (result.user.email_verified_at && !token && result.teams.length) window.location.assign(afterLogin(result.teams));
    });
  }
  async function confirmStatus() {
    const result = await session.reload();
    if (!result) throw new Error("Could not refresh your profile. Please try again.");
    if (!result.user.email_verified_at) throw new Error("Your email is not verified yet. Open the link in your email.");
  }
  return <AuthShell flow>
    <a className="join-back" href={user ? teamHome(session.team) : '/'}>← {user && session.team ? "Dashboard" : "Sign in"}</a>
    <div className="join-steps" aria-label={`Step ${step} of 3`}>{["Account", "Email", token ? "Join" : "Team"].map((label, index) => <span key={label} className={index + 1 <= step ? 'is-reached' : ''}><b>{index + 1}</b>{label}</span>)}</div>
    <h2 id="auth-heading">{token ? "Team invitation." : !user ? "Let's start the clock." : !user.email_verified_at ? "Verify your email." : "Your workspace."}</h2>
    {preview.loading ? <p role="status">Loading invitation…</p> : preview.error ? <div role="alert"><p>{preview.error}</p><button className="employee-button" onClick={() => void preview.reload()}>Retry</button></div> : <>
      {invite && <div className="join-invitation"><span>TEAM INVITATION</span><strong>{invite.team_name}</strong><dl><div><dt>Role</dt><dd>{inviteRoles[invite.role]}</dd></div><div><dt>For email</dt><dd>{invite.email}</dd></div><div><dt>Expires on</dt><dd>{new Date(invite.expires_at).toLocaleString('en-US')}</dd></div></dl></div>}
      {unavailable ? <div className="join-stage"><p>{invite.status === 'accepted' ? "This invitation has already been accepted." : invite.status === 'revoked' ? "The administrator revoked this invitation." : "This invitation has expired. Ask the administrator for a new one."}</p><a className="login-form__submit join-primary-link" href={user ? teamHome(session.teams.find(t => t.id === invite.team_id) || session.team) : '/'}>{user ? "Open dashboard" : "Sign in"}</a></div> : !user ? <>
        <p className="auth-pane__sub">{token ? "Sign in or create an account with the email from the invitation." : "Create an account for your tasks and team."}</p>
        <div className="join-switch"><button type="button" aria-pressed={!existing} onClick={() => setExisting(false)}>New account</button><button type="button" aria-pressed={existing} onClick={() => setExisting(true)}>Existing account</button></div>
        <form className="login-form join-form" onSubmit={submitAccount}>
          {!existing && <><label>Name<input name="name" autoComplete="name" maxLength={80} required value={name} onChange={e => setName(e.target.value)} /></label><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} readOnly={!!invite} value={invite?.email || email} onChange={e => setEmail(e.target.value)} /></label><label>Phone <small>optional</small><input name="phone" type="tel" autoComplete="tel" value={phone} maxLength={40} placeholder="+7…" onChange={e => setPhone(e.target.value)} /></label><label>Telegram <small>optional</small><input name="telegram" value={telegram} maxLength={33} placeholder="@username" onChange={e => setTelegram(e.target.value)} /></label></>}
          <label>Username<input name="username" autoComplete="username" required minLength={existing ? 1 : 3} maxLength={40} value={username} onChange={e => setUsername(e.target.value)} /></label>
          <label>Password<span className="join-password"><input name="password" aria-label="Password" type={showPassword ? 'text' : 'password'} autoComplete={existing ? 'current-password' : 'new-password'} required minLength={existing ? 1 : 8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? "Hide" : "Show"}</button></span></label>
          {!existing && <p className="join-hint">8–128 characters, at least one uppercase letter and one special character.</p>}
          <button className="login-form__submit" type="submit" disabled={busy}>{busy ? "Continuing…" : existing ? "Sign in" : "Create account"}</button>
        </form>
      </> : !user.email_verified_at ? <div className="join-stage"><p>Verify your email <strong>{user.email}</strong> using the link in your email.</p><button className="login-form__submit" disabled={busy} onClick={() => void action(confirmStatus)}>Check verification →</button><button className="join-secondary" disabled={busy} onClick={() => void action(async () => { await api('/auth/resend-verification', { method: 'POST' }); setNotice("Email sent. Check your inbox and spam folder."); })}>Resend verification email</button></div> : token && invite ? <div className="join-stage"><p>You are signed in as <strong>{user.email}</strong>.</p>{user.email.toLowerCase() !== invite.email.toLowerCase() ? <p>This invitation is for a different email address. Sign out and use the correct account.</p> : <button className="login-form__submit" disabled={busy} onClick={() => void action(async () => { await api(`/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' }); const result = await session.reload(); if (!result) throw new Error("Invitation accepted. Refresh the page to load your team."); window.location.assign(teamHome(result.teams.find(t => t.id === invite.team_id))); })}>Join {invite.team_name} →</button>}</div> : <div className="join-stage">
        {session.teams.length > 0 && <><p>Your teams</p>{session.teams.map(team => <a className="join-secondary" key={team.id} href={teamHome(team)}>{team.name} · {inviteRoles[team.role]} →</a>)}</>}
        <form className="login-form join-form" onSubmit={event => { event.preventDefault(); void action(async () => { const team = await api<Team>('/teams', { method: 'POST', body: { name: teamName.trim(), timezone } }); await session.reload(); window.location.assign(`/admin/?team=${team.id}&view=invitations`); }); }}><label>Team name<input name="team-name" value={teamName} required maxLength={120} onChange={e => setTeamName(e.target.value)} /></label><label>Team time zone<input name="timezone" value={timezone} required maxLength={40} onChange={e => setTimezone(e.target.value)} /></label><p className="join-hint">The shared time zone defines month boundaries for ratings and charts.</p><button className="login-form__submit" disabled={busy}>Create team →</button></form><p>To join another team, open a personal invitation link from its administrator.</p>
      </div>}
      {user && <button className="join-secondary" disabled={busy} onClick={() => void action(() => session.logout())}>Sign out</button>}
    </>}
    {error && <p className="login-form__notice login-form__notice--error" role="alert">{error}</p>}
    {notice && <p className="login-form__notice" role="status">{notice}</p>}
  </AuthShell>;
}
