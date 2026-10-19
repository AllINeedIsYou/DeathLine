import { createContext, useContext, type ReactNode } from 'react';
import type { TeamTask, Worker, WorkerProfileDraft } from '../admin/team';
import type { TaskDraft } from '../admin/AdminTasks';
import { api, monthQuery, refreshData, phoneText, type ApiTask, type Member, type Statistics, type Goat, type History } from '../../shared/api';
import { LoadingPage, useSession } from '../../shared/session';
import { useResource } from '../../shared/useResource';

export function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('en-US'); }
export function taskFromApi(task: ApiTask): TeamTask {
  return { id: task.id, workerId: task.user_id, title: task.title, description: task.description || '', summary: task.description || '', category: "Task", priority: task.priority, deadline: Date.parse(task.deadline), completedAt: task.completed_at ? Date.parse(task.completed_at) : null, createdAt: Date.parse(task.created_at) };
}
function memberFromApi(member: Member): Worker {
  return { id: member.user.id, memberId: member.id, teamRole: member.role, name: member.user.name, initials: initials(member.user.name), role: member.job_title || '', color: ['teal', 'purple', 'amber', 'rose'][member.user.id % 4], rating: null, email: member.user.email, telegram: member.user.telegram || '', phone: phoneText(member.user.phone), timeZone: member.user.timezone };
}
function useTeamState() {
  const session = useSession();
  const team = session.team!;
  const base = `/teams/${team.id}`;
  const period = monthQuery(team.timezone);
  const core = useResource(`core:${team.id}:${team.role}`, async signal => {
    if (team.role === 'admin') {
      const [tasks, members] = await Promise.all([api<ApiTask[]>(`${base}/tasks`, { signal }), api<Member[]>(`${base}/members`, { signal })]);
      return { tasks: tasks.map(taskFromApi), workers: members.map(memberFromApi) };
    }
    const tasks = await api<ApiTask[]>(`${base}/my-tasks`, { signal });
    return { tasks: tasks.map(taskFromApi), workers: [] as Worker[] };
  });
  const statistics = useResource(`statistics:${team.id}:${team.role}`, signal => api<Statistics>(`${base}/${team.role === 'admin' ? 'statistics' : 'my-statistics'}`, { signal }));
  const goat = useResource(`goat:${team.id}:${team.role}:${period}`, signal => api<Goat>(`${base}/goat${team.role === 'admin' ? '/admin' : ''}?${period}`, { signal }));
  const workers = (core.data?.workers || []).map(worker => ({ ...worker, rating: goat.data?.members?.find(entry => entry.user_id === worker.id)?.score ?? null }));
  async function saveTask(draft: TaskDraft, id?: number) {
    const original = core.data?.tasks.find(task => task.id === id);
    const body: Record<string, unknown> = {};
    if (!original || original.title !== draft.title) body.title = draft.title;
    if (!original || original.description !== draft.description) body.description = draft.description || null;
    if (!original || original.workerId !== draft.workerId) body.user_id = draft.workerId;
    if (!original || original.priority !== draft.priority) body.priority = draft.priority;
    if (!original || original.deadline !== draft.deadline) body.deadline = new Date(draft.deadline).toISOString();
    const task = await api<ApiTask>(`${base}/tasks${id === undefined ? '' : `/${id}`}`, { method: id === undefined ? 'POST' : 'PATCH', body });
    await core.reload(); refreshData(); return task.id;
  }
  async function saveProfile(workerId: number, draft: WorkerProfileDraft) {
    const member = workers.find(worker => worker.id === workerId);
    if (!member) throw new Error("Member not found. Refresh the page.");
    await api(`${base}/members/${member.memberId}`, { method: 'PATCH', body: { job_title: draft.role.trim() || null } });
    await core.reload(); refreshData();
  }
  async function completeTask(id: number) {
    await api(`${base}/tasks/${id}/complete`, { method: 'POST' });
    await core.reload(); refreshData();
  }
  return { tasks: core.data?.tasks || [], workers, core, statistics, goat, saveTask, saveProfile, completeTask };
}
const TeamDataContext = createContext<ReturnType<typeof useTeamState> | null>(null);
export function TeamDataProvider({ children }: { children: ReactNode }) {
  const data = useTeamState();
  if (!data.core.data) return <LoadingPage error={data.core.error} retry={() => void data.core.reload()} />;
  return <TeamDataContext.Provider value={data}>{data.core.error && <div className="connection-banner" role="alert">Could not refresh data: {data.core.error}<button onClick={() => void data.core.reload()}>Retry</button></div>}{data.goat.error && <p className="connection-banner" role="alert">Could not refresh ratings: {data.goat.error}</p>}{children}</TeamDataContext.Provider>;
}
export function useTeamData() { const value = useContext(TeamDataContext); if (!value) throw new Error('TeamDataProvider required'); return value; }
export function useTaskHistory(memberId?: number) {
  const { team } = useSession();
  const period = monthQuery(team!.timezone);
  return useResource(`history:${team!.id}:${memberId ?? 'team'}:${period}`, signal => api<History>(`/teams/${team!.id}${memberId === undefined ? '' : `/members/${memberId}`}/history?${period}`, { signal }));
}
