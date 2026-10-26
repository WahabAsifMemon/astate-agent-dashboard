import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "./api.js";

const PortalContext = createContext(null);

// Sign-in survives a page refresh
const load = (key, fallback) => {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

export function PortalProvider({ children }) {
  const [auth, setAuth] = useState(() => load("auth", null)); // {token, user} from POST /api/login
  const [pendingCount, setPendingCount] = useState(0); // admin's Approvals badge
  const [inflight, setInflight] = useState(0); // API calls in progress, drives the top progress bar

  useEffect(() => save("auth", auth), [auth]);

  const role = auth ? (auth.user.role === "admin" ? "admin" : "agent") : null;
  const token = auth?.token;

  // Authenticated API call; an expired or revoked token signs the user out
  const call = useCallback(async (path, opts = {}) => {
    setInflight(n => n + 1);
    try {
      return await api.request(path, { ...opts, token });
    } catch (error) {
      if (error.status === 401) setAuth(null);
      throw error;
    } finally {
      setInflight(n => n - 1);
    }
  }, [token]);
  const bonus = useMemo(() => api.bonusApi(call), [call]);

  const refreshPending = useCallback(() => {
    if (role !== "admin") return;
    bonus.list({ status: "pending" }).then(rs => setPendingCount(rs.length)).catch(() => {});
  }, [bonus, role]);

  const value = {
    role,
    user: auth?.user || null,
    bonus,
    busy: inflight > 0,
    pendingCount,
    setPendingCount,
    refreshPending,
    // chosenRole comes from the Agent/Admin switch on the login page
    async login(email, password, chosenRole) {
      const data = await api.login(email, password);
      const apiRole = data.user.role;
      if (apiRole && apiRole !== chosenRole) {
        api.logout(data.access_token).catch(() => {});
        throw new api.ApiError(chosenRole === "admin"
          ? "This account isn't an admin. Sign in as Agent."
          : "This is an admin account. Sign in as Admin.", 403);
      }
      // Until the role column is deployed the API sends no role, so fall back to the switch
      const role = apiRole || chosenRole;
      setAuth({ token: data.access_token, user: { ...data.user, role } });
      return role;
    },
    logout() {
      if (auth) api.logout(auth.token).catch(() => {}); // revoke the token; sign out locally either way
      setAuth(null);
      setPendingCount(0);
    },
  };

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export const usePortal = () => useContext(PortalContext);
export const homePath = role => (role === "admin" ? "/approvals" : "/log");
