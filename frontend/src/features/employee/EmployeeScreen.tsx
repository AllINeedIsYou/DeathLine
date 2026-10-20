import { useTimedNotice } from '../../shared/useTimedNotice';
import { useEffect, useRef, useState } from 'react';
import { clockText, dateText, priorities, taskStatus, type Priority, type Task, type TaskStatus } from './tasks';
import './employee.css';
import { useTeamData } from '../data/team-data';
import { useSession } from '../../shared/session';
import AccountMenu, { TeamSwitch } from '../../shared/AccountMenu';
import EmployeeGoat from './EmployeeGoat';

type IconName = 'home' | 'tasks' | 'search' | 'clock' | 'check' | 'arrow' | 'calendar' | 'bolt' | 'close' | 'exit' | 'empty' | 'trophy' | 'chevron' | 'team' | 'chart' | 'plus' | 'edit' | 'columns';
const iconPaths: Record<IconName, string> = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  tasks: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  search: 'M21 21l-5-5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0',
  clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  check: 'm8 12 3 3 5-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  calendar: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01',
  bolt: 'm13 2-9 12h7l-1 8 10-12h-7z',
  close: 'm6 6 12 12M6 18 18 6',
  exit: 'M10 4H4v16h6M10 12h11m-4-4 4 4-4 4',
  empty: 'M4 5h16l2 13H2zM3 12h5l2 3h4l2-3h5',
  trophy: 'M8 3h8v5a4 4 0 0 1-8 0V3zM8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 12v6M8 21h8M9 18h6v3',
  chevron: 'm8 10 4 4 4-4',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 7M22 21v-2a4 4 0 0 0-3-4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20V7',
  plus: 'M12 5v14M5 12h14',
  edit: 'm15 4 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 16v5z',
  columns: 'M3 4h18v16H3zM9 4v16M15 4v16',
};
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`employee-icon ${className}`} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]} /></svg>;
}

const statusLabels: Record<TaskStatus, string> = { active: "In progress", completed: "Completed", overdue: "Overdue" };

function PriorityTag({ priority }: { priority: Priority }) {
  return <span className={`employee-tag employee-tag--${priority}`}><span className="employee-tag__dot" />{priorities[priority]}</span>;
}

function TaskTime({ task, now, large = false }: { task: Task; now: number; large?: boolean }) {
  const status = taskStatus(task, now);
  const finished = task.completedAt !== null;
  const remaining = task.deadline - (task.completedAt ?? now);
  return <div className={`employee-task-time employee-task-time--${status}${large ? ' employee-task-time--large' : ''}`}>
    <span className="employee-task-time__caption">{finished ? (remaining >= 0 ? "Time saved at completion" : "Completed late") : status === 'overdue' ? "Deadline overdue by" : "Time until deadline"}</span>
    <strong className="employee-task-time__digits" aria-live="off"><Icon name={finished ? 'check' : 'clock'} />{clockText(remaining)}</strong>
    <span className="employee-task-time__date"><Icon name="calendar" />{dateText(task.completedAt ?? task.deadline)}</span>
  </div>;
}

function TaskDialog({ task, now, onClose, onComplete }: { task: Task; now: number; onClose: () => void; onComplete: (id: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  const status = taskStatus(task, now);
  return <dialog className="employee-dialog" ref={dialog} onCancel={onClose} aria-labelledby="task-dialog-title" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="employee-dialog__content">
      <div className="employee-dialog__top"><span>TASK #DL-{task.id}</span><button className="employee-icon-button" type="button" onClick={onClose} aria-label="Close task" autoFocus><Icon name="close" /></button></div>
      <h2 id="task-dialog-title">{task.title}</h2>
      <div className="employee-dialog__tags"><PriorityTag priority={task.priority} /><span className={`employee-tag employee-tag--${status}`}>{statusLabels[status]}</span><span className="employee-tag">{task.category}</span></div>
      <p className="employee-dialog__description">{task.description}</p>
      <div className="employee-dialog__time"><TaskTime task={task} now={now} large /></div>
      {task.completedAt !== null ? <p className="employee-dialog__done"><Icon name="check" />Completed {dateText(task.completedAt)}. The countdown has stopped.</p> : <button className="employee-button employee-button--primary" type="button" onClick={() => onComplete(task.id)}><Icon name="check" />Mark as completed</button>}
    </div>
  </dialog>;
}

type EmployeeView = 'overview' | 'tasks' | 'goats';
type StatusFilter = TaskStatus | 'all';

export default function EmployeeScreen() {
  const { tasks, completeTask: complete, statistics } = useTeamData();
  const session = useSession();
  const membership = { name: session.user!.name, workerId: session.user!.id, team: session.team! };
  const [completing, setCompleting] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const [view, setView] = useState<EmployeeView>('overview');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notice, setNotice] = useTimedNotice();

  useEffect(() => {
    const previousTitle = document.title;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearInterval(interval); document.title = previousTitle; };
  }, []);
  useEffect(() => { document.title = `${view === 'goats' ? 'GOAT' : view === 'tasks' ? "All tasks" : "My deadlines"} · DeathLine`; }, [view]);

  const counts = statistics.data || tasks.reduce((result, task) => { result[taskStatus(task, now)] += 1; return result; }, { active: 0, completed: 0, overdue: 0 });
  const openTasks = tasks.filter(task => task.completedAt === null).sort((a, b) => a.deadline - b.deadline);
  const nearest = openTasks.find(task => task.deadline > now);
  const searchText = query.trim().toLocaleLowerCase('en-US');
  const matchesQuery = (task: Task) => `${task.title} ${task.summary} ${task.category} DL-${task.id}`.toLocaleLowerCase('en-US').includes(searchText);
  const eligible = tasks.filter(task => view === 'overview' ? task.completedAt === null && task.id !== nearest?.id : statusFilter === 'all' || taskStatus(task, now) === statusFilter);
  const searched = eligible.filter(matchesQuery);
  const visibleTasks = searched.filter(task => view !== 'tasks' || priorityFilter === 'all' || task.priority === priorityFilter).sort((a, b) => a.deadline - b.deadline);
  const selected = tasks.find(task => task.id === selectedId);
  const stats: StatusFilter[] = view === 'tasks' ? ['all', 'active', 'completed', 'overdue'] : ['active', 'completed', 'overdue'];

  async function completeTask(id: number) {
    if (completing !== null) return;
    setCompleting(id);
    try {
      await complete(id);
      setNotice("Task completed.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Could not complete the task."); } finally { setCompleting(null); }
  }
  function navigate(nextView: EmployeeView) {
    setView(nextView); setStatusFilter('all'); setPriorityFilter('all'); setQuery('');
  }
  function showStatus(status: StatusFilter) {
    setView('tasks'); setStatusFilter(status); setPriorityFilter('all'); setQuery('');
  }

  return <div className="employee-page">
    <aside className="employee-sidebar" aria-label="Sidebar">
      <button type="button" className="employee-brand" aria-label="DeathLine — home" onClick={() => { navigate('overview'); window.scrollTo(0, 0); }}><span className="employee-brand__mark"><img src="/brand/deathline-logo.png" alt="" /></span><span>Death<b>Line</b></span></button>
      <nav className="employee-nav" aria-label="Employee navigation">
        {([{ id: 'overview', title: "Home", icon: 'home' }, { id: 'tasks', title: "My tasks", icon: 'tasks' }, { id: 'goats', title: 'GOAT', icon: 'trophy' }] as const).map(item => <button type="button" key={item.id} className={view === item.id ? 'is-current' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.title}</span>{item.id === 'tasks' && <span className="employee-nav__count">{counts.active + counts.overdue}</span>}</button>)}
      </nav>
      <div className="employee-sidebar__bottom"><p>Time to shit,<br /><span>we haven't eaten.</span></p><img className="employee-mascot" src="/brand/deathline-reaper-work.png" alt="The Grim Reaper sitting on a toilet and working on a laptop" /><span className="employee-sidebar__caption">FOCUS ON WHAT MATTERS.</span></div>
    </aside>

    <div className="employee-workspace">
      <header className="employee-topbar">
        {view !== 'goats' ? <div className="employee-search"><Icon name="search" /><input type="search" aria-label="Search tasks" placeholder="Search tasks…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button className="employee-icon-button" type="button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" /></button>}</div> : <div className="employee-topbar__label"><Icon name="trophy" />Team ranking</div>}
        <TeamSwitch /><AccountMenu />
      </header>

      <main className="employee-main">{statistics.error && <p className="connection-banner" role="alert">Statistics: {statistics.error}</p>}
        <div className="employee-heading"><div><p className="employee-eyebrow">YOUR ACCOUNT{membership?.team.name ? ` / ${membership.team.name}` : ''}</p><h1>{view === 'goats' ? 'GOAT' : "My tasks"}<span>.</span></h1><p className="employee-heading__sub">{view === 'goats' ? "Top employee of the month and your personal result." : view === 'overview' ? !tasks.length ? "Your tasks and deadlines will appear here." : "Your next deadline takes center stage. The rest are ordered by time." : "All tasks, statuses, and deadlines in one place."}</p></div><div className="employee-month"><Icon name="calendar" /><time dateTime={`${new Date(now).getFullYear()}-${String(new Date(now).getMonth() + 1).padStart(2, '0')}-${String(new Date(now).getDate()).padStart(2, '0')}`}>{new Intl.DateTimeFormat('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now)}</time></div></div>

        {view === 'goats' ? <EmployeeGoat /> : <>
          <div className={`employee-stats${view === 'tasks' ? ' employee-stats--filters' : ''}`} aria-label={view === 'tasks' ? "Filter by status" : "Task statistics"}>
            {stats.map(status => { const label = status === 'all' ? "All tasks" : statusLabels[status]; const count = status === 'all' ? tasks.length : counts[status]; return <button className={`employee-stat employee-stat--${status}${view === 'tasks' && statusFilter === status ? ' is-selected' : ''}`} type="button" key={status} onClick={() => showStatus(status)} aria-pressed={view === 'tasks' ? statusFilter === status : undefined} aria-label={`${label}: ${count}. Show tasks`}><span className="employee-stat__icon"><Icon name={status === 'completed' ? 'check' : status === 'overdue' ? 'clock' : 'tasks'} /></span><span className="employee-stat__text"><strong>{count}</strong><span>{label}</span></span><Icon name="arrow" /></button>; })}
          </div>

          {view === 'overview' && nearest && matchesQuery(nearest) && <section className="employee-focus" aria-labelledby="nearest-title">
            <div className="employee-section-title"><Icon name="bolt" /><h2 id="nearest-title">Next deadline</h2><span>#DL-{nearest.id}</span></div>
            <div className="employee-focus__body"><div className="employee-focus__task"><span className="employee-focus__document"><Icon name="tasks" /></span><div><h3>{nearest.title}</h3><p>{nearest.summary}</p><div className="employee-focus__tags"><PriorityTag priority={nearest.priority} /><span className="employee-tag">{nearest.category}</span></div></div></div><TaskTime task={nearest} now={now} large /><div className="employee-focus__actions"><button type="button" className="employee-button employee-button--primary" onClick={() => setSelectedId(nearest.id)}><Icon name="arrow" />Open task</button><button type="button" className="employee-button" disabled={completing !== null} onClick={() => void completeTask(nearest.id)}><Icon name="check" />Mark as completed</button></div></div>
          </section>}

          <section className="employee-task-section" aria-labelledby="tasks-title">
            <div className="employee-task-section__heading"><div className="employee-section-title"><Icon name={view === 'overview' ? 'clock' : 'tasks'} /><h2 id="tasks-title">{view === 'overview' && tasks.length ? "Other deadlines" : "All tasks"}</h2></div><span className="employee-result-count">{visibleTasks.length} of {eligible.length}</span></div>
            {view === 'tasks' && <div className="employee-priority-filters" aria-label="Filter by priority">
              <button type="button" aria-pressed={priorityFilter === 'all'} className={priorityFilter === 'all' ? 'is-selected' : ''} onClick={() => setPriorityFilter('all')}>All priorities<span>{searched.length}</span></button>
              {(['high', 'medium', 'low'] as const).map(priority => <button type="button" key={priority} aria-pressed={priorityFilter === priority} className={`employee-priority-filter--${priority}${priorityFilter === priority ? ' is-selected' : ''}`} onClick={() => setPriorityFilter(priority)}><span className="employee-tag__dot" />{priorities[priority]}<span>{searched.filter(task => task.priority === priority).length}</span></button>)}
            </div>}

            <div className="employee-task-list">
              {visibleTasks.map(task => { const status = taskStatus(task, now); return <article className={`employee-task-row employee-task-row--${status}`} key={task.id} data-deadline={task.deadline}>
                <div className="employee-task-row__info"><span className="employee-task-row__id">#DL-{task.id}</span><h3><button type="button" onClick={() => setSelectedId(task.id)}>{task.title}</button></h3><p>{task.summary}</p><div className="employee-task-row__tags"><PriorityTag priority={task.priority} /><span className={`employee-tag employee-tag--${status}`}>{statusLabels[status]}</span></div></div>
                <TaskTime task={task} now={now} />
                <div className="employee-task-row__actions"><button type="button" className="employee-button" onClick={() => setSelectedId(task.id)} aria-label={`Open task “${task.title}”`}>Open<Icon name="arrow" /></button>{task.completedAt === null && <button type="button" className="employee-complete" disabled={completing !== null} onClick={() => void completeTask(task.id)} aria-label={`Complete task “${task.title}”`}><Icon name="check" />Complete</button>}</div>
              </article>; })}
              {!visibleTasks.length && <div className="employee-empty"><Icon name="empty" /><h3>{!tasks.length ? "No tasks yet" : query.trim() ? "No results for your search" : "No tasks in this group"}</h3><p>{!tasks.length ? "When an administrator assigns your first task, its details and deadline will appear here." : query.trim() ? "Try a different title or reset the filters." : view === 'overview' ? nearest ? "No other deadlines yet." : "All deadlines are cleared." : "Try tasks with a different status or priority."}</p>{(tasks.length > 0) && (query || priorityFilter !== 'all' || statusFilter !== 'all') && <button className="employee-button" type="button" onClick={() => { setQuery(''); setPriorityFilter('all'); setStatusFilter('all'); }}>Reset filters</button>}</div>}
            </div>
          </section>
        </>}
        <footer className="employee-footer"><span>DEATHLINE / YOUR ACCOUNT</span></footer>
      </main>
    </div>
    {notice && <div className="employee-toast" role="status"><Icon name="check" /><p>{notice}</p><button type="button" className="employee-icon-button" onClick={() => setNotice('')} aria-label="Dismiss notification"><Icon name="close" /></button></div>}
    {selected && <TaskDialog task={selected} now={now} onClose={() => setSelectedId(null)} onComplete={completeTask} />}
  </div>;
}
