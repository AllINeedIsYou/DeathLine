import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '../employee/EmployeeScreen';
import './deadline-field.css';

const pad = (value: number) => String(value).padStart(2, '0');
export function calendarDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function shiftCalendarDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return calendarDateValue(date);
}
export function shiftCalendarMonth(value: string) {
  const date = new Date(`${value}T12:00:00`);
  const target = new Date(date.getFullYear(), date.getMonth() + 1, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return calendarDateValue(target);
}
function monthStart(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}
const dayLabel = (value: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));

export default function DeadlineField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [date, time = ''] = value.split('T');
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthStart(date));
  const [focusedDate, setFocusedDate] = useState(date);
  const root = useRef<HTMLFieldSetElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const restoreFocus = () => trigger.current?.focus({ preventScroll: true });
  function close(refocus = false) { setOpen(false); if (refocus) restoreFocus(); }
  function choose(next: string) { onChange(`${next}T${time}`); close(true); }
  function showCalendar() { setMonth(monthStart(date)); setFocusedDate(date); setOpen(true); }
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    if (open) calendar.current?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`)?.focus();
  }, [open, focusedDate]);
  const first = new Date(month);
  first.setDate(1 - (month.getDay() + 6) % 7);
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  function moveMonth(offset: number) {
    const target = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
    const day = new Date(`${focusedDate}T12:00:00`).getDate();
    target.setDate(Math.min(day, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
    setMonth(monthStart(calendarDateValue(target))); setFocusedDate(calendarDateValue(target));
  }
  function dayKey(event: KeyboardEvent<HTMLButtonElement>, current: string) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: string;
    if (event.key in offsets) next = shiftCalendarDate(current, offsets[event.key]);
    else if (event.key === 'Home' || event.key === 'End') {
      const weekday = (new Date(`${current}T12:00:00`).getDay() + 6) % 7;
      next = shiftCalendarDate(current, event.key === 'Home' ? -weekday : 6 - weekday);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const currentDate = new Date(`${current}T12:00:00`);
      const target = new Date(currentDate.getFullYear(), currentDate.getMonth() + (event.key === 'PageUp' ? -1 : 1), 1, 12);
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      target.setDate(Math.min(currentDate.getDate(), lastDay));
      next = calendarDateValue(target);
    } else return;
    event.preventDefault(); setMonth(monthStart(next)); setFocusedDate(next);
  }
  return <fieldset ref={root} className="admin-deadline" onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) close(); }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); }
  }}>
    <legend>Дедлайн</legend>
    <div className="admin-deadline__fields">
      <button ref={trigger} className="admin-deadline__date" type="button" aria-label={`Дата дедлайна: ${date.split('-').reverse().join('.')}`} aria-expanded={open} aria-controls="deadline-calendar" onClick={() => open ? close(true) : showCalendar()}><Icon name="calendar" /><span>{date.split('-').reverse().join('.')}</span><span className="admin-deadline__chevron" aria-hidden="true">⌄</span></button>
      <label className="admin-deadline__time"><span className="admin-visually-hidden">Время дедлайна</span><Icon name="clock" /><input type="text" name="deadline-time" inputMode="numeric" autoComplete="off" required maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" title="Время в формате ЧЧ:ММ, например 15:30" placeholder="ЧЧ:ММ" value={time} onChange={event => onChange(`${date}T${event.target.value}`)} onBlur={() => {
        const digits = time.replace(/\D/g, '');
        if (/^\d{4}$/.test(digits) && Number(digits.slice(0, 2)) < 24 && Number(digits.slice(2)) < 60) onChange(`${date}T${digits.slice(0, 2)}:${digits.slice(2)}`);
      }} /></label>
    </div>
    <div className="admin-deadline__quick" role="group" aria-label="Перенести срок"><button type="button" onClick={() => choose(shiftCalendarDate(date, 1))}>+1 день</button><button type="button" onClick={() => choose(shiftCalendarDate(date, 7))}>+неделя</button><button type="button" onClick={() => choose(shiftCalendarMonth(date))}>+месяц</button></div>
    {open && <div ref={calendar} id="deadline-calendar" className="admin-calendar" role="group" aria-label="Календарь дедлайна">
      <div className="admin-calendar__heading"><strong aria-live="polite">{new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(month)} {month.getFullYear()}</strong><button type="button" aria-label="Закрыть календарь" onClick={() => close(true)}><Icon name="close" /></button></div>
      <div className="admin-calendar__navigation"><button type="button" aria-label="Предыдущий месяц" onClick={() => moveMonth(-1)}>‹</button><button type="button" onClick={() => { const today = calendarDateValue(new Date()); setMonth(monthStart(today)); setFocusedDate(today); }}>К текущему месяцу</button><button type="button" aria-label="Следующий месяц" onClick={() => moveMonth(1)}>›</button></div>
      <div className="admin-calendar__week" aria-hidden="true">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="admin-calendar__days">{days.map(day => { const key = calendarDateValue(day); const outside = day.getMonth() !== month.getMonth(); return <button type="button" key={key} data-date={key} className={`${outside ? 'is-outside ' : ''}${key === calendarDateValue(new Date()) ? 'is-today' : ''}`} aria-label={dayLabel(key)} aria-pressed={key === date} tabIndex={key === focusedDate ? 0 : -1} onKeyDown={event => dayKey(event, key)} onClick={() => choose(key)}>{day.getDate()}</button>; })}</div>
      <p>Выбери день — время останется прежним.</p>
    </div>}
  </fieldset>;
}
