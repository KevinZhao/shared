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
 * Success response helper type
 */
export type SuccessResponse<T> = ApiResponse<T> & { code: 0 };

/**
 * Check if response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.code === 0;
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
