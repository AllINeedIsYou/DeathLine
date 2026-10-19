import { useEffect, useRef } from 'react';
import AuthScreen from './features/auth/AuthScreen';
import JoinScreen from './features/auth/JoinScreen';
import AccountAction from './features/auth/AccountAction';
import EmployeePage from './features/employee/EmployeePage';
import AdminScreen from './features/admin/AdminScreen';
import { SessionProvider, useSession, LoadingPage, teamHome, afterLogin } from './shared/session';
import { TeamDataProvider } from './features/data/team-data';
import './styles/integration.css';

function Redirect({ to }: { to: string }) { const destination = useRef(''); useEffect(() => { if (destination.current !== to) { destination.current = to; window.location.replace(to); } }, [to]); return <LoadingPage />; }
function Routes() {
  const session = useSession();
  const path = window.location.pathname;
  if (session.loading) return <LoadingPage />;
  if (session.error) return <LoadingPage error={session.error} retry={() => void session.reload()} />;
  if (/^\/(verify-email|forgot-password|reset-password)\/?$/.test(path)) return <AccountAction />;
  const invitation = path.match(/^\/(?:invite|invite-preview)\/([^/]+)\/?$/);
  if (invitation) return <JoinScreen token={decodeURIComponent(invitation[1])} />;
  if (/^\/(invite|invite-preview)\/?$/.test(path)) return <JoinScreen token="missing" />;
  if (/^\/(register|register-preview)\/?$/.test(path)) return <JoinScreen />;
  if (/^\/(admin|admin-preview|employee|employee-preview)\/?$/.test(path)) {
    if (!session.user) return <Redirect to="/" />;
    if (!session.team) return <Redirect to="/register/" />;
    const requestedTeam = new URLSearchParams(window.location.search).get('team');
    if (requestedTeam && !session.teams.some(team => String(team.id) === requestedTeam)) return <LoadingPage error="This team is not available to this account." retry={() => window.location.assign(teamHome(session.teams[0]))} />;
    const admin = path.startsWith('/admin');
    if (admin !== (session.team.role === 'admin')) return <Redirect to={teamHome(session.team)} />;
    return <TeamDataProvider key={session.team.id}>{admin ? <AdminScreen /> : <EmployeePage />}</TeamDataProvider>;
  }
  if (session.user) return <Redirect to={afterLogin(session.teams)} />;
  return <AuthScreen />;
}
export default function App() { return <SessionProvider><Routes /></SessionProvider>; }
