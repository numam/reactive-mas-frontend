import { useState, useEffect, useCallback } from "react";

/**
 * Generic data fetching hook.
 * @param {Function} fetchFn  — API function to call (must return a Promise)
 * @param {Array}    deps     — dependency array, refetch when these change
 */
export default function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFn()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    return run();
  }, [run]);

  return { data, loading, error, refetch: run };
}
