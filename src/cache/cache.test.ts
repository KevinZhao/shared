import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cache, createCache } from './cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new Cache<string>({ defaultTTL: 1000, maxSize: 3, cleanupInterval: 500 });
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should return undefined for expired keys', () => {
      cache.set('key1', 'value1', 100);
      vi.advanceTimersByTime(150);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should use custom TTL when provided', () => {
      cache.set('key1', 'value1', 2000);
      vi.advanceTimersByTime(1500);
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', () => {
      cache.set('key1', 'value1', 100);
      vi.advanceTimersByTime(150);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should delete a specific key', () => {
      cache.set('key1', 'value1');
      expect(cache.invalidate('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false for non-existent keys', () => {
      expect(cache.invalidate('nonexistent')).toBe(false);
    });
  });

  describe('invalidatePattern', () => {
    it('should delete keys matching pattern', () => {
      cache.set('user:1', 'a');
      cache.set('user:2', 'b');
      cache.set('item:1', 'c');

      const count = cache.invalidatePattern(/^user:/);
      expect(count).toBe(2);
      expect(cache.get('user:1')).toBeUndefined();
      expect(cache.get('item:1')).toBe('c');
    });
  });

  describe('invalidatePrefix', () => {
    it('should delete keys with prefix', () => {
      cache.set('cache:a', '1');
      cache.set('cache:b', '2');
      cache.set('other:c', '3');

      const count = cache.invalidatePrefix('cache:');
      expect(count).toBe(2);
      expect(cache.get('cache:a')).toBeUndefined();
      expect(cache.get('other:c')).toBe('3');
    });
  });

  describe('wrap', () => {
    it('should cache async function results', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      const result1 = await cache.wrap('key', fn);
      const result2 = await cache.wrap('key', fn);

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cache null/undefined values correctly', async () => {
      const fn = vi.fn().mockResolvedValue(null);

      await cache.wrap('key', fn);
      await cache.wrap('key', fn);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when maxSize reached', () => {
      cache.set('a', '1');
      vi.advanceTimersByTime(10);
      cache.set('b', '2');
      vi.advanceTimersByTime(10);
      cache.set('c', '3');
      vi.advanceTimersByTime(10);
      cache.set('d', '4'); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('2');
      expect(cache.get('d')).toBe('4');
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries on cleanup interval', () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 2000);

      vi.advanceTimersByTime(600); // Trigger cleanup after TTL expires

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('getStats', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should report size correctly', () => {
      cache.set('a', '1');
      cache.set('b', '2');

      expect(cache.getStats().size).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all entries and reset stats', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('createCache', () => {
    it('should create a cache instance', () => {
      const newCache = createCache<number>();
      newCache.set('num', 42);
      expect(newCache.get('num')).toBe(42);
      newCache.destroy();
    });
  });
});
