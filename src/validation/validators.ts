import {
  ValidationError,
  ValidationErrors,
  ValidationRule,
  PaginationOptions,
  StringOptions,
  ArrayOptions,
  DateOptions,
} from './types';

/**
 * Validate a positive integer ID
 */
export function validateId(id: unknown, fieldName = 'id'): number {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;

  if (typeof numId !== 'number' || isNaN(numId)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName, id);
  }

  if (numId <= 0 || !Number.isInteger(numId)) {
    throw new ValidationError(`${fieldName} must be a positive integer`, fieldName, id);
  }

  if (numId > Number.MAX_SAFE_INTEGER) {
    throw new ValidationError(`${fieldName} exceeds maximum safe integer`, fieldName, id);
  }

  return numId;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page: unknown,
  pageSize: unknown,
  options: PaginationOptions = {}
): { page: number; pageSize: number } {
  const { minPage = 1, maxPage = 1000, minPageSize = 1, maxPageSize = 100 } = options;

  const numPage = typeof page === 'string' ? parseInt(page, 10) : page;
  if (typeof numPage !== 'number' || isNaN(numPage) || numPage < minPage || numPage > maxPage) {
    throw new ValidationError(`page must be between ${minPage} and ${maxPage}`, 'page', page);
  }

  const numPageSize = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize;
  if (
    typeof numPageSize !== 'number' ||
    isNaN(numPageSize) ||
    numPageSize < minPageSize ||
    numPageSize > maxPageSize
  ) {
    throw new ValidationError(
      `pageSize must be between ${minPageSize} and ${maxPageSize}`,
      'pageSize',
      pageSize
    );
  }

  return { page: numPage, pageSize: numPageSize };
}

/**
 * Validate a string parameter
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: StringOptions = {}
): string {
  const { required = true, minLength, maxLength, pattern, trim = true } = options;

  if (typeof value !== 'string') {
    if (required) {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
    }
    return '';
  }

  const result = trim ? value.trim() : value;

  if (required && result.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName, value);
  }

  if (minLength !== undefined && result.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName,
      value
    );
  }

  if (maxLength !== undefined && result.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
      fieldName,
      value
    );
  }

  if (pattern && !pattern.test(result)) {
    throw new ValidationError(`${fieldName} format is invalid`, fieldName, value);
  }

  return result;
}

/**
 * Validate an array parameter
 */
export function validateArray<T = unknown>(
  value: unknown,
  fieldName: string,
  options: ArrayOptions<T> = {}
): T[] {
  const { required = true, minLength, maxLength, itemValidator } = options;

  if (!Array.isArray(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName, value);
    }
    return [];
  }

  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must have at least ${minLength} items`,
      fieldName,
      value
    );
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must not exceed ${maxLength} items`, fieldName, value);
  }

  if (itemValidator) {
    return value.map((item, index) => {
      try {
        return itemValidator(item, index);
      } catch (error) {
        throw new ValidationError(
          `${fieldName}[${index}] is invalid: ${error instanceof Error ? error.message : 'unknown error'}`,
          `${fieldName}[${index}]`,
          item
        );
      }
    });
  }

  return value as T[];
}

/**
 * Validate an enum value
 */
export function validateEnum<T>(value: unknown, fieldName: string, allowedValues: readonly T[]): T {
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName,
      value
    );
  }
  return value as T;
}

/**
 * Validate a date parameter
 */
export function validateDate(
  value: unknown,
  fieldName: string,
  options: DateOptions = {}
): Date | null {
  const { required = true, minDate, maxDate } = options;

  if (value == null) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName, value);
    }
    return null;
  }

  const date = new Date(value as string | number | Date);

  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`, fieldName, value);
  }

  if (minDate && date < minDate) {
    throw new ValidationError(
      `${fieldName} must be after ${minDate.toISOString()}`,
      fieldName,
      value
    );
  }

  if (maxDate && date > maxDate) {
    throw new ValidationError(
      `${fieldName} must be before ${maxDate.toISOString()}`,
      fieldName,
      value
    );
  }

  return date;
}

/**
 * Validate an email address
 */
export function validateEmail(
  email: unknown,
  fieldName = 'email',
  options: { required?: boolean } = {}
): string {
  const { required = true } = options;

  if (typeof email !== 'string') {
    if (required) {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, email);
    }
    return '';
  }

  const trimmed = email.trim().toLowerCase();

  if (required && trimmed.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName, email);
  }

  // RFC 5322 simplified pattern
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (trimmed.length > 0 && !emailPattern.test(trimmed)) {
    throw new ValidationError(`${fieldName} format is invalid`, fieldName, email);
  }

  if (trimmed.length > 254) {
    throw new ValidationError(`${fieldName} must not exceed 254 characters`, fieldName, email);
  }

  return trimmed;
}

/**
 * Validate a single field against rules
 */
export function validateField(fieldName: string, value: unknown, rules: ValidationRule): void {
  // Required check
  if (rules.required && (value === undefined || value === null || value === '')) {
    throw new ValidationError(rules.message || `${fieldName} is required`, fieldName, value);
  }

  // Skip if value is empty and not required
  if (value === undefined || value === null) {
    return;
  }

  // Type check
  if (rules.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) {
      throw new ValidationError(
        rules.message || `${fieldName} must be of type ${rules.type}`,
        fieldName,
        value
      );
    }
  }

  // Number range check
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ValidationError(rules.message || `${fieldName} must be a valid number`, fieldName, value);
    }

    if (rules.min !== undefined && value < rules.min) {
      throw new ValidationError(
        rules.message || `${fieldName} must be at least ${rules.min}`,
        fieldName,
        value
      );
    }

    if (rules.max !== undefined && value > rules.max) {
      throw new ValidationError(
        rules.message || `${fieldName} must not exceed ${rules.max}`,
        fieldName,
        value
      );
    }
  }

  // String length check
  if (typeof value === 'string') {
    if (rules.min !== undefined && value.length < rules.min) {
      throw new ValidationError(
        rules.message || `${fieldName} must be at least ${rules.min} characters`,
        fieldName,
        value
      );
    }

    if (rules.max !== undefined && value.length > rules.max) {
      throw new ValidationError(
        rules.message || `${fieldName} must not exceed ${rules.max} characters`,
        fieldName,
        value
      );
    }
  }

  // Pattern check
  if (rules.pattern && typeof value === 'string') {
    if (!rules.pattern.test(value)) {
      throw new ValidationError(rules.message || `${fieldName} format is invalid`, fieldName, value);
    }
  }

  // Custom validation
  if (rules.custom && !rules.custom(value)) {
    throw new ValidationError(rules.message || `${fieldName} validation failed`, fieldName, value);
  }
}

/**
 * Validate multiple fields against a schema
 * Collects all validation errors and throws them together
 */
export function validateParams<T extends Record<string, unknown>>(
  params: T,
  schema: Partial<Record<keyof T, ValidationRule>>,
  options: { throwAll?: boolean } = {}
): void {
  const { throwAll = true } = options;
  const errors: ValidationError[] = [];

  for (const [fieldName, rules] of Object.entries(schema)) {
    if (!rules) continue;
    try {
      validateField(fieldName, params[fieldName as keyof T], rules);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error);
        // Early exit if throwAll is disabled (backwards compatible)
        if (!throwAll) break;
      }
    }
  }

  if (errors.length > 0) {
    if (errors.length === 1) {
      throw errors[0];
    }
    throw new ValidationErrors(errors);
  }
}

/**
 * Safe validation wrapper - returns default value on error
 */
export function safeValidate<T>(
  validator: () => T,
  defaultValue: T,
  onError?: (error: Error) => void
): T {
  try {
    return validator();
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    return defaultValue;
  }
}

/**
 * Common validation rules presets
 */
export const CommonRules = {
  id: {
    required: true,
    type: 'number' as const,
    min: 1,
    custom: (value: unknown): boolean => typeof value === 'number' && Number.isInteger(value),
    message: 'ID must be a positive integer',
  },

  optionalId: {
    type: 'number' as const,
    min: 1,
    custom: (value: unknown): boolean => typeof value === 'number' && Number.isInteger(value),
    message: 'ID must be a positive integer',
  },

  page: {
    type: 'number' as const,
    min: 1,
    custom: (value: unknown): boolean => typeof value === 'number' && Number.isInteger(value),
    message: 'Page must be a positive integer',
  },

  pageSize: {
    type: 'number' as const,
    min: 1,
    max: 100,
    custom: (value: unknown): boolean => typeof value === 'number' && Number.isInteger(value),
    message: 'Page size must be between 1 and 100',
  },

  requiredString: {
    required: true,
    type: 'string' as const,
    min: 1,
    message: 'Value cannot be empty',
  },

  email: {
    type: 'string' as const,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email format',
  },

  array: {
    required: true,
    type: 'array' as const,
    custom: (value: unknown): boolean => Array.isArray(value) && value.length > 0,
    message: 'Array cannot be empty',
  },

  boolean: {
    type: 'boolean' as const,
    message: 'Value must be a boolean',
  },
} as const;
