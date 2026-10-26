/* Shimmering placeholders shown while data loads, shaped like the real content */

const WIDTHS = ["72%", "46%", "84%", "58%", "38%", "64%"];

export const Skel = ({ w = "100%", h = 12, r = 6, style }) => (
  <span className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />
);

export function SkeletonTable({ rows = 3, cols = 5 }) {
  return (
    <div className="tablewrap" aria-busy="true" aria-label="Loading">
      <table>
        <thead>
          <tr>{Array.from({ length: cols }, (_, c) => <th key={c}><Skel w="55%" h={9} /></th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => <td key={c}><Skel w={WIDTHS[(r + c) % WIDTHS.length]} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonRequest() {
  return (
    <div className="req" aria-busy="true" aria-label="Loading">
      <div className="req-head">
        <div className="req-who">
          <Skel w={36} h={36} r={18} />
          <div style={{ display: "grid", gap: 8 }}>
            <Skel w={160} h={14} />
            <Skel w={220} h={10} />
          </div>
        </div>
        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <Skel w={40} h={9} />
          <Skel w={70} h={20} />
        </div>
      </div>
      <SkeletonTable rows={2} cols={4} />
      <div className="req-actions"><Skel w={90} h={34} r={10} /><Skel w={80} h={34} r={10} /></div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="stats" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 4 }, (_, i) => (
        <div className="stat" key={i}>
          <Skel w="50%" h={9} />
          <Skel w="65%" h={22} style={{ marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rej" style={{ borderLeftColor: "#ececf0" }} aria-busy="true" aria-label="Loading">
      <Skel w={140} h={14} />
      <Skel w="100%" h={46} r={10} />
      <Skel w="60%" h={10} />
    </div>
  );
}
