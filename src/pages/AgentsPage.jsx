import { useState } from "react";
import { usePortal } from "../store.jsx";
import useLoad from "../useLoad.js";
import PageHead from "../components/PageHead.jsx";
import Modal from "../components/Modal.jsx";
import { Person } from "../components/TableBits.jsx";
import { SkeletonTable } from "../components/Skeleton.jsx";
import { PasswordField, ResetAgentPasswordModal } from "../components/PasswordModals.jsx";

const ICON_PATHS = {
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  key: ["M21 2l-2 2", "M15.5 7.5l3 3L22 7l-3-3", "M11.4 12.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8z", "M11.4 12.6L19 5"],
  trash: ["M3 6h18", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6", "M10 11v6", "M14 11v6"],
};

/* Small square icon button; the browser tooltip (title) shows its name on hover */
function IconBtn({ icon, label, tip, danger, ...rest }) {
  return (
    <button type="button" className={"icon-btn" + (danger ? " danger" : "")} aria-label={label} title={tip} {...rest}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICON_PATHS[icon].map(d => <path key={d} d={d} />)}
      </svg>
    </button>
  );
}

const joined = iso => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export default function AgentsPage() {
  const { bonus } = usePortal();
  const agents = useLoad(() => bonus.agents(), "agents");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null); // null | {mode: "add"} | {mode: "edit", agent}
  const [confirm, setConfirm] = useState(null); // agent id waiting for delete confirmation
  const [pwFor, setPwFor] = useState(null); // agent whose password is being changed
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null); // {bad, text}

  const list = agents.data || [];
  const q = query.trim().toLowerCase();
  const shown = q ? list.filter(a => [a.name, a.username].some(v => (v || "").toLowerCase().includes(q))) : list;

  function saved(agent, isNew) {
    agents.setData(rs => {
      const rest = (rs || []).filter(a => a.id !== agent.id);
      return [...rest, agent].sort((a, b) => a.name.localeCompare(b.name));
    });
    setForm(null);
    setMsg({ bad: false, text: isNew ? `${agent.name} was added. They can sign in as Agent now.` : `${agent.name} was updated.` });
  }

  async function remove(agent) {
    setBusyId(agent.id);
    setMsg(null);
    try {
      await bonus.deleteAgent(agent.id);
      agents.setData(rs => rs.filter(a => a.id !== agent.id));
      setMsg({ bad: false, text: `${agent.name} was deleted.` });
    } catch (e) {
      setMsg({ bad: true, text: e.message });
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  return (
    <main className="wrap">
      <PageHead title="Agents" sub="Add agents, update their details or change an agent's password.">
        <button className="btn add-btn" type="button" onClick={() => { setMsg(null); setForm({ mode: "add" }); }}>
          <span aria-hidden="true">+</span> Add agent
        </button>
      </PageHead>

      <section className="panel">
        <div className="panel-head">
          <h2>All agents</h2>
          <div className="search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input className="input" type="search" placeholder="Search name or username" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search agents" />
          </div>
        </div>

        {msg && <div className={"toast" + (msg.bad ? " bad" : "")}>{msg.text}</div>}

        {agents.error ? (
          <div className="toast bad">Couldn't load agents: {agents.error} <button className="btn sm plain" type="button" onClick={agents.reload}>Try again</button></div>
        ) : agents.loading && !agents.data ? (
          <SkeletonTable rows={4} cols={5} />
        ) : !list.length ? (
          <div className="empty">No agents yet. Use “Add agent” to create the first one.</div>
        ) : !shown.length ? (
          <div className="empty">No agents match “{query}”.</div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Agent</th><th>Username</th><th className="money">Entries</th><th>Added</th><th></th></tr></thead>
              <tbody>
                {shown.map(a => (
                  <tr key={a.id}>
                    <td><Person name={a.name} /></td>
                    <td><span className="uname">{a.username || "—"}</span></td>
                    <td className="money">{a.entries_count}</td>
                    <td className="muted">{joined(a.created_at)}</td>
                    <td>
                      <div className="row-actions">
                        {confirm === a.id ? (
                          <>
                            <span className="hint">Delete {a.name.split(" ")[0]}?</span>
                            <button className="btn sm outline" type="button" disabled={busyId === a.id} onClick={() => remove(a)}>{busyId === a.id ? "Deleting…" : "Delete"}</button>
                            <button className="btn sm plain" type="button" onClick={() => setConfirm(null)}>Keep</button>
                          </>
                        ) : (
                          <>
                            <IconBtn icon="edit" label={`Edit ${a.name}`} tip="Edit details" onClick={() => { setMsg(null); setForm({ mode: "edit", agent: a }); }} />
                            <IconBtn icon="key" label={`Change password for ${a.name}`} tip="Change password" onClick={() => { setMsg(null); setPwFor(a); }} />
                            <IconBtn icon="trash" danger label={`Delete ${a.name}`} onClick={() => setConfirm(a.id)}
                              disabled={a.entries_count > 0} tip={a.entries_count > 0 ? "Has bonus entries, can't delete" : "Delete agent"} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.some(a => a.entries_count > 0) && (
          <div className="hint">Agents who already have bonus entries can't be deleted, so their payout history stays complete.</div>
        )}
      </section>

      {form && <AgentForm form={form} onClose={() => setForm(null)} onSaved={saved} />}
      {pwFor && (
        <ResetAgentPasswordModal agent={pwFor} onClose={() => setPwFor(null)}
          onDone={a => { setPwFor(null); setMsg({ bad: false, text: `Password changed for ${a.name}. Share the new password with them.` }); }} />
      )}
    </main>
  );
}

function AgentForm({ form, onClose, onSaved }) {
  const { bonus } = usePortal();
  const editing = form.mode === "edit";
  const [name, setName] = useState(editing ? form.agent.name : "");
  const [username, setUsername] = useState(editing ? form.agent.username || "" : "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!name.trim()) next.name = "Enter the agent's name.";
    const u = username.trim();
    if (!u) next.username = "Enter a username.";
    else if (!/^[A-Za-z0-9._-]{3,50}$/.test(u)) next.username = "Use 3–50 letters, numbers, dots, dashes or underscores.";
    if (!editing && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email address.";
    if (!editing && password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    setErr("");
    if (Object.keys(next).length) return;

    setBusy(true);
    // Editing only changes name/username; passwords have their own button
    const body = { name: name.trim(), username: username.trim().toLowerCase(), ...(!editing ? { email: email.trim(), password } : {}) };
    try {
      const agent = editing ? await bonus.updateAgent(form.agent.id, body) : await bonus.createAgent(body);
      onSaved(agent, !editing);
    } catch (e2) {
      // Laravel validation errors come back per field
      const fieldErrors = Object.fromEntries(Object.entries(e2.errors || {}).map(([k, v]) => [k, v[0]]));
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      else setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? `Edit ${form.agent.name}` : "Add agent"}
      onClose={onClose}
      footer={<>
        <button className="btn plain" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="submit" form="agentForm" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add agent"}</button>
      </>}
    >
      <form id="agentForm" className="modal-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="agName">Full name</label>
          <input className={"input" + (errors.name ? " err" : "")} id="agName" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ana Rodriguez" />
          {errors.name && <span className="errmsg">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="agUser">Username</label>
          <input className={"input" + (errors.username ? " err" : "")} id="agUser" autoComplete="off" autoCapitalize="none" spellCheck={false}
            value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. ana" />
          {errors.username
            ? <span className="errmsg">{errors.username}</span>
            : <span className="hint">The agent signs in with this.{editing ? " Changing it means they use the new one next time." : ""}</span>}
        </div>
        {!editing && (
          <div className="field">
            <label htmlFor="agEmail">Email</label>
            <input className={"input" + (errors.email ? " err" : "")} id="agEmail" type="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@astate.com" />
            {errors.email && <span className="errmsg">{errors.email}</span>}
          </div>
        )}
        {!editing && (
          <PasswordField id="agPw" label="Password" value={password} onChange={setPassword} error={errors.password}
            placeholder="At least 8 characters" hint="Share it with the agent so they can sign in." />
        )}
        {err && <div className="toast bad">{err}</div>}
      </form>
    </Modal>
  );
}
