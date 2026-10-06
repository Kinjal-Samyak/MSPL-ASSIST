interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

export class InMemoryTtlCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number, now = Date.now()): void {
    this.entries.set(key, {
      expiresAt: now + ttlMs,
      value,
    });
  }
}

