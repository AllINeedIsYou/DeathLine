import { useEffect, useState } from 'react';
import './borrowed-time.js';

export default function BorrowedTime({ glitchesEnabled = true }: { glitchesEnabled?: boolean }) {
  const [clock] = useState(() => DeathlineTime.createClock());
  const [reading, setReading] = useState(() => clock.tick(false));

  useEffect(() => {
    const update = () => setReading(clock.tick(!document.hidden));
    const visibilityChanged = () => setReading(clock.tick(false));
    const interval = window.setInterval(update, 200);
    document.addEventListener('visibilitychange', visibilityChanged);
    update();
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [clock]);

  const time = DeathlineTime.formatTime(reading.remainingSeconds);
  const parts = time.split(':');
  const labels = ['ЧАСЫ', 'МИНУТЫ', 'СЕКУНДЫ'];

  return (
    <section className={`borrowed-time${glitchesEnabled && reading.glitching ? ' is-glitching' : ''}${reading.ended ? ' is-ended' : ''}`} aria-labelledby="borrowed-time-title">
      <header className="borrowed-time__header">
        <h2 id="borrowed-time-title"><span className="status-dot" /> Время, доктор Фримен? Неужели опять пришло то самое время?</h2>
        <span className="borrowed-time__state">{reading.ended ? 'ОТСЧЁТ ЗАВЕРШЁН' : 'ОТСЧЁТ ИДЁТ'}</span>
      </header>
      <div className="borrowed-time__body">
        <div className="borrowed-time__clock" role="timer" aria-live="off" aria-label={`Осталось ${time}`}>
          {parts.map((part, index) => (
            <div className="borrowed-time__unit" key={labels[index]} aria-hidden="true">
              <span className="borrowed-time__value" data-value={part}>{part}</span>
              <span className="borrowed-time__label">{labels[index]}</span>
            </div>
          ))}
        </div>
        <p className="borrowed-time__quote">{reading.ended ? 'Время вышло. Начни с главного.' : 'Кажется, ещё успеем.'}</p>
        <div className={`borrowed-time__bonus${reading.bonusVisible ? ' is-visible' : ''}`} aria-hidden="true">
          +{DeathlineTime.formatTime(reading.bonusSeconds)} <span>· ОТСРОЧКА</span>
        </div>
      </div>
      <footer className="borrowed-time__footer">
        <div className="borrowed-time__progress" aria-hidden="true"><span style={{ width: `${reading.progress * 100}%` }} /></div>
        <div className="borrowed-time__footer-line"><span>Время не ждёт.</span><span>DEATHLINE</span></div>
      </footer>
    </section>
  );
}
