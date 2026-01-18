/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTTL?: number;
  /** Maximum number of entries (default: 1000) */
  maxSize?: number;
  /** Cleanup interval in milliseconds (default: 60 seconds) */
  cleanupInterval?: number;
}

/**
 * Internal cache entry structure
 */
export interface CacheEntry<T> {
  value: T;
  expires: number;
  createdAt: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}
