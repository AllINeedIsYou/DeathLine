import { useEffect, useId, useRef, useState } from 'react';
import { useTaskHistory } from '../data/team-data';

export default function ProgressChart({ memberId }: { memberId?: number }) {
  const resource = useTaskHistory(memberId);
  const history = resource.data;
  const plot = useRef<SVGSVGElement>(null);
  const title = useId();
  const [width, setWidth] = useState(742);
  const [selected, setSelected] = useState<number | null>(null);
  const [visible, setVisible] = useState({ completed: true, overdue: true, created: true });
  useEffect(() => {
    const element = plot.current; if (!element) return;
    const observer = new ResizeObserver(() => setWidth(Math.max(240, element.clientWidth)));
    observer.observe(element); return () => observer.disconnect();
  }, [history !== undefined]);
  const series = [{ key: 'completed', title: "Completed", color: '#00c8ff' }, { key: 'overdue', title: "Overdue", color: '#ff4965' }, { key: 'created', title: memberId === undefined ? "Created" : "Assigned", color: '#97afd6' }] as const;
  const points = history?.points || [];
  const max = Math.max(10, Math.ceil(Math.max(0, ...points.flatMap(point => [point.created ?? 0, point.completed ?? 0, point.overdue ?? 0])) / 10) * 10);
  const left = 32, right = width - 16, top = 12, bottom = 185;
  const x = (index: number) => points.length === 1 ? right : left + index / Math.max(1, points.length - 1) * (right - left);
  const y = (value: number) => bottom - value / max * (bottom - top);
  const index = Math.min(selected ?? points.length - 1, points.length - 1);
  const point = points[index];
  const day = (at: string) => new Intl.DateTimeFormat('en-US', { timeZone: history?.timezone, day: 'numeric' }).format(Date.parse(at));
  return <section className="admin-panel admin-chart" aria-labelledby={title}><div className="admin-panel__heading admin-chart__heading"><div><h2 id={title}>Task progress</h2><p>{memberId === undefined ? "Entire team" : "Employee tasks"} · this month</p></div><div className="admin-chart__legend">{series.map(item => <button type="button" key={item.key} aria-pressed={visible[item.key]} onClick={() => setVisible(current => ({ ...current, [item.key]: !current[item.key] }))}><span style={{ background: item.color }} />{item.title}</button>)}</div></div>
    {resource.error && <p role="alert">{resource.error} <button className="employee-button" onClick={() => void resource.reload()}>Retry</button></p>}
    {!history ? <p role="status">{resource.loading ? "Loading history…" : "History is unavailable."}</p> : !points.length ? <p>No history points for this month yet.</p> : <>
      <div className="admin-chart__readout" aria-live="polite"><span>{new Intl.DateTimeFormat('en-US', { timeZone: history.timezone, day: 'numeric', month: 'long' }).format(Date.parse(point.at))}</span>{series.filter(item => visible[item.key]).map(item => <span key={item.key}><i style={{ background: item.color }} />{item.title}: <strong>{point[item.key] ?? "no history"}</strong></span>)}</div>
      {!history.history_complete && <p className="admin-empty">Some older tasks have no recorded history. Missing values appear as gaps.</p>}
      <svg className="admin-chart__plot" ref={plot} viewBox={`0 0 ${width} 220`} role="group" aria-label="Daily task history for the month">
        {Array.from({ length: 6 }, (_, i) => max / 5 * i).map(value => <g key={value} aria-hidden="true"><line x1={left} x2={right} y1={y(value)} y2={y(value)} className="admin-chart__grid" /><text x="23" y={y(value) + 4} textAnchor="end">{value}</text></g>)}
        {points.map((entry, i) => (i % Math.max(1, Math.ceil(points.length / 6)) === 0 || i === points.length - 1) && <text key={entry.at} x={x(i)} y="210" textAnchor="middle">{day(entry.at)}</text>)}
        {series.filter(item => visible[item.key]).map(item => { let drawing = false; const path = points.map((entry, i) => { const value = entry[item.key]; if (value === null) { drawing = false; return ''; } const command = drawing ? 'L' : 'M'; drawing = true; return `${command}${x(i)},${y(value)}`; }).join(' '); return <path key={item.key} d={path} fill="none" stroke={item.color} strokeWidth={item.key === 'created' ? 1.5 : 2.5} strokeDasharray={item.key === 'created' ? '5 7' : undefined} />; })}
        <line x1={x(index)} x2={x(index)} y1={top} y2={bottom} stroke="#7da8cb" strokeOpacity=".3" strokeDasharray="3 5" />
        {points.map((entry, i) => <g key={entry.at} role="button" tabIndex={0} aria-label={`${day(entry.at)} day: ${series.map(item => `${item.title} ${entry[item.key] ?? "no history"}`).join(', ')}`} onMouseEnter={() => setSelected(i)} onFocus={() => setSelected(i)} onClick={() => setSelected(i)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(i); } }}><rect x={x(i) - 12} y={top} width={24} height={bottom - top} fill="transparent" />{series.filter(item => visible[item.key] && entry[item.key] !== null).map(item => <circle key={item.key} cx={x(i)} cy={y(entry[item.key]!)} r={i === index ? 3 : 1.5} fill={item.color} />)}</g>)}
      </svg>
    </>}
  </section>;
}
