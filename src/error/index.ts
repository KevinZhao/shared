export {
  ErrorHandler,
  createErrorHandler,
  normalizeError,
  filterSensitiveData,
  containsSensitiveInfo,
  getUserFriendlyMessage,
  isRetryableError,
  createError,
  DEFAULT_ERROR_RANGES,
} from './handler';

export type {
  AppError,
  ErrorHandlerResult,
  ErrorCodeRangeConfig,
} from './types';
