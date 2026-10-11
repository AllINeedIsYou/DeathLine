import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthShell } from './AuthScreen';
import { createTeam, inviteRoles, inviteStatus, normalizeContacts, teamPath, updateInvitation, useInvitations, validEmail, type Team } from './invitations';
import './join.css';
import { serviceUnavailableMessage } from '../../shared/service';
const employeePath = () => '/employee/';

type Stage = 'account' | 'confirm' | 'choice' | 'team' | 'accept' | 'done';
const failureMessages = {
  expired: ['Время вышло', 'Срок действия ссылки истёк. Попроси администратора создать новое приглашение.'],
  revoked: ['Приглашение отменено', 'Администратор отменил эту ссылку. Для вступления понадобится новое приглашение.'],
  accepted: ['Приглашение принято', 'Эта ссылка уже использована. Повторно присоединиться по ней нельзя.'],
  missing: ['Приглашение недоступно', 'Не удалось загрузить приглашение. Попробуй открыть ссылку позже.'],
};
export default function JoinScreen({ token }: { token?: string }) {
  const data = useInvitations();
  const invite = data.invites.find(item => item.token === token);
  const invitedTeam = data.teams.find(team => team.id === invite?.teamId);
  const [stage, setStage] = useState<Stage>('account');
  const [existing, setExisting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(invite?.email ?? '');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [createdTeam, setCreatedTeam] = useState<Team | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, []);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); setError(''); }, [stage, existing]);
  useEffect(() => { document.title = `${token ? 'Приглашение в команду' : 'Регистрация'} · DeathLine`; }, [token]);
  const status = invite ? inviteStatus(invite, now) : 'missing';
  const unavailable = !!token && status !== 'pending' && stage !== 'done';
  const failure = unavailable ? failureMessages[status as keyof typeof failureMessages] : null;
  const titles: Record<Stage, string> = { account: token ? 'Тебя пригласили.' : 'Начнём отсчёт.', confirm: existing ? 'Проверим почту.' : 'Подтверди почту.', choice: 'Твоё пространство.', team: 'Собери команду.', accept: 'Всё готово к старту.', done: createdTeam ? 'Команда готова.' : 'Ты в команде.' };
  function submitAccount(event: FormEvent) {
    event.preventDefault();
    if ((!existing && !name.trim()) || !username.trim() || !password || !validEmail(email.trim())) { setError('Заполни имя, почту, логин и пароль.'); return; }
    if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username.trim())) { setError('Логин: 3–40 латинских букв, цифр, точек, дефисов или подчёркиваний.'); return; }
    if (!existing && password.length < 8) { setError('Для нового аккаунта нужен пароль от 8 символов.'); return; }
    if (!existing) {
      try { const contacts = normalizeContacts({ phone, telegram }); setPhone(contacts.phone); setTelegram(contacts.telegram); }
      catch (reason) { setError(reason instanceof Error ? reason.message : 'Проверь контакты.'); return; }
    }
    // Credentials are deliberately discarded. No account or session is simulated.
    setPassword(''); setShowPassword(false); setError(serviceUnavailableMessage);
  }
  function accept() {
    if (!invite) return;
    try { updateInvitation(invite.token, 'accept', email, name, Date.now(), existing ? undefined : { phone, telegram }); setStage('done'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось принять приглашение.'); setNow(Date.now()); }
  }
  const step = stage === 'account' ? 1 : stage === 'confirm' ? 2 : 3;
  return <AuthShell flow>
    <a className="join-back" href="/">← К экрану входа</a>
    <div className="join-steps" aria-label={`Шаг ${step} из 3`}>{['Аккаунт', 'Почта', token ? 'Вступление' : 'Команда'].map((label, index) => <span key={label} className={index + 1 <= step ? 'is-reached' : ''}><b>{index + 1}</b>{label}</span>)}</div>
    <h2 id="auth-heading" ref={heading} tabIndex={-1}>{failure ? failure[0] : titles[stage]}</h2>
    {failure ? <><p className="auth-pane__sub">{failure[1]}</p>{status === 'accepted' && invite && <a className="login-form__submit join-primary-link" href={invite.role === 'employee' ? employeePath() : teamPath(invite.teamId)}>Открыть кабинет →</a>}<a className="join-secondary" href="/">Перейти ко входу</a></> : <>
      {token && invitedTeam && invite && stage !== 'done' && <div className="join-invitation"><span>ПРИГЛАШЕНИЕ В КОМАНДУ</span><strong>{invitedTeam.name}</strong><dl><div><dt>Твоя роль</dt><dd>{inviteRoles[invite.role]}</dd></div><div><dt>Для почты</dt><dd>{invite.email}</dd></div><div><dt>Действует до</dt><dd>{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(invite.expiresAt)}</dd></div></dl></div>}
      {stage === 'account' && <>
        <p className="auth-pane__sub">{token ? 'Присоединись к команде с новым или существующим аккаунтом.' : 'Один аккаунт для твоих задач и команды. Телефон и Telegram можно указать сейчас или добавить позже.'}</p>
        {token && <div className="join-switch" aria-label="Способ входа"><button type="button" aria-pressed={!existing} onClick={() => { setExisting(false); setPassword(''); }}>Новый аккаунт</button><button type="button" aria-pressed={existing} onClick={() => { setExisting(true); setPassword(''); }}>Уже есть аккаунт</button></div>}
        <form className="login-form join-form" onSubmit={submitAccount}>
          {!existing && <label>Имя<input name="name" autoComplete="off" maxLength={80} required value={name} placeholder="Как к тебе обращаться" onChange={event => setName(event.target.value)} /></label>}
          {!existing && <label>Почта<input name="email" type="email" autoComplete="off" maxLength={254} required readOnly={!!invite} value={email} placeholder="name@example.com" onChange={event => setEmail(event.target.value)} /></label>}
          {!!invite && !existing && <p className="join-hint">Ссылка предназначена для этой почты. Используй аккаунт с таким же адресом.</p>}
          {!existing && <><label><span>Телефон <small>необязательно</small></span><input name="phone" type="tel" autoComplete="off" maxLength={40} value={phone} placeholder="+7 (___) ___-__-__" onChange={event => setPhone(event.target.value)} /></label><label><span>Telegram <small>необязательно</small></span><input name="telegram" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={33} value={telegram} placeholder="@username" onChange={event => setTelegram(event.target.value)} /></label></>}
          <label>Логин<input name="username" autoComplete="off" minLength={3} maxLength={40} required value={username} placeholder="Твой логин" onChange={event => setUsername(event.target.value)} /></label>
          <label>Пароль<span className="join-password"><input aria-label="Пароль" name="password" type={showPassword ? 'text' : 'password'} autoComplete="off" required maxLength={128} minLength={existing ? 1 : 8} value={password} placeholder={existing ? 'Пароль аккаунта' : 'Не менее 8 символов'} onChange={event => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Скрыть' : 'Показать'}</button></span></label>
          
          {error && <p className="login-form__notice login-form__notice--error" role="alert">{error}</p>}
          <button className="login-form__submit" type="submit">Продолжить <span aria-hidden="true">→</span></button>
        </form>
        {!token && <p className="auth-flow-link">Уже зарегистрирован? <a href="/">Войти</a></p>}
      </>}
      {stage === 'confirm' && <div className="join-stage"><p>Подтверди почту <strong>{email}</strong> по ссылке из письма.</p>{error && <p className="login-form__notice login-form__notice--error" role="alert">{error}</p>}<button type="button" className="login-form__submit" onClick={() => setError(serviceUnavailableMessage)}>Проверить подтверждение <span aria-hidden="true">→</span></button><button type="button" className="join-secondary" onClick={() => setStage('account')}>Вернуться к данным</button></div>}
      {stage === 'choice' && <div className="join-stage"><p>Создай своё пространство и пригласи коллег. Ты станешь администратором своей команды.</p><button type="button" className="login-form__submit" onClick={() => setStage('team')}>Создать команду <span aria-hidden="true">→</span></button><div className="join-wait"><strong>Тебя пригласили?</strong><p>Открой персональную ссылку от администратора. Команда и роль будут указаны в ней.</p></div></div>}
      {stage === 'team' && <form className="login-form join-form" onSubmit={event => { event.preventDefault(); try { const team = createTeam(teamName, { phone, telegram }); setCreatedTeam(team); setStage('done'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить команду.'); } }}><p className="auth-pane__sub">Название увидят все, кого ты пригласишь.</p><label>Название команды<input required autoComplete="off" maxLength={80} placeholder="Например, команда без дедлайнов" value={teamName} onChange={event => setTeamName(event.target.value)} /></label><div className="join-wait"><strong>Твоя роль — администратор</strong><p>Ты сможешь приглашать сотрудников и других администраторов.</p></div>{error && <p role="alert" className="login-form__notice login-form__notice--error">{error}</p>}<button type="submit" className="login-form__submit">Создать команду <span aria-hidden="true">→</span></button><button type="button" className="join-secondary" onClick={() => setStage('choice')}>Назад</button></form>}
      {stage === 'accept' && <div className="join-stage"><p><strong>{name}</strong>, всё готово для вступления в команду. Роль «{invite && inviteRoles[invite.role]}» назначена администратором.</p>{error && <p role="alert" className="login-form__notice login-form__notice--error">{error}</p>}<button className="login-form__submit" type="button" onClick={accept}>Принять приглашение <span aria-hidden="true">→</span></button><button className="join-secondary" type="button" onClick={() => setStage('account')}>Назад</button></div>}
      {stage === 'done' && <div className="join-stage"><div className="join-success" aria-hidden="true">✓</div><p>{createdTeam ? <>Команда <strong>{createdTeam.name}</strong> создана. Теперь можно создать первую ссылку для коллеги.</> : <>Приглашение в <strong>{invitedTeam?.name}</strong> отмечено как принятое. Администратор увидит новый статус{invite?.role === 'employee' ? ' и сотрудника в своей команде' : ''}.</>}</p><a className="login-form__submit join-primary-link" href={createdTeam ? `${teamPath(createdTeam.id)}&view=invitations` : invite?.role === 'admin' ? teamPath(invite.teamId) : invite ? employeePath() : '/'}>{createdTeam ? 'Пригласить коллег' : 'Открыть кабинет'} <span aria-hidden="true">→</span></a>{!createdTeam && invite?.role === 'employee' && <p className="join-hint">В твоём кабинете пока нет задач. Они появятся после назначения администратором.</p>}</div>}
    </>}
  </AuthShell>;
}
