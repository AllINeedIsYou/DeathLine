export type Role = 'admin' | 'employee';
export type User = { id: number; name: string; username: string; email: string; phone: string | null; telegram: string | null; timezone: string; created_at: string; email_verified_at: string | null };
export type Team = { id: number; name: string; timezone: string; role: Role; created_at: string };
export type Member = { id: number; team_id: number; role: Role; job_title: string | null; joined_at: string; user: User };
export type ApiTask = { id: number; team_id: number; user_id: number; title: string; description: string | null; priority: 'high' | 'medium' | 'low'; deadline: string; created_at: string; updated_at: string; completed_at: string | null };
export type Statistics = { total: number; active: number; completed: number; overdue: number; productivity_percent: number | null; on_time_percent: number | null };
export type GoatMember = { member_id: number; user_id: number; name: string; job_title: string | null; statistics: Statistics; score: number | null; rank: number | null };
export type Goat = { team_id: number; year: number; month: number; timezone: string; members?: GoatMember[]; leaders?: GoatMember[]; my_result?: GoatMember };
export type History = { team_id: number; member_id: number | null; year: number; month: number; timezone: string; as_of: string; history_complete: boolean; points: { at: string; created: number | null; completed: number | null; overdue: number | null }[] };
export type Preview = { team_id: number; team_name: string; email: string; role: Role; expires_at: string; status: 'pending' | 'expired' | 'revoked' | 'accepted' };
export type ApiInvitation = { id: number; team_id: number; email: string; role: Role; created_at: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; status?: Preview['status'] };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const configuredBase = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL;
export const apiBase = (configuredBase || '/api').replace(/\/$/, '');
export function errorText(error: unknown) { return error instanceof Error ? error.message : "Could not complete the action. Please try again."; }
const fields: Record<string, string> = { password: "Password", new_password: "New password", username: "Username", email: "Email", name: "Name", phone: "Phone", timezone: "Time zone", deadline: "Deadline", title: "Title", user_id: "Assignee", job_title: "Job title", text: "Note" };
function validationMessage(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(item => {
    const field = item.loc?.at(-1);
    const label = fields[field] || field || "Data";
    const type = String(item.type || '');
    let message = String(item.msg || "Check this value").replace(/^Value error, /, '');
    if (type === 'string_too_short') message = `at least ${item.ctx?.min_length} characters`;
    else if (type === 'string_too_long') message = `at most ${item.ctx?.max_length} characters`;
    else if (type === 'missing') message = "this field is required";
    else if (type === 'string_pattern_mismatch') message = "invalid format";
    else if (message.includes('valid email')) message = "enter a valid email address";
    else if (message.includes('valid phone')) message = "enter a valid phone number";
    return `${label}: ${message}`;
  }).join('. ');
  return '';
}
export async function api<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = window.setTimeout(abort, 30000);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: options.method || 'GET', credentials: 'include', signal: controller.signal,
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (!response.ok) {
      if (response.status === 401 && !['/auth/login', '/auth/me'].includes(path)) window.dispatchEvent(new Event('deathline:unauthorized'));
      throw new ApiError(response.status, validationMessage(data?.detail) || (response.status === 401 ? "Please sign in." : response.status === 403 ? "You do not have access to this action." : response.status >= 500 ? "The server is temporarily unavailable. Please try again later." : `Request failed (${ response.status}).`));
    }
    if (response.status !== 204 && data === undefined) throw new ApiError(502, "The server returned an invalid response.");
    return data as T;
  } catch (error) {
    if (error instanceof ApiError || options.signal?.aborted) throw error;
    throw new Error(controller.signal.aborted ? "The server did not respond in time. Please try again." : "Cannot reach the server. Check your connection and try again.");
  } finally { window.clearTimeout(timeout); options.signal?.removeEventListener('abort', abort); }
}
export function monthQuery(timezone: string, at = Date.now()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: 'numeric' }).formatToParts(at);
  return `year=${parts.find(p => p.type === 'year')!.value}&month=${parts.find(p => p.type === 'month')!.value}`;
}
export function refreshData() { window.dispatchEvent(new Event('deathline:refresh')); }
export function passwordProblem(value: string) {
  if (value.length < 8 || value.length > 128) return "Your password must contain 8 to 128 characters.";
  if (!/\p{Lu}/u.test(value) || !/[^\p{L}\p{N}\s]/u.test(value)) return "Add at least one uppercase letter and one special character.";
  return '';
}
export function localTimezone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow'; }
export function phoneText(value: string | null) { return (value || '').replace(/^tel:/, ''); }
