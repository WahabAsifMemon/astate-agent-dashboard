import { TYPES, initials } from "../data.js";

/* Small building blocks shared by the dashboard tables */

export function PolicyChips({ items }) {
  if (!items.length) return <span className="muted">Fee only</span>;
  return (
    <span className="chips">
      {items.map((it, i) => (
        <span key={i} className={"pchip" + (it.review ? " rev" : "")} title={it.review ? "Review bonus applied" : undefined}>
          <i className={"tdot " + it.type} />{TYPES[it.type].short}{it.review && <span className="star">★</span>}
        </span>
      ))}
    </span>
  );
}

export function Person({ name }) {
  return (
    <span className="person">
      <span className="avatar sm" aria-hidden="true">{initials(name)}</span>
      <span>{name}</span>
    </span>
  );
}

export function PolicyType({ type }) {
  return <span className="typecell"><i className={"tdot " + type} />{TYPES[type].name}</span>;
}

export function ReviewLink({ url }) {
  if (!url) return <span className="muted">No review</span>;
  return (
    <a className="linkbtn" href={url} target="_blank" rel="noopener noreferrer" title={url}>
      Open review <span aria-hidden="true">↗</span>
    </a>
  );
}

export function Rank({ n, active }) {
  if (!active) return <span className="rank">—</span>;
  return <span className={"rank" + (n <= 3 ? " r" + n : "")}>{n}</span>;
}

export function PayoutBar({ value, max }) {
  return (
    <span className="minibar" aria-hidden="true">
      <i style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }} />
    </span>
  );
}
