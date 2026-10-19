import { useRef, useState } from 'react';
import { Icon } from '../employee/EmployeeScreen';
import { inviteRoles, inviteStatuses, type InviteRole, type InviteStatus, type Team } from '../auth/invitations';
import { useTimedNotice } from '../../shared/useTimedNotice';
import { api, errorText, type ApiInvitation } from '../../shared/api';
import { useResource } from '../../shared/useResource';
import './admin-invitations.css';

type InvitationDelivery = { invitation: ApiInvitation; invite_url: string; email_sent: boolean };

const date = (at: string) => new Date(at).toLocaleString('en-US');
export default function AdminInvitations({ team, now, query, onBack }: { team: Team; memberEmails: string[]; now: number; query: string; onBack: () => void }) {
  const resource = useResource(`invitations:${team.id}`, signal => api<ApiInvitation[]>(`/teams/${team.id}/invitations`, { signal }));
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('employee');
  const [filter, setFilter] = useState<'all' | InviteStatus>('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: number; url: string; emailSent: boolean }>();
  const [cancelId, setCancelId] = useState<number>();
  const [notice, showNotice] = useTimedNotice();
  const linkInput = useRef<HTMLInputElement>(null);
  const all = resource.data || [];
  const status = (invite: ApiInvitation): InviteStatus => invite.accepted_at ? 'accepted' : invite.revoked_at ? 'revoked' : Date.parse(invite.expires_at) <= now ? 'expired' : invite.status || 'pending';
  const visible = all.filter(invite => (filter === 'all' || status(invite) === filter) && invite.email.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = all.find(invite => invite.id === created?.id);
  function rememberDelivery(result: InvitationDelivery) {
    const link = new URL(result.invite_url);
    setCreated({ id: result.invitation.id, url: `${window.location.origin}${link.pathname}${link.search}`, emailSent: result.email_sent });
  }
  async function resend(invitationId: number) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await api<InvitationDelivery>(`/teams/${team.id}/invitations/${invitationId}/resend`, { method: 'POST' });
      rememberDelivery(result);
      await resource.reload();
      showNotice(result.email_sent ? 'Invitation email sent again. The previous link has been replaced.' : 'The new invitation is ready, but its email could not be sent. Copy the link below.');
    } catch (reason) { showNotice(errorText(reason)); }
    finally { setBusy(false); }
  }
  async function copy() {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.url); showNotice("Link copied. You can send it to your colleague."); }
    catch { showNotice("Select the link and copy it manually."); linkInput.current?.focus(); linkInput.current?.select(); }
  }
  return <section className="admin-invitations" aria-label="Team invitations"><div className="invites-toolbar"><button className="admin-text-button" onClick={onBack}>← Team members</button><span>TEAM / <strong>{team.name}</strong></span></div>
    {resource.error && <p className="connection-banner" role="alert">{resource.error}<button onClick={() => void resource.reload()}>Retry</button></p>}
    <div className="invites-layout"><div className="invites-main"><div className="invites-filters">{(['all', 'pending', 'accepted', 'expired', 'revoked'] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}><span>{value === 'all' ? "All" : inviteStatuses[value]}</span><strong>{value === 'all' ? all.length : all.filter(invite => status(invite) === value).length}</strong></button>)}</div><section className="admin-panel invites-list"><div className="admin-panel__heading"><div><h2>Invitations</h2><p>Personal link · 7 days · one acceptance</p></div><span>{visible.length} of {all.length}</span></div>
      {resource.loading ? <p role="status">Loading invitations…</p> : visible.length ? visible.map(invite => <article className="invite-row" key={invite.id}><div className="invite-row__identity"><span className={`invite-avatar invite-avatar--${invite.role}`}><Icon name="team" /></span><div><strong>{invite.email}</strong><span>{inviteRoles[invite.role]}</span></div><span className={`invite-status invite-status--${status(invite)}`}>{inviteStatuses[status(invite)]}</span></div><div className="invite-row__bottom"><span>Expires on {date(invite.expires_at)}</span><div className="invite-row__actions">{status(invite) === 'pending' ? <><button disabled={busy} onClick={() => void resend(invite.id)}>Resend email</button>{created?.id === invite.id && <button onClick={() => void copy()}>Copy</button>}<button className="invite-cancel" onClick={() => setCancelId(invite.id)}>Revoke</button></> : status(invite) !== 'accepted' && <button onClick={() => { setEmail(invite.email); setRole(invite.role); document.getElementById('invitation-email')?.focus(); }}>Invite again →</button>}</div></div>{cancelId === invite.id && <div className="invite-confirm"><p>Revoke this invitation? Its link will stop working.</p><button disabled={busy} onClick={async () => { if (busy) return; setBusy(true); try { await api(`/teams/${team.id}/invitations/${invite.id}`, { method: 'DELETE' }); await resource.reload(); setCancelId(undefined); showNotice("Invitation revoked."); } catch (reason) { showNotice(errorText(reason)); } finally { setBusy(false); } }}>Yes, revoke</button><button onClick={() => setCancelId(undefined)}>Keep invitation</button></div>}</article>) : resource.data && <div className="employee-empty"><Icon name="team" /><h3>{all.length ? "No matching invitations" : "A team starts with an invitation"}</h3><p>Create a link and send it to a colleague.</p></div>}
    </section></div><aside className="admin-panel invites-create"><div className="admin-panel__heading"><h2>New invitation</h2><Icon name="plus" /></div><form onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { const result = await api<InvitationDelivery>(`/teams/${team.id}/invitations`, { method: 'POST', body: { email: email.trim(), role } }); rememberDelivery(result); setEmail(''); setFilter('all'); await resource.reload(); showNotice(result.email_sent ? 'Invitation created and email sent.' : 'Invitation created, but the email could not be sent. Copy the link below.'); } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); } }}><label htmlFor="invitation-email">Colleague's email</label><input id="invitation-email" type="email" value={email} maxLength={254} required onChange={event => setEmail(event.target.value)} /><label htmlFor="invitation-role">Team role</label><select id="invitation-role" value={role} onChange={event => setRole(event.target.value as InviteRole)}><option value="employee">Employee</option><option value="admin">Administrator</option></select><p className="invites-role-hint">{role === 'admin' ? "Can manage tasks, members, and invitations." : "Can see their own tasks, GOAT leaders, and personal rating."}</p>{error && <p className="admin-task-editor__error" role="alert">{error}</p>}<button disabled={busy} className="employee-button employee-button--primary">{busy ? 'Sending…' : 'Send invitation'}</button><p className="invites-form-foot">The invitation is emailed automatically. You can also copy its link. Resending replaces the previous link and can be requested once a minute.</p></form>
      {created && (!selected || status(selected) === 'pending') && <div className="invite-share"><strong>{created.emailSent ? 'Invitation email sent' : 'Your invitation link is ready'}</strong>{!created.emailSent && <p role="alert">The email could not be sent. Copy this link and share it directly, or try Resend email in a minute.</p>}<input ref={linkInput} aria-label="Invitation link" readOnly value={created.url} onFocus={event => event.target.select()} /><button className="employee-button" onClick={() => void copy()}>Copy link</button><a href={created.url} target="_blank" rel="noreferrer">View invitation ↗</a></div>}
    </aside></div>{notice && <div className="employee-toast" role="status"><p>{notice}</p><button className="employee-icon-button" onClick={() => showNotice('')} aria-label="Dismiss notification"><Icon name="close" /></button></div>}
  </section>;
}
