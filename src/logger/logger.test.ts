import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createLogger,
  createModuleLogger,
  logger,
  DEFAULT_LOGGER_CONFIG,
} from './logger';
import { LogLevel } from './types';

describe('Logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    group: ReturnType<typeof vi.spyOn>;
    groupEnd: ReturnType<typeof vi.spyOn>;
    time: ReturnType<typeof vi.spyOn>;
    timeEnd: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      group: vi.spyOn(console, 'group').mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
      time: vi.spyOn(console, 'time').mockImplementation(() => {}),
      timeEnd: vi.spyOn(console, 'timeEnd').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with namespace', () => {
      const log = createLogger('TestModule');
      log.info('Test message');

      expect(consoleSpy.info).toHaveBeenCalled();
      const call = consoleSpy.info.mock.calls[0];
      expect(call.some((arg) => String(arg).includes('TestModule'))).toBe(true);
    });

    it('should log debug messages', () => {
      const log = createLogger('Test', { level: LogLevel.DEBUG });
      log.debug('Debug message');

      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      const log = createLogger('Test');
      log.info('Info message');

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log using log() method', () => {
      const log = createLogger('Test');
      log.log('Log message');

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      const log = createLogger('Test');
      log.warn('Warn message');

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const log = createLogger('Test');
      log.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include additional arguments', () => {
      const log = createLogger('Test');
      log.info('Message', { data: 'test' }, 123);

      const call = consoleSpy.info.mock.calls[0];
      expect(call).toContain('Message');
      expect(call).toContainEqual({ data: 'test' });
      expect(call).toContain(123);
    });
  });

  describe('log level filtering', () => {
    it('should filter logs below configured level', () => {
      const log = createLogger('Test', { level: LogLevel.WARN });

      log.debug('Debug');
      log.info('Info');
      log.warn('Warn');
      log.error('Error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should always log errors regardless of level', () => {
      const log = createLogger('Test', { level: LogLevel.ERROR });

      log.debug('Debug');
      log.error('Error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('enabled flag', () => {
    it('should not log when disabled', () => {
      const log = createLogger('Test', { enabled: false });

      log.debug('Debug');
      log.info('Info');
      log.warn('Warn');
      log.error('Error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('sampling rate', () => {
    it('should always log errors regardless of sampling', () => {
      const log = createLogger('Test', { samplingRate: 0 });

      log.error('Error');

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should respect sampling rate for non-errors', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);

      const log = createLogger('Test', { samplingRate: 0.5 });
      log.info('Info');

      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it('should log when random is below sampling rate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      const log = createLogger('Test', { samplingRate: 0.5 });
      log.info('Info');

      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe('formatting options', () => {
    it('should include emoji by default', () => {
      const log = createLogger('Test');
      log.info('Message');

      const call = consoleSpy.info.mock.calls[0];
      const prefix = String(call[0]);
      expect(prefix).toContain('ℹ️');
    });

    it('should exclude emoji when disabled', () => {
      const log = createLogger('Test', { showEmoji: false });
      log.info('Message');

      const call = consoleSpy.info.mock.calls[0];
      const prefix = String(call[0]);
      expect(prefix).not.toContain('ℹ️');
    });

    it('should include timestamp when enabled', () => {
      const log = createLogger('Test', { showTimestamp: true });
      log.info('Message');

      const call = consoleSpy.info.mock.calls[0];
      const hasTimestamp = call.some((arg) => /\d{4}-\d{2}-\d{2}/.test(String(arg)));
      expect(hasTimestamp).toBe(true);
    });

    it('should use module color when provided', () => {
      const log = createLogger('Test', { moduleColor: '#ff0000' });
      log.info('Message');

      const call = consoleSpy.info.mock.calls[0];
      expect(call[0]).toContain('%c');
      expect(call[1]).toContain('color: #ff0000');
    });
  });

  describe('createModuleLogger', () => {
    it('should create logger with module name', () => {
      const log = createModuleLogger('MyModule');
      log.info('Test');

      const call = consoleSpy.info.mock.calls[0];
      expect(call.some((arg) => String(arg).includes('MyModule'))).toBe(true);
    });

    it('should have success method', () => {
      const log = createModuleLogger('Test');
      log.success('Success!');

      expect(consoleSpy.info).toHaveBeenCalled();
      const call = consoleSpy.info.mock.calls[0];
      expect(call.some((arg) => String(arg).includes('✅'))).toBe(true);
    });

    it('should have failure method', () => {
      const log = createModuleLogger('Test');
      log.failure('Failed!');

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0];
      expect(call.some((arg) => String(arg).includes('❌'))).toBe(true);
    });

    it('should have group/groupEnd methods', () => {
      const log = createModuleLogger('Test');
      log.group('Group Title');
      log.groupEnd();

      expect(consoleSpy.group).toHaveBeenCalled();
      expect(consoleSpy.groupEnd).toHaveBeenCalled();
    });

    it('should not call group when disabled', () => {
      const log = createModuleLogger('Test', { enabled: false });
      log.group('Group');
      log.groupEnd();

      expect(consoleSpy.group).not.toHaveBeenCalled();
      expect(consoleSpy.groupEnd).not.toHaveBeenCalled();
    });

    it('should have time/timeEnd methods', () => {
      const log = createModuleLogger('Test');
      log.time('Timer');
      log.timeEnd('Timer');

      expect(consoleSpy.time).toHaveBeenCalledWith('[Test] Timer');
      expect(consoleSpy.timeEnd).toHaveBeenCalledWith('[Test] Timer');
    });

    it('should not call time when disabled', () => {
      const log = createModuleLogger('Test', { enabled: false });
      log.time('Timer');
      log.timeEnd('Timer');

      expect(consoleSpy.time).not.toHaveBeenCalled();
      expect(consoleSpy.timeEnd).not.toHaveBeenCalled();
    });

    it('should apply module color to group', () => {
      const log = createModuleLogger('Test', { moduleColor: '#00ff00' });
      log.group('Group');

      const call = consoleSpy.group.mock.calls[0];
      expect(call[0]).toContain('%c');
      expect(call[1]).toContain('color: #00ff00');
    });
  });

  describe('DEFAULT_LOGGER_CONFIG', () => {
    it('should have expected defaults', () => {
      expect(DEFAULT_LOGGER_CONFIG.enabled).toBe(true);
      expect(DEFAULT_LOGGER_CONFIG.level).toBe(LogLevel.DEBUG);
      expect(DEFAULT_LOGGER_CONFIG.showTimestamp).toBe(false);
      expect(DEFAULT_LOGGER_CONFIG.showEmoji).toBe(true);
      expect(DEFAULT_LOGGER_CONFIG.samplingRate).toBe(1);
    });
  });

  describe('default logger instance', () => {
    it('should export a default logger', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });
});
