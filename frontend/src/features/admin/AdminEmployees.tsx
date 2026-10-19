import { useTimedNotice } from '../../shared/useTimedNotice';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../employee/EmployeeScreen';
import { dateText, priorities, taskStatus, type TaskStatus } from '../employee/tasks';
import { workerMetrics, type TeamTask, type Worker, type WorkerProfileDraft } from './team';
import { workerLocalTime } from './worker-time';
import PrivateWorkerNote from './PrivateWorkerNote';
import { StatusTag, TaskEditor, TaskOutcome, type TaskDraft } from './AdminTasks';
import './admin-employees.css';

type Filter = 'all' | TaskStatus;
const labels: Record<Filter, string> = { all: "All tasks", active: "In progress", completed: "Completed", overdue: "Overdue" };
function Avatar({ worker }: { worker: Worker }) { return <span className={`admin-avatar admin-avatar--${worker.color}`} aria-hidden="true">{worker.initials}</span>; }
function Rating({ worker }: { worker: Worker }) { return <strong className={`admin-rating${(worker.rating ?? -1) >= 85 ? ' admin-rating--top' : worker.rating !== null && worker.rating < 50 ? ' admin-rating--low' : ''}`}>{worker.rating === null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(worker.rating)}</strong>; }

export function MemberRoleBadge({ worker }: { worker: Worker }) {
  const label = worker.teamRole === 'admin' ? 'Administrator' : worker.teamRole === 'employee' ? 'Employee' : 'Team member';
  return <span className={`admin-member-role${worker.teamRole === 'admin' ? ' admin-member-role--admin' : ''}`}>{label}</span>;
}

function ProfileEditor({ worker, onSave, onClose }: { worker: Worker; onSave: (draft: WorkerProfileDraft) => Promise<void>; onClose: () => void }) {
  const [role, setRole] = useState(worker.role);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <aside className="admin-panel admin-task-editor admin-profile-editor"><div className="admin-panel__heading"><h2>Edit job title</h2><button className="employee-icon-button" type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div><form onSubmit={async event => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await onSave({ ...worker, role: role.trim() }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the job title."); } finally { setBusy(false); }
  }}><label htmlFor="worker-role">Job title</label><input autoFocus id="worker-role" maxLength={120} value={role} onChange={event => setRole(event.target.value)} /><p>Members edit their own name and contact details. Leave this field empty to clear the job title.</p>{error && <p role="alert" className="admin-task-editor__error">{error}</p>}<button className="employee-button employee-button--primary" disabled={busy}>Save job title</button></form></aside>;
}

type Props = { workers: Worker[]; tasks: TeamTask[]; now: number; query: string; workerId: number | null; chart?: ReactNode; privateNote: string; onNoteSave: (value: string) => Promise<void>; onSelect: (id: number) => void; onBack: () => void; onClearQuery: () => void; onProfileSave: (id: number, draft: WorkerProfileDraft) => Promise<void>; onOpenTask: (id: number) => void; editor: number | null | undefined; onEditor: (id: number | null | undefined) => void; onSaveTask: (draft: TaskDraft, id?: number) => Promise<number> };
export default function AdminEmployees({ workers, tasks, now, query, workerId, chart, privateNote, onNoteSave, onSelect, onBack, onClearQuery, onProfileSave, onOpenTask, editor, onEditor, onSaveTask }: Props) {
  const [profileEditing, setProfileEditing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [notice, setNotice] = useTimedNotice();
  const [savedId, setSavedId] = useState<number | null>(null);
  useEffect(() => { if (editor !== undefined) setProfileEditing(false); }, [editor]);
  const search = query.trim().toLocaleLowerCase('en-US');
  const worker = workers.find(item => item.id === workerId);
  const localTime = worker && workerLocalTime(worker.timeZone, now);
  const found = workers.filter(item => `${item.name} ${item.role}`.toLocaleLowerCase('en-US').includes(search));
  const assigned = worker ? tasks.filter(task => task.workerId === worker.id) : [];
  const metrics = worker && workerMetrics(worker, tasks, now);
  const counts = { all: assigned.length, active: assigned.filter(task => taskStatus(task, now) === 'active').length, completed: assigned.filter(task => taskStatus(task, now) === 'completed').length, overdue: assigned.filter(task => taskStatus(task, now) === 'overdue').length };
  const visible = assigned.filter(task => (filter === 'all' || taskStatus(task, now) === filter) && `${task.id} ${task.title} ${task.description} ${worker?.name} ${worker?.role}`.toLocaleLowerCase('en-US').includes(search)).sort((a, b) => Number(a.completedAt !== null) - Number(b.completedAt !== null) || a.deadline - b.deadline || a.id - b.id);
  const nearest = assigned.filter(task => taskStatus(task, now) === 'active').sort((a, b) => a.deadline - b.deadline)[0];
  const editingTask = typeof editor === 'number' ? tasks.find(task => task.id === editor) : undefined;
  const editing = profileEditing || editor !== undefined;
  async function saveTask(draft: TaskDraft) {
    const id = await onSaveTask(draft, editingTask?.id);
    setSavedId(id);
    let message = editingTask ? "Changes saved." : "Task assigned.";
    if (draft.workerId !== workerId) message += " The assignee has changed. The task is available in their profile.";
    else if (!editingTask) { setFilter('active'); onClearQuery(); }
    else {
      const updated = { ...editingTask, ...draft };
      if ((filter !== 'all' && taskStatus(updated, Date.now()) !== filter) || !`${updated.id} ${updated.title} ${updated.description} ${worker?.name} ${worker?.role}`.toLocaleLowerCase('en-US').includes(search)) message += " The task no longer matches the selected filters.";
    }
    setNotice(message);
    onEditor(undefined);
  }
  return <section className="admin-people admin-tasks" aria-label={worker ? "Member profile" : "Team directory"}>
    {!worker ? <>
      <div className="admin-people-summary"><div><Icon name="team" /><span>Team members<strong>{workers.length}</strong></span></div><div><Icon name="tasks" /><span>Open tasks<strong>{tasks.filter(task => task.completedAt === null).length}</strong></span></div><div><Icon name="check" /><span>Completed tasks<strong>{tasks.filter(task => task.completedAt !== null).length}</strong></span></div></div>
      <div className="admin-panel admin-people-directory"><div className="admin-panel__heading"><h2>Team</h2><span>{found.length} of {workers.length}</span></div>
        {found.length ? <div className="admin-people-table-wrap"><table className="admin-people-table"><thead><tr><th>Team member</th><th>In progress</th><th>Completed</th><th>Overdue</th><th>On time</th><th>Rating</th><th><span className="admin-visually-hidden">Open profile</span></th></tr></thead><tbody>{found.map(item => { const data = workerMetrics(item, tasks, now); return <tr key={item.id} className="admin-people-row" onClick={() => onSelect(item.id)}><th scope="row"><button className="admin-person-button" type="button" aria-label={`Open profile: ${item.name}`}><Avatar worker={item} /><span><strong>{item.name}</strong><small className="admin-member-meta"><MemberRoleBadge worker={item} />{item.role && <span>{item.role}</span>}</small></span></button></th><td>{data.open - data.overdue}</td><td className="admin-people-done">{data.completed}</td><td className={data.overdue ? 'admin-late-count' : ''}>{data.overdue}</td><td>{data.onTime === null ? '—' : `${data.onTime}%`}</td><td><Rating worker={item} /></td><td><span className="admin-people-row__arrow"><Icon name="arrow" /></span></td></tr>; })}</tbody></table></div> : <div className="employee-empty"><Icon name="empty" /><h3>{workers.length ? "No matching members" : "No team members yet"}</h3><p>{workers.length ? "Try a different name or job title." : "Invite a colleague using the button above."}</p>{workers.length > 0 && <button className="employee-button" type="button" onClick={onClearQuery}>Clear search</button>}</div>}
      </div>
    </> : metrics && <>
      <button className="admin-text-button admin-people-back" type="button" onClick={onBack}><Icon name="arrow" />Team members<span>/ {worker.name}</span></button>
      <div className="admin-panel admin-people-hero"><Avatar worker={worker} /><div className="admin-people-hero__name"><p>{worker.teamRole === 'admin' ? 'ADMINISTRATOR' : 'TEAM MEMBER'} #{worker.memberId}</p><h2>{worker.name}</h2><span className="admin-member-meta"><MemberRoleBadge worker={worker} />{worker.role && <span>{worker.role}</span>}</span></div><div className="admin-people-hero__actions"><button type="button" className="employee-button" onClick={() => { onEditor(undefined); setProfileEditing(true); }}><Icon name="edit" />Edit profile</button><button type="button" className="employee-button employee-button--primary" onClick={() => { setProfileEditing(false); onEditor(null); }}><Icon name="plus" />Assign task</button></div></div>
      <section className="admin-panel admin-person-contacts" aria-label="Member contacts and local time"><dl>
        <div><dt>Email</dt><dd className={!worker.email ? 'is-empty' : ''}>{worker.email || "Not provided"}</dd></div>
        <div><dt>Telegram</dt><dd className={!worker.telegram ? 'is-empty' : ''}>{worker.telegram || "Not provided"}</dd></div>
        <div><dt>Phone</dt><dd className={!worker.phone ? 'is-empty' : ''}>{worker.phone || "Not provided"}</dd></div>
        {localTime && <div className="admin-person-contacts__time"><dt><Icon name="clock" />Local time</dt><dd><time dateTime={new Date(now).toISOString()} aria-live="off">{localTime.time}</time><span>{localTime.city} · {localTime.offset}</span><small>{localTime.date}</small></dd></div>}
      </dl></section>
      <div className="employee-stats employee-stats--filters admin-tasks-status admin-people-stats" aria-label="Member statistics and task filters">{(['all', 'active', 'completed', 'overdue'] as Filter[]).map(status => <button type="button" key={status} className={`employee-stat employee-stat--${status}${filter === status ? ' is-selected' : ''}`} aria-label={`${labels[status]}: ${counts[status]}. Member tasks`} aria-pressed={filter === status} onClick={() => setFilter(status)}><span className="employee-stat__icon"><Icon name={status === 'completed' ? 'check' : status === 'overdue' ? 'clock' : 'tasks'} /></span><span className="employee-stat__text"><strong>{counts[status]}</strong><span>{labels[status]}</span></span><Icon name="arrow" /></button>)}</div>
      <div className={`admin-people-grid${editing ? ' has-editor' : ''}`}><div className="admin-people-primary">{chart}
        <PrivateWorkerNote value={privateNote} onSave={async value => { await onNoteSave(value); setNotice(value ? "Private note saved." : "Private note cleared."); }} />
        <section className="admin-people-tasks" aria-labelledby="worker-tasks-title"><div className="admin-task-results-heading"><h2 id="worker-tasks-title">Member tasks</h2><span>{visible.length} of {assigned.length}</span></div>
          {visible.length ? <div className="admin-task-table-wrap"><table className="admin-task-table"><thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Deadline</th><th>Time left / result</th></tr></thead><tbody>{visible.map(task => <tr key={task.id} className={savedId === task.id ? 'is-saved' : ''}><th scope="row"><button className="admin-task-title" type="button" onClick={() => onOpenTask(task.id)}><small>#{task.id}</small><strong>{task.title}</strong></button></th><td><span className={`employee-tag employee-tag--${task.priority}`}><span className="employee-tag__dot" />{priorities[task.priority]}</span></td><td><StatusTag task={task} now={now} /></td><td className="admin-task-table__date">{dateText(task.deadline)}</td><td><TaskOutcome task={task} now={now} /></td></tr>)}</tbody></table></div> : <div className="admin-panel employee-empty"><Icon name="empty" /><h3>No tasks found</h3><p>{assigned.length ? "Try a different status or search term." : "Assign this member their first task."}</p>{assigned.length > 0 && <button type="button" className="employee-button" onClick={() => { setFilter('all'); onClearQuery(); }}>Reset filters</button>}</div>}
        </section>
      </div><div className="admin-people-side">
        {profileEditing ? <ProfileEditor worker={worker} onClose={() => setProfileEditing(false)} onSave={async draft => { await onProfileSave(worker.id, draft); setProfileEditing(false); setNotice("Profile updated."); }} /> : editor !== undefined ? <TaskEditor key={editor ?? 'new'} task={editingTask} workers={workers} initialWorkerId={worker.id} onClose={() => onEditor(undefined)} onSave={saveTask} /> : <>
          <section className="admin-panel admin-person-load" aria-labelledby="worker-load-title"><div className="admin-panel__heading"><h2 id="worker-load-title">Current workload</h2><Icon name="clock" /></div><div className="admin-person-load__ring" role="img" aria-label={`${counts.active} in progress, ${counts.overdue} overdue, ${metrics.open} open in total`} style={{ background: metrics.open ? `conic-gradient(#00c8ff 0 ${counts.active / metrics.open * 100}%, #ff4965 ${counts.active / metrics.open * 100}% 100%)` : '#153452' }}><div><strong>{metrics.open}</strong><span>open tasks</span></div></div><dl><div><dt><i />In progress</dt><dd>{counts.active}</dd></div><div><dt><i />Overdue</dt><dd>{counts.overdue}</dd></div><div><dt>Completed on time</dt><dd>{metrics.onTime === null ? '—' : `${metrics.onTime}%`}</dd></div></dl></section>
          <section className="admin-panel admin-person-rating"><div><Icon name="trophy" /><h2>Monthly rating</h2></div><Rating worker={worker} /><p>Current member rating</p></section>
          {nearest && <section className="admin-panel admin-person-nearest"><p>NEXT DEADLINE</p><button className="admin-task-title" type="button" onClick={() => onOpenTask(nearest.id)}><strong>{nearest.title}</strong></button><TaskOutcome task={nearest} now={now} /><span>{dateText(nearest.deadline)}</span></section>}
        </>}
      </div></div>
    </>}
    {notice && <div className="employee-toast" role="status"><Icon name="check" /><p>{notice}</p><button className="employee-icon-button" type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" /></button></div>}
  </section>;
}
