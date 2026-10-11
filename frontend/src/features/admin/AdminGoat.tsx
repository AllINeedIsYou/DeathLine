import { Icon } from '../employee/EmployeeScreen';
import { type TeamTask, type Worker } from './team';
import { goatHighlights, monthlyGoatEntries, type GoatEntry } from './monthly-goat';
import './admin-goat.css';

const score = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
function Highlight({ entries, kind, onOpenWorker, emptyText }: { entries: GoatEntry[]; kind: 'best' | 'worst'; onOpenWorker: (id: number) => void; emptyText?: string }) {
  return <section className={`admin-goat-card admin-goat-card--${kind}`} aria-label={kind === 'best' ? 'Лучший сотрудник месяца' : 'Худший сотрудник месяца'}>
    <div className="admin-goat-card__heading"><Icon name={kind === 'best' ? 'trophy' : 'clock'} /><h2>{kind === 'best' ? 'Лучший сотрудник месяца' : 'Худший сотрудник месяца'}</h2>{kind === 'worst' && <span>Только админам</span>}</div>
    {entries.length > 1 && <p className="admin-goat-card__tie">Одинаковый результат у {entries.length} участников</p>}
    {entries.length ? entries.map(entry => <div className="admin-goat-person" key={entry.worker.id}>
      <button type="button" className="admin-goat-person__link" aria-label={`Открыть профиль: ${entry.worker.name}`} onClick={() => onOpenWorker(entry.worker.id)}><span className={`admin-avatar admin-avatar--${entry.worker.color}`} aria-hidden="true">{entry.worker.initials}</span><span><strong>{entry.worker.name}</strong><small>{entry.worker.role}</small></span><Icon name="arrow" /></button>
      <div className="admin-goat-person__score"><strong>{score.format(entry.worker.rating)}</strong><span>баллов<br />из 100</span><Icon name={kind === 'best' ? 'trophy' : 'clock'} /></div>
      <dl className="admin-goat-person__metrics"><div><dt>Выполнено задач</dt><dd>{entry.completed}</dd></div><div><dt>Выполнено вовремя</dt><dd>{entry.onTime === null ? '—' : `${entry.onTime}%`}</dd></div><div><dt>Просрочено сейчас</dt><dd>{entry.overdue}</dd></div></dl>
      <button type="button" className="employee-button admin-goat-person__open" onClick={() => onOpenWorker(entry.worker.id)}>Открыть анкету<Icon name="arrow" /></button>
    </div>) : <div className="admin-goat-card__empty"><Icon name={kind === 'best' ? 'trophy' : 'team'} /><h3>Пока не определён</h3><p>{emptyText}</p></div>}
  </section>;
}

export default function AdminGoat({ workers, tasks, now, onOpenWorker }: { workers: Worker[]; tasks: TeamTask[]; now: number; onOpenWorker: (id: number) => void }) {
  const { eligible, best, worst } = goatHighlights(monthlyGoatEntries(workers, tasks, now));
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(now).replace(' г.', '');
  const noWorst = eligible.length > 1 ? 'У всех участников одинаковый балл. Худшего сотрудника не выделяем.' : eligible.length === 1 ? 'Пока участвует один сотрудник. Для сравнения нужны хотя бы двое.' : 'Для участия нужны минимум 5 выполненных или просроченных задач за месяц.';
  return <section className="admin-goat" aria-label="GOAT — рейтинг команды">
    <div className="admin-goat-period"><span><Icon name="calendar" /><time dateTime={`${new Date(now).getFullYear()}-${String(new Date(now).getMonth() + 1).padStart(2, '0')}`}>{month}</time><small>Месяц идёт</small></span><p>Участвуют <strong>{eligible.length}</strong> из {workers.length} сотрудников</p></div>
    <div className="admin-goat-cards"><Highlight entries={best} kind="best" onOpenWorker={onOpenWorker} emptyText="Первые результаты появятся, когда у сотрудников будет минимум 5 выполненных или просроченных задач за месяц." /><Highlight entries={worst} kind="worst" onOpenWorker={onOpenWorker} emptyText={noWorst} /></div>
    <section className="admin-panel admin-goat-rules" aria-labelledby="goat-rules-title"><div className="admin-goat-rules__intro"><Icon name="trophy" /><div><h2 id="goat-rules-title">Из чего складывается рейтинг</h2><p>Результат за календарный месяц. Итоги меняются до его окончания.</p></div></div><div className="admin-goat-rules__weights"><div><strong>60<span>%</span></strong><span>Продуктивность</span></div><div><strong>40<span>%</span></strong><span>Пунктуальность</span></div></div><p className="admin-goat-rules__minimum">Для участия — минимум <strong>5</strong> выполненных или просроченных задач за месяц. Незавершённые задачи с будущим дедлайном пока не оцениваются.</p></section>
  </section>;
}
