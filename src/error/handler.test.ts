import { describe, it, expect } from 'vitest';
import {
  containsSensitiveInfo,
  filterSensitiveData,
  normalizeError,
  getUserFriendlyMessage,
  isRetryableError,
  createError,
  ErrorHandler,
  DEFAULT_ERROR_RANGES,
} from './handler';

describe('containsSensitiveInfo', () => {
  it('should return false for empty string', () => {
    expect(containsSensitiveInfo('')).toBe(false);
  });

  it('should detect SQL keywords', () => {
    expect(containsSensitiveInfo('SELECT * FROM users')).toBe(true);
    expect(containsSensitiveInfo('INSERT INTO table')).toBe(true);
    expect(containsSensitiveInfo('DELETE FROM users')).toBe(true);
    expect(containsSensitiveInfo('DROP TABLE users')).toBe(true);
  });

  it('should detect database names', () => {
    expect(containsSensitiveInfo('mysql connection failed')).toBe(true);
    expect(containsSensitiveInfo('postgres error')).toBe(true);
    expect(containsSensitiveInfo('mongodb timeout')).toBe(true);
    expect(containsSensitiveInfo('redis connection')).toBe(true);
  });

  it('should detect credentials', () => {
    expect(containsSensitiveInfo('password invalid')).toBe(true);
    expect(containsSensitiveInfo('token expired')).toBe(true);
    expect(containsSensitiveInfo('secret key')).toBe(true);
    expect(containsSensitiveInfo('credential not found')).toBe(true);
  });

  it('should detect system paths', () => {
    expect(containsSensitiveInfo('/var/log/app.log')).toBe(true);
    expect(containsSensitiveInfo('/home/user/project')).toBe(true);
    expect(containsSensitiveInfo('c:\\windows\\system32')).toBe(true);
    expect(containsSensitiveInfo('node_modules/package')).toBe(true);
  });

  it('should detect stack traces', () => {
    expect(containsSensitiveInfo('error: at line 42')).toBe(true);
    expect(containsSensitiveInfo('at MyFunction (')).toBe(true);
    expect(containsSensitiveInfo('/src/app.ts')).toBe(true);
  });

  it('should detect IP addresses and ports', () => {
    expect(containsSensitiveInfo('localhost:3000')).toBe(true);
    expect(containsSensitiveInfo('127.0.0.1')).toBe(true);
    expect(containsSensitiveInfo('server:8080')).toBe(true);
  });

  it('should not flag normal messages', () => {
    expect(containsSensitiveInfo('User not found')).toBe(false);
    expect(containsSensitiveInfo('Invalid input')).toBe(false);
    expect(containsSensitiveInfo('Please try again')).toBe(false);
  });

  it('should use word boundaries to avoid false positives', () => {
    // "selective" should not match "select"
    expect(containsSensitiveInfo('selective process')).toBe(false);
    // "update" alone without SQL context
    expect(containsSensitiveInfo('Please update your app')).toBe(false);
  });
});

describe('filterSensitiveData', () => {
  it('should return undefined for empty input', () => {
    expect(filterSensitiveData(undefined)).toBeUndefined();
    expect(filterSensitiveData('')).toBeUndefined();
  });

  it('should return detail in dev mode', () => {
    expect(filterSensitiveData('SELECT * FROM users', true)).toBe('SELECT * FROM users');
  });

  it('should filter sensitive data in production', () => {
    expect(filterSensitiveData('SELECT * FROM users', false)).toBeUndefined();
  });

  it('should filter long messages in production', () => {
    const longMessage = 'a'.repeat(250);
    expect(filterSensitiveData(longMessage, false)).toBeUndefined();
  });

  it('should allow safe messages in production', () => {
    expect(filterSensitiveData('Invalid input', false)).toBe('Invalid input');
  });
});

describe('normalizeError', () => {
  it('should normalize Error instances', () => {
    const error = new Error('Test error');
    const normalized = normalizeError(error);

    expect(normalized.name).toBe('Error');
    expect(normalized.message).toBe('Test error');
    expect(normalized.code).toBe('UNKNOWN_ERROR');
  });

  it('should preserve custom error properties', () => {
    const error = new Error('Test') as Error & { code: number; detail: string };
    error.code = 12345;
    error.detail = 'Detail info';

    const normalized = normalizeError(error);
    expect(normalized.code).toBe(12345);
    expect(normalized.detail).toBe('Detail info');
  });

  it('should normalize string errors', () => {
    const normalized = normalizeError('String error');
    expect(normalized.message).toBe('String error');
    expect(normalized.code).toBe('UNKNOWN_ERROR');
  });

  it('should normalize error-like objects', () => {
    const errorObj = { message: 'Object error', code: 'CUSTOM_ERROR' };
    const normalized = normalizeError(errorObj);

    expect(normalized.message).toBe('Object error');
    expect(normalized.code).toBe('CUSTOM_ERROR');
  });

  it('should handle objects with error property', () => {
    const errorObj = { error: 'Error message' };
    const normalized = normalizeError(errorObj);

    expect(normalized.message).toBe('Error message');
  });

  it('should handle unknown error types', () => {
    const normalized = normalizeError(null);
    expect(normalized.message).toBe('Unknown error');
    expect(normalized.code).toBe('UNKNOWN_ERROR');
  });

  it('should handle non-error objects', () => {
    const normalized = normalizeError({ foo: 'bar' });
    expect(normalized.message).toBe('Unknown error');
  });
});

describe('getUserFriendlyMessage', () => {
  it('should return predefined message for known code', () => {
    const messages = { 10001: 'Custom message' };
    expect(getUserFriendlyMessage(10001, messages)).toBe('Custom message');
  });

  it('should return range message for codes in range', () => {
    expect(getUserFriendlyMessage(150000)).toBe('System error, please try again later');
    expect(getUserFriendlyMessage(250000)).toBe('Authentication required');
    expect(getUserFriendlyMessage(350000)).toBe('Operation failed, please retry');
    expect(getUserFriendlyMessage(450000)).toBe('Data processing failed');
    expect(getUserFriendlyMessage(550000)).toBe('Service temporarily unavailable');
  });

  it('should return fallback for unknown codes', () => {
    expect(getUserFriendlyMessage(999999)).toBe('Operation failed, please retry');
    expect(getUserFriendlyMessage(999999, {}, [], 'Custom fallback')).toBe('Custom fallback');
  });
});

describe('isRetryableError', () => {
  it('should return true for retryable error codes', () => {
    expect(isRetryableError(150000)).toBe(true); // System error
    expect(isRetryableError(350000)).toBe(true); // Operation error
    expect(isRetryableError(550000)).toBe(true); // Service error
  });

  it('should return false for non-retryable error codes', () => {
    expect(isRetryableError(250000)).toBe(false); // Auth error
    expect(isRetryableError(450000)).toBe(false); // Data error
  });

  it('should return false for unknown codes', () => {
    expect(isRetryableError(999999)).toBe(false);
  });
});

describe('createError', () => {
  it('should create an error with code and message', () => {
    const error = createError('CUSTOM_ERROR', 'Custom message');
    expect(error.message).toBe('Custom message');
    expect(error.code).toBe('CUSTOM_ERROR');
  });

  it('should include detail when provided', () => {
    const error = createError(12345, 'Error', 'Detail info');
    expect(error.detail).toBe('Detail info');
  });
});

describe('ErrorHandler', () => {
  describe('handleError', () => {
    it('should return standardized error result', () => {
      const handler = new ErrorHandler();
      const result = handler.handleError(new Error('Test'));

      expect(result.message).toBe('Test');
      expect(result.userMessage).toBeTruthy();
      expect(result.code).toBeDefined();
    });

    it('should use custom messages', () => {
      const handler = new ErrorHandler({
        messages: { 12345: 'Custom user message' },
      });

      const error = new Error('Test') as Error & { code: number };
      error.code = 12345;

      const result = handler.handleError(error);
      expect(result.userMessage).toBe('Custom user message');
    });

    it('should filter sensitive data in production', () => {
      const handler = new ErrorHandler({ isDev: false });
      const error = new Error('Test') as Error & { detail: string };
      error.detail = 'SELECT * FROM users';

      const result = handler.handleError(error);
      expect(result.detail).toBeUndefined();
    });

    it('should preserve sensitive data in dev mode', () => {
      const handler = new ErrorHandler({ isDev: true });
      const error = new Error('Test') as Error & { detail: string };
      error.detail = 'SELECT * FROM users';

      const result = handler.handleError(error);
      expect(result.detail).toBe('SELECT * FROM users');
    });

    it('should extract request_id from error', () => {
      const handler = new ErrorHandler();
      const error = { message: 'Test', request_id: 'req-123' };

      const result = handler.handleError(error);
      expect(result.requestId).toBe('req-123');
    });

    it('should determine if error is retryable', () => {
      const handler = new ErrorHandler();
      const error = new Error('Test') as Error & { code: number };

      error.code = 150000;
      expect(handler.handleError(error).isRetryable).toBe(true);

      error.code = 250000;
      expect(handler.handleError(error).isRetryable).toBe(false);
    });
  });

  describe('createError', () => {
    it('should create standardized error', () => {
      const handler = new ErrorHandler();
      const error = handler.createError('CODE', 'Message', 'Detail');

      expect(error.code).toBe('CODE');
      expect(error.message).toBe('Message');
      expect(error.detail).toBe('Detail');
    });
  });
});
