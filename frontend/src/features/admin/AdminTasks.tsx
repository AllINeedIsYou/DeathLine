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
const statusLabels: Record<Status, string> = { all: 'Все задачи', active: 'В работе', completed: 'Выполнено', overdue: 'Просрочено' };
const statuses: TaskStatus[] = ['active', 'completed', 'overdue'];
function WorkerName({ id, workers }: { id: number; workers: Worker[] }) {
  const worker = workers.find(item => item.id === id)!;
  return <span className="admin-task-worker"><span className={`admin-avatar admin-avatar--${worker.color}`} aria-hidden="true">{worker.initials}</span><span>{worker.name}</span></span>;
}
export function StatusTag({ task, now }: { task: TeamTask; now: number }) {
  const status = taskStatus(task, now);
  return <span className={`employee-tag ${completionDelay(task) > 0 ? 'admin-tag--completed-late' : `employee-tag--${status}`}`}>{completionDelay(task) > 0 ? 'Выполнено с просрочкой' : statusLabels[status]}</span>;
}
export function TaskOutcome({ task, now }: { task: TeamTask; now: number }) {
  const late = completionDelay(task);
  return <span className={`admin-task-outcome admin-task-outcome--${late > 0 ? 'late' : taskStatus(task, now)}`}><Icon name={task.completedAt !== null ? 'check' : 'clock'} /><span><strong>{task.completedAt !== null ? late > 0 ? `+${clockText(late)}` : 'В срок' : clockText(task.deadline - now)}</strong><small>{task.completedAt !== null ? late > 0 ? 'Опоздание' : 'Выполнено' : task.deadline <= now ? 'Просрочено на' : 'Осталось'}</small></span></span>;
}
function localDateValue(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function TaskEditor({ task, workers, initialWorkerId, onSave, onClose }: { task?: TeamTask; workers: Worker[]; initialWorkerId?: number; onSave: (draft: TaskDraft) => void; onClose: () => void }) {
  const form = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [workerId, setWorkerId] = useState(task ? String(task.workerId) : initialWorkerId !== undefined ? String(initialWorkerId) : '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [deadline, setDeadline] = useState(localDateValue(task?.deadline ?? Date.now() + 4 * 3600000));
  const [error, setError] = useState('');
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    form.current?.querySelector<HTMLInputElement>('[name="title"]')?.focus();
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  return <aside className="admin-panel admin-task-editor" aria-labelledby="editor-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className="admin-panel__heading"><h2 id="editor-title">{task ? 'Редактировать задачу' : 'Новая задача'}</h2><button type="button" className="employee-icon-button" aria-label="Закрыть форму задачи" onClick={onClose}><Icon name="close" /></button></div>
    <form ref={form} onSubmit={event => { event.preventDefault(); const value = new Date(deadline).getTime(); if (!title.trim()) { setError('Укажи название задачи.'); form.current?.querySelector<HTMLInputElement>('[name="title"]')?.focus(); return; } if (!Number.isFinite(value)) { setError('Укажи дату и время дедлайна.'); return; } if ((!task && value <= Date.now()) || (task && value < task.createdAt)) { setError(task ? 'Дедлайн не может быть раньше создания задачи.' : 'Для новой задачи выбери будущий дедлайн.'); return; } setError(''); try { onSave({ title: title.trim(), description: description.trim(), workerId: Number(workerId), priority, deadline: value }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить задачу.'); } }}>
      <label htmlFor="task-title">Название задачи</label><input id="task-title" name="title" required maxLength={120} placeholder="Что нужно сделать?" value={title} onChange={event => setTitle(event.target.value)} />
      <label htmlFor="task-description">Описание</label><textarea id="task-description" maxLength={2000} rows={4} placeholder="Детали и ожидаемый результат…" value={description} onChange={event => setDescription(event.target.value)} />
      <label htmlFor="task-worker">Сотрудник</label><select id="task-worker" required value={workerId} onChange={event => setWorkerId(event.target.value)}><option value="" disabled>Выбери сотрудника</option>{workers.map(worker => <option value={worker.id} key={worker.id}>{worker.name}</option>)}</select>
      <fieldset><legend>Приоритет</legend><div className="admin-task-editor__priorities">{(['high', 'medium', 'low'] as const).map(value => <label className={`admin-priority-choice admin-priority-choice--${value}${value === priority ? ' is-selected' : ''}`} key={value}><input type="radio" name="priority" value={value} checked={priority === value} onChange={() => setPriority(value)} /><span className="employee-tag__dot" />{priorities[value]}</label>)}</div></fieldset>
      <DeadlineField value={deadline} onChange={setDeadline} />
      {error && <p className="admin-task-editor__error" role="alert">{error}</p>}
      <button type="submit" className="employee-button employee-button--primary">{task ? 'Сохранить изменения' : 'Создать задачу'}</button>
      <button type="button" className="admin-task-editor__cancel" onClick={onClose}>Отмена</button>
    </form>
  </aside>;
}

type Props = { workers: Worker[]; tasks: TeamTask[]; now: number; query: string; onClearQuery: () => void; layout: TaskLayout; onLayout: (layout: TaskLayout) => void; editor: number | null | undefined; onEditor: (id: number | null | undefined) => void; onOpen: (id: number) => void; onSave: (draft: TaskDraft, id?: number) => number };
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
  const search = query.trim().toLocaleLowerCase('ru-RU');
  const today = new Date(now); const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const day = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset).getTime();
  const matchesBase = (task: TeamTask) => (worker === 'all' || task.workerId === Number(worker)) && (priority === 'all' || task.priority === priority) && (period === 'all' || (task.deadline >= (period === 'tomorrow' ? day(1) : start) && task.deadline < day(period === 'today' ? 1 : period === 'tomorrow' ? 2 : 7))) && `${task.title} ${task.description} ${task.id} ${workers.find(item => item.id === task.workerId)?.name}`.toLocaleLowerCase('ru-RU').includes(search);
  const base = tasks.filter(matchesBase);
  const counts = { all: base.length, active: base.filter(task => taskStatus(task, now) === 'active').length, completed: base.filter(task => taskStatus(task, now) === 'completed').length, overdue: base.filter(task => taskStatus(task, now) === 'overdue').length };
  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const visible = base.filter(task => status === 'all' || taskStatus(task, now) === status).sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title, 'ru') : sort === 'priority' ? rank[a.priority] - rank[b.priority] || a.deadline - b.deadline : sort === 'latest' ? b.deadline - a.deadline : a.deadline - b.deadline) || a.id - b.id);
  const pages = Math.max(1, Math.ceil(visible.length / pageSize)); const currentPage = Math.min(page, pages);
  const pageTasks = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const editingTask = editor === null || editor === undefined ? undefined : tasks.find(task => task.id === editor);
  function reset() { setStatus('all'); setWorker('all'); setPriority('all'); setPeriod('all'); setSort('deadline'); onClearQuery(); setPage(1); }
  function save(draft: TaskDraft) {
    const id = onSave(draft, editingTask?.id);
    setSavedId(id);
    if (editingTask) {
      const updated = { ...editingTask, ...draft };
      const staysVisible = matchesBase(updated) && (status === 'all' || taskStatus(updated, Date.now()) === status);
      setNotice(staysVisible ? 'Изменения сохранены.' : 'Изменения сохранены. Задача больше не соответствует выбранным фильтрам.');
    } else {
      setNotice('Задача создана.'); reset(); setStatus(draft.deadline <= Date.now() ? 'overdue' : 'active');
    }
    onEditor(undefined);
  }
  const hasFilters = !!search || status !== 'all' || worker !== 'all' || priority !== 'all' || period !== 'all';
  return <section className="admin-tasks" aria-label="Управление задачами">
    <div className="admin-tasks-actions"><p>{tasks.length} задач в команде</p><div><div className="admin-view-switch" role="group" aria-label="Вид задач"><button type="button" aria-pressed={layout === 'table'} aria-label="Таблица" onClick={() => onLayout('table')}><Icon name="tasks" /><span>Таблица</span></button><button type="button" aria-pressed={layout === 'board'} aria-label="Доска" onClick={() => onLayout('board')}><Icon name="columns" /><span>Доска</span></button></div><button type="button" className="employee-button employee-button--primary admin-new-task" disabled={!workers.length} onClick={() => openEditor(null)}><Icon name="plus" />Новая задача</button></div></div>
    <div className="employee-stats employee-stats--filters admin-tasks-status" aria-label="Фильтр задач по статусу">{(['all', ...statuses] as Status[]).map(value => <button className={`employee-stat employee-stat--${value}${status === value ? ' is-selected' : ''}`} type="button" key={value} aria-pressed={status === value} aria-label={`${statusLabels[value]}: ${counts[value]}. Фильтр задач`} onClick={() => setStatus(value)}><span className="employee-stat__icon"><Icon name={value === 'completed' ? 'check' : value === 'overdue' ? 'clock' : 'tasks'} /></span><span className="employee-stat__text"><strong>{counts[value]}</strong><span>{statusLabels[value]}</span></span><Icon name="arrow" /></button>)}</div>
    <div className="admin-panel admin-task-filters"><label>Сотрудник<select aria-label="Фильтр по сотруднику" value={worker} onChange={event => setWorker(event.target.value)}><option value="all">Все сотрудники</option>{workers.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Приоритет<select aria-label="Фильтр по приоритету" value={priority} onChange={event => setPriority(event.target.value)}><option value="all">Все приоритеты</option>{Object.entries(priorities).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label><label>Дедлайн<select aria-label="Фильтр по дедлайну" value={period} onChange={event => setPeriod(event.target.value)}><option value="all">Все сроки</option><option value="today">Сегодня</option><option value="tomorrow">Завтра</option><option value="week">Ближайшие 7 дней</option></select></label><label>Порядок<select aria-label="Сортировка задач" value={sort} onChange={event => setSort(event.target.value)}><option value="deadline">Ближайший срок</option><option value="latest">Поздний срок</option><option value="title">Название А–Я</option><option value="priority">Высокий приоритет</option></select></label><button type="button" className="employee-button" onClick={reset} disabled={!hasFilters && sort === 'deadline'}>Сбросить</button></div>
    <div className={`admin-task-layout${editor !== undefined ? ' has-editor' : ''}`}><div className="admin-task-layout__results" ref={results}><div className="admin-task-results-heading"><h2>{statusLabels[status]}</h2><span>{visible.length} из {tasks.length}</span></div>
      {visible.length === 0 ? <div className="admin-panel employee-empty"><Icon name="empty" /><h3>{tasks.length ? 'Задачи не найдены' : 'Пока нет задач'}</h3><p>{tasks.length ? 'Попробуй другой запрос или сбрось фильтры.' : workers.length ? 'Создай первую задачу для сотрудника команды.' : 'Сначала пригласи сотрудника в разделе «Сотрудники».'}</p>{hasFilters && <button className="employee-button" type="button" onClick={reset}>Сбросить фильтры</button>}</div> : layout === 'table' ? <><div className="admin-task-table-wrap"><table className="admin-task-table"><thead><tr><th>Задача</th><th>Сотрудник</th><th>Приоритет</th><th>Статус</th><th>Дедлайн</th><th>Осталось / итог</th><th><span className="admin-visually-hidden">Действия</span></th></tr></thead><tbody>{pageTasks.map(task => <tr key={task.id} className={savedId === task.id ? 'is-saved' : ''}><th scope="row"><button className="admin-task-title" type="button" onClick={() => onOpen(task.id)}><small>#{task.id}</small><strong>{task.title}</strong></button></th><td><WorkerName id={task.workerId} workers={workers} /></td><td><span className={`employee-tag employee-tag--${task.priority}`}><span className="employee-tag__dot" />{priorities[task.priority]}</span></td><td><StatusTag task={task} now={now} /></td><td className="admin-task-table__date">{dateText(task.deadline)}</td><td><TaskOutcome task={task} now={now} /></td><td>{task.completedAt === null && <button type="button" className="employee-icon-button" aria-label={`Редактировать задачу #${task.id}`} onClick={() => openEditor(task.id)}><Icon name="edit" /></button>}</td></tr>)}</tbody></table></div><div className="admin-task-pagination"><span>Показано {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, visible.length)} из {visible.length}</span><div><button type="button" className="employee-button" aria-label="Предыдущая страница" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>←</button><span>{currentPage} / {pages}</span><button type="button" className="employee-button" aria-label="Следующая страница" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>→</button></div><label><span className="admin-visually-hidden">Задач на странице</span><select aria-label="Задач на странице" value={pageSize} onChange={event => setPageSize(Number(event.target.value))}><option value={10}>10 на странице</option><option value={20}>20 на странице</option><option value={50}>50 на странице</option></select></label></div></> : <><p className="admin-board-hint">Прокрути доску в сторону, чтобы увидеть все статусы.</p><div className="admin-task-board-wrap" tabIndex={0} aria-label="Доска задач, прокрутка по горизонтали"><div className="admin-task-board">{statuses.filter(value => status === 'all' || status === value).map(value => { const column = visible.filter(task => taskStatus(task, now) === value); return <section className={`admin-board-column admin-board-column--${value}`} key={value} aria-label={statusLabels[value]}><header><Icon name={value === 'completed' ? 'check' : value === 'overdue' ? 'clock' : 'tasks'} /><h3>{statusLabels[value]}</h3><span>{column.length}</span></header><div className="admin-board-column__list">{column.map(task => <article className={`admin-board-card${savedId === task.id ? ' is-saved' : ''}`} key={task.id}><div className="admin-board-card__top"><span>#{task.id}</span>{task.completedAt === null && <button type="button" className="employee-icon-button" aria-label={`Редактировать задачу #${task.id}`} onClick={() => openEditor(task.id)}><Icon name="edit" /></button>}</div><button type="button" className="admin-task-title" onClick={() => onOpen(task.id)}><strong>{task.title}</strong></button><p>{task.summary}</p><WorkerName id={task.workerId} workers={workers} /><div className="admin-board-card__tags"><span className={`employee-tag employee-tag--${task.priority}`}><span className="employee-tag__dot" />{priorities[task.priority]}</span>{completionDelay(task) > 0 && <StatusTag task={task} now={now} />}</div><div className="admin-board-card__time"><TaskOutcome task={task} now={now} /><span>{dateText(task.completedAt ?? task.deadline)}</span></div></article>)}{!column.length && <p className="admin-board-column__empty">Задач нет</p>}</div></section>; })}</div></div></>}
    </div>{editor !== undefined && <TaskEditor key={editor ?? 'new'} task={editingTask} workers={workers} onClose={() => onEditor(undefined)} onSave={save} />}</div>
    {notice && <div className="employee-toast" role="status"><Icon name="check" /><p>{notice}</p><button type="button" className="employee-icon-button" aria-label="Закрыть уведомление" onClick={() => setNotice('')}><Icon name="close" /></button></div>}
  </section>;
}
