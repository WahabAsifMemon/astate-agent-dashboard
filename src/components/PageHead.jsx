import { useEffect } from "react";

/* Title row at the top of each signed-in page; also names the browser tab */
export default function PageHead({ title, sub, children }) {
  useEffect(() => { document.title = `${title} · A-State Agent Portal`; }, [title]);

  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </div>
  );
}
