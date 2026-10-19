import { useTeamData, initials } from '../data/team-data';
import { useSession } from '../../shared/session';
import { Icon } from './EmployeeScreen';

export default function EmployeeGoat() {
  const { goat } = useTeamData();
  const { team } = useSession();
  const result = goat.data;
  const personal = result?.my_result;
  const month = new Intl.DateTimeFormat('en-US', { timeZone: team!.timezone, month: 'long', year: 'numeric' }).format(Date.now());
  const format = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  if (!result || !personal) return <section className="admin-panel" role={goat.error ? 'alert' : 'status'}>{goat.error || "Loading ratings…"}{goat.error && <button onClick={() => void goat.reload()}>Retry</button>}</section>;
  return <section className="employee-goats employee-goats--new-member" aria-label="Team ranking and personal results">
    {goat.error && <p className="connection-banner" role="alert">{goat.error}</p>}
    <div className="employee-goats__period"><Icon name="calendar" /><span>{month}</span><span className="employee-goats__period-line" /></div><div className="employee-goats__cards">
      {result.leaders?.length ? result.leaders.map(winner => <article className="employee-goat-winner" key={winner.member_id}><div className="employee-goats__eyebrow"><Icon name="trophy" />TOP MEMBER OF THE MONTH</div><div className="employee-goat-winner__person"><span className="employee-goat-winner__avatar">{initials(winner.name)}</span><div><span className="employee-goat-winner__place">MONTHLY LEADER · PROVISIONAL</span><h2>{winner.name}</h2><p>{winner.job_title || "Team member"}</p></div></div><div className="employee-goat-winner__score"><strong>{format(winner.score!)}</strong><span>points<br />out of 100</span></div><div className="employee-goat-winner__metrics"><div><strong>{winner.statistics.completed}</strong><span>Completed tasks</span></div><div><strong>{winner.statistics.on_time_percent === null ? '—' : `${winner.statistics.on_time_percent}%`}</strong><span>On time</span></div></div></article>) : <article className="employee-goat-winner"><div className="employee-rating-empty"><Icon name="trophy" /><h2>No leader yet</h2><p>At least 5 completed or overdue tasks per month are required.</p></div></article>}
      <article className="employee-personal-rating"><div className="employee-goats__eyebrow"><Icon name="chart" />YOUR PERSONAL RATING</div><h2>{personal.name}</h2>{personal.score !== null ? <><p className="employee-personal-rating__sub">Your place among this month's participants</p><div className="employee-personal-rating__rank"><strong><span>#</span>{personal.rank}</strong><div><strong>{format(personal.score)}</strong><span>points out of 100</span></div></div><div className="employee-goat-winner__metrics"><div><strong>{personal.statistics.completed}</strong><span>Completed tasks</span></div><div><strong>{personal.statistics.on_time_percent === null ? '—' : `${personal.statistics.on_time_percent}%`}</strong><span>On time</span></div></div></> : <div className="employee-rating-empty"><Icon name="chart" /><h3>Not enough data</h3><p>Your rating will appear after your first 5 completed or overdue tasks this month.</p><span>Evaluated so far: {personal.statistics.completed + personal.statistics.overdue} of 5 tasks</span></div>}</article>
    </div><div className="employee-goats__rules"><Icon name="trophy" /><p><strong>60%</strong> — productivity, <strong>40%</strong> — punctuality. The month is determined by the task deadline and the team's time zone.</p></div>
  </section>;
}
