import { useState } from "react";
import { usePortal } from "../store.jsx";
import useLoad from "../useLoad.js";
import PageHead from "../components/PageHead.jsx";
import { SkeletonRequest, SkeletonTable } from "../components/Skeleton.jsx";
import { Person, PolicyType, ReviewLink } from "../components/TableBits.jsx";
import { TIER_LABEL, REJECT_REASONS, fmt, niceDate, itemAmt, reqTotal, initials } from "../data.js";

// "Oct 20, 3:45 PM"
const decidedAt = iso => (iso
  ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  : "—");

export default function ApprovalsPage() {
  const { bonus, setPendingCount } = usePortal();
  const pending = useLoad(() => bonus.list({ status: "pending" }).then(rs => { setPendingCount(rs.length); return rs; }), "pending");
  // Latest 10 approve/reject decisions from the server (any admin, survives refresh)
  const recent = useLoad(() => bonus.list({ reviewed: 1, limit: 10 }), "recent");
  const decided = recent.data || [];

  const pend = (pending.data || []).slice().sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  async function decide(id, status, reason, note) {
    const done = status === "approved" ? await bonus.approve(id) : await bonus.reject(id, reason, note);
    pending.setData(rs => rs.filter(r => r.id !== id));
    setPendingCount(n => Math.max(0, n - 1));
    recent.setData(ds => [done, ...(ds || []).filter(r => r.id !== done.id)].slice(0, 10));
  }

  return (
    <main className="wrap">
      <PageHead title="Approvals" sub="Check customer IDs and review links, then approve or reject each entry.">
        {pend.length > 0 && <span className="count-chip"><i></i>{pend.length} waiting</span>}
      </PageHead>
      <div className="stack">
        <section className="panel">
          <div className="panel-head">
            <h2>Waiting for approval</h2>
            <span className="label">{pend.length ? `${pend.length} request${pend.length > 1 ? "s" : ""}` : ""}</span>
          </div>
          <div className="reqs">
            {pending.error ? (
              <div className="toast bad">Couldn't load requests: {pending.error} <button className="btn sm plain" type="button" onClick={pending.reload}>Try again</button></div>
            ) : pending.loading && !pending.data ? (
              <><SkeletonRequest /><SkeletonRequest /></>
            ) : pend.length ? (
              pend.map(r => <RequestCard key={r.id} r={r} onDecide={decide} />)
            ) : (
              <div className="empty">Nothing waiting. New agent submissions show up here.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Recent decisions</h2><span className="label">Latest 10</span></div>
          {recent.error ? (
            <div className="toast bad">Couldn't load decisions: {recent.error} <button className="btn sm plain" type="button" onClick={recent.reload}>Try again</button></div>
          ) : recent.loading && !recent.data ? (
            <SkeletonTable rows={3} cols={7} />
          ) : !decided.length ? (
            <div className="empty">No decisions yet. Approved and rejected entries show up here.</div>
          ) : (
            <div className="tablewrap">
              <table>
                <thead><tr><th>Decided</th><th>Entry date</th><th>Agent</th><th>Status</th><th className="money">Total</th><th>By</th><th>Reason</th></tr></thead>
                <tbody>
                  {decided.map(r => (
                    <tr key={r.id}>
                      <td className="muted">{decidedAt(r.reviewedAt)}</td>
                      <td>{niceDate(r.date)}</td>
                      <td><Person name={r.agent} /></td>
                      <td><span className={"pill " + r.status}>{r.status === "approved" ? "Approved" : "Rejected"}</span></td>
                      <td className="money">{fmt(reqTotal(r))}</td>
                      <td className="muted">{r.reviewedBy || "—"}</td>
                      <td className="reason-cell">{[r.reason, r.note].filter(Boolean).join(": ") || <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function RequestCard({ r, onDecide }) {
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const n = r.items.length;

  async function run(status, reason, note) {
    setBusy(true);
    setErr("");
    try {
      await onDecide(r.id, status, reason, note); // the card unmounts on success
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <article className="req">
      <div className="req-head">
        <div className="req-who">
          <span className="avatar" aria-hidden="true">{initials(r.agent)}</span>
          <div>
            <h3>{r.agent}</h3>
            <div className="sub">{niceDate(r.date)} · {TIER_LABEL[r.fee]} · {n} polic{n === 1 ? "y" : "ies"}</div>
          </div>
        </div>
        <div>
          <div className="label" style={{ textAlign: "right" }}>Total</div>
          <div className="req-total">{fmt(reqTotal(r))}</div>
        </div>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Item</th><th>Customer ID</th><th>Review link</th><th className="money">Bonus</th></tr></thead>
          <tbody>
            <tr><td><span className="typecell"><i className="tdot fee" />Daily fee bonus</span></td><td className="muted">{TIER_LABEL[r.fee]}</td><td className="muted">—</td><td className="money">{fmt(r.fee)}</td></tr>
            {r.items.map((it, i) => (
              <tr key={i}>
                <td><PolicyType type={it.type} /></td>
                <td>{it.cid}</td>
                <td><ReviewLink url={it.review ? it.url : ""} /></td>
                <td className="money">{fmt(itemAmt(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {err && <div className="toast bad">{err}</div>}
      {rejecting ? (
        <RejectForm id={r.id} busy={busy} onCancel={() => setRejecting(false)} onConfirm={(reason, note) => run("rejected", reason, note)} />
      ) : (
        <div className="req-actions">
          <button className="btn sm approve" type="button" disabled={busy} onClick={() => run("approved")}>{busy ? "Saving…" : "Approve"}</button>
          <button className="btn sm outline" type="button" disabled={busy} onClick={() => setRejecting(true)}>Reject</button>
          <span className="hint">Check the customer IDs and open each review link before approving.</span>
        </div>
      )}
    </article>
  );
}

function RejectForm({ id, busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  const [det, setDet] = useState("");
  const [errs, setErrs] = useState({});

  function confirm() {
    const d = det.trim();
    const next = { why: !reason, det: reason === "Other" && !d };
    setErrs(next);
    if (next.why) return document.getElementById("why-" + id).focus();
    if (next.det) return document.getElementById("det-" + id).focus();
    onConfirm(reason, d);
  }

  return (
    <div className="reject-box">
      <div className="field">
        <label htmlFor={"why-" + id}>Reason for rejecting</label>
        <select className={"input" + (errs.why ? " err" : "")} id={"why-" + id} autoFocus value={reason} onChange={e => setReason(e.target.value)}>
          <option value="">Choose a reason…</option>
          {REJECT_REASONS.map(x => <option key={x}>{x}</option>)}
        </select>
        {errs.why && <span className="errmsg">Choose a reason. The agent sees it.</span>}
      </div>
      <div className="field">
        <label htmlFor={"det-" + id}>
          Details for the agent <span className="hint" style={{ fontWeight: 400 }}>{reason === "Other" ? "(required)" : "(optional)"}</span>
        </label>
        <textarea className={"input" + (errs.det ? " err" : "")} id={"det-" + id} value={det} onChange={e => setDet(e.target.value)}
          placeholder="What's wrong and how to fix it, e.g. Collection report shows $780, so resubmit at the $750 tier." />
        {errs.det && <span className="errmsg">Explain the reason when you choose Other.</span>}
      </div>
      <div className="req-actions">
        <button className="btn sm outline" type="button" disabled={busy} onClick={confirm}>{busy ? "Saving…" : "Confirm reject"}</button>
        <button className="btn sm plain" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
