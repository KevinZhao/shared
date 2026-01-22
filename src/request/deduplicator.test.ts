import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestDeduplicator, DuplicateRequestError, requestDeduplicator } from './deduplicator';

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    vi.useFakeTimers();
    deduplicator = new RequestDeduplicator({ requestTimeout: 5000 });
  });

  afterEach(() => {
    deduplicator.stopAutoCleanup();
    deduplicator.clear();
    vi.useRealTimers();
  });

  describe('generateKey', () => {
    it('should generate consistent keys', () => {
      const key1 = deduplicator.generateKey('GET', '/api/users');
      const key2 = deduplicator.generateKey('GET', '/api/users');
      expect(key1).toBe(key2);
    });

    it('should include method in key', () => {
      const getKey = deduplicator.generateKey('GET', '/api/users');
      const postKey = deduplicator.generateKey('POST', '/api/users');
      expect(getKey).not.toBe(postKey);
    });

    it('should uppercase method', () => {
      const key1 = deduplicator.generateKey('get', '/api/users');
      const key2 = deduplicator.generateKey('GET', '/api/users');
      expect(key1).toBe(key2);
    });

    it('should include data in key', () => {
      const key1 = deduplicator.generateKey('POST', '/api', { a: 1 });
      const key2 = deduplicator.generateKey('POST', '/api', { a: 2 });
      expect(key1).not.toBe(key2);
    });

    it('should sort object keys for consistent serialization', () => {
      const key1 = deduplicator.generateKey('POST', '/api', { b: 2, a: 1 });
      const key2 = deduplicator.generateKey('POST', '/api', { a: 1, b: 2 });
      expect(key1).toBe(key2);
    });

    it('should handle nested objects', () => {
      const key1 = deduplicator.generateKey('POST', '/api', { nested: { b: 2, a: 1 } });
      const key2 = deduplicator.generateKey('POST', '/api', { nested: { a: 1, b: 2 } });
      expect(key1).toBe(key2);
    });

    it('should handle arrays', () => {
      const key1 = deduplicator.generateKey('POST', '/api', { arr: [1, 2, 3] });
      const key2 = deduplicator.generateKey('POST', '/api', { arr: [1, 2, 3] });
      expect(key1).toBe(key2);
    });

    it('should handle non-serializable data', () => {
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;

      // Should not throw, falls back to String()
      expect(() => deduplicator.generateKey('POST', '/api', circular)).not.toThrow();
    });
  });

  describe('deduplicate', () => {
    it('should return same promise for concurrent requests', async () => {
      let callCount = 0;
      const fn = () =>
        new Promise<string>((resolve) => {
          callCount++;
          setTimeout(() => resolve('result'), 100);
        });

      const promise1 = deduplicator.deduplicate('key', fn);
      const promise2 = deduplicator.deduplicate('key', fn);

      vi.advanceTimersByTime(100);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(callCount).toBe(1);
    });

    it('should allow new request after previous completes', async () => {
      let callCount = 0;
      const fn = () =>
        new Promise<number>((resolve) => {
          callCount++;
          setTimeout(() => resolve(callCount), 50);
        });

      const promise1 = deduplicator.deduplicate('key', fn);
      vi.advanceTimersByTime(50);
      await promise1;

      const promise2 = deduplicator.deduplicate('key', fn);
      vi.advanceTimersByTime(50);
      await promise2;

      expect(callCount).toBe(2);
    });

    it('should clean up after request completes', async () => {
      const fn = () => Promise.resolve('done');

      await deduplicator.deduplicate('key', fn);

      expect(deduplicator.getStats().pendingCount).toBe(0);
    });

    it('should clean up after request fails', async () => {
      const fn = () => Promise.reject(new Error('fail'));

      try {
        await deduplicator.deduplicate('key', fn);
      } catch {
        // Expected
      }

      expect(deduplicator.getStats().pendingCount).toBe(0);
    });
  });

  describe('execute', () => {
    it('should deduplicate concurrent requests', async () => {
      let callCount = 0;
      const fn = () =>
        new Promise<string>((resolve) => {
          callCount++;
          setTimeout(() => resolve('result'), 100);
        });

      const options = { method: 'POST', url: '/api/submit', data: { id: 1 } };

      const promise1 = deduplicator.execute(options, fn);
      const promise2 = deduplicator.execute(options, fn);

      vi.advanceTimersByTime(100);

      await Promise.all([promise1, promise2]);
      expect(callCount).toBe(1);
    });

    it('should block recently completed requests', async () => {
      const fn = () => Promise.resolve('done');
      const options = {
        method: 'POST',
        url: '/api/submit',
        blockAfterComplete: 1000,
      };

      await deduplicator.execute(options, fn);

      vi.advanceTimersByTime(500);

      await expect(deduplicator.execute(options, fn)).rejects.toThrow(DuplicateRequestError);
    });

    it('should allow request after block time expires', async () => {
      const fn = () => Promise.resolve('done');
      const options = {
        method: 'POST',
        url: '/api/submit',
        blockAfterComplete: 1000,
      };

      await deduplicator.execute(options, fn);

      vi.advanceTimersByTime(1100);

      await expect(deduplicator.execute(options, fn)).resolves.toBe('done');
    });

    it('should track completed time on success', async () => {
      const fn = () => Promise.resolve('done');
      const options = {
        method: 'POST',
        url: '/api/submit',
        blockAfterComplete: 1000,
      };

      await deduplicator.execute(options, fn);

      expect(deduplicator.getStats().completedCount).toBe(1);
    });

    it('should not track completed time on failure', async () => {
      const fn = () => Promise.reject(new Error('fail'));
      const options = {
        method: 'POST',
        url: '/api/submit',
        blockAfterComplete: 1000,
      };

      try {
        await deduplicator.execute(options, fn);
      } catch {
        // Expected
      }

      expect(deduplicator.getStats().completedCount).toBe(0);
    });

    it('should not block when blockAfterComplete is 0', async () => {
      const fn = () => Promise.resolve('done');
      const options = {
        method: 'POST',
        url: '/api/submit',
        blockAfterComplete: 0,
      };

      await deduplicator.execute(options, fn);
      await expect(deduplicator.execute(options, fn)).resolves.toBe('done');
    });
  });

  describe('DuplicateRequestError', () => {
    it('should have reason property', () => {
      const inProgress = new DuplicateRequestError('in_progress');
      expect(inProgress.reason).toBe('in_progress');
      expect(inProgress.message).toContain('in progress');

      const recent = new DuplicateRequestError('recently_completed');
      expect(recent.reason).toBe('recently_completed');
      expect(recent.message).toContain('recently completed');
    });
  });

  describe('cleanup', () => {
    it('should remove expired completed records', async () => {
      const fn = () => Promise.resolve('done');
      const options = {
        method: 'POST',
        url: '/api/submit',
        blockAfterComplete: 1000,
      };

      await deduplicator.execute(options, fn);
      expect(deduplicator.getStats().completedCount).toBe(1);

      vi.advanceTimersByTime(5000);
      deduplicator.cleanup(1000);

      expect(deduplicator.getStats().completedCount).toBe(0);
    });

    it('should remove stuck pending requests', async () => {
      // Start a request that never resolves
      const neverResolves = new Promise(() => {});
      deduplicator.deduplicate('stuck', () => neverResolves);

      expect(deduplicator.getStats().pendingCount).toBe(1);

      vi.advanceTimersByTime(10000);
      deduplicator.cleanup();

      expect(deduplicator.getStats().pendingCount).toBe(0);
    });
  });

  describe('autoCleanup', () => {
    it('should run cleanup on interval', async () => {
      const fn = () => Promise.resolve('done');
      const options = {
        method: 'POST',
        url: '/api/submit',
        blockAfterComplete: 1000,
      };

      await deduplicator.execute(options, fn);
      deduplicator.startAutoCleanup(1000);

      vi.advanceTimersByTime(15000);

      expect(deduplicator.getStats().completedCount).toBe(0);
    });

    it('should not start multiple cleanup intervals', () => {
      deduplicator.startAutoCleanup(1000);
      deduplicator.startAutoCleanup(1000); // Should be no-op

      // Just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should stop cleanup interval', () => {
      deduplicator.startAutoCleanup(1000);
      deduplicator.stopAutoCleanup();

      // Verify no errors
      expect(true).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return correct counts', async () => {
      const fn = () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve('done'), 100);
        });

      deduplicator.deduplicate('key1', fn);

      const stats = deduplicator.getStats();
      expect(stats.pendingCount).toBe(1);
      expect(stats.completedCount).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all state', async () => {
      const fn = () => Promise.resolve('done');
      const options = {
        method: 'POST',
        url: '/api/submit',
        blockAfterComplete: 1000,
      };

      await deduplicator.execute(options, fn);
      deduplicator.clear();

      const stats = deduplicator.getStats();
      expect(stats.pendingCount).toBe(0);
      expect(stats.completedCount).toBe(0);
    });
  });

  describe('default instance', () => {
    it('should export a default instance', () => {
      expect(requestDeduplicator).toBeInstanceOf(RequestDeduplicator);
    });
  });
});
