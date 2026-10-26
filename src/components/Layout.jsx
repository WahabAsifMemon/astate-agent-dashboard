import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router";
import logo from "../assets/logo.js";
import { usePortal } from "../store.jsx";
import { initials } from "../data.js";
import { ChangePasswordModal } from "./PasswordModals.jsx";

const TabIcon = ({ d }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map(p => <path key={p} d={p} />)}
  </svg>
);
const ICONS = {
  log: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  approvals: ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
  payouts: ["M3 4h18v18H3z", "M16 2v4", "M8 2v4", "M3 10h18"],
  agents: ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  key: ["M21 2l-2 2", "M15.5 7.5l3 3L22 7l-3-3", "M11.4 12.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8z", "M11.4 12.6L19 5"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
};

/* Top bar + tab links shared by every signed-in screen */
export default function Layout() {
  const { role, user, busy, pendingCount: pend, refreshPending, logout } = usePortal();
  const navigate = useNavigate();
  const [changingPw, setChangingPw] = useState(false);
  useEffect(() => { refreshPending(); }, [refreshPending]);
  if (!role) return <Navigate to="/login" replace />;

  const tabs = role === "admin"
    ? [["/approvals", "approvals", <>Approvals{pend > 0 && <span className="badge">{pend}</span>}</>], ["/payouts", "payouts", "Monthly payouts"], ["/agents", "agents", "Agents"]]
    : [["/log", "log", "Log activity"], ["/payouts", "payouts", "Monthly payouts"]];

  function signOut() {
    logout();
    navigate("/login", { replace: true });
    window.scrollTo(0, 0);
  }

  return (
    <div id="portalView">
      <div className={"topload" + (busy ? " on" : "")} role="progressbar" aria-hidden={!busy} aria-label="Loading" />
      <header className="topbar">
        <div className="topbar-in">
          <div className="toprow">
            <div className="brand">
              <img className="mark" src={logo} alt="A-State Insurance" />
              <div><b>A-STATE INSURANCE</b><span>Agent Bonus Portal</span></div>
            </div>
            <div className="who">
              <span className="user-chip">
                <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
                <span className="who-text"><b>{user.name}</b><span>{role === "admin" ? "Admin" : "Agent"}</span></span>
              </span>
              <button className="logout" type="button" onClick={() => setChangingPw(true)} title="Change password" aria-label="Change password">
                <TabIcon d={ICONS.key} />
              </button>
              <button className="logout" type="button" onClick={signOut} title="Log out" aria-label="Log out">
                <TabIcon d={ICONS.logout} />
              </button>
            </div>
          </div>
          <nav className="tabs" aria-label="Main">
            {tabs.map(([to, icon, label]) => (
              <NavLink key={to} to={to} className="tab"><TabIcon d={ICONS[icon]} />{label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <Outlet />
      {changingPw && <ChangePasswordModal onClose={() => setChangingPw(false)} />}
    </div>
  );
}
