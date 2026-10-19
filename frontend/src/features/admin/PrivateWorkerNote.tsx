import { useEffect, useRef, useState } from 'react';
import { Icon } from '../employee/EmployeeScreen';

export default function PrivateWorkerNote({ value, onSave }: { value: string; onSave: (value: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(value);
  const field = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (editing) field.current?.focus();
    else if (wasEditing.current) opener.current?.focus({ preventScroll: true });
    wasEditing.current = editing;
  }, [editing]);
  function close() { setEditing(false); }
  return <section className="admin-panel admin-private-note" aria-labelledby="private-note-title">
    <div className="admin-panel__heading"><div><h2 id="private-note-title">Private notes</h2><p>Only you · not shared with the team</p></div>{!editing && <button ref={opener} type="button" className="admin-text-button" onClick={() => { setDraft(value); setError(''); setEditing(true); }}><Icon name={value ? 'edit' : 'plus'} />{value ? "Edit" : "Add"}</button>}</div>
    {editing ? <form onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); try { await onSave(draft.trim()); close(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the note."); } finally { setBusy(false); } }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
      <label className="admin-visually-hidden" htmlFor="worker-private-note">Private note about this employee</label>
      <textarea ref={field} id="worker-private-note" rows={5} maxLength={4000} value={draft} placeholder="For example: discuss the next task on a call…" onChange={event => setDraft(event.target.value)} />
      {error && <p role="alert" className="admin-task-editor__error">{error}</p>}
      <div className="admin-private-note__actions"><button type="submit" disabled={busy} className="employee-button employee-button--primary">Save note</button><button type="button" className="employee-button" onClick={close}>Cancel</button><span>{draft.length} / 4000</span></div>
    </form> : value ? <p className="admin-private-note__text">{value}</p> : <p className="admin-private-note__empty">You can leave a reminder about this employee. This is optional.</p>}
  </section>;
}
