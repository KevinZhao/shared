/**
 * Standard application error interface
 */
export interface AppError extends Error {
  code: string | number;
  detail?: string;
  originalError?: Error;
}

/**
 * Error handler result
 */
export interface ErrorHandlerResult {
  message: string;
  userMessage: string;
  code: string | number;
  detail?: string;
  requestId?: string;
  isRetryable: boolean;
}

/**
 * Error code range configuration
 */
export interface ErrorCodeRangeConfig {
  start: number;
  end: number;
  defaultMessage: string;
  isRetryable: boolean;
}
