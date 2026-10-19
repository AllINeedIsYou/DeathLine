import { Icon } from '../employee/EmployeeScreen';
import { type TeamTask, type Worker } from './team';
import { useTeamData, initials } from '../data/team-data';
import { useSession } from '../../shared/session';
type GoatEntry = { worker: Worker; completed: number; overdue: number; onTime: number | null; evaluated: number };
import './admin-goat.css';

const score = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
function Highlight({ entries, kind, onOpenWorker, emptyText }: { entries: GoatEntry[]; kind: 'best' | 'worst'; onOpenWorker: (id: number) => void; emptyText?: string }) {
  return <section className={`admin-goat-card admin-goat-card--${kind}`} aria-label={kind === 'best' ? "Top member of the month" : "Lowest-rated member of the month"}>
    <div className="admin-goat-card__heading"><Icon name={kind === 'best' ? 'trophy' : 'clock'} /><h2>{kind === 'best' ? "Top member of the month" : "Lowest-rated member of the month"}</h2>{kind === 'worst' && <span>Admins only</span>}</div>
    {entries.length > 1 && <p className="admin-goat-card__tie">Equal scores for {entries.length} members</p>}
    {entries.length ? entries.map(entry => <div className="admin-goat-person" key={entry.worker.id}>
      <button type="button" className="admin-goat-person__link" aria-label={`Open profile: ${entry.worker.name}`} onClick={() => onOpenWorker(entry.worker.id)}><span className={`admin-avatar admin-avatar--${entry.worker.color}`} aria-hidden="true">{entry.worker.initials}</span><span><strong>{entry.worker.name}</strong><small>{entry.worker.role}</small></span><Icon name="arrow" /></button>
      <div className="admin-goat-person__score"><strong>{score.format(entry.worker.rating!)}</strong><span>points<br />out of 100</span><Icon name={kind === 'best' ? 'trophy' : 'clock'} /></div>
      <dl className="admin-goat-person__metrics"><div><dt>Completed tasks</dt><dd>{entry.completed}</dd></div><div><dt>Completed on time</dt><dd>{entry.onTime === null ? '—' : `${entry.onTime}%`}</dd></div><div><dt>Currently overdue</dt><dd>{entry.overdue}</dd></div></dl>
      <button type="button" className="employee-button admin-goat-person__open" onClick={() => onOpenWorker(entry.worker.id)}>Open profile<Icon name="arrow" /></button>
    </div>) : <div className="admin-goat-card__empty"><Icon name={kind === 'best' ? 'trophy' : 'team'} /><h3>Not determined yet</h3><p>{emptyText}</p></div>}
  </section>;
}

export default function AdminGoat({ workers, now, onOpenWorker }: { workers: Worker[]; tasks: TeamTask[]; now: number; onOpenWorker: (id: number) => void }) {
  const { goat } = useTeamData();
  const { team } = useSession();
  const entries: GoatEntry[] = (goat.data?.members || []).map(item => ({ worker: { ...(workers.find(worker => worker.id === item.user_id) || { id: item.user_id, memberId: item.member_id, name: item.name, initials: initials(item.name), role: item.job_title || '', color: 'teal', email: '', phone: '', telegram: '', timeZone: team!.timezone }), rating: item.score }, completed: item.statistics.completed, overdue: item.statistics.overdue, onTime: item.statistics.on_time_percent, evaluated: item.statistics.completed + item.statistics.overdue }));
  const eligible = entries.filter(entry => entry.worker.rating !== null);
  const bestScore = Math.max(...eligible.map(entry => entry.worker.rating!));
  const worstScore = Math.min(...eligible.map(entry => entry.worker.rating!));
  const best = eligible.filter(entry => entry.worker.rating === bestScore);
  const worst = bestScore === worstScore ? [] : eligible.filter(entry => entry.worker.rating === worstScore);
  if (!goat.data) return <div className="admin-panel" role={goat.error ? 'alert' : 'status'}>{goat.error || "Loading ratings…"}{goat.error && <button onClick={() => void goat.reload()}>Retry</button>}</div>;
  const month = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: team!.timezone }).format(now);
  const noWorst = eligible.length > 1 ? "Everyone has the same score. No lowest-rated member is selected." : eligible.length === 1 ? "Only one member is eligible so far. At least two are needed for comparison." : "At least 5 completed or overdue tasks per month are required.";
  return <section className="admin-goat" aria-label="GOAT — team ranking">
    {goat.error && <p role="alert">{goat.error}</p>}<div className="admin-goat-period"><span><Icon name="calendar" /><time dateTime={`${new Date(now).getFullYear()}-${String(new Date(now).getMonth() + 1).padStart(2, '0')}`}>{month}</time><small>Month in progress</small></span><p>Eligible: <strong>{eligible.length}</strong> of {workers.length} members</p></div>
    <div className="admin-goat-cards"><Highlight entries={best} kind="best" onOpenWorker={onOpenWorker} emptyText="Results appear once members have at least 5 completed or overdue tasks this month." /><Highlight entries={worst} kind="worst" onOpenWorker={onOpenWorker} emptyText={noWorst} /></div>
    <section className="admin-panel admin-goat-rules" aria-labelledby="goat-rules-title"><div className="admin-goat-rules__intro"><Icon name="trophy" /><div><h2 id="goat-rules-title">How the rating works</h2><p>Results cover a calendar month and can change before it ends.</p></div></div><div className="admin-goat-rules__weights"><div><strong>60<span>%</span></strong><span>Productivity</span></div><div><strong>40<span>%</span></strong><span>Punctuality</span></div></div><p className="admin-goat-rules__minimum">Eligibility requires at least <strong>5</strong> completed or overdue tasks per month. Open tasks with future deadlines are not evaluated yet.</p></section>
  </section>;
}
