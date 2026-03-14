// Simple in-memory cache for Supabase queries
// Pages show cached data instantly, then refresh in background
import { useState, useEffect, useCallback } from 'react';

const cache = {};
const TTL = 5 * 60 * 1000; // 5 minutes

export function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;
  return entry.data;
}

export function isFresh(key) {
  const entry = cache[key];
  if (!entry) return false;
  return Date.now() - entry.ts < TTL;
}

export function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

export function clearCache(key) {
  if (key) delete cache[key];
  else Object.keys(cache).forEach(k => delete cache[k]);
}

// Hook: returns [data, loading, refresh]
// Shows cached data immediately (loading=false), fetches fresh in background
export function useCachedData(key, fetchFn) {
  const [data, setData] = useState(() => getCached(key));
  const [loading, setLoading] = useState(!getCached(key));

  const refresh = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setCache(key, result);
    } catch (e) { console.error(e); }
    setLoading(false);
    // eslint-disable-next-line
  }, [key, fetchFn]);

  useEffect(() => {
    const cached = getCached(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      if (!isFresh(key)) refresh();
    } else {
      setLoading(true);
      refresh();
    }
  }, [key, refresh]);

  return [data, loading, refresh];
}
