/**
 * HTTP 重试工具
 */

import type { RetryConfig } from './types';

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNABORTED', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ERR_NETWORK'],
};

/**
 * 默认超时配置(ms)
 */
export const DEFAULT_TIMEOUTS = {
  fast: 5000,
  default: 15000,
  upload: 60000,
  batch: 120000,
  long: 180000,
} as const;

/**
 * 计算重试延迟(指数退避 + 抖动)
 */
export function calculateRetryDelay(
  attempt: number,
  config: Pick<RetryConfig, 'baseDelay' | 'maxDelay'>
): number {
  const delay = config.baseDelay * Math.pow(2, attempt);
  const jitter = delay * 0.1 * Math.random();
  return Math.min(delay + jitter, config.maxDelay);
}

/**
 * 判断 HTTP 状态码是否可重试
 */
export function isStatusRetryable(status: number, config: Pick<RetryConfig, 'retryableStatuses'>): boolean {
  return config.retryableStatuses.includes(status);
}

/**
 * 判断错误码是否可重试
 */
export function isErrorRetryable(errorCode: string | undefined, config: Pick<RetryConfig, 'retryableErrors'>): boolean {
  if (!errorCode || !config.retryableErrors) return false;
  return config.retryableErrors.includes(errorCode);
}

/**
 * 延迟指定毫秒
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
