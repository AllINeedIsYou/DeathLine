import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon, ProfileMenu } from '../employee/EmployeeScreen';
import { clockText, completionDelay, dateText, taskStatus } from '../employee/tasks';
import { monthlyHistory, workerMetrics, type TeamTask, type Worker, type WorkerProfileDraft } from './team';
import './admin.css';
import { saveTaskData, saveProfileData, savePrivateNote, useTeamData } from '../data/team-data';
import AdminTasks, { type TaskDraft, type TaskLayout } from './AdminTasks';
import AdminEmployees from './AdminEmployees';
import AdminGoat from './AdminGoat';
import AdminInvitations from './AdminInvitations';
import { defaultTeam, useInvitations } from '../auth/invitations';

type View = 'overview' | 'tasks' | 'employees' | 'goat' | 'invitations';
type Filter = 'all' | 'active' | 'completed' | 'overdue';
type Selection = { kind: 'tasks'; filter: Filter } | { kind: 'workers' } | { kind: 'worker'; id: number } | { kind: 'task'; id: number };
const labels: Record<Filter, string> = { all: 'Все задачи', active: 'В работе', completed: 'Выполнено', overdue: 'Просрочено' };
function Avatar({ worker }: { worker: Worker }) { return <span className={`admin-avatar admin-avatar--${worker.color}`} aria-hidden="true">{worker.initials}</span>; }
function Rating({ value }: { value: number }) { return <strong className={`admin-rating${value >= 85 ? ' admin-rating--top' : value < 50 ? ' admin-rating--low' : ''}`}>{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)}</strong>; }

function ProgressChart({ tasks, now, scope = 'Вся команда · с начала месяца' }: { tasks: TeamTask[]; now: number; scope?: string }) {
  const history = monthlyHistory(tasks, now);
  const plot = useRef<SVGSVGElement>(null);
  const [plotWidth, setPlotWidth] = useState(742);
  useEffect(() => {
    const element = plot.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setPlotWidth(Math.max(240, element.clientWidth)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [visible, setVisible] = useState({ completed: true, overdue: true, created: true });
  const series = [{ key: 'completed', title: 'Выполнено', color: '#00c8ff' }, { key: 'overdue', title: 'Просрочено', color: '#ff4965' }, { key: 'created', title: 'Создано', color: '#97afd6' }] as const;
  const anyVisible = Object.values(visible).some(Boolean);
  const max = Math.max(10, Math.ceil(tasks.length / 10) * 10);
  const left = 32, right = plotWidth - 16, top = 12, bottom = 185;
  const x = (index: number) => history.length === 1 ? right : left + index / (history.length - 1) * (right - left);
  const y = (value: number) => bottom - value / max * (bottom - top);
  const selectedIndex = Math.min(selectedDay ?? history.length - 1, history.length - 1);
  const point = history[selectedIndex];
  const tickEvery = Math.max(1, Math.ceil(history.length / (plotWidth < 400 ? 4 : 6)));
  return <section className="admin-panel admin-chart" aria-labelledby="progress-title">
    <div className="admin-panel__heading admin-chart__heading"><div><h2 id="progress-title">Выполнение задач</h2><p>{scope}</p></div><div className="admin-chart__legend" aria-label="Ряды графика">{series.map(item => <button type="button" key={item.key} aria-pressed={visible[item.key]} onClick={() => setVisible(current => ({ ...current, [item.key]: !current[item.key] }))}><span style={{ background: item.color }} />{item.title}</button>)}</div></div>
    <div className="admin-chart__readout" aria-live="polite"><span>{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(new Date(now).getFullYear(), new Date(now).getMonth(), point.day))}</span>{series.filter(item => visible[item.key]).map(item => <span key={item.key}><i style={{ background: item.color }} />{item.title}: <strong>{point[item.key]}</strong></span>)}{!anyVisible && <span>Выбери показатели над графиком</span>}</div>
    <svg className="admin-chart__plot" ref={plot} viewBox={`0 0 ${plotWidth} 220`} role="group" aria-label="График задач по дням текущего месяца">
      <defs><linearGradient id="admin-completed-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#00c8ff" stopOpacity=".23" /><stop offset="1" stopColor="#00c8ff" stopOpacity=".015" /></linearGradient><linearGradient id="admin-overdue-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#ff4965" stopOpacity=".18" /><stop offset="1" stopColor="#ff4965" stopOpacity=".01" /></linearGradient></defs>
      {Array.from({ length: 6 }, (_, index) => max / 5 * index).map(value => <g key={value} aria-hidden="true"><line x1={left} x2={right} y1={y(value)} y2={y(value)} className="admin-chart__grid" /><text x="23" y={y(value) + 4} textAnchor="end">{value}</text></g>)}
      {history.map((item, index) => (index % tickEvery === 0 || index === history.length - 1) && <g key={item.day} aria-hidden="true"><line x1={x(index)} x2={x(index)} y1={top} y2={bottom} className="admin-chart__grid" /><text x={x(index)} y="210" textAnchor="middle">{item.day}</text></g>)}
      {series.filter(item => visible[item.key]).map(item => { const points = history.map((entry, index) => `${x(index)},${y(entry[item.key])}`).join(' '); return <g key={item.key} aria-hidden="true">{item.key !== 'created' && <polygon points={`${left},${bottom} ${points} ${right},${bottom}`} fill={`url(#admin-${item.key}-fill)`} />}<polyline points={points} fill="none" stroke={item.color} strokeWidth={item.key === 'created' ? 1.5 : 2.5} strokeDasharray={item.key === 'created' ? '5 7' : undefined} strokeLinejoin="round" strokeLinecap="round" /></g>; })}
      {anyVisible && <line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={top} y2={bottom} stroke="#7da8cb" strokeOpacity=".3" strokeDasharray="3 5" aria-hidden="true" />}
      {anyVisible && history.map((entry, index) => <g key={entry.day} role="button" tabIndex={0} aria-label={`${entry.day} число: создано ${entry.created}, выполнено ${entry.completed}, просрочено ${entry.overdue}`} onMouseEnter={() => setSelectedDay(index)} onFocus={() => setSelectedDay(index)} onClick={() => setSelectedDay(index)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedDay(index); } }}><rect x={x(index) - Math.min(22, (right - left) / history.length / 2)} y={top} width={Math.min(44, (right - left) / history.length)} height={bottom - top} fill="transparent" /><circle cx={x(index)} cy={y(visible.completed ? entry.completed : visible.created ? entry.created : entry.overdue)} r={selectedIndex === index ? 4 : 2.5} fill={visible.completed ? '#5ddfff' : visible.created ? '#a7bfe2' : '#ff4965'} /></g>)}
    </svg>
  </section>;
}

function AdminDialog({ selection, workers, tasks, now, onClose, onSelect, onEdit }: { selection: Selection; workers: Worker[]; tasks: TeamTask[]; now: number; onClose: () => void; onSelect: (selection: Selection) => void; onEdit: (id: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
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
  const title = task?.title ?? worker?.name ?? (selection.kind === 'tasks' ? labels[selection.filter] : 'Сотрудники команды');
  const list = worker ? tasks.filter(item => item.workerId === worker.id) : selection.kind === 'tasks' ? tasks.filter(item => selection.filter === 'all' || taskStatus(item, now) === selection.filter) : [];
  return <dialog className="employee-dialog admin-dialog" ref={dialog} onCancel={onClose} aria-labelledby="admin-dialog-title" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="employee-dialog__content"><div className="employee-dialog__top"><span>DEATHLINE / КОМАНДА</span><button type="button" className="employee-icon-button" aria-label="Закрыть окно" onClick={onClose} autoFocus><Icon name="close" /></button></div><h2 id="admin-dialog-title">{title}</h2>
    {worker && metrics && <div className="admin-worker-summary"><Avatar worker={worker} /><div><p>{worker.role}</p><span>{metrics.completed} выполнено · {metrics.open} незавершённых · {metrics.overdue} просрочено</span></div><Rating value={worker.rating} /></div>}
    {task && <><div className="admin-task-meta"><span className={`employee-tag ${delay > 0 ? 'admin-tag--completed-late' : `employee-tag--${taskStatus(task, now)}`}`}>{delay > 0 ? 'Выполнено с просрочкой' : labels[taskStatus(task, now)]}</span><span>#{task.id}</span></div><p className="employee-dialog__description">{task.description}</p><dl className="admin-task-details"><div><dt>Ответственный</dt><dd>{workers.find(item => item.id === task.workerId)?.name}</dd></div><div><dt>Дедлайн</dt><dd>{dateText(task.deadline)}</dd></div><div><dt>{task.completedAt !== null ? 'Завершена' : task.deadline <= now ? 'Просрочено на' : 'Осталось'}</dt><dd>{task.completedAt !== null ? dateText(task.completedAt) : clockText(task.deadline - now)}</dd></div>{delay > 0 && <div className="admin-task-details__late"><dt>Опоздание</dt><dd>{clockText(delay)}</dd></div>}</dl>{task.completedAt === null && <button type="button" className="employee-button employee-button--primary" onClick={() => onEdit(task.id)}><Icon name="edit" />Редактировать задачу</button>}</>}
    {selection.kind === 'workers' && <div className="admin-dialog__list">{workers.map(item => { const data = workerMetrics(item, tasks, now); return <button type="button" key={item.id} onClick={() => onSelect({ kind: 'worker', id: item.id })}><Avatar worker={item} /><span><strong>{item.name}</strong><small>{item.role} · {data.open} незавершённых задач</small></span><Icon name="arrow" /></button>; })}</div>}
    {list.length > 0 && <div className="admin-dialog__list">{[...list].sort((a, b) => a.deadline - b.deadline).map(item => <button type="button" key={item.id} onClick={() => onSelect({ kind: 'task', id: item.id })}><span className={`admin-status-dot admin-status-dot--${completionDelay(item) > 0 ? 'completed-late' : taskStatus(item, now)}`} /><span><strong>{item.title}</strong><small>{workers.find(person => person.id === item.workerId)?.name} · {labels[taskStatus(item, now)]} · {dateText(item.deadline)}</small>{completionDelay(item) > 0 && <span className="admin-completion-late"><Icon name="clock" />Выполнено с просрочкой · {clockText(completionDelay(item))}</span>}</span><Icon name="arrow" /></button>)}</div>}
  </div></dialog>;
}

export default function AdminScreen() {
  const invitationData = useInvitations();
  const [currentTeam] = useState(() => invitationData.teams.find(team => team.id === new URLSearchParams(window.location.search).get('team')) ?? defaultTeam);
  const { tasks, workers } = useTeamData();
  const [view, setView] = useState<View>(() => new URLSearchParams(window.location.search).get('view') === 'invitations' ? 'invitations' : 'overview');
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
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
  useEffect(() => { const previousTitle = document.title; document.title = 'Панель администратора · DeathLine'; const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => { window.clearInterval(interval); document.title = previousTitle; }; }, []);
  useEffect(() => { document.title = `${view === 'invitations' ? 'Приглашения' : view === 'goat' ? 'GOAT' : view === 'tasks' ? 'Задачи команды' : view === 'employees' ? 'Сотрудники' : 'Панель администратора'} · DeathLine`; }, [view]);
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
  function saveProfile(id: number, draft: WorkerProfileDraft) {
    saveProfileData(currentTeam.id, id, draft);
  }
  function saveTask(draft: TaskDraft, id?: number): number {
    const taskId = saveTaskData(currentTeam.id, workers, draft, id);
    return taskId;
  }
  const search = query.trim().toLocaleLowerCase('ru-RU');
  const matchesTask = (task: TeamTask) => `${task.title} ${task.summary} ${task.id} ${workers.find(item => item.id === task.workerId)?.name}`.toLocaleLowerCase('ru-RU').includes(search);
  const team = workers.filter(worker => !search || `${worker.name} ${worker.role}`.toLocaleLowerCase('ru-RU').includes(search) || tasks.some(task => task.workerId === worker.id && matchesTask(task)));
  const counts = { all: tasks.length, active: tasks.filter(task => taskStatus(task, now) === 'active').length, completed: tasks.filter(task => taskStatus(task, now) === 'completed').length, overdue: tasks.filter(task => taskStatus(task, now) === 'overdue').length };
  const load = team.map(worker => ({ worker, ...workerMetrics(worker, tasks, now) })).sort((a, b) => b.open - a.open);
  const maxLoad = Math.max(1, ...workers.map(worker => workerMetrics(worker, tasks, now).open));
  const deadlines = tasks.filter(task => taskStatus(task, now) === 'active' && matchesTask(task)).sort((a, b) => a.deadline - b.deadline).slice(0, 5);
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(now);
  return <div className="employee-page admin-page"><aside className="employee-sidebar" aria-label="Боковая панель администратора"><button type="button" className="employee-brand" aria-label="DeathLine — главная" onClick={() => { navigate('overview'); window.scrollTo(0, 0); }}><span className="employee-brand__mark"><img src="/brand/deathline-logo.png" alt="" /></span><span>Death<b>Line</b></span></button><nav className="employee-nav admin-nav" aria-label="Разделы администратора"><button type="button" className={view === 'overview' ? 'is-current' : ''} aria-current={view === 'overview' ? 'page' : undefined} onClick={() => navigate('overview')}><Icon name="home" /><span>Главная</span></button><button type="button" className={view === 'tasks' ? 'is-current' : ''} aria-current={view === 'tasks' ? 'page' : undefined} onClick={() => navigate('tasks')}><Icon name="tasks" /><span>Задачи</span></button><button type="button" className={view === 'employees' || view === 'invitations' ? 'is-current' : ''} aria-current={view === 'employees' || view === 'invitations' ? 'page' : undefined} onClick={() => navigate('employees')}><Icon name="team" /><span>Сотрудники</span></button><button type="button" className={view === 'goat' ? 'is-current' : ''} aria-current={view === 'goat' ? 'page' : undefined} onClick={() => navigate('goat')}><Icon name="trophy" /><span>GOAT</span></button></nav><div className="employee-sidebar__bottom"><p>Время срать,<br /><span>а мы не ели.</span></p><img className="employee-mascot" src="/brand/deathline-reaper-work.png" alt="Смерть сидит на унитазе и работает за ноутбуком" /><span className="employee-sidebar__caption">FOCUS ON WHAT MATTERS.</span></div></aside>
    <div className="employee-workspace"><header className="employee-topbar">{view === 'goat' ? <div className="employee-topbar__label"><Icon name="trophy" />Рейтинг команды</div> : <div className="employee-search"><Icon name="search" /><input type="search" aria-label="Поиск задач и сотрудников" placeholder={view === 'invitations' ? 'Поиск по почте…' : view === 'employees' ? selectedWorkerId === null ? 'Поиск сотрудников…' : 'Поиск задач сотрудника…' : 'Поиск задач, сотрудников…'} value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" className="employee-icon-button" aria-label="Очистить поиск" onClick={() => setQuery('')}><Icon name="close" /></button>}</div>}<ProfileMenu role="Администратор" displayName="Мой профиль" /></header>
      <main className="employee-main admin-main"><div className="employee-heading"><div><p className="employee-eyebrow">ПУЛЬТ УПРАВЛЕНИЯ</p><h1>{view === 'invitations' ? 'Приглашения' : view === 'goat' ? 'GOAT' : view === 'tasks' ? 'Задачи команды' : view === 'employees' ? selectedWorkerId === null ? 'Сотрудники' : 'Карточка сотрудника' : 'Панель администратора'}<span>.</span></h1><p className="employee-heading__sub">{view === 'invitations' ? currentTeam.name ? `Персональные ссылки для команды «${currentTeam.name}».` : 'Персональные ссылки для твоей команды.' : view === 'goat' ? 'Лучший и худший сотрудник месяца. Результаты твоей команды.' : view === 'tasks' ? 'Задачи, сроки и распределение между сотрудниками.' : view === 'employees' ? 'Команда, нагрузка и задачи каждого сотрудника.' : 'Команда, задачи и дедлайны — общая картина.'}</p></div><div className="employee-month"><Icon name="calendar" /><time dateTime={new Date(now).toLocaleDateString('sv-SE')}>{new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now)}</time></div></div>
        {view === 'invitations' ? <AdminInvitations team={currentTeam} memberEmails={workers.map(worker => worker.email)} now={now} query={query} onBack={() => navigate('employees')} /> : view === 'goat' ? <AdminGoat workers={workers} tasks={tasks} now={now} onOpenWorker={openWorker} /> : view === 'tasks' ? <AdminTasks workers={workers} tasks={tasks} now={now} query={query} onClearQuery={() => setQuery('')} layout={layout} onLayout={setLayout} editor={editor} onEditor={changeEditor} onOpen={id => setSelection({ kind: 'task', id })} onSave={saveTask} /> : view === 'employees' ? <><div className="invites-directory-action"><button type="button" className="employee-button employee-button--primary" onClick={() => navigate('invitations')}><Icon name="plus" />Пригласить в команду</button></div><AdminEmployees key={selectedWorkerId ?? 'directory'} workers={workers} tasks={tasks} now={now} query={query} workerId={selectedWorkerId} onSelect={openWorker} onBack={backToEmployees} onClearQuery={() => setQuery('')} onProfileSave={saveProfile} privateNote="" onNoteSave={savePrivateNote} onOpenTask={id => setSelection({ kind: 'task', id })} editor={editor} onEditor={changeEditor} onSaveTask={saveTask} chart={selectedWorkerId !== null ? <ProgressChart tasks={tasks.filter(task => task.workerId === selectedWorkerId)} now={now} scope="Задачи сотрудника · с начала месяца" /> : undefined} /></> : <><div className="admin-dashboard"><div className="admin-dashboard__primary"><div className="admin-stats" aria-label="Общая статистика за месяц">{([{ filter: 'all', icon: 'tasks', caption: 'Всего задач' }, { filter: 'completed', icon: 'check', caption: 'Выполнено' }, { filter: 'overdue', icon: 'clock', caption: 'Просрочено' }] as const).map(item => <button type="button" className={`admin-stat admin-stat--${item.filter}`} key={item.filter} onClick={() => setSelection({ kind: 'tasks', filter: item.filter })} aria-label={`${item.caption}: ${counts[item.filter]}. Открыть список`}><Icon name={item.icon} /><span>{item.caption}</span><strong>{counts[item.filter]}</strong><small>{item.filter === 'all' ? `За ${month}` : `${Math.round(counts[item.filter] / Math.max(1, counts.all) * 100)}% от всех задач`}</small></button>)}<button type="button" className="admin-stat admin-stat--team" onClick={() => navigate('employees')} aria-label={`Сотрудники: ${workers.length}. Открыть список`}><Icon name="team" /><span>Сотрудники</span><strong>{workers.length}</strong><small>{workers.filter(worker => workerMetrics(worker, tasks, now).open > 0).length} с задачами в работе</small></button></div><ProgressChart tasks={tasks} now={now} /></div>
          <section className="admin-panel admin-load" aria-labelledby="load-title"><div className="admin-panel__heading"><div><h2 id="load-title">Нагрузка команды</h2><p>Незавершённые задачи, включая просроченные</p></div><Icon name="chart" /></div><div className="admin-load__list">{load.map(item => <button type="button" key={item.worker.id} onClick={() => openWorker(item.worker.id)} className={item.open === maxLoad ? 'is-heaviest' : ''}><Avatar worker={item.worker} /><span className="admin-load__info"><span><strong>{item.worker.name}</strong><span>{item.open} {item.open === 1 ? 'задача' : item.open < 5 ? 'задачи' : 'задач'}</span></span><span className="admin-load__bar"><span style={{ width: `${item.open / maxLoad * 100}%` }} /></span></span><span className="admin-load__percent">{Math.round(item.open / maxLoad * 100)}%</span></button>)}</div>{!load.length && <p className="admin-empty">{workers.length ? 'Сотрудники не найдены.' : 'В команде пока никого нет. Пригласи коллег в разделе «Сотрудники».'}</p>}{workers.length > 0 && <p className="admin-load__note">100% — самая высокая нагрузка в команде.</p>}</section>
        </div>
        <div className="admin-bottom-grid"><section className="admin-panel admin-workers" aria-labelledby="workers-title"><div className="admin-panel__heading"><h2 id="workers-title">Сотрудники</h2><button type="button" className="admin-text-button" onClick={() => navigate('employees')}>Все сотрудники<Icon name="arrow" /></button></div><div className="admin-table-wrap"><table><thead><tr><th>Сотрудник</th><th>Выполнено</th><th>Вовремя</th><th>Просрочено</th><th>Рейтинг</th></tr></thead><tbody>{team.map(worker => { const metrics = workerMetrics(worker, tasks, now); return <tr key={worker.id} className="admin-people-row" onClick={() => openWorker(worker.id)}><th scope="row"><button type="button" className="admin-person-button" aria-label={`Открыть профиль: ${worker.name}`}><Avatar worker={worker} /><span>{worker.name}</span></button></th><td>{metrics.completed}</td><td>{metrics.onTime === null ? '—' : `${metrics.onTime}%`}</td><td className={metrics.overdue ? 'admin-late-count' : ''}>{metrics.overdue}</td><td><Rating value={worker.rating} /></td></tr>; })}</tbody></table></div>{!team.length && <p className="admin-empty">{workers.length ? 'Сотрудники не найдены. Попробуй другой запрос.' : 'Здесь появятся коллеги, которые примут твои приглашения.'}</p>}</section>
          <section className="admin-panel admin-deadlines" aria-labelledby="deadlines-title"><div className="admin-panel__heading"><h2 id="deadlines-title">Ближайшие дедлайны</h2><button type="button" className="admin-text-button" onClick={() => setSelection({ kind: 'tasks', filter: 'all' })}>Все задачи<Icon name="arrow" /></button></div><div className="admin-deadlines__list">{deadlines.map((task, index) => <button type="button" key={task.id} className={index === 0 ? 'is-nearest' : ''} onClick={() => setSelection({ kind: 'task', id: task.id })}><span className="admin-deadlines__icon"><Icon name="clock" /></span><span className="admin-deadlines__task"><strong>{task.title}</strong><span>{workers.find(worker => worker.id === task.workerId)?.name}</span></span><span className="admin-deadlines__time">{clockText(task.deadline - now)}</span></button>)}</div>{!deadlines.length && <p className="admin-empty">{tasks.length ? 'Ближайших дедлайнов по запросу нет.' : 'Дедлайны появятся после создания первых задач.'}</p>}</section></div>
        </>}<footer className="employee-footer"><span>DEATHLINE / ПАНЕЛЬ АДМИНИСТРАТОРА</span></footer>
      </main></div>{selection && <AdminDialog selection={selection} workers={workers} tasks={tasks} now={now} onClose={() => setSelection(null)} onSelect={next => { if (next.kind === 'worker') openWorker(next.id); else if (next.kind === 'workers') navigate('employees'); else setSelection(next); }} onEdit={editFromDialog} />}
  </div>;
}
