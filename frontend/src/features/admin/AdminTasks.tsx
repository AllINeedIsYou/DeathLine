import { useTimedNotice } from '../../shared/useTimedNotice';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../employee/EmployeeScreen';
import { clockText, completionDelay, dateText, priorities, taskStatus, type Priority, type TaskStatus } from '../employee/tasks';
import { type Worker, type TeamTask } from './team';
import DeadlineField from './DeadlineField';
import './admin-tasks.css';

export type TaskLayout = 'table' | 'board';
export type TaskDraft = { title: string; description: string; workerId: number; priority: Priority; deadline: number };
type Status = TaskStatus | 'all';
const statusLabels: Record<Status, string> = { all: "All tasks", active: "In progress", completed: "Completed", overdue: "Overdue" };
const statuses: TaskStatus[] = ['active', 'completed', 'overdue'];
function WorkerName({ id, workers }: { id: number; workers: Worker[] }) {
  const worker = workers.find(item => item.id === id);
  if (!worker) return <span>Member #{id}</span>;
  return <span className="admin-task-worker"><span className={`admin-avatar admin-avatar--${worker.color}`} aria-hidden="true">{worker.initials}</span><span>{worker.name}</span></span>;
}
export function StatusTag({ task, now }: { task: TeamTask; now: number }) {
  const status = taskStatus(task, now);
  return <span className={`employee-tag ${completionDelay(task) > 0 ? 'admin-tag--completed-late' : `employee-tag--${status}`}`}>{completionDelay(task) > 0 ? "Completed late" : statusLabels[status]}</span>;
}
export function TaskOutcome({ task, now }: { task: TeamTask; now: number }) {
  const late = completionDelay(task);
  return <span className={`admin-task-outcome admin-task-outcome--${late > 0 ? 'late' : taskStatus(task, now)}`}><Icon name={task.completedAt !== null ? 'check' : 'clock'} /><span><strong>{task.completedAt !== null ? late > 0 ? `+${clockText(late)}` : "On time" : clockText(task.deadline - now)}</strong><small>{task.completedAt !== null ? late > 0 ? "Delay" : "Completed" : task.deadline <= now ? "Overdue by" : "Time left"}</small></span></span>;
}
function localDateValue(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function TaskEditor({ task, workers, initialWorkerId, onSave, onClose }: { task?: TeamTask; workers: Worker[]; initialWorkerId?: number; onSave: (draft: TaskDraft) => Promise<void>; onClose: () => void }) {
  const form = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [workerId, setWorkerId] = useState(task ? String(task.workerId) : initialWorkerId !== undefined ? String(initialWorkerId) : '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [deadline, setDeadline] = useState(localDateValue(task?.deadline ?? Date.now() + 4 * 3600000));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    form.current?.querySelector<HTMLInputElement>('[name="title"]')?.focus();
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  return <aside className="admin-panel admin-task-editor" aria-labelledby="editor-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className="admin-panel__heading"><h2 id="editor-title">{task ? "Edit task" : "New task"}</h2><button type="button" className="employee-icon-button" aria-label="Close task form" onClick={onClose}><Icon name="close" /></button></div>
    <form ref={form} onSubmit={async event => { event.preventDefault(); if (busy) return; const value = new Date(deadline).getTime(); if (!title.trim()) { setError("Enter a task title."); form.current?.querySelector<HTMLInputElement>('[name="title"]')?.focus(); return; } if (!Number.isFinite(value)) { setError("Enter the deadline date and time."); return; } if ((!task || deadline !== localDateValue(task.deadline)) && value <= Date.now()) { setError("The new deadline must be in the future."); return; } setError(''); setBusy(true); try { await onSave({ title: title.trim(), description: description.trim(), workerId: Number(workerId), priority, deadline: task && deadline === localDateValue(task.deadline) ? task.deadline : value }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the task."); } finally { setBusy(false); } }}>
      <label htmlFor="task-title">Task title</label><input id="task-title" name="title" required maxLength={120} placeholder="What needs to be done?" value={title} onChange={event => setTitle(event.target.value)} />
      <label htmlFor="task-description">Description</label><textarea id="task-description" maxLength={2000} rows={4} placeholder="Details and expected outcome…" value={description} onChange={event => setDescription(event.target.value)} />
      <label htmlFor="task-worker">Assignee</label><select id="task-worker" required value={workerId} onChange={event => setWorkerId(event.target.value)}><option value="" disabled>Select a team member</option>{workers.map(worker => <option value={worker.id} key={worker.id}>{worker.name}{worker.teamRole === 'admin' ? ' (Administrator)' : ''}</option>)}</select>
      <fieldset><legend>Priority</legend><div className="admin-task-editor__priorities">{(['high', 'medium', 'low'] as const).map(value => <label className={`admin-priority-choice admin-priority-choice--${value}${value === priority ? ' is-selected' : ''}`} key={value}><input type="radio" name="priority" value={value} checked={priority === value} onChange={() => setPriority(value)} /><span className="employee-tag__dot" />{priorities[value]}</label>)}</div></fieldset>
      <DeadlineField value={deadline} onChange={setDeadline} />
      {error && <p className="admin-task-editor__error" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="employee-button employee-button--primary">{task ? "Save changes" : "Create task"}</button>
      <button type="button" className="admin-task-editor__cancel" onClick={onClose}>Cancel</button>
    </form>
  </aside>;
}

type Props = { workers: Worker[]; tasks: TeamTask[]; now: number; query: string; onClearQuery: () => void; layout: TaskLayout; onLayout: (layout: TaskLayout) => void; editor: number | null | undefined; onEditor: (id: number | null | undefined) => void; onOpen: (id: number) => void; onSave: (draft: TaskDraft, id?: number) => Promise<number> };
export default function AdminTasks({ workers, tasks, now, query, onClearQuery, layout, onLayout, editor, onEditor, onOpen, onSave }: Props) {
  const [status, setStatus] = useState<Status>('all');
  const [worker, setWorker] = useState('all');
  const [priority, setPriority] = useState('all');
  const [period, setPeriod] = useState('all');
  const [sort, setSort] = useState('deadline');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useTimedNotice();
  const [savedId, setSavedId] = useState<number | null>(null);
  const results = useRef<HTMLDivElement>(null);
  const returnPosition = useRef<{ x: number; y: number; scrollers: { element: HTMLElement; left: number; top: number }[] } | null>(null);
  function openEditor(id: number | null) {
    returnPosition.current = { x: window.scrollX, y: window.scrollY, scrollers: Array.from(results.current?.querySelectorAll<HTMLElement>('.admin-task-table-wrap, .admin-task-board-wrap, .admin-board-column__list') ?? []).map(element => ({ element, left: element.scrollLeft, top: element.scrollTop })) };
    onEditor(id);
  }
  useLayoutEffect(() => {
    if (editor !== undefined || !returnPosition.current) return;
    const position = returnPosition.current;
    position.scrollers.forEach(({ element, left, top }) => { if (element.isConnected) element.scrollTo(left, top); });
    window.scrollTo(position.x, position.y);
    returnPosition.current = null;
  }, [editor]);
  useEffect(() => { setPage(1); }, [query, status, worker, priority, period, sort, pageSize]);
  const search = query.trim().toLocaleLowerCase('en-US');
  const today = new Date(now); const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const day = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset).getTime();
  const matchesBase = (task: TeamTask) => (worker === 'all' || task.workerId === Number(worker)) && (priority === 'all' || task.priority === priority) && (period === 'all' || (task.deadline >= (period === 'tomorrow' ? day(1) : start) && task.deadline < day(period === 'today' ? 1 : period === 'tomorrow' ? 2 : 7))) && `${task.title} ${task.description} ${task.id} ${workers.find(item => item.id === task.workerId)?.name}`.toLocaleLowerCase('en-US').includes(search);
  const base = tasks.filter(matchesBase);
  const counts = { all: base.length, active: base.filter(task => taskStatus(task, now) === 'active').length, completed: base.filter(task => taskStatus(task, now) === 'completed').length, overdue: base.filter(task => taskStatus(task, now) === 'overdue').length };
  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const visible = base.filter(task => status === 'all' || taskStatus(task, now) === status).sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title, 'ru') : sort === 'priority' ? rank[a.priority] - rank[b.priority] || a.deadline - b.deadline : sort === 'latest' ? b.deadline - a.deadline : a.deadline - b.deadline) || a.id - b.id);
  const pages = Math.max(1, Math.ceil(visible.length / pageSize)); const currentPage = Math.min(page, pages);
  const pageTasks = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const editingTask = editor === null || editor === undefined ? undefined : tasks.find(task => task.id === editor);
  function reset() { setStatus('all'); setWorker('all'); setPriority('all'); setPeriod('all'); setSort('deadline'); onClearQuery(); setPage(1); }
  async function save(draft: TaskDraft) {
    const id = await onSave(draft, editingTask?.id);
    setSavedId(id);
    if (editingTask) {
      const updated = { ...editingTask, ...draft };
      const staysVisible = matchesBase(updated) && (status === 'all' || taskStatus(updated, Date.now()) === status);
      setNotice(staysVisible ? "Changes saved." : "Changes saved. The task no longer matches the selected filters.");
    } else {
      setNotice("Task created."); reset(); setStatus(draft.deadline <= Date.now() ? 'overdue' : 'active');
    }
    onEditor(undefined);
  }
  const hasFilters = !!search || status !== 'all' || worker !== 'all' || priority !== 'all' || period !== 'all';
  return <section className="admin-tasks" aria-label="Task management">
    <div className="admin-tasks-actions"><p>{tasks.length} tasks in the team</p><div><div className="admin-view-switch" role="group" aria-label="Task view"><button type="button" aria-pressed={layout === 'table'} aria-label="Table" onClick={() => onLayout('table')}><Icon name="tasks" /><span>Table</span></button><button type="button" aria-pressed={layout === 'board'} aria-label="Board" onClick={() => onLayout('board')}><Icon name="columns" /><span>Board</span></button></div><button type="button" className="employee-button employee-button--primary admin-new-task" disabled={!workers.length} onClick={() => openEditor(null)}><Icon name="plus" />New task</button></div></div>
    <div className="employee-stats employee-stats--filters admin-tasks-status" aria-label="Filter tasks by status">{(['all', ...statuses] as Status[]).map(value => <button className={`employee-stat employee-stat--${value}${status === value ? ' is-selected' : ''}`} type="button" key={value} aria-pressed={status === value} aria-label={`${statusLabels[value]}: ${counts[value]}. Filter tasks`} onClick={() => setStatus(value)}><span className="employee-stat__icon"><Icon name={value === 'completed' ? 'check' : value === 'overdue' ? 'clock' : 'tasks'} /></span><span className="employee-stat__text"><strong>{counts[value]}</strong><span>{statusLabels[value]}</span></span><Icon name="arrow" /></button>)}</div>
    <div className="admin-panel admin-task-filters"><label>Employee<select aria-label="Filter by member" value={worker} onChange={event => setWorker(event.target.value)}><option value="all">All members</option>{workers.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Priority<select aria-label="Filter by priority" value={priority} onChange={event => setPriority(event.target.value)}><option value="all">All priorities</option>{Object.entries(priorities).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label><label>Deadline<select aria-label="Filter by deadline" value={period} onChange={event => setPeriod(event.target.value)}><option value="all">All deadlines</option><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="week">Next 7 days</option></select></label><label>Order<select aria-label="Sort tasks" value={sort} onChange={event => setSort(event.target.value)}><option value="deadline">Earliest deadline</option><option value="latest">Latest deadline</option><option value="title">Title A–Z</option><option value="priority">Highest priority</option></select></label><button type="button" className="employee-button" onClick={reset} disabled={!hasFilters && sort === 'deadline'}>Reset</button></div>
    <div className={`admin-task-layout${editor !== undefined ? ' has-editor' : ''}`}><div className="admin-task-layout__results" ref={results}><div className="admin-task-results-heading"><h2>{statusLabels[status]}</h2><span>{visible.length} of {tasks.length}</span></div>
      {visible.length === 0 ? <div className="admin-panel employee-empty"><Icon name="empty" /><h3>{tasks.length ? "No tasks found" : "No tasks yet"}</h3><p>{tasks.length ? "Try another search or reset the filters." : workers.length ? "Create the first task for a team member." : "First invite an employee from the Employees section."}</p>{hasFilters && <button className="employee-button" type="button" onClick={reset}>Reset filters</button>}</div> : layout === 'table' ? <><div className="admin-task-table-wrap"><table className="admin-task-table"><thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Deadline</th><th>Time left / result</th><th><span className="admin-visually-hidden">Actions</span></th></tr></thead><tbody>{pageTasks.map(task => <tr key={task.id} className={savedId === task.id ? 'is-saved' : ''}><th scope="row"><button className="admin-task-title" type="button" onClick={() => onOpen(task.id)}><small>#{task.id}</small><strong>{task.title}</strong></button></th><td><WorkerName id={task.workerId} workers={workers} /></td><td><span className={`employee-tag employee-tag--${task.priority}`}><span className="employee-tag__dot" />{priorities[task.priority]}</span></td><td><StatusTag task={task} now={now} /></td><td className="admin-task-table__date">{dateText(task.deadline)}</td><td><TaskOutcome task={task} now={now} /></td><td>{task.completedAt === null && <button type="button" className="employee-icon-button" aria-label={`Edit task #${task.id}`} onClick={() => openEditor(task.id)}><Icon name="edit" /></button>}</td></tr>)}</tbody></table></div><div className="admin-task-pagination"><span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, visible.length)} of {visible.length}</span><div><button type="button" className="employee-button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>←</button><span>{currentPage} / {pages}</span><button type="button" className="employee-button" aria-label="Next page" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>→</button></div><label><span className="admin-visually-hidden">Tasks per page</span><select aria-label="Tasks per page" value={pageSize} onChange={event => setPageSize(Number(event.target.value))}><option value={10}>10 per page</option><option value={20}>20 per page</option><option value={50}>50 per page</option></select></label></div></> : <><p className="admin-board-hint">Scroll the board horizontally to see all statuses.</p><div className="admin-task-board-wrap" tabIndex={0} aria-label="Task board, scroll horizontally"><div className="admin-task-board">{statuses.filter(value => status === 'all' || status === value).map(value => { const column = visible.filter(task => taskStatus(task, now) === value); return <section className={`admin-board-column admin-board-column--${value}`} key={value} aria-label={statusLabels[value]}><header><Icon name={value === 'completed' ? 'check' : value === 'overdue' ? 'clock' : 'tasks'} /><h3>{statusLabels[value]}</h3><span>{column.length}</span></header><div className="admin-board-column__list">{column.map(task => <article className={`admin-board-card${savedId === task.id ? ' is-saved' : ''}`} key={task.id}><div className="admin-board-card__top"><span>#{task.id}</span>{task.completedAt === null && <button type="button" className="employee-icon-button" aria-label={`Edit task #${task.id}`} onClick={() => openEditor(task.id)}><Icon name="edit" /></button>}</div><button type="button" className="admin-task-title" onClick={() => onOpen(task.id)}><strong>{task.title}</strong></button><p>{task.summary}</p><WorkerName id={task.workerId} workers={workers} /><div className="admin-board-card__tags"><span className={`employee-tag employee-tag--${task.priority}`}><span className="employee-tag__dot" />{priorities[task.priority]}</span>{completionDelay(task) > 0 && <StatusTag task={task} now={now} />}</div><div className="admin-board-card__time"><TaskOutcome task={task} now={now} /><span>{dateText(task.completedAt ?? task.deadline)}</span></div></article>)}{!column.length && <p className="admin-board-column__empty">No tasks</p>}</div></section>; })}</div></div></>}
    </div>{editor !== undefined && <TaskEditor key={editor ?? 'new'} task={editingTask} workers={workers} onClose={() => onEditor(undefined)} onSave={save} />}</div>
    {notice && <div className="employee-toast" role="status"><Icon name="check" /><p>{notice}</p><button type="button" className="employee-icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" /></button></div>}
  </section>;
}
