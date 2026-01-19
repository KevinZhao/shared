/**
 * 统一日志工具
 * 支持模块分类、日志级别控制、采样率
 */

import type { Logger, LoggerConfig, LogLevelType, ModuleLogger } from './types';
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
  samplingRate: 1,
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
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[mergedConfig.level]) return false;

    // ERROR 级别始终记录，其他级别根据采样率
    if (level === LogLevel.ERROR) return true;
    if (mergedConfig.samplingRate !== undefined && mergedConfig.samplingRate < 1) {
      return Math.random() < mergedConfig.samplingRate;
    }
    return true;
  };

  const formatPrefix = (level: LogLevelType): string => {
    const parts: string[] = [];
    if (mergedConfig.showEmoji) {
      parts.push(LOG_EMOJI[level]);
    }
    const name = mergedConfig.module || namespace;
    parts.push(`[${name}]`);
    if (mergedConfig.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    return parts.join(' ');
  };

  const logWithStyle = (
    level: LogLevelType,
    consoleFn: (...args: unknown[]) => void,
    message: string,
    args: unknown[]
  ): void => {
    if (!shouldLog(level)) return;

    const prefix = formatPrefix(level);
    if (mergedConfig.moduleColor) {
      const style = `color: ${mergedConfig.moduleColor}; font-weight: bold;`;
      consoleFn(`%c${prefix}`, style, message, ...args);
    } else {
      consoleFn(prefix, message, ...args);
    }
  };

  return {
    debug(message: string, ...args: unknown[]): void {
      logWithStyle(LogLevel.DEBUG, console.debug, message, args);
    },
    info(message: string, ...args: unknown[]): void {
      logWithStyle(LogLevel.INFO, console.info, message, args);
    },
    log(message: string, ...args: unknown[]): void {
      logWithStyle(LogLevel.INFO, console.log, message, args);
    },
    warn(message: string, ...args: unknown[]): void {
      logWithStyle(LogLevel.WARN, console.warn, message, args);
    },
    error(message: string, ...args: unknown[]): void {
      logWithStyle(LogLevel.ERROR, console.error, message, args);
    },
  };
}

/**
 * 创建模块日志器 - 带额外便捷方法
 */
export function createModuleLogger(
  module: string,
  config: Partial<LoggerConfig> = {}
): ModuleLogger {
  const mergedConfig: LoggerConfig = {
    ...DEFAULT_LOGGER_CONFIG,
    ...config,
    module,
  };

  const baseLogger = createLogger(module, mergedConfig);

  return {
    ...baseLogger,

    success(message: string, ...args: unknown[]): void {
      baseLogger.info(`✅ ${message}`, ...args);
    },

    failure(message: string, ...args: unknown[]): void {
      baseLogger.error(`❌ ${message}`, ...args);
    },

    group(title: string): void {
      if (mergedConfig.enabled) {
        if (mergedConfig.moduleColor) {
          console.group(
            `%c[${module}] ${title}`,
            `color: ${mergedConfig.moduleColor}; font-weight: bold;`
          );
        } else {
          console.group(`[${module}] ${title}`);
        }
      }
    },

    groupEnd(): void {
      if (mergedConfig.enabled) {
        console.groupEnd();
      }
    },

    time(label: string): void {
      if (mergedConfig.enabled) {
        console.time(`[${module}] ${label}`);
      }
    },

    timeEnd(label: string): void {
      if (mergedConfig.enabled) {
        console.timeEnd(`[${module}] ${label}`);
      }
    },
  };
}

/**
 * 默认日志器
 */
export const logger = createLogger('App');
