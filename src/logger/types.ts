/**
 * 日志相关类型定义
 */

/**
 * 日志级别
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * 日志器接口
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  log(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * 日志配置
 */
export interface LoggerConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 最小日志级别 */
  level: LogLevelType;
  /** 是否显示时间戳 */
  showTimestamp: boolean;
  /** 是否显示 emoji */
  showEmoji: boolean;
}
