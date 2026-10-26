import { useState } from "react";
import { usePortal } from "../store.jsx";
import useLoad from "../useLoad.js";
import PageHead from "../components/PageHead.jsx";
import { SkeletonStats, SkeletonTable } from "../components/Skeleton.jsx";
import { TODAY, TIER_LABEL, PLAN_START, PLAN_END, fmt, niceDate, polTotal, reqTotal } from "../data.js";
import { PolicyChips, Person, Rank, PayoutBar } from "../components/TableBits.jsx";

const MONTHS = [["2026-10", "October 2026"], ["2026-11", "November 2026"]];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ZERO = { payout: 0, fee: 0, policy: 0, policies: 0, with_review: 0 };

export default function PayoutsPage() {
  const { role, user, bonus } = usePortal();
  const isAgent = role === "agent"; // agents see everyone too; their own row is highlighted
  const [month, setMonth] = useState(TODAY.startsWith("2026-11") ? "2026-11" : "2026-10");
  const [agentId, setAgentId] = useState(""); // admin filter; "" = all agents
  const [day, setDay] = useState(null);

  const iso = d => `${month}-${String(d).padStart(2, "0")}`;
  const agents = useLoad(() => bonus.agents(), role);
  const payouts = useLoad(() => bonus.payouts({ month, agent_id: agentId }), `${month}|${agentId}`);
  const dayList = useLoad(
    () => (day ? bonus.list({ status: "approved", date: iso(day), agent_id: agentId }) : Promise.resolve([])),
    `${month}|${agentId}|${day}`,
  );

  const [y, m] = month.split("-").map(Number);
  const monthName = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const data = payouts.data;
  const totals = data?.totals || ZERO;
  const byDay = Object.fromEntries((data?.days || []).map(d => [+d.date.slice(8), d]));
  const max = Math.max(1, ...Object.values(byDay).map(v => v.total));
  const firstDow = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
  const showAgentCount = !agentId;
  const rows = data?.agents || [];
  const T = k => rows.reduce((s, r) => s + r[k], 0);
  const dayReqs = (dayList.data || []).slice().sort((a, b) => reqTotal(b) - reqTotal(a));

  return (
    <main className="wrap">
      <PageHead title="Monthly payouts" sub="Approved bonuses by day and by agent. Only admin-approved entries count." />
      <div className="stack">
        <section className="panel">
          <div className="panel-head">
            <h2>{monthName} payouts</h2>
            <div className="filters">
              <div className="field">
                <label htmlFor="monthSel">Month</label>
                <select className="input" id="monthSel" value={month} onChange={e => { setMonth(e.target.value); setDay(null); }}>
                  {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {(
                <div className="field">
                  <label htmlFor="calAgent">Agent</label>
                  <select className="input" id="calAgent" value={agentId} onChange={e => { setAgentId(e.target.value); setDay(null); }}>
                    <option value="">All agents</option>
                    {(agents.data || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {payouts.error && (
            <div className="toast bad">Couldn't load payouts: {payouts.error} <button className="btn sm plain" type="button" onClick={payouts.reload}>Try again</button></div>
          )}

          {!data && payouts.loading ? <SkeletonStats /> : (
          <div className={"stats" + (payouts.loading ? " refreshing" : "")}>
            <div className="stat main"><span className="label">{!agentId ? "Total payout" : "Payout"}</span><b>{fmt(totals.payout)}</b></div>
            <div className="stat"><span className="label">Fee bonus</span><b>{fmt(totals.fee)}</b></div>
            <div className="stat"><span className="label">Policy bonus</span><b>{fmt(totals.policy)}</b></div>
            <div className="stat"><span className="label">Policies</span><b>{totals.policies}</b><span className="hint">{totals.with_review} with review</span></div>
          </div>
          )}

          <div>
            <div className={"cal" + (!data && payouts.loading ? " loading" : "")}>
              {DOW.map(d => <div className="dow" key={d}>{d}</div>)}
              {Array.from({ length: firstDow }, (_, i) => <div className="day blank" key={"b" + i}></div>)}
              {Array.from({ length: days }, (_, i) => {
                const d = i + 1, date = iso(d), v = byDay[d];
                if (date < PLAN_START || date > PLAN_END) return <div className="day off" key={d}><span className="dn">{d}</span></div>;
                const lvl = v ? Math.min(4, Math.ceil((v.total / max) * 4)) : 0;
                const cls = ["day", lvl && "h" + lvl, day === d && "sel", date === TODAY && "today"].filter(Boolean).join(" ");
                return (
                  <button type="button" key={d} className={cls} aria-label={`${niceDate(date)}: ${v ? fmt(v.total) : "no approved bonus"}`}
                    onClick={() => setDay(day === d ? null : d)}>
                    <span className="dn">{d}</span>
                    <span>
                      {v && <>
                        <span className="dv">{fmt(v.total)}</span><br />
                        <span className="dc">
                          {showAgentCount ? `${v.agents} agent${v.agents > 1 ? "s" : ""}` : `${v.policies} polic${v.policies === 1 ? "y" : "ies"}`}
                        </span>
                      </>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="legend">
              <span>Approved bonus per day:</span>
              <i style={{ background: "var(--heat-1)" }}></i>low
              <i style={{ background: "var(--heat-2)" }}></i>
              <i style={{ background: "var(--heat-3)" }}></i>
              <i style={{ background: "var(--heat-4)" }}></i>high
              <span style={{ marginLeft: 8 }}>Dashed days are outside the plan period.</span>
            </div>
          </div>

          <div>
            {!day ? (
              <div className="hint">Select a day to see who earned what.</div>
            ) : (
              <>
                <div className="panel-head" style={{ marginBottom: 8 }}>
                  <h2 style={{ fontSize: 15 }}>{niceDate(iso(day))}</h2>
                  <span className="label">{dayList.loading ? "" : `${dayReqs.length} approved`}</span>
                </div>
                {dayList.loading && !dayReqs.length ? <SkeletonTable rows={2} cols={6} />
                  : dayList.error ? <div className="toast bad">{dayList.error}</div>
                  : !dayReqs.length ? <div className="empty">No approved entries on this day.</div> : (
                    <>
                      <div className="tablewrap">
                        <table>
                          <thead><tr><th>Agent</th><th>Fee tier</th><th>Policies</th><th className="money">Fee bonus</th><th className="money">Policy bonus</th><th className="money">Total</th></tr></thead>
                          <tbody>
                            {dayReqs.map(r => (
                              <tr key={r.id}>
                                <td><Person name={r.agent} />{isAgent && r.userId === user.id && <span className="you">You</span>}</td>
                                <td>{TIER_LABEL[r.fee]}</td>
                                <td><PolicyChips items={r.items} /></td>
                                <td className="money">{fmt(r.fee)}</td>
                                <td className="money">{fmt(polTotal(r))}</td>
                                <td className="money"><b>{fmt(reqTotal(r))}</b></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="hint" style={{ marginTop: 6 }}>★ = review bonus applied</div>
                    </>
                  )}
              </>
            )}
          </div>
        </section>

        {(
          <section className="panel">
            <div className="panel-head"><h2>Agent payouts · {monthName}</h2><span className="label">Approved only</span></div>
            {!data && payouts.loading ? <SkeletonTable rows={4} cols={8} /> : (
            <div className="tablewrap">
              <table>
                <thead><tr><th>#</th><th>Agent</th><th className="money">Days</th><th className="money">Policies</th><th className="money">With review</th><th className="money">Fee bonus</th><th className="money">Policy bonus</th><th className="money">Payout</th></tr></thead>
                <tbody>
                  {rows.length ? rows.map((r, i) => (
                    <tr key={r.user_id} className={String(r.user_id) === agentId || (isAgent && r.user_id === user.id) ? "me" : ""}>
                      <td><Rank n={i + 1} active={r.total > 0} /></td>
                      <td><Person name={r.name} />{isAgent && r.user_id === user.id && <span className="you">You</span>}</td>
                      <td className="money">{r.days}</td>
                      <td className="money">{r.policies}</td>
                      <td className="money">{r.with_review}</td>
                      <td className="money">{fmt(r.fee)}</td>
                      <td className="money">{fmt(r.policy)}</td>
                      <td className="money"><span className="bar-cell"><PayoutBar value={r.total} max={rows[0]?.total || 0} /><b>{fmt(r.total)}</b></span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} className="hint">No agents yet.</td></tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr>
                      <td></td><td>All agents</td>
                      <td className="money">{T("days")}</td><td className="money">{T("policies")}</td><td className="money">{T("with_review")}</td>
                      <td className="money">{fmt(T("fee"))}</td><td className="money">{fmt(T("policy"))}</td><td className="money">{fmt(T("total"))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
