import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../employee/EmployeeScreen';
import { clockText, completionDelay, dateText, taskStatus } from '../employee/tasks';
import { workerMetrics, type TeamTask, type Worker } from './team';
import './admin.css';
import { useTeamData } from '../data/team-data';
import AdminTasks, { type TaskLayout } from './AdminTasks';
import AdminEmployees, { MemberRoleBadge } from './AdminEmployees';
import AdminGoat from './AdminGoat';
import AdminInvitations from './AdminInvitations';
import { useSession } from '../../shared/session';
import { api } from '../../shared/api';
import { useResource } from '../../shared/useResource';
import AccountMenu, { TeamSwitch } from '../../shared/AccountMenu';
import ProgressChart from './ProgressChart';

type View = 'overview' | 'tasks' | 'employees' | 'goat' | 'invitations';
type Filter = 'all' | 'active' | 'completed' | 'overdue';
type Selection = { kind: 'tasks'; filter: Filter } | { kind: 'workers' } | { kind: 'worker'; id: number } | { kind: 'task'; id: number };
const labels: Record<Filter, string> = { all: "All tasks", active: "In progress", completed: "Completed", overdue: "Overdue" };
function Avatar({ worker }: { worker: Worker }) { return <span className={`admin-avatar admin-avatar--${worker.color}`} aria-hidden="true">{worker.initials}</span>; }
function Rating({ value }: { value: number | null }) { return <strong className={`admin-rating${(value ?? -1) >= 85 ? ' admin-rating--top' : value !== null && value < 50 ? ' admin-rating--low' : ''}`}>{value === null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)}</strong>; }


function AdminDialog({ selection, workers, tasks, now, onClose, onSelect, onEdit }: { selection: Selection; workers: Worker[]; tasks: TeamTask[]; now: number; onClose: () => void; onSelect: (selection: Selection) => void; onEdit: (id: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { user } = useSession();
  const { completeTask } = useTeamData();
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState('');
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { dialog.current?.querySelector<HTMLButtonElement>('.employee-icon-button')?.focus(); }, [selection]);
  const worker = selection.kind === 'worker' ? workers.find(item => item.id === selection.id) : undefined;
  const task = selection.kind === 'task' ? tasks.find(item => item.id === selection.id) : undefined;
  const metrics = worker && workerMetrics(worker, tasks, now);
  const delay = task ? completionDelay(task) : 0;
  const title = task?.title ?? worker?.name ?? (selection.kind === 'tasks' ? labels[selection.filter] : "Team members");
  const list = worker ? tasks.filter(item => item.workerId === worker.id) : selection.kind === 'tasks' ? tasks.filter(item => selection.filter === 'all' || taskStatus(item, now) === selection.filter) : [];
  return <dialog className="employee-dialog admin-dialog" ref={dialog} onCancel={onClose} aria-labelledby="admin-dialog-title" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="employee-dialog__content"><div className="employee-dialog__top"><span>DEATHLINE / TEAM</span><button type="button" className="employee-icon-button" aria-label="Close dialog" onClick={onClose} autoFocus><Icon name="close" /></button></div><h2 id="admin-dialog-title">{title}</h2>
    {worker && metrics && <div className="admin-worker-summary"><Avatar worker={worker} /><div><p>{worker.role}</p><span>{metrics.completed} completed · {metrics.open} open · {metrics.overdue} overdue</span></div><Rating value={worker.rating} /></div>}
    {task && <><div className="admin-task-meta"><span className={`employee-tag ${delay > 0 ? 'admin-tag--completed-late' : `employee-tag--${taskStatus(task, now)}`}`}>{delay > 0 ? "Completed late" : labels[taskStatus(task, now)]}</span><span>#{task.id}</span></div><p className="employee-dialog__description">{task.description}</p><dl className="admin-task-details"><div><dt>Assignee</dt><dd>{workers.find(item => item.id === task.workerId)?.name}</dd></div><div><dt>Deadline</dt><dd>{dateText(task.deadline)}</dd></div><div><dt>{task.completedAt !== null ? "Completed on" : task.deadline <= now ? "Overdue by" : "Time left"}</dt><dd>{task.completedAt !== null ? dateText(task.completedAt) : clockText(task.deadline - now)}</dd></div>{delay > 0 && <div className="admin-task-details__late"><dt>Delay</dt><dd>{clockText(delay)}</dd></div>}</dl>{task.completedAt === null && <button type="button" className="employee-button employee-button--primary" onClick={() => onEdit(task.id)}><Icon name="edit" />Edit task</button>}{task.completedAt === null && task.workerId === user?.id && <button type="button" className="employee-button" disabled={completing} onClick={async () => { if (completing) return; setCompleting(true); setCompletionError(''); try { await completeTask(task.id); } catch (error) { setCompletionError(error instanceof Error ? error.message : "Could not complete the task."); } finally { setCompleting(false); } }}><Icon name="check" />Complete my task</button>}{completionError && <p role="alert">{completionError}</p>}</>}
    {selection.kind === 'workers' && <div className="admin-dialog__list">{workers.map(item => { const data = workerMetrics(item, tasks, now); return <button type="button" key={item.id} onClick={() => onSelect({ kind: 'worker', id: item.id })}><Avatar worker={item} /><span><strong>{item.name}</strong><small>{item.role} · {data.open} open tasks</small></span><Icon name="arrow" /></button>; })}</div>}
    {list.length > 0 && <div className="admin-dialog__list">{[...list].sort((a, b) => a.deadline - b.deadline).map(item => <button type="button" key={item.id} onClick={() => onSelect({ kind: 'task', id: item.id })}><span className={`admin-status-dot admin-status-dot--${completionDelay(item) > 0 ? 'completed-late' : taskStatus(item, now)}`} /><span><strong>{item.title}</strong><small>{workers.find(person => person.id === item.workerId)?.name} · {labels[taskStatus(item, now)]} · {dateText(item.deadline)}</small>{completionDelay(item) > 0 && <span className="admin-completion-late"><Icon name="clock" />Completed late · {clockText(completionDelay(item))}</span>}</span><Icon name="arrow" /></button>)}</div>}
  </div></dialog>;
}

export default function AdminScreen() {
  const session = useSession();
  const currentTeam = session.team!;
  const { tasks, workers, saveTask, saveProfile, statistics } = useTeamData();
  const [view, setView] = useState<View>(() => new URLSearchParams(window.location.search).get('view') === 'invitations' ? 'invitations' : 'overview');
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const selectedMember = workers.find(worker => worker.id === selectedWorkerId);
  const note = useResource(selectedMember ? `note:${currentTeam.id}:${selectedMember.memberId}` : null, async signal => {
    const result = await api<{ text: string } | null>(`/teams/${currentTeam.id}/members/${selectedMember!.memberId}/private-note`, { signal });
    return { text: result?.text || '' };
  }, false);
  async function saveNote(value: string) {
    if (!selectedMember) throw new Error("Member not found.");
    await api(`/teams/${currentTeam.id}/members/${selectedMember.memberId}/private-note`, value ? { method: 'PUT', body: { text: value } } : { method: 'DELETE' });
    await note.reload();
  }

  const employeeListOrigin = useRef({ query: '', x: 0, y: 0 });
  const [layout, setLayout] = useState<TaskLayout>('table');
  const [editor, setEditor] = useState<number | null | undefined>(undefined);
  const [now, setNow] = useState(Date.now);
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const editOrigin = useRef<{ view: View; selection: Selection; x: number; y: number } | null>(null);
  const returnScroll = useRef<{ x: number; y: number } | null>(null);
  function changeEditor(id: number | null | undefined) {
    setEditor(id);
    if (id !== undefined || !editOrigin.current) return;
    const origin = editOrigin.current;
    editOrigin.current = null;
    returnScroll.current = origin;
    setView(origin.view);
    setSelection(origin.selection);
  }
  function editFromDialog(id: number) {
    if (!selection) return;
    editOrigin.current = { view, selection, x: window.scrollX, y: window.scrollY };
    setView(view === 'employees' ? 'employees' : 'tasks'); setEditor(id); setSelection(null);
  }
  useLayoutEffect(() => {
    if (editor !== undefined || !returnScroll.current) return;
    window.scrollTo(returnScroll.current.x, returnScroll.current.y);
    returnScroll.current = null;
  }, [editor, view, selectedWorkerId]);
  useEffect(() => { const previousTitle = document.title; document.title = "Admin dashboard · DeathLine"; const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => { window.clearInterval(interval); document.title = previousTitle; }; }, []);
  useEffect(() => { document.title = `${view === 'invitations' ? "Invitations" : view === 'goat' ? 'GOAT' : view === 'tasks' ? "Team tasks" : view === 'employees' ? "Team members" : "Admin dashboard"} · DeathLine`; }, [view]);
  function navigate(next: View) {
    editOrigin.current = null; setEditor(undefined); setSelection(null); setView(next); setQuery('');
    if (next === 'employees') setSelectedWorkerId(null);
    window.scrollTo(0, 0);
  }
  function openWorker(id: number) {
    employeeListOrigin.current = view === 'employees' && selectedWorkerId === null ? { query, x: window.scrollX, y: window.scrollY } : { query: '', x: 0, y: 0 };
    editOrigin.current = null; setEditor(undefined); setSelection(null); setView('employees'); setSelectedWorkerId(id); setQuery(''); window.scrollTo(0, 0);
  }
  function backToEmployees() {
    editOrigin.current = null; setEditor(undefined); setSelectedWorkerId(null); setQuery(employeeListOrigin.current.query); returnScroll.current = employeeListOrigin.current;
  }
  const search = query.trim().toLocaleLowerCase('en-US');
  const matchesTask = (task: TeamTask) => `${task.title} ${task.summary} ${task.id} ${workers.find(item => item.id === task.workerId)?.name}`.toLocaleLowerCase('en-US').includes(search);
  const team = workers.filter(worker => !search || `${worker.name} ${worker.role}`.toLocaleLowerCase('en-US').includes(search) || tasks.some(task => task.workerId === worker.id && matchesTask(task)));
  const counts = { all: statistics.data?.total ?? tasks.length, active: statistics.data?.active ?? tasks.filter(task => taskStatus(task, now) === 'active').length, completed: statistics.data?.completed ?? tasks.filter(task => taskStatus(task, now) === 'completed').length, overdue: statistics.data?.overdue ?? tasks.filter(task => taskStatus(task, now) === 'overdue').length };
  const load = team.map(worker => ({ worker, ...workerMetrics(worker, tasks, now) })).sort((a, b) => b.open - a.open);
  const maxLoad = Math.max(1, ...workers.map(worker => workerMetrics(worker, tasks, now).open));
  const deadlines = tasks.filter(task => taskStatus(task, now) === 'active' && matchesTask(task)).sort((a, b) => a.deadline - b.deadline).slice(0, 5);
  return <div className="employee-page admin-page"><aside className="employee-sidebar" aria-label="Admin sidebar"><button type="button" className="employee-brand" aria-label="DeathLine — home" onClick={() => { navigate('overview'); window.scrollTo(0, 0); }}><span className="employee-brand__mark"><img src="/brand/deathline-logo.png" alt="" /></span><span>Death<b>Line</b></span></button><nav className="employee-nav admin-nav" aria-label="Admin navigation"><button type="button" className={view === 'overview' ? 'is-current' : ''} aria-current={view === 'overview' ? 'page' : undefined} onClick={() => navigate('overview')}><Icon name="home" /><span>Home</span></button><button type="button" className={view === 'tasks' ? 'is-current' : ''} aria-current={view === 'tasks' ? 'page' : undefined} onClick={() => navigate('tasks')}><Icon name="tasks" /><span>Tasks</span></button><button type="button" className={view === 'employees' || view === 'invitations' ? 'is-current' : ''} aria-current={view === 'employees' || view === 'invitations' ? 'page' : undefined} onClick={() => navigate('employees')}><Icon name="team" /><span>Team members</span></button><button type="button" className={view === 'goat' ? 'is-current' : ''} aria-current={view === 'goat' ? 'page' : undefined} onClick={() => navigate('goat')}><Icon name="trophy" /><span>GOAT</span></button></nav><div className="employee-sidebar__bottom"><p>Time to shit,<br /><span>we haven't eaten.</span></p><img className="employee-mascot" src="/brand/deathline-reaper-work.png" alt="The Grim Reaper sitting on a toilet and working on a laptop" /><span className="employee-sidebar__caption">FOCUS ON WHAT MATTERS.</span></div></aside>
    <div className="employee-workspace"><header className="employee-topbar">{view === 'goat' ? <div className="employee-topbar__label"><Icon name="trophy" />Team ranking</div> : <div className="employee-search"><Icon name="search" /><input type="search" aria-label="Search tasks and members" placeholder={view === 'invitations' ? "Search by email…" : view === 'employees' ? selectedWorkerId === null ? "Search members…" : "Search member tasks…" : "Search tasks, members…"} value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" className="employee-icon-button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" /></button>}</div>}<TeamSwitch /><AccountMenu /></header>
      <main className="employee-main admin-main">{statistics.error && <p className="connection-banner" role="alert">Statistics: {statistics.error}</p>}<div className="employee-heading"><div><p className="employee-eyebrow">CONTROL PANEL</p><h1>{view === 'invitations' ? "Invitations" : view === 'goat' ? 'GOAT' : view === 'tasks' ? "Team tasks" : view === 'employees' ? selectedWorkerId === null ? "Team members" : "Member profile" : "Admin dashboard"}<span>.</span></h1><p className="employee-heading__sub">{view === 'invitations' ? currentTeam.name ? `Personal links for team “${currentTeam.name}”.` : "Personal links for your team." : view === 'goat' ? "Top and lowest-rated members of the month. Your team's results." : view === 'tasks' ? "Tasks, deadlines, and assignments across your team." : view === 'employees' ? "Your team, their workload, and individual tasks." : "Your team, tasks, and deadlines at a glance."}</p></div><div className="employee-month"><Icon name="calendar" /><time dateTime={new Date(now).toLocaleDateString('sv-SE')}>{new Intl.DateTimeFormat('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now)}</time></div></div>
        {view === 'invitations' ? <AdminInvitations team={{ id: String(currentTeam.id), name: currentTeam.name }} memberEmails={workers.map(worker => worker.email)} now={now} query={query} onBack={() => navigate('employees')} /> : view === 'goat' ? <AdminGoat workers={workers} tasks={tasks} now={now} onOpenWorker={openWorker} /> : view === 'tasks' ? <AdminTasks workers={workers} tasks={tasks} now={now} query={query} onClearQuery={() => setQuery('')} layout={layout} onLayout={setLayout} editor={editor} onEditor={changeEditor} onOpen={id => setSelection({ kind: 'task', id })} onSave={saveTask} /> : view === 'employees' ? <><div className="invites-directory-action"><button type="button" className="employee-button employee-button--primary" onClick={() => navigate('invitations')}><Icon name="plus" />Invite to team</button></div>{selectedMember && !note.data ? <div className="connection-banner" role={note.error ? 'alert' : 'status'}>{note.error || "Loading private note…"}{note.error && <button onClick={() => void note.reload()}>Retry</button>}</div> : <AdminEmployees key={selectedWorkerId ?? 'directory'} workers={workers} tasks={tasks} now={now} query={query} workerId={selectedWorkerId} onSelect={openWorker} onBack={backToEmployees} onClearQuery={() => setQuery('')} onProfileSave={saveProfile} privateNote={note.data?.text || ""} onNoteSave={saveNote} onOpenTask={id => setSelection({ kind: 'task', id })} editor={editor} onEditor={changeEditor} onSaveTask={saveTask} chart={selectedMember ? <ProgressChart memberId={selectedMember.memberId} /> : undefined} />}</> : <><div className="admin-dashboard"><div className="admin-dashboard__primary"><div className="admin-stats" aria-label="Overall task statistics">{([{ filter: 'all', icon: 'tasks', caption: "Total tasks" }, { filter: 'completed', icon: 'check', caption: "Completed" }, { filter: 'overdue', icon: 'clock', caption: "Overdue" }] as const).map(item => <button type="button" className={`admin-stat admin-stat--${item.filter}`} key={item.filter} onClick={() => setSelection({ kind: 'tasks', filter: item.filter })} aria-label={`${item.caption}: ${counts[item.filter]}. Open list`}><Icon name={item.icon} /><span>{item.caption}</span><strong>{counts[item.filter]}</strong><small>{item.filter === 'all' ? "All time" : `${Math.round(counts[item.filter] / Math.max(1, counts.all) * 100)}% of all tasks`}</small></button>)}<button type="button" className="admin-stat admin-stat--team" onClick={() => navigate('employees')} aria-label={`Team members: ${workers.length}. Open list`}><Icon name="team" /><span>Team members</span><strong>{workers.length}</strong><small>{workers.filter(worker => workerMetrics(worker, tasks, now).open > 0).length} with open tasks</small></button></div><ProgressChart /></div>
          <section className="admin-panel admin-load" aria-labelledby="load-title"><div className="admin-panel__heading"><div><h2 id="load-title">Team workload</h2><p>Open tasks, including overdue ones</p></div><Icon name="chart" /></div><div className="admin-load__list">{load.map(item => <button type="button" key={item.worker.id} onClick={() => openWorker(item.worker.id)} className={item.open === maxLoad ? 'is-heaviest' : ''}><Avatar worker={item.worker} /><span className="admin-load__info"><span><strong>{item.worker.name}</strong><span>{item.open} {item.open === 1 ? "task" : "tasks"}</span></span><span className="admin-load__bar"><span style={{ width: `${item.open / maxLoad * 100}%` }} /></span></span><span className="admin-load__percent">{Math.round(item.open / maxLoad * 100)}%</span></button>)}</div>{!load.length && <p className="admin-empty">{workers.length ? "No matching employees." : "No team members yet. Invite colleagues from the Employees section."}</p>}{workers.length > 0 && <p className="admin-load__note">100% represents the highest workload in the team.</p>}</section>
        </div>
        <div className="admin-bottom-grid"><section className="admin-panel admin-workers" aria-labelledby="workers-title"><div className="admin-panel__heading"><h2 id="workers-title">Team members</h2><button type="button" className="admin-text-button" onClick={() => navigate('employees')}>All members<Icon name="arrow" /></button></div><div className="admin-table-wrap"><table><thead><tr><th>Team member</th><th>Completed</th><th>On time</th><th>Overdue</th><th>Rating</th></tr></thead><tbody>{team.map(worker => { const metrics = workerMetrics(worker, tasks, now); return <tr key={worker.id} className="admin-people-row" onClick={() => openWorker(worker.id)}><th scope="row"><button type="button" className="admin-person-button" aria-label={`Open profile: ${worker.name}`}><Avatar worker={worker} /><span><strong>{worker.name}</strong><small className="admin-member-meta"><MemberRoleBadge worker={worker} />{worker.role && <span>{worker.role}</span>}</small></span></button></th><td>{metrics.completed}</td><td>{metrics.onTime === null ? '—' : `${metrics.onTime}%`}</td><td className={metrics.overdue ? 'admin-late-count' : ''}>{metrics.overdue}</td><td><Rating value={worker.rating} /></td></tr>; })}</tbody></table></div>{!team.length && <p className="admin-empty">{workers.length ? "No matching employees. Try a different search." : "Colleagues who accept your invitations will appear here."}</p>}</section>
          <section className="admin-panel admin-deadlines" aria-labelledby="deadlines-title"><div className="admin-panel__heading"><h2 id="deadlines-title">Upcoming deadlines</h2><button type="button" className="admin-text-button" onClick={() => setSelection({ kind: 'tasks', filter: 'all' })}>All tasks<Icon name="arrow" /></button></div><div className="admin-deadlines__list">{deadlines.map((task, index) => <button type="button" key={task.id} className={index === 0 ? 'is-nearest' : ''} onClick={() => setSelection({ kind: 'task', id: task.id })}><span className="admin-deadlines__icon"><Icon name="clock" /></span><span className="admin-deadlines__task"><strong>{task.title}</strong><span>{workers.find(worker => worker.id === task.workerId)?.name}</span></span><span className="admin-deadlines__time">{clockText(task.deadline - now)}</span></button>)}</div>{!deadlines.length && <p className="admin-empty">{tasks.length ? "No upcoming deadlines match your search." : "Deadlines will appear after you create your first tasks."}</p>}</section></div>
        </>}<footer className="employee-footer"><span>DEATHLINE / ADMIN DASHBOARD</span></footer>
      </main></div>{selection && <AdminDialog selection={selection} workers={workers} tasks={tasks} now={now} onClose={() => setSelection(null)} onSelect={next => { if (next.kind === 'worker') openWorker(next.id); else if (next.kind === 'workers') navigate('employees'); else setSelection(next); }} onEdit={editFromDialog} />}
  </div>;
}
