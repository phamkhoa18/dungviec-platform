/**
 * Cache TTL đơn giản trong bộ nhớ của server.
 * Lưu trên globalThis để không mất khi Next.js hot-reload ở môi trường dev.
 */
export class TtlCache<V> {
  private readonly store: Map<string, { value: V; expiresAt: number }>;

  constructor(
    namespace: string,
    private readonly ttlMs: number
  ) {
    const g = globalThis as unknown as Record<string, Map<string, { value: V; expiresAt: number }>>;
    const key = `__dungviec_cache_${namespace}`;
    g[key] ??= new Map();
    this.store = g[key];
  }

  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
