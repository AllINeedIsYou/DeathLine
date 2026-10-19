import { useEffect, useId, useRef, useState } from 'react';
import { api, errorText, phoneText, refreshData, type User } from './api';
import { teamHome, useSession } from './session';
import { normalizeContacts } from '../features/auth/invitations';

export function TeamSwitch() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = Math.max(0, session.teams.findIndex(team => team.id === session.team?.id));

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, listId]);

  function choose(index: number) {
    const team = session.teams[index];
    setOpen(false);
    trigger.current?.focus();
    if (team && team.id !== session.team?.id) window.location.assign(teamHome(team));
  }

  return <div className="team-switch" ref={container} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="team-switch__trigger" role="combobox"
      aria-label="Current team" aria-haspopup="listbox" aria-expanded={open}
      aria-controls={open ? listId : undefined} aria-activedescendant={open ? `${listId}-${active}` : undefined}
      title={session.team?.name} onClick={() => { setActive(selected); setOpen(value => !value); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (!open) { setActive(selected); setOpen(true); }
          else setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + session.teams.length) % session.teams.length);
        } else if (open && (event.key === 'Home' || event.key === 'End')) {
          event.preventDefault(); setActive(event.key === 'Home' ? 0 : session.teams.length - 1);
        } else if (open && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault(); choose(active);
        } else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
        else if (event.key === 'Tab') setOpen(false);
      }}>
      <svg className="team-switch__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="11" y="3" width="6" height="6" rx="1.5" /><rect x="3" y="11" width="6" height="6" rx="1.5" /><rect x="11" y="11" width="6" height="6" rx="1.5" /></svg>
      <span className="team-switch__name">{session.team?.name}</span>
      <svg className="team-switch__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 6.5 3 3 3-3" /></svg>
    </button>
    {open && <div className="team-switch__popover"><p className="team-switch__heading">Your teams</p>
      <div id={listId} className="team-switch__list" role="listbox" aria-label="Choose a team">
        {session.teams.map((team, index) => <button key={team.id} id={`${listId}-${index}`} type="button" tabIndex={-1}
          role="option" aria-selected={team.id === session.team?.id}
          className={`team-switch__option${active === index ? ' is-active' : ''}`}
          onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
          <span className="team-switch__option-copy"><strong>{team.name}</strong><small>{team.role === 'admin' ? "Administrator" : "Employee"}</small></span>
          {team.id === session.team?.id && <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 8 2.5 2.5L12 5" /></svg>}
        </button>)}
      </div>
    </div>}
  </div>;
}

export default function AccountMenu() {
  const session = useSession();
  const user = session.user!;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(phoneText(user.phone));
  const [telegram, setTelegram] = useState(user.telegram || '');
  const [timezone, setTimezone] = useState(user.timezone);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (editing) dialog.current?.showModal(); }, [editing]);
  async function logout() { if (busy) return; setBusy(true); setError(''); try { await session.logout(); } catch (reason) { setError(errorText(reason)); setBusy(false); } }
  return <div className="account-menu"><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><TeamSwitch /><button className="employee-user" type="button" onClick={() => { setName(user.name); setPhone(phoneText(user.phone)); setTelegram(user.telegram || ''); setTimezone(user.timezone); setError(''); setEditing(true); }}><span className="employee-user__avatar">{user.name[0]?.toUpperCase()}</span><span className="employee-user__details"><strong>{user.name}</strong><span>{session.team?.role === 'admin' ? "Administrator" : "Employee"}</span></span></button><button className="employee-button" type="button" disabled={busy} onClick={() => void logout()}>Sign out</button></div>
    {!editing && error && <p role="alert">{error}</p>}
    {editing && <dialog ref={dialog} className="account-dialog" onCancel={() => setEditing(false)} onClick={event => { if (event.target === event.currentTarget) setEditing(false); }}><header><h2>My profile</h2><button className="employee-button" onClick={() => setEditing(false)}>Close</button></header><form onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { const contacts = normalizeContacts({ phone, telegram }); await api<User>('/auth/me', { method: 'PATCH', body: { name: name.trim(), phone: contacts.phone || null, telegram: contacts.telegram || null, timezone } }); await session.reload(); refreshData(); setEditing(false); } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); } }}>
      <label>Name<input name="profile-name" required minLength={1} maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label><label>Email<input value={user.email} readOnly /></label><label>Phone<input name="profile-phone" type="tel" maxLength={40} value={phone} onChange={event => setPhone(event.target.value)} /></label><label>Telegram<input name="profile-telegram" maxLength={33} value={telegram} onChange={event => setTelegram(event.target.value)} /></label><label>Time zone<input name="profile-timezone" required maxLength={40} value={timezone} onChange={event => setTimezone(event.target.value)} /></label>
      {!user.email_verified_at && <a href="/register/">Verify email →</a>}
      {error && <p role="alert">{error}</p>}<button className="employee-button employee-button--primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button><a href="/register/">My teams / create team →</a><a href="/forgot-password/">Change password by email →</a>
    </form></dialog>}
  </div>;
}
