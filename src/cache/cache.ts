import { CacheOptions, CacheEntry, CacheStats } from './types';

/**
 * Generic in-memory cache with TTL, LRU eviction, and pattern invalidation
 */
export class Cache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private options: Required<CacheOptions>;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTTL: options.defaultTTL ?? 5 * 60 * 1000,
      maxSize: options.maxSize ?? 1000,
      cleanupInterval: options.cleanupInterval ?? 60 * 1000,
    };
    this.startCleanup();
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    if (this.store.size >= this.options.maxSize && !this.store.has(key)) {
      this.evictOldest();
    }
    this.store.set(key, {
      value,
      expires: Date.now() + (ttl ?? this.options.defaultTTL),
      createdAt: Date.now(),
    });
  }

  /**
   * Delete a specific key
   */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (pattern.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Delete all keys starting with a prefix
   */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Wrap an async function with caching
   * Properly handles undefined/null values by using has() check
   */
  async wrap<R>(key: string, fn: () => Promise<R>, ttl?: number): Promise<R> {
    // Use has() to properly detect cached undefined/null values
    if (this.has(key)) {
      return this.get(key) as R;
    }

    const result = await fn();
    this.set(key, result as unknown as T, ttl);
    return result;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Destroy the cache and stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.store.clear();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (now > entry.expires) {
          this.store.delete(key);
        }
      }
    }, this.options.cleanupInterval);

    // Unref to allow process to exit (Node.js specific)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      (this.cleanupTimer as any).unref();
    }
  }

  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldest = key;
      }
    }
    if (oldest) {
      this.store.delete(oldest);
    }
  }
}

/**
 * Create a new cache instance
 */
export function createCache<T = unknown>(options?: CacheOptions): Cache<T> {
  return new Cache<T>(options);
}
