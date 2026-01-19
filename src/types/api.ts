/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  request_id?: string;
  timestamp?: number;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  code: number;
  message: string;
  error?: {
    code: number;
    message: string;
    detail?: string;
    request_id?: string;
    timestamp?: number;
    path?: string;
  };
  request_id?: string;
  timestamp?: number;
}

/**
 * Pagination parameters for list requests
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
  limit?: number;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size?: number;
  limit?: number;
  total_pages?: number;
}

/**
 * Authentication token response
 */
export interface AuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Common HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Request configuration
 */
export interface RequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
}

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort parameters
 */
export interface SortParams {
  sort_by?: string;
  sort_order?: SortOrder;
}

/**
 * Filter parameters (generic)
 */
export interface FilterParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * List query parameters combining pagination, sort and filter
 */
export interface ListQueryParams extends PaginationParams, SortParams {
  filters?: FilterParams;
}

/**
 * 成功状态码
 */
export const SUCCESS_CODE = 100000;

/**
 * 错误码枚举
 * 与 sleep 后端 pkg/util/errors.go 的错误码定义保持一致
 */
export enum ErrorCode {
  // 通用错误 (10xxxx)
  SUCCESS = 100000,
  INTERNAL_ERROR = 100001,
  INVALID_REQUEST = 100002,
  INVALID_PARAMETER = 100003,
  RESOURCE_NOT_FOUND = 100004,
  TOO_MANY_REQUESTS = 100006,

  // 认证授权错误 (20xxxx)
  UNAUTHORIZED = 200001,
  FORBIDDEN = 200002,
  TOKEN_EXPIRED = 200003,
  TOKEN_INVALID = 200004,
  INVALID_CREDENTIALS = 200005,

  // 业务逻辑错误 (30xxxx)
  QUESTION_NOT_FOUND = 300001,
  CERT_NOT_FOUND = 300002,
  ANSWER_INVALID = 300003,
  EXAM_NOT_AVAILABLE = 300004,

  // 数据库错误 (40xxxx)
  DATABASE_ERROR = 400001,
  DUPLICATE_ENTRY = 400002,
  CONSTRAINT_VIOLATION = 400003,
  DUPLICATE_RESOURCE = 400004,
}

/**
 * 错误码对应的用户友好消息
 */
export const ErrorMessages: Record<number, string> = {
  [ErrorCode.SUCCESS]: '操作成功',
  [ErrorCode.INTERNAL_ERROR]: '内部服务器错误',
  [ErrorCode.INVALID_REQUEST]: '无效请求',
  [ErrorCode.INVALID_PARAMETER]: '参数无效',
  [ErrorCode.RESOURCE_NOT_FOUND]: '资源未找到',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后重试',
  [ErrorCode.UNAUTHORIZED]: '未授权访问',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ErrorCode.TOKEN_INVALID]: '令牌无效',
  [ErrorCode.INVALID_CREDENTIALS]: '凭据无效',
  [ErrorCode.QUESTION_NOT_FOUND]: '问题未找到',
  [ErrorCode.CERT_NOT_FOUND]: '认证未找到',
  [ErrorCode.ANSWER_INVALID]: '答案无效',
  [ErrorCode.EXAM_NOT_AVAILABLE]: '考试不可用',
  [ErrorCode.DATABASE_ERROR]: '数据库操作失败',
  [ErrorCode.DUPLICATE_ENTRY]: '数据重复',
  [ErrorCode.CONSTRAINT_VIOLATION]: '数据约束冲突',
  [ErrorCode.DUPLICATE_RESOURCE]: '资源已存在',
};

/**
 * 判断错误码是否需要重新登录
 */
export function isAuthError(code: number): boolean {
  return [
    ErrorCode.UNAUTHORIZED,
    ErrorCode.TOKEN_EXPIRED,
    ErrorCode.TOKEN_INVALID,
    ErrorCode.INVALID_CREDENTIALS,
  ].includes(code);
}

/**
 * Success response helper type
 */
export type SuccessResponse<T> = ApiResponse<T> & { code: typeof SUCCESS_CODE };

/**
 * Check if response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.code === SUCCESS_CODE;
}

/**
 * Extract data from response or throw
 */
export function extractData<T>(response: ApiResponse<T>): T {
  if (!isSuccessResponse(response)) {
    throw new Error(response.message || 'Request failed');
  }
  return response.data;
}
