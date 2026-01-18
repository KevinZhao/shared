import { AppError, ErrorHandlerResult, ErrorCodeRangeConfig } from './types';

/**
 * Sensitive keywords that should be filtered from error messages
 */
const SENSITIVE_KEYWORDS = [
  // Database
  'sql', 'database', 'query', 'mysql', 'postgres', 'mongodb', 'redis',
  'select', 'insert', 'update', 'delete', 'drop', 'table', 'column',
  // Stack trace
  'stack', 'stacktrace', 'exception', 'error:', 'at line', 'traceback',
  // System paths
  '/var/', '/usr/', '/home/', '/opt/', 'node_modules', 'src/',
  // Secrets
  'password', 'token', 'secret', 'key', 'credential', 'auth',
  // Framework
  'express', 'react', 'axios', 'nginx', 'gin', 'gorm',
  // Internal errors
  'panic', 'fatal', 'assertion', 'undefined', 'nil pointer',
  // Network
  'localhost', '127.0.0.1', ':3000', ':8080',
];

/**
 * Path patterns that indicate internal information
 */
const PATH_PATTERNS = [
  /[a-z]:\\[\w\\]+/i,              // Windows path
  /\/[\w\/]+\.(js|ts|tsx|jsx|go)/i, // File path
  /line\s+\d+/i,                    // Line number
  /at\s+[\w.]+\s+\(/i,              // Stack frame
];

/**
 * Check if a string contains sensitive information
 */
export function containsSensitiveInfo(text: string): boolean {
  if (!text) return false;

  const lower = text.toLowerCase();

  // Check for sensitive keywords
  if (SENSITIVE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()))) {
    return true;
  }

  // Check for path patterns
  if (PATH_PATTERNS.some(pattern => pattern.test(text))) {
    return true;
  }

  return false;
}

/**
 * Filter sensitive information from error detail
 * In production mode, removes any potentially sensitive content
 */
export function filterSensitiveData(
  detail: string | undefined,
  isDev = false
): string | undefined {
  if (!detail || typeof detail !== 'string') {
    return undefined;
  }

  // In development, allow more detail
  if (isDev) {
    return detail;
  }

  // In production, be strict
  if (containsSensitiveInfo(detail) || detail.length > 200) {
    return undefined;
  }

  return detail;
}

/**
 * Normalize any error to AppError format
 * Note: Error properties are non-enumerable, so we explicitly copy them
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof Error) {
    const appError = error as AppError;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: appError.code ?? 'UNKNOWN_ERROR',
      detail: appError.detail,
      originalError: error,
    } as AppError;
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
      code: 'UNKNOWN_ERROR',
    } as AppError;
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    return {
      name: 'Error',
      message: String(obj.message ?? obj.error ?? 'Unknown error'),
      code: obj.code ?? 'UNKNOWN_ERROR',
      detail: typeof obj.detail === 'string' ? obj.detail : undefined,
    } as AppError;
  }

  return {
    name: 'Error',
    message: 'Unknown error',
    code: 'UNKNOWN_ERROR',
  } as AppError;
}

/**
 * Default error code ranges for typical API error codes
 */
export const DEFAULT_ERROR_RANGES: ErrorCodeRangeConfig[] = [
  { start: 100000, end: 200000, defaultMessage: 'System error, please try again later', isRetryable: true },
  { start: 200000, end: 300000, defaultMessage: 'Authentication required', isRetryable: false },
  { start: 300000, end: 400000, defaultMessage: 'Operation failed, please retry', isRetryable: true },
  { start: 400000, end: 500000, defaultMessage: 'Data processing failed', isRetryable: false },
  { start: 500000, end: 600000, defaultMessage: 'Service temporarily unavailable', isRetryable: true },
];

/**
 * Get a user-friendly message based on error code
 */
export function getUserFriendlyMessage(
  errorCode: number,
  messages: Record<number, string> = {},
  ranges: ErrorCodeRangeConfig[] = DEFAULT_ERROR_RANGES,
  fallback = 'Operation failed, please retry'
): string {
  // Check predefined messages first
  if (messages[errorCode]) {
    return messages[errorCode];
  }

  // Check error ranges
  for (const range of ranges) {
    if (errorCode >= range.start && errorCode < range.end) {
      return range.defaultMessage;
    }
  }

  return fallback;
}

/**
 * Check if an error is retryable based on its code
 */
export function isRetryableError(
  errorCode: number,
  ranges: ErrorCodeRangeConfig[] = DEFAULT_ERROR_RANGES
): boolean {
  for (const range of ranges) {
    if (errorCode >= range.start && errorCode < range.end) {
      return range.isRetryable;
    }
  }
  return false;
}

/**
 * Create a standardized error object
 */
export function createError(
  code: string | number,
  message: string,
  detail?: string
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.detail = detail;
  return error;
}

/**
 * Error handler class for unified error processing
 */
export class ErrorHandler {
  private messages: Record<number, string>;
  private ranges: ErrorCodeRangeConfig[];
  private isDev: boolean;

  constructor(options: {
    messages?: Record<number, string>;
    ranges?: ErrorCodeRangeConfig[];
    isDev?: boolean;
  } = {}) {
    this.messages = options.messages ?? {};
    this.ranges = options.ranges ?? DEFAULT_ERROR_RANGES;
    this.isDev = options.isDev ?? false;
  }

  /**
   * Handle an API error and return a standardized result
   */
  handleError(error: unknown): ErrorHandlerResult {
    const normalized = normalizeError(error);
    const errorCode = typeof normalized.code === 'number' ? normalized.code : 0;

    return {
      message: normalized.message,
      userMessage: getUserFriendlyMessage(errorCode, this.messages, this.ranges),
      code: normalized.code,
      detail: filterSensitiveData(normalized.detail, this.isDev),
      requestId: (error as Record<string, unknown>)?.request_id as string | undefined,
      isRetryable: isRetryableError(errorCode, this.ranges),
    };
  }

  /**
   * Create a standardized error
   */
  createError(code: string | number, message: string, detail?: string): AppError {
    return createError(code, message, detail);
  }
}

/**
 * Create an error handler instance
 */
export function createErrorHandler(options?: {
  messages?: Record<number, string>;
  ranges?: ErrorCodeRangeConfig[];
  isDev?: boolean;
}): ErrorHandler {
  return new ErrorHandler(options);
}
