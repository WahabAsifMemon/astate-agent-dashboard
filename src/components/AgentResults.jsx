import { useState } from "react";
import { TYPES, TODAY, TIER_LABEL, fmt, niceDate, polTotal, reqTotal } from "../data.js";
import { PolicyChips } from "./TableBits.jsx";

import { SkeletonTable, SkeletonCard } from "./Skeleton.jsx";

/* Entries still waiting for an admin. Your own can be edited or deleted; another agent's are view-only. */
export function PendingEntries({ requests, loading, editing, onEdit, onDelete, readOnly }) {
  const [confirm, setConfirm] = useState(null); // id waiting for delete confirmation
  const pending = requests.filter(r => r.status === "pending").sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  return (
    <section className="panel spaced">
      <div className="panel-head">
        <h2>Waiting for approval</h2>
        <span className="label">{pending.length ? `${pending.length} pending` : ""}</span>
      </div>
      {loading && !requests.length ? <SkeletonTable rows={2} cols={6} /> : !pending.length ? (
        <div className="empty">{readOnly ? "Nothing waiting for this agent." : "Nothing waiting. Entries you submit show here until an admin approves or rejects them."}</div>
      ) : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Date</th><th>Fee tier</th><th>Policies</th><th className="money">Total</th><th>Status</th>{!readOnly && <th></th>}</tr></thead>
            <tbody>
              {pending.map(r => (
                <tr key={r.id} className={editing === r.id ? "me" : ""}>
                  <td>{niceDate(r.date)}</td>
                  <td>{TIER_LABEL[r.fee]}</td>
                  <td><PolicyChips items={r.items} /></td>
                  <td className="money"><b>{fmt(reqTotal(r))}</b></td>
                  <td><span className="pill pending">{editing === r.id ? "Editing" : "Pending"}</span></td>
                  {!readOnly && <td>
                    <div className="row-actions">
                      {confirm === r.id ? (
                        <>
                          <span className="hint">Delete this entry?</span>
                          <button className="btn sm outline" type="button" onClick={() => { setConfirm(null); onDelete(r); }}>Delete</button>
                          <button className="btn sm plain" type="button" onClick={() => setConfirm(null)}>Keep</button>
                        </>
                      ) : (
                        <>
                          <button className="btn sm plain" type="button" onClick={() => onEdit(r)} disabled={editing === r.id}>Edit</button>
                          <button className="btn sm outline" type="button" onClick={() => setConfirm(r.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* The agent's own approved entries for today */
export function ApprovedEntries({ requests, loading }) {
  const approved = requests.filter(r => r.status === "approved" && r.date === TODAY).sort((a, b) => reqTotal(b) - reqTotal(a));
  const anyReview = approved.some(r => r.items.some(i => i.review));

  return (
    <section className="panel spaced">
      <div className="panel-head"><h2>Approved today · {niceDate(TODAY)}</h2></div>
      {loading && !requests.length ? <SkeletonTable rows={2} cols={5} /> : !approved.length ? (
        <div className="empty">No approved entries for today yet. Earlier days are in Monthly payouts.</div>
      ) : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Fee tier</th><th>Policies</th><th className="money">Fee bonus</th><th className="money">Policy bonus</th><th className="money">Total</th></tr></thead>
            <tbody>
              {approved.map(r => (
                <tr key={r.id}>
                  <td>{TIER_LABEL[r.fee]}</td>
                  <td><PolicyChips items={r.items} /></td>
                  <td className="money">{fmt(r.fee)}</td>
                  <td className="money">{fmt(polTotal(r))}</td>
                  <td className="money"><b>{fmt(reqTotal(r))}</b></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Today's approved total{anyReview && <span className="hint" style={{ fontWeight: 400 }}> · ★ = review bonus applied</span>}</td>
                <td className="money">{fmt(approved.reduce((s, r) => s + reqTotal(r), 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

/* The agent's own rejected entries with the admin's reason */
export function RejectedEntries({ requests, loading }) {
  const rj = requests.filter(r => r.status === "rejected").sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  return (
    <section className="panel spaced">
      <div className="panel-head">
        <h2>Rejected entries</h2>
        <span className="label">{rj.length ? `${rj.length} rejected` : ""}</span>
      </div>
      {loading && !requests.length ? <SkeletonCard /> : !rj.length ? (
        <div className="empty">No rejected entries. If an admin rejects a submission, it shows here with the reason.</div>
      ) : (
        <div className="rejs">
          {rj.map(r => (
            <article key={r.id} className="rej">
              <div className="rej-head">
                <div>
                  <b>{niceDate(r.date)}</b>
                  <div className="sub">{TIER_LABEL[r.fee]} · requested {fmt(reqTotal(r))}</div>
                </div>
                <span className="pill rejected">Rejected</span>
              </div>
              <div className="reason">
                <span className="label">Admin's reason</span>
                <strong>{r.reason || "No reason given"}</strong>
                {r.note && <p>{r.note}</p>}
              </div>
              <div className="rej-items">
                {r.items.length ? "Policies: " + r.items.map(it => `${TYPES[it.type].short} (${it.cid})`).join(", ") : "No policies, fee bonus only."}
                {" "}To fix it, submit a corrected entry for the same date.
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
