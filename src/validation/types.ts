/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Aggregated validation errors class
 * Holds multiple validation errors for batch validation
 */
export class ValidationErrors extends Error {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    const messages = errors.map(e => `${e.field}: ${e.message}`);
    super(messages.join('; '));
    this.name = 'ValidationErrors';
    this.errors = errors;
  }

  /**
   * Get the first error (for backwards compatibility)
   */
  get first(): ValidationError | undefined {
    return this.errors[0];
  }

  /**
   * Get all field names that have errors
   */
  get fields(): string[] {
    return this.errors.map(e => e.field);
  }

  /**
   * Check if a specific field has an error
   */
  hasError(field: string): boolean {
    return this.errors.some(e => e.field === field);
  }

  /**
   * Get error for a specific field
   */
  getError(field: string): ValidationError | undefined {
    return this.errors.find(e => e.field === field);
  }
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean;
  message?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  minPage?: number;
  maxPage?: number;
  minPageSize?: number;
  maxPageSize?: number;
}

/**
 * String validation options
 */
export interface StringOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  trim?: boolean;
}

/**
 * Array validation options
 */
export interface ArrayOptions<T> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  itemValidator?: (item: unknown, index: number) => T;
}

/**
 * Date validation options
 */
export interface DateOptions {
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
}
