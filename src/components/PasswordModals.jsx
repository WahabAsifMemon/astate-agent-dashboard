import { useState } from "react";
import Modal from "./Modal.jsx";
import { usePortal } from "../store.jsx";

/* Password input with a Show/Hide toggle and its error line */
export function PasswordField({ id, label, value, onChange, error, hint, autoFocus, autoComplete = "new-password", placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input className={"input" + (error ? " err" : "")} id={id} type={show ? "text" : "password"} autoComplete={autoComplete}
          autoFocus={autoFocus} style={{ paddingRight: 64 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        <button type="button" className="peek" onClick={() => setShow(s => !s)}>{show ? "Hide" : "Show"}</button>
      </div>
      {error ? <span className="errmsg">{error}</span> : hint && <span className="hint">{hint}</span>}
    </div>
  );
}

// Laravel validation errors -> {field: first message}
const fieldErrors = e => Object.fromEntries(Object.entries(e.errors || {}).map(([k, v]) => [k, v[0]]));

function checkNew(password, confirm) {
  const errs = {};
  if (password.length < 8) errs.password = "Use at least 8 characters.";
  if (confirm !== password) errs.password_confirmation = "The passwords don't match.";
  return errs;
}

/* Signed-in user changes their own password */
export function ChangePasswordModal({ onClose }) {
  const { bonus } = usePortal();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const next = checkNew(password, confirm);
    if (!current) next.current_password = "Enter your current password.";
    else if (current === password) next.password = "The new password must be different from the current one.";
    setErrors(next);
    setErr("");
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await bonus.changePassword(current, password, confirm);
      setDone(true);
    } catch (e2) {
      const fe = fieldErrors(e2);
      if (Object.keys(fe).length) setErrors(fe);
      else setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal title="Password changed" onClose={onClose}
        footer={<button className="btn" type="button" onClick={onClose}>Done</button>}>
        <div className="toast">Your password was changed. Use the new one next time you sign in. Any other devices were signed out.</div>
      </Modal>
    );
  }

  return (
    <Modal title="Change password" onClose={onClose}
      footer={<>
        <button className="btn plain" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit" form="pwForm" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
      </>}>
      <form id="pwForm" className="modal-form" onSubmit={submit} noValidate>
        <PasswordField id="pwCurrent" label="Current password" value={current} onChange={setCurrent} error={errors.current_password}
          autoFocus autoComplete="current-password" />
        <PasswordField id="pwNew" label="New password" value={password} onChange={setPassword} error={errors.password}
          hint="At least 8 characters." placeholder="At least 8 characters" />
        <PasswordField id="pwConfirm" label="Confirm new password" value={confirm} onChange={setConfirm} error={errors.password_confirmation} />
        {err && <div className="toast bad">{err}</div>}
      </form>
    </Modal>
  );
}

/* Admin sets a new password for an agent */
export function ResetAgentPasswordModal({ agent, onClose, onDone }) {
  const { bonus } = usePortal();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const next = checkNew(password, confirm);
    setErrors(next);
    setErr("");
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await bonus.resetAgentPassword(agent.id, password, confirm);
      onDone(agent);
    } catch (e2) {
      const fe = fieldErrors(e2);
      if (Object.keys(fe).length) setErrors(fe);
      else setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Change password for ${agent.name}`} onClose={onClose}
      footer={<>
        <button className="btn plain" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit" form="resetPwForm" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
      </>}>
      <form id="resetPwForm" className="modal-form" onSubmit={submit} noValidate>
        {agent.username && (
          <div className="note">Username: <b>{agent.username}</b></div>
        )}
        <PasswordField id="rpNew" label="New password" value={password} onChange={setPassword} error={errors.password}
          autoFocus hint="At least 8 characters. Share it with the agent." placeholder="At least 8 characters" />
        <PasswordField id="rpConfirm" label="Confirm new password" value={confirm} onChange={setConfirm} error={errors.password_confirmation} />
        <div className="hint">Saving signs {agent.name.split(" ")[0]} out on every device; they'll sign in again with the new password.</div>
        {err && <div className="toast bad">{err}</div>}
      </form>
    </Modal>
  );
}
