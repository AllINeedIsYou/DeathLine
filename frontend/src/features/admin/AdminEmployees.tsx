import { useTimedNotice } from '../../shared/useTimedNotice';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../employee/EmployeeScreen';
import { dateText, priorities, taskStatus, type TaskStatus } from '../employee/tasks';
import { workerMetrics, type TeamTask, type Worker, type WorkerProfileDraft } from './team';
import { workerLocalTime, workerTimeZones } from './worker-time';
import PrivateWorkerNote from './PrivateWorkerNote';
import { StatusTag, TaskEditor, TaskOutcome, type TaskDraft } from './AdminTasks';
import './admin-employees.css';

type Filter = 'all' | TaskStatus;
const labels: Record<Filter, string> = { all: 'Все задачи', active: 'В работе', completed: 'Выполнено', overdue: 'Просрочено' };
function Avatar({ worker }: { worker: Worker }) { return <span className={`admin-avatar admin-avatar--${worker.color}`} aria-hidden="true">{worker.initials}</span>; }
function Rating({ worker }: { worker: Worker }) { return <strong className={`admin-rating${worker.rating >= 85 ? ' admin-rating--top' : worker.rating < 50 ? ' admin-rating--low' : ''}`}>{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(worker.rating)}</strong>; }

function ProfileEditor({ worker, onSave, onClose }: { worker: Worker; onSave: (draft: WorkerProfileDraft) => void; onClose: () => void }) {
  const [name, setName] = useState(worker.name);
  const [role, setRole] = useState(worker.role);
  const [email, setEmail] = useState(worker.email);
  const [telegram, setTelegram] = useState(worker.telegram);
  const [phone, setPhone] = useState(worker.phone);
  const [timeZone, setTimeZone] = useState(worker.timeZone);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input.current?.focus();
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  return <aside className="admin-panel admin-task-editor admin-profile-editor" aria-labelledby="profile-editor-title" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className="admin-panel__heading"><h2 id="profile-editor-title">Редактировать профиль</h2><button className="employee-icon-button" type="button" aria-label="Закрыть редактирование профиля" onClick={onClose}><Icon name="close" /></button></div>
    <form onSubmit={event => {
      event.preventDefault();
      if (!name.trim() || !role.trim()) { setError('Заполни имя и должность.'); return; }
      const handle = telegram.trim().replace(/^@/, '');
      if (handle && !/^[a-zA-Z0-9_]{5,32}$/.test(handle)) { setError('Telegram: укажи имя пользователя, например @username, без ссылки и пробелов.'); return; }
      if (phone.trim() && (!/^[+\d\s().-]+$/.test(phone.trim()) || !/^\d{8,15}$/.test(phone.replace(/\D/g, '')))) { setError('Проверь номер телефона: от 8 до 15 цифр.'); return; }
      try { onSave({ name: name.trim(), role: role.trim(), email: email.trim(), telegram: handle ? `@${handle}` : '', phone: phone.trim(), timeZone }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить профиль.'); }
    }}>
      <label htmlFor="worker-name">Имя</label><input id="worker-name" ref={input} name="worker-name" required maxLength={80} value={name} onChange={event => setName(event.target.value)} autoComplete="off" />
      <label htmlFor="worker-role">Должность</label><input id="worker-role" required maxLength={120} value={role} onChange={event => setRole(event.target.value)} autoComplete="off" />
      <label htmlFor="worker-email">Почта <small>необязательно</small></label><input id="worker-email" type="email" maxLength={254} value={email} placeholder="name@example.com" onChange={event => setEmail(event.target.value)} autoComplete="off" />
      <label htmlFor="worker-telegram">Telegram <small>необязательно</small></label><input id="worker-telegram" maxLength={33} value={telegram} placeholder="@username" onChange={event => setTelegram(event.target.value)} autoComplete="off" spellCheck={false} />
      <label htmlFor="worker-phone">Телефон <small>необязательно</small></label><input id="worker-phone" type="tel" maxLength={40} value={phone} placeholder="+7 (___) ___-__-__" onChange={event => setPhone(event.target.value)} autoComplete="off" />
      <label htmlFor="worker-timezone">Часовой пояс</label><select id="worker-timezone" value={timeZone} onChange={event => setTimeZone(event.target.value)}>{!workerTimeZones.some(zone => zone[0] === timeZone) && <option value={timeZone}>{timeZone}</option>}{workerTimeZones.map(([zone, city]) => <option key={zone} value={zone}>{city}</option>)}</select>
      {error && <p className="admin-task-editor__error" role="alert">{error}</p>}
      <button className="employee-button employee-button--primary" type="submit">Сохранить профиль</button><button className="admin-task-editor__cancel" type="button" onClick={onClose}>Отмена</button>
    </form>
  </aside>;
}

type Props = { workers: Worker[]; tasks: TeamTask[]; now: number; query: string; workerId: number | null; chart?: ReactNode; privateNote: string; onNoteSave: (value: string) => void; onSelect: (id: number) => void; onBack: () => void; onClearQuery: () => void; onProfileSave: (id: number, draft: WorkerProfileDraft) => void; onOpenTask: (id: number) => void; editor: number | null | undefined; onEditor: (id: number | null | undefined) => void; onSaveTask: (draft: TaskDraft, id?: number) => number };
export default function AdminEmployees({ workers, tasks, now, query, workerId, chart, privateNote, onNoteSave, onSelect, onBack, onClearQuery, onProfileSave, onOpenTask, editor, onEditor, onSaveTask }: Props) {
  const [profileEditing, setProfileEditing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [notice, setNotice] = useTimedNotice();
  const [savedId, setSavedId] = useState<number | null>(null);
  useEffect(() => { if (editor !== undefined) setProfileEditing(false); }, [editor]);
  const search = query.trim().toLocaleLowerCase('ru-RU');
  const worker = workers.find(item => item.id === workerId);
  const localTime = worker && workerLocalTime(worker.timeZone, now);
  const found = workers.filter(item => `${item.name} ${item.role}`.toLocaleLowerCase('ru-RU').includes(search));
  const assigned = worker ? tasks.filter(task => task.workerId === worker.id) : [];
  const metrics = worker && workerMetrics(worker, tasks, now);
  const counts = { all: assigned.length, active: assigned.filter(task => taskStatus(task, now) === 'active').length, completed: assigned.filter(task => taskStatus(task, now) === 'completed').length, overdue: assigned.filter(task => taskStatus(task, now) === 'overdue').length };
  const visible = assigned.filter(task => (filter === 'all' || taskStatus(task, now) === filter) && `${task.id} ${task.title} ${task.description} ${worker?.name} ${worker?.role}`.toLocaleLowerCase('ru-RU').includes(search)).sort((a, b) => Number(a.completedAt !== null) - Number(b.completedAt !== null) || a.deadline - b.deadline || a.id - b.id);
  const nearest = assigned.filter(task => taskStatus(task, now) === 'active').sort((a, b) => a.deadline - b.deadline)[0];
  const editingTask = typeof editor === 'number' ? tasks.find(task => task.id === editor) : undefined;
  const editing = profileEditing || editor !== undefined;
  function saveTask(draft: TaskDraft) {
    const id = onSaveTask(draft, editingTask?.id);
    setSavedId(id);
    let message = editingTask ? 'Изменения сохранены.' : 'Задача назначена.';
    if (draft.workerId !== workerId) message += ' Исполнитель — другой сотрудник, задача доступна в его карточке.';
    else if (!editingTask) { setFilter('active'); onClearQuery(); }
    else {
      const updated = { ...editingTask, ...draft };
      if ((filter !== 'all' && taskStatus(updated, Date.now()) !== filter) || !`${updated.id} ${updated.title} ${updated.description} ${worker?.name} ${worker?.role}`.toLocaleLowerCase('ru-RU').includes(search)) message += ' Задача больше не соответствует выбранным фильтрам.';
    }
    setNotice(message);
    onEditor(undefined);
  }
  return <section className="admin-people admin-tasks" aria-label={worker ? 'Карточка сотрудника' : 'Список сотрудников'}>
    {!worker ? <>
      <div className="admin-people-summary"><div><Icon name="team" /><span>Сотрудников в команде<strong>{workers.length}</strong></span></div><div><Icon name="tasks" /><span>Незавершённых задач<strong>{tasks.filter(task => task.completedAt === null).length}</strong></span></div><div><Icon name="check" /><span>Выполнено за месяц<strong>{tasks.filter(task => task.completedAt !== null).length}</strong></span></div></div>
      <div className="admin-panel admin-people-directory"><div className="admin-panel__heading"><h2>Команда</h2><span>{found.length} из {workers.length}</span></div>
        {found.length ? <div className="admin-people-table-wrap"><table className="admin-people-table"><thead><tr><th>Сотрудник</th><th>В работе</th><th>Выполнено</th><th>Просрочено</th><th>Вовремя</th><th>Рейтинг</th><th><span className="admin-visually-hidden">Открыть профиль</span></th></tr></thead><tbody>{found.map(item => { const data = workerMetrics(item, tasks, now); return <tr key={item.id} className="admin-people-row" onClick={() => onSelect(item.id)}><th scope="row"><button className="admin-person-button" type="button" aria-label={`Открыть профиль: ${item.name}`}><Avatar worker={item} /><span><strong>{item.name}</strong><small>{item.role}</small></span></button></th><td>{data.open - data.overdue}</td><td className="admin-people-done">{data.completed}</td><td className={data.overdue ? 'admin-late-count' : ''}>{data.overdue}</td><td>{data.onTime === null ? '—' : `${data.onTime}%`}</td><td><Rating worker={item} /></td><td><span className="admin-people-row__arrow"><Icon name="arrow" /></span></td></tr>; })}</tbody></table></div> : <div className="employee-empty"><Icon name="empty" /><h3>{workers.length ? 'Сотрудники не найдены' : 'Пока никого нет'}</h3><p>{workers.length ? 'Попробуй другое имя или должность.' : 'Пригласи коллегу в команду с помощью кнопки выше.'}</p>{workers.length > 0 && <button className="employee-button" type="button" onClick={onClearQuery}>Сбросить поиск</button>}</div>}
      </div>
    </> : metrics && <>
      <button className="admin-text-button admin-people-back" type="button" onClick={onBack}><Icon name="arrow" />Сотрудники<span>/ {worker.name}</span></button>
      <div className="admin-panel admin-people-hero"><Avatar worker={worker} /><div className="admin-people-hero__name"><p>СОТРУДНИК #{worker.id}</p><h2>{worker.name}</h2><span>{worker.role}</span></div><div className="admin-people-hero__actions"><button type="button" className="employee-button" onClick={() => { onEditor(undefined); setProfileEditing(true); }}><Icon name="edit" />Редактировать профиль</button><button type="button" className="employee-button employee-button--primary" onClick={() => { setProfileEditing(false); onEditor(null); }}><Icon name="plus" />Назначить задачу</button></div></div>
      <section className="admin-panel admin-person-contacts" aria-label="Контакты и местное время сотрудника"><dl>
        <div><dt>Почта</dt><dd className={!worker.email ? 'is-empty' : ''}>{worker.email || 'Не указана'}</dd></div>
        <div><dt>Telegram</dt><dd className={!worker.telegram ? 'is-empty' : ''}>{worker.telegram || 'Не указан'}</dd></div>
        <div><dt>Телефон</dt><dd className={!worker.phone ? 'is-empty' : ''}>{worker.phone || 'Не указан'}</dd></div>
        {localTime && <div className="admin-person-contacts__time"><dt><Icon name="clock" />Местное время</dt><dd><time dateTime={new Date(now).toISOString()} aria-live="off">{localTime.time}</time><span>{localTime.city} · {localTime.offset}</span><small>{localTime.date}</small></dd></div>}
      </dl></section>
      <div className="employee-stats employee-stats--filters admin-tasks-status admin-people-stats" aria-label="Статистика и фильтр задач сотрудника">{(['all', 'active', 'completed', 'overdue'] as Filter[]).map(status => <button type="button" key={status} className={`employee-stat employee-stat--${status}${filter === status ? ' is-selected' : ''}`} aria-label={`${labels[status]}: ${counts[status]}. Задачи сотрудника`} aria-pressed={filter === status} onClick={() => setFilter(status)}><span className="employee-stat__icon"><Icon name={status === 'completed' ? 'check' : status === 'overdue' ? 'clock' : 'tasks'} /></span><span className="employee-stat__text"><strong>{counts[status]}</strong><span>{labels[status]}</span></span><Icon name="arrow" /></button>)}</div>
      <div className={`admin-people-grid${editing ? ' has-editor' : ''}`}><div className="admin-people-primary">{chart}
        <PrivateWorkerNote value={privateNote} onSave={value => { onNoteSave(value); setNotice(value ? 'Личная заметка сохранена.' : 'Личная заметка очищена.'); }} />
        <section className="admin-people-tasks" aria-labelledby="worker-tasks-title"><div className="admin-task-results-heading"><h2 id="worker-tasks-title">Задачи сотрудника</h2><span>{visible.length} из {assigned.length}</span></div>
          {visible.length ? <div className="admin-task-table-wrap"><table className="admin-task-table"><thead><tr><th>Задача</th><th>Приоритет</th><th>Статус</th><th>Дедлайн</th><th>Осталось / итог</th></tr></thead><tbody>{visible.map(task => <tr key={task.id} className={savedId === task.id ? 'is-saved' : ''}><th scope="row"><button className="admin-task-title" type="button" onClick={() => onOpenTask(task.id)}><small>#{task.id}</small><strong>{task.title}</strong></button></th><td><span className={`employee-tag employee-tag--${task.priority}`}><span className="employee-tag__dot" />{priorities[task.priority]}</span></td><td><StatusTag task={task} now={now} /></td><td className="admin-task-table__date">{dateText(task.deadline)}</td><td><TaskOutcome task={task} now={now} /></td></tr>)}</tbody></table></div> : <div className="admin-panel employee-empty"><Icon name="empty" /><h3>Задач не найдено</h3><p>{assigned.length ? 'Попробуй другой статус или поисковый запрос.' : 'Назначь сотруднику первую задачу.'}</p>{assigned.length > 0 && <button type="button" className="employee-button" onClick={() => { setFilter('all'); onClearQuery(); }}>Сбросить фильтры</button>}</div>}
        </section>
      </div><div className="admin-people-side">
        {profileEditing ? <ProfileEditor worker={worker} onClose={() => setProfileEditing(false)} onSave={draft => { onProfileSave(worker.id, draft); setProfileEditing(false); setNotice('Профиль обновлён.'); }} /> : editor !== undefined ? <TaskEditor key={editor ?? 'new'} task={editingTask} workers={workers} initialWorkerId={worker.id} onClose={() => onEditor(undefined)} onSave={saveTask} /> : <>
          <section className="admin-panel admin-person-load" aria-labelledby="worker-load-title"><div className="admin-panel__heading"><h2 id="worker-load-title">Текущая нагрузка</h2><Icon name="clock" /></div><div className="admin-person-load__ring" role="img" aria-label={`${counts.active} в работе, ${counts.overdue} просрочено, всего ${metrics.open} незавершённых`} style={{ background: metrics.open ? `conic-gradient(#00c8ff 0 ${counts.active / metrics.open * 100}%, #ff4965 ${counts.active / metrics.open * 100}% 100%)` : '#153452' }}><div><strong>{metrics.open}</strong><span>незавершённых</span></div></div><dl><div><dt><i />В работе</dt><dd>{counts.active}</dd></div><div><dt><i />Просрочено</dt><dd>{counts.overdue}</dd></div><div><dt>Выполнено вовремя</dt><dd>{metrics.onTime === null ? '—' : `${metrics.onTime}%`}</dd></div></dl></section>
          <section className="admin-panel admin-person-rating"><div><Icon name="trophy" /><h2>Рейтинг за месяц</h2></div><Rating worker={worker} /><p>Текущий рейтинг сотрудника</p></section>
          {nearest && <section className="admin-panel admin-person-nearest"><p>БЛИЖАЙШИЙ ДЕДЛАЙН</p><button className="admin-task-title" type="button" onClick={() => onOpenTask(nearest.id)}><strong>{nearest.title}</strong></button><TaskOutcome task={nearest} now={now} /><span>{dateText(nearest.deadline)}</span></section>}
        </>}
      </div></div>
    </>}
    {notice && <div className="employee-toast" role="status"><Icon name="check" /><p>{notice}</p><button className="employee-icon-button" type="button" aria-label="Закрыть уведомление" onClick={() => setNotice('')}><Icon name="close" /></button></div>}
  </section>;
}
