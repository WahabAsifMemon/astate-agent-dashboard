import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import logo from "../assets/logo.js";
import { usePortal, homePath } from "../store.jsx";

const Icon = ({ d, size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map(p => <path key={p} d={p} />)}
  </svg>
);
const ICONS = {
  agent: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"],
  admin: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M9 12l2 2 4-4"],
  mail: ["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M22 6l-10 7L2 6"],
  lock: ["M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z", "M7 11V7a5 5 0 0 1 10 0v4"],
  alert: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 8v4", "M12 16h.01"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
};

// Illustrative week for the showcase mock (Mon–Sun, last bar = today)
const WEEK = [38, 62, 45, 80, 55, 92, 70];

export default function LoginPage() {
  const portal = usePortal();
  const navigate = useNavigate();
  const [role, setRole] = useState("agent");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Sign in · A-State Agent Portal"; }, []);

  if (portal.role) return <Navigate to={homePath(portal.role)} replace />;

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() || !pw) return setErr("Enter both your username and password.");
    setErr("");
    setBusy(true);
    try {
      const signedInAs = await portal.login(email.trim(), pw, role);
      navigate(homePath(signedInAs), { replace: true });
    } catch (error) {
      // 401 = wrong password, 422 = not a valid account name; both mean the same to the user
      setErr(error.status === 401 || error.status === 422 ? "Wrong username or password." : error.message);
      setBusy(false);
    }
  }

  const pick = r => { setRole(r); setErr(""); };

  return (
    <div className="auth">
      <section className="auth-form-side">
        <div className="auth-brand">
          <img className="mark" src={logo} alt="" />
          <div><b>A-STATE</b><span>INSURANCE</span></div>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          <div>
            <span className="eyebrow">Agent Bonus Portal</span>
            <h1>Sign in to your account</h1>
            <p className="sub">Welcome back. Choose how you're signing in.</p>
          </div>

          <div className="switch" role="group" aria-label="Sign in as" data-role={role}>
            <button type="button" aria-pressed={role === "agent"} onClick={() => pick("agent")}><Icon d={ICONS.agent} size={16} />Agent</button>
            <button type="button" aria-pressed={role === "admin"} onClick={() => pick("admin")}><Icon d={ICONS.admin} size={16} />Admin</button>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div className="field">
              <label htmlFor="emailIn">Username</label>
              <div className="input-wrap">
                <Icon d={ICONS.mail} />
                <input className={"input" + (err ? " err" : "")} id="emailIn" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus
                  placeholder="Enter your username" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pwIn">Password</label>
              <div className="input-wrap">
                <Icon d={ICONS.lock} />
                <input className={"input has-btn" + (err ? " err" : "")} id="pwIn" type={showPw ? "text" : "password"} autoComplete="current-password"
                  placeholder="Enter your password" value={pw} onChange={e => setPw(e.target.value)} />
                <button type="button" className="peek" onClick={() => setShowPw(s => !s)} aria-pressed={showPw}>{showPw ? "Hide" : "Show"}</button>
              </div>
            </div>
          </div>

          {err && <div className="alert" role="alert"><Icon d={ICONS.alert} />{err}</div>}

          <button className="btn block auth-btn" type="submit" disabled={busy}>
            {busy
              ? <><span className="spin" aria-hidden="true"></span>Signing in…</>
              : <>Sign in as {role === "agent" ? "Agent" : "Admin"}<Icon d={ICONS.arrow} /></>}
          </button>

          <p className="auth-help">Forgot your password? Ask your A-State admin to reset it.</p>
        </form>

        <footer className="auth-foot">
          <span>© 2026 A-State Insurance</span>
          <span>Bonus plan · Oct 16 – Nov 30, 2026</span>
        </footer>
      </section>

      <aside className="auth-showcase" aria-hidden="true">
        <div className="show-copy">
          <span className="plan"><i></i>Employee Bonus Plan 2026</span>
          <h2>Every policy you write, <em>counted.</em></h2>
          <p>Log daily fees and new policies in seconds. Add a review link and that policy earns double.</p>
        </div>

        <div className="mock">
          <div className="mock-card">
            <div className="mock-top">
              <div><span className="label">October payout</span><b>$375</b></div>
              <span className="mock-up">+$80 today</span>
            </div>
            <div className="bars">
              {WEEK.map((h, i) => <span key={i} className={i === WEEK.length - 1 ? "now" : h > 75 ? "hi" : ""} style={{ height: h + "%" }} />)}
            </div>
            <div className="bar-days">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
          </div>
          <div className="mock-chip approved"><span className="dot">✓</span><span>Entry approved<small>New Auto · C-58213</small></span></div>
          <div className="mock-chip review"><span className="dot">★</span><span>Review link added<small>$5 → $10 bonus</small></span></div>
        </div>
      </aside>
    </div>
  );
}
