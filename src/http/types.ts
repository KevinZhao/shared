/**
 * HTTP 相关类型定义
 */

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 基础延迟(ms) */
  baseDelay: number;
  /** 最大延迟(ms) */
  maxDelay: number;
  /** 可重试的 HTTP 状态码 */
  retryableStatuses: number[];
  /** 可重试的网络错误码 */
  retryableErrors?: string[];
}

/**
 * 请求超时配置
 */
export interface TimeoutConfig {
  /** 快速请求 */
  fast: number;
  /** 默认请求 */
  default: number;
  /** 上传请求 */
  upload: number;
  /** 批量请求 */
  batch: number;
  /** 长时间请求 */
  long: number;
}
