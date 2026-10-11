import AuthScreen from './features/auth/AuthScreen';
import JoinScreen from './features/auth/JoinScreen';
import EmployeePage from './features/employee/EmployeePage';
import AdminScreen from './features/admin/AdminScreen';

export default function App() {
  const path = window.location.pathname;
  if (/^\/(register|register-preview)\/?$/.test(path)) return <JoinScreen />;
  const invitation = path.match(/^\/(?:invite|invite-preview)\/([^/]+)\/?$/);
  if (invitation) return <JoinScreen token={invitation[1]} />;
  if (/^\/(invite|invite-preview)\/?$/.test(path)) return <JoinScreen token="missing" />;
  if (/^\/(admin|admin-preview)\/?$/.test(path)) return <AdminScreen />;
  if (/^\/(employee|employee-preview)\/?$/.test(path)) return <EmployeePage />;
  return <AuthScreen />;
}
