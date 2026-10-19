export type InviteRole = 'employee' | 'admin';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type Contacts = { phone: string; telegram: string };
export type Team = { id: string; name: string };
export const inviteRoles: Record<InviteRole, string> = { employee: "Employee", admin: "Administrator" };
export const inviteStatuses: Record<InviteStatus, string> = { pending: "Pending", accepted: "Accepted", expired: "Expired", revoked: "Revoked" };
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export function normalizeContacts(contacts: Contacts): Contacts {
  const phone = contacts.phone.trim();
  const handle = contacts.telegram.trim().replace(/^@/, '');
  if (phone && (phone.length > 40 || !/^[+\d\s().-]+$/.test(phone) || !/^\d{8,15}$/.test(phone.replace(/\D/g, '')))) throw new Error("Check the phone number: it must contain 8 to 15 digits.");
  if (handle && !/^[a-zA-Z0-9_]{5,32}$/.test(handle)) throw new Error("Telegram: enter a username such as @username, without a link or spaces.");
  return { phone, telegram: handle ? `@${handle}` : '' };
}
