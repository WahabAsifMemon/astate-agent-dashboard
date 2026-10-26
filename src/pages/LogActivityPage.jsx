import { useEffect, useRef, useState } from "react";
import { TYPES, TIERS, PLAN_START, PLAN_END, TODAY, fmt, niceDate, validUrl, earnsReview, amountOf } from "../data.js";
import { PendingEntries, ApprovedEntries, RejectedEntries } from "../components/AgentResults.jsx";
import { usePortal } from "../store.jsx";
import useLoad from "../useLoad.js";
import PageHead from "../components/PageHead.jsx";

const CLOSED = Object.fromEntries(Object.keys(TYPES).map(k => [k, false]));
const DEFAULT_DATE = TODAY >= PLAN_START && TODAY <= PLAN_END ? TODAY : PLAN_START;

export default function LogActivityPage() {
  const { user, bonus } = usePortal();
  // The Agent dropdown lists every agent. Picking someone else shows their entries (view only);
  // new entries are always saved under the signed-in agent.
  const agents = useLoad(() => bonus.agents(), "agents");
  const [viewId, setViewId] = useState(user.id);
  const isSelf = viewId === user.id;
  const viewName = (agents.data || []).find(a => a.id === viewId)?.name || user.name;
  const mine = useLoad(() => bonus.list({ agent_id: viewId }), viewId);

  const seq = useRef(0);
  const [entries, setEntries] = useState([]); // {id, type, cid, review, url}
  const [open, setOpen] = useState(CLOSED);
  const [tier, setTier] = useState(0);
  const [date, setDate] = useState(DEFAULT_DATE);
  const [editing, setEditing] = useState(null); // id of the pending entry being edited
  const [errors, setErrors] = useState({}); // keyed by input id
  const [msg, setMsg] = useState(null); // {bad, text}
  const [busy, setBusy] = useState(false);

  // Focus an input after the render that creates it
  const [focusReq, setFocusReq] = useState(null);
  useEffect(() => { if (focusReq) document.getElementById(focusReq.id)?.focus(); }, [focusReq]);
  const focus = id => setFocusReq({ id });

  const newEntry = (type, values = {}) => ({ id: ++seq.current, type, cid: "", review: false, url: "", ...values });
  const clearErr = key => setErrors(e => (e[key] ? { ...e, [key]: "" } : e));

  function toggle(type) {
    const willOpen = !open[type];
    setOpen({ ...open, [type]: willOpen });
    if (!willOpen) return;
    let first = entries.find(e => e.type === type);
    if (!first) { first = newEntry(type); setEntries([...entries, first]); }
    if (!first.cid) focus("cid-" + first.id);
  }
  function add(type) {
    const en = newEntry(type);
    setEntries([...entries, en]);
    focus("cid-" + en.id);
  }
  const update = (id, patch) => setEntries(es => es.map(e => (e.id === id ? { ...e, ...patch } : e)));
  const remove = id => setEntries(es => es.filter(e => e.id !== id));

  function resetForm() {
    setEntries([]);
    setOpen(CLOSED);
    setTier(0);
    setDate(DEFAULT_DATE);
    setEditing(null);
    setErrors({});
  }

  function startEdit(r) {
    const loaded = r.items.map(it => newEntry(it.type, { cid: it.cid, review: it.review, url: it.url }));
    setEntries(loaded);
    setOpen({ ...CLOSED, ...Object.fromEntries(loaded.map(en => [en.type, true])) });
    setTier(r.fee);
    setDate(r.date);
    setEditing(r.id);
    setErrors({});
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEntry(r) {
    try {
      await bonus.remove(r.id);
      if (editing === r.id) resetForm();
      setMsg({ bad: false, text: `Deleted your entry for ${niceDate(r.date)}.` });
      mine.reload();
    } catch (e) {
      setMsg({ bad: true, text: e.message });
    }
  }

  // Receipt numbers
  const fee = tier;
  const pol = entries.reduce((s, en) => s + amountOf(en), 0);
  const waiting = entries.filter(en => en.review && !earnsReview(en)).length;
  const rows = {};
  entries.forEach(en => {
    const r = earnsReview(en), k = en.type + (r ? "r" : "n");
    rows[k] = rows[k] || { label: TYPES[en.type].name + (r ? " · review" : ""), n: 0, unit: amountOf(en) };
    rows[k].n++;
  });

  function validate() {
    const errs = {};
    let first = null;
    setOpen(o => ({ ...o, ...Object.fromEntries(entries.map(en => [en.type, true])) }));
    const seen = {};
    entries.forEach(en => {
      const cid = en.cid.trim(), key = en.type + "|" + cid.toLowerCase();
      const m = !cid ? "Enter the customer ID." : seen[key] ? "This customer ID is already listed for this policy type." : "";
      seen[key] = true;
      if (m) { errs["cid-" + en.id] = m; first = first || "cid-" + en.id; }
      if (en.review && en.url.trim() && !validUrl(en.url)) {
        errs["url-" + en.id] = "This doesn't look like a link. Fix it, or leave it empty to submit without the review bonus.";
        first = first || "url-" + en.id;
      }
    });
    setErrors(errs);
    if (first) focus(first);
    return !first;
  }

  async function submit() {
    if (fee + pol === 0) return setMsg({ bad: true, text: "Choose a fee tier or add at least one policy before submitting." });
    if (!validate()) return setMsg({ bad: true, text: "Fix the highlighted fields, then submit again." });
    const entry = {
      date, fee,
      items: entries.map(en => ({ type: en.type, cid: en.cid.trim(), review: earnsReview(en), url: earnsReview(en) ? en.url.trim() : "" })),
    };
    setBusy(true);
    try {
      if (editing) await bonus.update(editing, entry);
      else await bonus.create(entry);
      setMsg({ bad: false, text: editing
        ? `Saved your changes (${fmt(fee + pol)}). It's still waiting for the admin.`
        : `Sent ${fmt(fee + pol)} to the admin. You'll see it under Approved or Rejected once the admin decides.` });
      resetForm();
      mine.reload();
    } catch (e) {
      setMsg({ bad: true, text: e.message });
    } finally {
      setBusy(false);
    }
  }

  const all = mine.data || [];

  return (
    <main className="wrap">
      <PageHead title={editing ? "Edit entry" : "Log activity"} sub="Add your daily fee tier and the policies you wrote, then submit for approval. Pick another agent to see their entries." />
      <div className="grid">
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>{editing ? "Edit pending entry" : "Entry details"}</h2>
              <span className="step">Step 1</span>
            </div>
            {editing && <div className="note">You're editing an entry that's waiting for approval. Save it, or cancel to start a new one.</div>}
            <div className="row2">
              <div className="field">
                <label htmlFor="agentName">Agent name</label>
                <select className="input" id="agentName" value={viewId}
                  onChange={e => { const id = +e.target.value; if (editing) resetForm(); setMsg(null); setViewId(id); }}>
                  {(agents.data?.length ? agents.data : [{ id: user.id, name: user.name }]).map(a => (
                    <option key={a.id} value={a.id}>{a.name}{a.id === user.id ? " (you)" : ""}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="dateIn">Date</label>
                <input className="input" id="dateIn" type="date" min={PLAN_START} max={PLAN_END} value={date} onChange={e => setDate(e.target.value)} disabled={!isSelf} />
              </div>
            </div>
            {!isSelf && (
              <div className="view-note">
                You're viewing <b>{viewName}</b>'s entries below. New entries are always saved under your own name.{" "}
                <button type="button" className="linklike" onClick={() => setViewId(user.id)}>Switch back to me</button>
              </div>
            )}
          </section>

          <fieldset className="plain-fieldset stack" disabled={!isSelf}>
          <section className="panel">
            <div className="panel-head"><h2>Daily fee collection</h2><span className="step">Step 2</span></div>
            <div className="tiers" role="radiogroup" aria-label="Daily fees collected">
              {TIERS.map(t => (
                <label className="tier" key={t.value}>
                  <input type="radio" name="tier" value={t.value} checked={tier === t.value} onChange={() => setTier(t.value)} />
                  <span className="card"><b>{t.title}</b><small>{t.small}</small></span>
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Policy production</h2><span className="step">Step 3</span></div>
            <div className="services">
              {Object.entries(TYPES).map(([type, t]) => {
                const list = entries.filter(e => e.type === type);
                const sub = list.reduce((s, e) => s + amountOf(e), 0);
                return (
                  <div key={type} className={"svc" + (open[type] ? " open" : "")}>
                    <button className="svc-head" type="button" aria-expanded={open[type]} aria-controls={"body-" + type} onClick={() => toggle(type)}>
                      <span className="chev" aria-hidden="true">›</span>
                      <span className="svc-name"><b>{t.name}</b><small>{fmt(t.base)} each · {fmt(t.rev)} with a review link</small></span>
                      <span className="svc-meta">
                        <span className={"count" + (list.length ? " has" : "")}>{list.length} added</span>
                        <span className="svc-sub">{list.length ? fmt(sub) : ""}</span>
                      </span>
                    </button>
                    {open[type] && (
                      <div className="svc-body" id={"body-" + type}>
                        {t.note && <div className="note">{t.note}</div>}
                        {list.map((en, i) => (
                          <EntryCard key={en.id} en={en} n={i + 1} t={t} errors={errors}
                            onChange={patch => {
                              update(en.id, patch);
                              if ("cid" in patch) clearErr("cid-" + en.id);
                              if ("url" in patch) clearErr("url-" + en.id);
                            }}
                            onReview={yes => { update(en.id, { review: yes }); if (yes) focus("url-" + en.id); }}
                            onRemove={() => remove(en.id)} />
                        ))}
                        {!list.length && <div className="hint empty-hint">No entries. Add one below.</div>}
                        <button type="button" className="add-more" onClick={() => add(type)}>
                          {list.length ? `+ Add another ${t.name}` : `+ Add ${t.name}`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          </fieldset>
        </div>

        <aside className="panel receipt" aria-live="polite">
          <div className="panel-head">
            <h2>Bonus summary</h2>
            <span className="label">{date ? new Date(date + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
          </div>
          <div className="rline"><span>Daily fee bonus</span><span className="money">{fmt(fee)}</span></div>
          <div className="rline"><span>Policy production bonus</span><span className="money">{fmt(pol)}</span></div>
          <div className="rsub">
            {Object.values(rows).length
              ? Object.values(rows).map(r => (
                <div className="rline" key={r.label}><span>{r.n} × {r.label}</span><span className="money">{fmt(r.n * r.unit)}</span></div>
              ))
              : <div className="rline"><span>No policies added yet</span><span></span></div>}
          </div>
          {waiting > 0 && (
            <div className="pending">
              {waiting} {waiting > 1 ? "policies are" : "policy is"} marked as reviewed but missing a link, so the review bonus isn't counted yet.
            </div>
          )}
          <div className="total"><span className="label">Total bonus</span><b>{fmt(fee + pol)}</b></div>
          <div className="formula">Total = daily fee bonus + qualifying policy bonuses</div>
          {msg && <div className={"toast" + (msg.bad ? " bad" : "")}>{msg.text}</div>}
          <button className="btn block" type="button" onClick={submit} disabled={busy || !isSelf}>
            {!isSelf ? "Switch to your name to submit" : busy ? "Saving…" : editing ? "Save changes" : "Submit for approval"}
          </button>
          {editing && <button className="btn block plain" type="button" onClick={() => { resetForm(); setMsg(null); }}>Cancel edit</button>}
        </aside>
      </div>

      {mine.error && (
        <div className="toast bad" style={{ marginTop: 24 }}>
          Couldn't load entries: {mine.error} <button className="btn sm plain" type="button" onClick={mine.reload}>Try again</button>
        </div>
      )}
      {!isSelf && <div className="view-banner">Showing entries for <b>{viewName}</b></div>}
      <PendingEntries requests={all} loading={mine.loading} editing={editing} onEdit={startEdit} onDelete={deleteEntry} readOnly={!isSelf} />
      <ApprovedEntries requests={all} loading={mine.loading} />
      <RejectedEntries requests={all} loading={mine.loading} />
    </main>
  );
}

function EntryCard({ en, n, t, errors, onChange, onReview, onRemove }) {
  const r = earnsReview(en);
  const cidErr = errors["cid-" + en.id], urlErr = errors["url-" + en.id];
  let hint, hintOk = false;
  if (r) { hint = `Link added. Review bonus applied (${fmt(t.rev)} instead of ${fmt(t.base)}).`; hintOk = true; }
  else if (en.url.trim()) hint = "Review bonus applies once this is a full link starting with http:// or https://.";
  else hint = `Paste the link to raise this policy from ${fmt(t.base)} to ${fmt(t.rev)}.`;

  return (
    <div className="entry">
      <div className="entry-head">
        <div className="left">
          <span className="chip">#{n}</span>
          <span className={"amt" + (r ? " rev" : "")}>{fmt(amountOf(en))}{r ? " · review bonus" : ""}</span>
        </div>
        <button className="remove" type="button" aria-label={`Remove ${t.name} #${n}`} onClick={onRemove}>Remove</button>
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor={"cid-" + en.id}>Customer ID</label>
          <input className={"input" + (cidErr ? " err" : "")} id={"cid-" + en.id} placeholder="e.g. C-58213"
            value={en.cid} onChange={e => onChange({ cid: e.target.value })} />
          {cidErr && <span className="errmsg">{cidErr}</span>}
        </div>
        <div className="field">
          <span className="flabel" id={"revLbl-" + en.id}>Got a customer review?</span>
          <div className="seg" role="group" aria-labelledby={"revLbl-" + en.id}>
            <button type="button" aria-pressed={!en.review} onClick={() => onReview(false)}>No</button>
            <button type="button" aria-pressed={en.review} onClick={() => onReview(true)}>Yes</button>
          </div>
        </div>
      </div>
      {en.review && (
        <div className="field">
          <label htmlFor={"url-" + en.id}>Review URL</label>
          <input className={"input" + (urlErr ? " err" : "")} id={"url-" + en.id} type="url" placeholder="Paste the review link (https://…)"
            value={en.url} onChange={e => onChange({ url: e.target.value })} />
          <span className={"hint" + (hintOk ? " ok" : "")}>{hint}</span>
          {urlErr && <span className="errmsg">{urlErr}</span>}
        </div>
      )}
    </div>
  );
}
