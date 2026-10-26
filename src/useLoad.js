import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/*
 * Runs an async loader on mount and whenever `key` changes; ignores stale responses.
 * A new key clears the old data (so a different month/day never flashes the previous one);
 * reload() keeps the current data on screen while it refreshes.
 */
export default function useLoad(loader, key) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const latest = useRef(0);
  const loaderRef = useRef(loader);
  useLayoutEffect(() => { loaderRef.current = loader; });

  const run = useCallback(reset => {
    const id = ++latest.current;
    setState(s => ({ loading: true, error: "", data: reset ? null : s.data }));
    return loaderRef.current()
      .then(data => { if (id === latest.current) setState({ loading: false, error: "", data }); })
      .catch(e => { if (id === latest.current) setState(s => ({ ...s, loading: false, error: e.message })); });
  }, []);

  useEffect(() => { run(true); }, [run, key]);

  const reload = useCallback(() => run(false), [run]);
  const setData = useCallback(fn => setState(s => ({ ...s, data: fn(s.data) })), []);
  return { ...state, reload, setData };
}
