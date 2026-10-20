import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, errorText, type Team, type User } from './api';
import { subscribeToRefresh } from './autoRefresh';

const SessionContext = createContext<ReturnType<typeof useSessionState> | null>(null);
function useSessionState() {
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const pending = useRef(0);
  const reload = useCallback(async (background = false) => {
    if (background && pending.current > 0) return null;
    pending.current++;
    const current = ++generation.current;
    try {
      const account = await api<User>('/auth/me');
      const memberships = await api<Team[]>('/teams');
      if (generation.current === current) { setUser(account); setTeams(memberships); setError(''); }
      return { user: account, teams: memberships };
    } catch (reason) {
      if (generation.current === current) {
        if (reason instanceof ApiError && reason.status === 401) { setUser(null); setTeams([]); setError(''); }
        else if (!background) setError(errorText(reason));
      }
      return null;
    } finally { pending.current--; if (generation.current === current) setLoading(false); }
  }, []);
  useEffect(() => {
    void reload();
    const expired = () => { generation.current++; setUser(null); setTeams([]); setLoading(false); };
    window.addEventListener('deathline:unauthorized', expired);
    return () => { generation.current++; window.removeEventListener('deathline:unauthorized', expired); };
  }, [reload]);
  useEffect(() => {
    if (!user?.id) return;
    return subscribeToRefresh(() => void reload(true));
  }, [user?.id, reload]);
  async function login(username: string, password: string) {
    await api<User>('/auth/login', { method: 'POST', body: { username, password } });
    const result = await reload();
    if (!result) throw new Error("You are signed in, but your profile could not be loaded. Refresh the page.");
    return result;
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    generation.current++;
    window.location.assign('/');
  }
  const selected = new URLSearchParams(window.location.search).get('team');
  const team = teams.find(item => String(item.id) === selected) || teams[0];
  return { user, teams, team, loading, error, reload, login, logout };
}
export function SessionProvider({ children }: { children: ReactNode }) { const session = useSessionState(); return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>; }
export function useSession() { const value = useContext(SessionContext); if (!value) throw new Error('SessionProvider required'); return value; }
export function teamHome(team?: Team) { return team ? `/${team.role === 'admin' ? 'admin' : 'employee'}/?team=${team.id}` : '/register/'; }
export function afterLogin(teams: Team[]) {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && /^\/(?:invite\/|register\/?(?:\?|$))/.test(next) ? next : teamHome(teams[0]);
}
export function LoadingPage({ error = '', retry }: { error?: string; retry?: () => void }) { return <main className="connection-page"><img src="/brand/deathline-logo.png" alt="" /><h1>DeathLine</h1><p role={error ? 'alert' : 'status'}>{error || "Loading your workspace…"}</p>{error && <><button type="button" className="employee-button" onClick={retry || (() => window.location.reload())}>Retry</button><a className="join-secondary" href="/">Back to home</a></>}</main>; }
