export const TYPES = {
  auto: {
    name: "New Auto Policy", short: "Auto", base: 5, rev: 10,
    note: "Returning customers count as new only after 60+ consecutive days away from A-State, counted from when their prior auto policy ended. Renewals and carrier transfers don't qualify.",
  },
  renters: { name: "Renters Insurance", short: "Renters", base: 10, rev: 20 },
  commercial: { name: "Commercial Auto Insurance", short: "Commercial Auto", base: 10, rev: 20 },
  surety: { name: "Surety Bond", short: "Surety Bond", base: 10, rev: 20 },
};

export const TIERS = [
  { value: 0, title: "None", small: "Below $500" },
  { value: 25, title: "$500", small: "Bonus $25" },
  { value: 50, title: "$750", small: "Bonus $50" },
  { value: 100, title: "$1,000", small: "Bonus $100" },
];
export const TIER_LABEL = { 0: "Below $500", 25: "$500 tier", 50: "$750 tier", 100: "$1,000 tier" };

export const PLAN_START = "2026-10-16", PLAN_END = "2026-11-30";
export const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

export const REJECT_REASONS = [
  "Not a new policy (renewal or carrier transfer)",
  "Returning customer away less than 60 days",
  "Customer ID not found or doesn't match",
  "Review link doesn't open or isn't from this customer",
  "Daily fee tier doesn't match collection records",
  "Duplicate submission",
  "Other",
];

export const fmt = n => "$" + n.toLocaleString("en-US");
export const validUrl = u => /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(u.trim());
export const niceDate = d => new Date(d + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// Draft entries (while logging) vs. submitted items (review already resolved)
export const earnsReview = en => en.review && validUrl(en.url);
export const amountOf = en => (earnsReview(en) ? TYPES[en.type].rev : TYPES[en.type].base);
export const itemAmt = it => (it.review ? TYPES[it.type].rev : TYPES[it.type].base);
export const polTotal = r => r.items.reduce((s, it) => s + itemAmt(it), 0);
export const reqTotal = r => r.fee + polTotal(r);
export const policyList = r => r.items.map(it => TYPES[it.type].short + (it.review ? " ★" : "")).join(", ") || "—";
export const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
