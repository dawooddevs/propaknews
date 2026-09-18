// Tiny in-memory page-data cache with manual clear (admin "Clear Cache").
const store = new Map<string, { v: any; exp: number }>();

export function cached<T>(key: string, ttlMs: number, fn: () => T): T {
  const hit = store.get(key);
  if (hit && hit.exp > Date.now()) return hit.v;
  const v = fn();
  store.set(key, { v, exp: Date.now() + ttlMs });
  return v;
}
export const clearCache = () => store.clear();
