import { FormEvent, ReactNode, useEffect, useId, useState } from 'react';
import BorrowedTime from './BorrowedTime';
import { useTimedNotice } from '../../shared/useTimedNotice';
import './auth.css';
import { serviceUnavailableMessage } from '../../shared/service';

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.6" />
      {hidden && <path d="M3 21 21 3" strokeWidth="2.2" />}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  );
}

const glitchPreferenceKey = 'deathline.glitches-enabled';
function readGlitchPreference() {
  try { return window.localStorage.getItem(glitchPreferenceKey) !== 'false'; } catch { return true; }
}

function Logo({ glitchesEnabled, notice, onToggle }: { glitchesEnabled: boolean; notice: string; onToggle: () => void }) {
  return (
    <div className="brand">
      <button type="button" className="brand__mark brand__mark--toggle" aria-label="Глитчи" aria-pressed={glitchesEnabled} title={glitchesEnabled ? 'Отключить глитчи' : 'Включить глитчи'} onClick={onToggle}><img src="/brand/deathline-logo.png" alt="" /></button>
      <span className="brand__name">Death<span>Line</span></span>
      <span className={`brand__glitch-notice${notice ? ' is-visible' : ''}`} role="status" aria-live="polite" aria-atomic="true">{notice}</span>
    </div>
  );
}

type Notice = { kind: 'info' | 'error'; message: string } | null;

export default function AuthScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const usernameId = useId();
  const passwordId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setNotice({ kind: 'error', message: 'Введите логин и пароль, чтобы продолжить.' });
      return;
    }
    // The current backend has no authentication endpoint or defined response contract.
    // Until the backend owner provides that contract, NEVER simulate a successful login.
    setNotice({
      kind: 'error',
      message: serviceUnavailableMessage,
    });
  }

  return <AuthShell>
            <div className="auth-pane__intro">
            <div className="auth-pane__badge"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg> ЛИЧНЫЙ КАБИНЕТ</div>
            <h2 id="auth-heading">С возвращением<span className="auth-pane__punct">.</span></h2>
            <p className="auth-pane__sub">Войди в аккаунт, чтобы вернуться<br />к своим задачам и дедлайнам.</p>
            </div>
            <form className="login-form" onSubmit={submit} noValidate>
              <div className="login-form__field">
                <label htmlFor={usernameId}>Логин</label>
                <div className="input-shell">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 2.8-5.5 7-5.5s7 2.2 7 5.5" /></svg>
                  <input id={usernameId} type="text" name="username" autoComplete="username" placeholder="Введите логин" value={username} onChange={(e) => {setUsername(e.target.value); setNotice(null);}} required />
                </div>
              </div>
              <div className="login-form__field">
                <label htmlFor={passwordId}>Пароль</label>
                <div className="input-shell">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>
                  <input id={passwordId} type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Введите пароль" value={password} onChange={(e) => {setPassword(e.target.value); setNotice(null);}} required />
                  <button className="input-shell__toggle" type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} aria-pressed={showPassword}><EyeIcon hidden={showPassword} /></button>
                </div>
              </div>
              {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`login-form__notice login-form__notice--${notice.kind}`}>{notice.message}</div>}
              <button className="login-form__submit" type="submit"><span>Войти в систему</span><ArrowIcon /></button>
            </form>
            <p className="auth-flow-link">Нет аккаунта? <a href="/register/">Создать аккаунт</a></p>
  </AuthShell>;
}

export function AuthShell({ children, flow = false }: { children: ReactNode; flow?: boolean }) {
  const [glitchesEnabled, setGlitchesEnabled] = useState(readGlitchPreference);
  const [glitchNotice, showGlitchNotice] = useTimedNotice(5000);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === glitchPreferenceKey || event.key === null) setGlitchesEnabled(readGlitchPreference()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function toggleGlitches() {
    const next = !glitchesEnabled;
    setGlitchesEnabled(next);
    showGlitchNotice(next ? 'Глитчи вкл' : 'Глитчи выкл');
    try { window.localStorage.setItem(glitchPreferenceKey, String(next)); } catch { /* Keep the choice for this page when storage is unavailable. */ }
  }
  return (
    <main className={`auth-page${flow ? " auth-page--flow" : ""}`}>
      <div className="auth-page__grid" aria-hidden="true" />
      <div className="auth-page__glow auth-page__glow--first" aria-hidden="true" />
      <div className="auth-page__glow auth-page__glow--second" aria-hidden="true" />
      <div className="auth-container">
        <section className="showcase" aria-label="О DeathLine">
          <header className="showcase__header">
            <Logo glitchesEnabled={glitchesEnabled} notice={glitchNotice} onToggle={toggleGlitches} />
            <div className="showcase__edition"><span className="status-dot" /> CONTROL SYSTEM <span className="showcase__edition-ver">/ 01</span></div>
          </header>

          <div className="showcase__copy">
            <p className="eyebrow"><span className="eyebrow__dash" /> СИСТЕМА УПРАВЛЕНИЯ ДЕДЛАЙНАМИ</p>
            <h1>Время срать,<br /><span>а мы не ели.</span></h1>
            <p className="showcase__desc">Задачи. Дедлайны. Результаты.<br />Всё под контролем — в одном пространстве.</p>
          </div>

          <BorrowedTime glitchesEnabled={glitchesEnabled} />

          <div className="showcase__bottom"><span>FOCUS ON WHAT MATTERS.</span><span>© 2026 DEATHLINE</span></div>
        </section>

        <section className="auth-pane" aria-labelledby="auth-heading">
          <div className="auth-pane__top"><span className="auth-pane__top-line" /> ЕДИНАЯ ТОЧКА ВХОДА <span>01 / 01</span></div>
          <div className="auth-pane__content">
            {children}
          </div>
          <div className="auth-pane__bottom"><span><span className="status-dot" /> DEATHLINE</span><span>DESIGNED FOR DEATHLINE</span></div>
        </section>
      </div>
    </main>
  );
}
