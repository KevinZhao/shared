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
  /** 模块名称 (可选) */
  module?: string;
  /** 模块颜色 (可选, 用于控制台样式) */
  moduleColor?: string;
  /** 采样率 0-1 (可选, 1=全部记录, 0.1=10%采样, ERROR 级别始终记录) */
  samplingRate?: number;
}

/**
 * 模块日志器 - 带额外便捷方法
 */
export interface ModuleLogger extends Logger {
  success(message: string, ...args: unknown[]): void;
  failure(message: string, ...args: unknown[]): void;
  group(title: string): void;
  groupEnd(): void;
  time(label: string): void;
  timeEnd(label: string): void;
}
