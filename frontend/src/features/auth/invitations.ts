import { serviceUnavailable } from '../../shared/service';

export type InviteRole = 'employee' | 'admin';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type Contacts = { phone: string; telegram: string };
export type Team = { id: string; name: string };
export type Invitation = {
  token: string; teamId: string; email: string; role: InviteRole;
  createdAt: number; expiresAt: number; state: 'pending' | 'accepted' | 'revoked';
  acceptedName?: string;
};
export type InvitationData = { teams: Team[]; invites: Invitation[] };
// An unnamed layout context, not a saved team or authenticated membership.
export const defaultTeam: Team = { id: '', name: '' };
const emptyData: InvitationData = { teams: [], invites: [] };
export const inviteRoles: Record<InviteRole, string> = { employee: 'Сотрудник', admin: 'Администратор' };
export const inviteStatuses: Record<InviteStatus, string> = { pending: 'Ожидает', accepted: 'Принято', expired: 'Истекло', revoked: 'Отменено' };
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export function normalizeContacts(contacts: Contacts): Contacts {
  const phone = contacts.phone.trim();
  const handle = contacts.telegram.trim().replace(/^@/, '');
  if (phone && (phone.length > 40 || !/^[+\d\s().-]+$/.test(phone) || !/^\d{8,15}$/.test(phone.replace(/\D/g, '')))) throw new Error('Проверь номер телефона: от 8 до 15 цифр.');
  if (handle && !/^[a-zA-Z0-9_]{5,32}$/.test(handle)) throw new Error('Telegram: укажи имя пользователя, например @username, без ссылки и пробелов.');
  return { phone, telegram: handle ? `@${handle}` : '' };
}
export function inviteStatus(invite: Invitation, now: number): InviteStatus {
  return invite.state === 'pending' && now >= invite.expiresAt ? 'expired' : invite.state;
}
// Replace these boundaries with authenticated API calls during integration.
// Old browser demo storage is intentionally never read or modified.
export function useInvitations(): InvitationData { return emptyData; }
export function createTeam(_name: string, _contacts?: Contacts): Team { return serviceUnavailable(); }
export function createInvitation(_teamId: string, _email: string, _role: InviteRole, _memberEmails: string[]): Invitation { return serviceUnavailable(); }
export function updateInvitation(_token: string, _action: 'accept' | 'revoke', _email?: string, _name?: string, _now?: number, _contacts?: Contacts): Invitation { return serviceUnavailable(); }
export const invitePath = (token: string) => `/invite/${encodeURIComponent(token)}`;
export const teamPath = (teamId: string) => `/admin/${teamId ? `?team=${encodeURIComponent(teamId)}` : ''}`;
