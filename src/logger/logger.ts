/**
 * 日志工具
 */

import type { Logger, LoggerConfig, LogLevelType } from './types';
import { LogLevel } from './types';

/**
 * 日志级别优先级
 */
const LOG_LEVEL_PRIORITY: Record<LogLevelType, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * 默认日志配置
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  enabled: true,
  level: LogLevel.DEBUG,
  showTimestamp: false,
  showEmoji: true,
};

/**
 * 日志 emoji
 */
const LOG_EMOJI: Record<LogLevelType, string> = {
  [LogLevel.DEBUG]: '🐛',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌',
};

/**
 * 创建带命名空间的日志器
 */
export function createLogger(namespace: string, config: Partial<LoggerConfig> = {}): Logger {
  const mergedConfig: LoggerConfig = { ...DEFAULT_LOGGER_CONFIG, ...config };

  const shouldLog = (level: LogLevelType): boolean => {
    if (!mergedConfig.enabled) return false;
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[mergedConfig.level];
  };

  const formatPrefix = (level: LogLevelType): string => {
    const parts: string[] = [];
    if (mergedConfig.showEmoji) {
      parts.push(LOG_EMOJI[level]);
    }
    parts.push(`[${namespace}]`);
    if (mergedConfig.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    return parts.join(' ');
  };

  return {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog(LogLevel.DEBUG)) {
        console.debug(formatPrefix(LogLevel.DEBUG), message, ...args);
      }
    },
    info(message: string, ...args: unknown[]): void {
      if (shouldLog(LogLevel.INFO)) {
        console.info(formatPrefix(LogLevel.INFO), message, ...args);
      }
    },
    log(message: string, ...args: unknown[]): void {
      if (shouldLog(LogLevel.INFO)) {
        console.log(formatPrefix(LogLevel.INFO), message, ...args);
      }
    },
    warn(message: string, ...args: unknown[]): void {
      if (shouldLog(LogLevel.WARN)) {
        console.warn(formatPrefix(LogLevel.WARN), message, ...args);
      }
    },
    error(message: string, ...args: unknown[]): void {
      if (shouldLog(LogLevel.ERROR)) {
        console.error(formatPrefix(LogLevel.ERROR), message, ...args);
      }
    },
  };
}

/**
 * 默认日志器
 */
export const logger = createLogger('App');
