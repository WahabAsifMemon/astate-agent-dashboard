// Laravel backend (a_state_backend). Override with VITE_API_URL in .env.local
const API_URL = (import.meta.env.VITE_API_URL || "https://api.astateinsurance.com/a-state-backend/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors || {}; // Laravel validation errors: {field: [messages]}
  }
}

export async function request(path, { method = "GET", body, token, query } = {}) {
  const qs = query ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== "")) : "";
  let res;
  try {
    res = await fetch(API_URL + path + (qs === "?" ? "" : qs), {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const firstError = data.errors && Object.values(data.errors)[0]?.[0];
    throw new ApiError(firstError || data.message || `Request failed (${res.status})`, res.status, data.errors);
  }
  return data;
}

// Accepts a username (ana) or an email (ana@astate.com)
export const login = (username, password) => request("/login", { method: "POST", body: { username, password } });
export const logout = token => request("/logout", { method: "POST", token });

/* API entry → the shape the screens use */
export const fromApi = r => ({
  id: r.id,
  userId: r.user.id,
  agent: r.user.name,
  date: r.date,
  fee: r.fee,
  status: r.status,
  reason: r.reason || "",
  note: r.note || "",
  createdAt: r.created_at,
  reviewedAt: r.reviewed_at,
  reviewedBy: r.reviewed_by?.name || "",
  items: r.items.map(it => ({ type: it.type, cid: it.customer_id, review: !!it.review_url, url: it.review_url || "" })),
});

/* Screen entry → request body for POST/PUT /bonus-requests */
export const toApi = ({ date, fee, items }) => ({
  date,
  fee,
  items: items.map(it => ({ type: it.type, customer_id: it.cid, review_url: it.review ? it.url : null })),
});

/* Bonus endpoints, bound to the signed-in user's token by the store */
export const bonusApi = call => ({
  list: query => call("/bonus-requests", { query }).then(d => d.data.map(fromApi)),
  create: entry => call("/bonus-requests", { method: "POST", body: toApi(entry) }).then(d => fromApi(d.data)),
  update: (id, entry) => call(`/bonus-requests/${id}`, { method: "PUT", body: toApi(entry) }).then(d => fromApi(d.data)),
  remove: id => call(`/bonus-requests/${id}`, { method: "DELETE" }),
  approve: id => call(`/bonus-requests/${id}/approve`, { method: "POST" }).then(d => fromApi(d.data)),
  reject: (id, reason, note) => call(`/bonus-requests/${id}/reject`, { method: "POST", body: { reason, note } }).then(d => fromApi(d.data)),
  payouts: query => call("/payouts", { query }).then(d => d.data),
  agents: () => call("/agents").then(d => d.data),
  createAgent: body => call("/agents", { method: "POST", body }).then(d => d.data),
  updateAgent: (id, body) => call(`/agents/${id}`, { method: "PUT", body }).then(d => d.data),
  deleteAgent: id => call(`/agents/${id}`, { method: "DELETE" }),
  resetAgentPassword: (id, password, password_confirmation) =>
    call(`/agents/${id}/password`, { method: "PUT", body: { password, password_confirmation } }),
  changePassword: (current_password, password, password_confirmation) =>
    call("/change-password", { method: "POST", body: { current_password, password, password_confirmation } }),
});
