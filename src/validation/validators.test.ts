import { describe, it, expect } from 'vitest';
import {
  validateId,
  validatePagination,
  validateString,
  validateArray,
  validateEnum,
  validateDate,
  validateEmail,
  validateField,
  validateParams,
  safeValidate,
  CommonRules,
} from './validators';
import { ValidationError, ValidationErrors } from './types';

describe('validateId', () => {
  it('should accept valid positive integers', () => {
    expect(validateId(1)).toBe(1);
    expect(validateId(100)).toBe(100);
    expect(validateId('42')).toBe(42);
  });

  it('should reject non-numbers', () => {
    expect(() => validateId('abc')).toThrow(ValidationError);
    expect(() => validateId(null)).toThrow(ValidationError);
    expect(() => validateId(undefined)).toThrow(ValidationError);
  });

  it('should reject non-positive numbers', () => {
    expect(() => validateId(0)).toThrow(ValidationError);
    expect(() => validateId(-1)).toThrow(ValidationError);
  });

  it('should reject non-integers', () => {
    expect(() => validateId(1.5)).toThrow(ValidationError);
  });

  it('should reject numbers exceeding MAX_SAFE_INTEGER', () => {
    expect(() => validateId(Number.MAX_SAFE_INTEGER + 1)).toThrow(ValidationError);
  });

  it('should use custom field name in error', () => {
    try {
      validateId(-1, 'userId');
    } catch (e) {
      expect((e as ValidationError).message).toContain('userId');
    }
  });
});

describe('validatePagination', () => {
  it('should accept valid pagination', () => {
    const result = validatePagination(1, 10);
    expect(result).toEqual({ page: 1, pageSize: 10 });
  });

  it('should parse string values', () => {
    const result = validatePagination('5', '20');
    expect(result).toEqual({ page: 5, pageSize: 20 });
  });

  it('should reject invalid page', () => {
    expect(() => validatePagination(0, 10)).toThrow(ValidationError);
    expect(() => validatePagination(1001, 10)).toThrow(ValidationError);
    expect(() => validatePagination('abc', 10)).toThrow(ValidationError);
  });

  it('should reject invalid pageSize', () => {
    expect(() => validatePagination(1, 0)).toThrow(ValidationError);
    expect(() => validatePagination(1, 101)).toThrow(ValidationError);
  });

  it('should respect custom options', () => {
    const result = validatePagination(500, 50, { maxPage: 500, maxPageSize: 50 });
    expect(result).toEqual({ page: 500, pageSize: 50 });
  });
});

describe('validateString', () => {
  it('should accept valid strings', () => {
    expect(validateString('hello', 'name')).toBe('hello');
  });

  it('should trim by default', () => {
    expect(validateString('  hello  ', 'name')).toBe('hello');
  });

  it('should not trim when disabled', () => {
    expect(validateString('  hello  ', 'name', { trim: false })).toBe('  hello  ');
  });

  it('should reject non-strings when required', () => {
    expect(() => validateString(123, 'name')).toThrow(ValidationError);
  });

  it('should return empty string for non-string when not required', () => {
    expect(validateString(123, 'name', { required: false })).toBe('');
  });

  it('should reject empty strings when required', () => {
    expect(() => validateString('', 'name')).toThrow(ValidationError);
    expect(() => validateString('   ', 'name')).toThrow(ValidationError);
  });

  it('should enforce minLength', () => {
    expect(() => validateString('ab', 'name', { minLength: 3 })).toThrow(ValidationError);
    expect(validateString('abc', 'name', { minLength: 3 })).toBe('abc');
  });

  it('should enforce maxLength', () => {
    expect(() => validateString('abcdef', 'name', { maxLength: 5 })).toThrow(ValidationError);
  });

  it('should enforce pattern', () => {
    expect(() => validateString('abc', 'name', { pattern: /^\d+$/ })).toThrow(ValidationError);
    expect(validateString('123', 'name', { pattern: /^\d+$/ })).toBe('123');
  });
});

describe('validateArray', () => {
  it('should accept valid arrays', () => {
    expect(validateArray([1, 2, 3], 'items')).toEqual([1, 2, 3]);
  });

  it('should reject non-arrays when required', () => {
    expect(() => validateArray('not array', 'items')).toThrow(ValidationError);
  });

  it('should return empty array for non-array when not required', () => {
    expect(validateArray('not array', 'items', { required: false })).toEqual([]);
  });

  it('should enforce minLength', () => {
    expect(() => validateArray([1], 'items', { minLength: 2 })).toThrow(ValidationError);
  });

  it('should enforce maxLength', () => {
    expect(() => validateArray([1, 2, 3], 'items', { maxLength: 2 })).toThrow(ValidationError);
  });

  it('should validate items with itemValidator', () => {
    const validator = (item: unknown) => {
      if (typeof item !== 'number') throw new Error('Must be number');
      return item * 2;
    };

    expect(validateArray([1, 2], 'items', { itemValidator: validator })).toEqual([2, 4]);
  });

  it('should report item validation errors with index', () => {
    const validator = (item: unknown) => {
      if (item === 'bad') throw new Error('Bad item');
      return item;
    };

    expect(() => validateArray(['good', 'bad'], 'items', { itemValidator: validator })).toThrow(
      /items\[1\]/
    );
  });
});

describe('validateEnum', () => {
  it('should accept valid enum values', () => {
    const allowed = ['a', 'b', 'c'] as const;
    expect(validateEnum('a', 'field', allowed)).toBe('a');
  });

  it('should reject invalid enum values', () => {
    const allowed = ['a', 'b', 'c'] as const;
    expect(() => validateEnum('d', 'field', allowed)).toThrow(ValidationError);
  });
});

describe('validateDate', () => {
  it('should accept valid dates', () => {
    const date = validateDate('2024-01-01', 'date');
    expect(date).toBeInstanceOf(Date);
  });

  it('should accept Date objects', () => {
    const input = new Date('2024-01-01');
    expect(validateDate(input, 'date')).toEqual(input);
  });

  it('should reject invalid dates', () => {
    expect(() => validateDate('not a date', 'date')).toThrow(ValidationError);
  });

  it('should return null for null when not required', () => {
    expect(validateDate(null, 'date', { required: false })).toBeNull();
  });

  it('should reject null when required', () => {
    expect(() => validateDate(null, 'date')).toThrow(ValidationError);
  });

  it('should enforce minDate', () => {
    const minDate = new Date('2024-01-01');
    expect(() => validateDate('2023-12-31', 'date', { minDate })).toThrow(ValidationError);
  });

  it('should enforce maxDate', () => {
    const maxDate = new Date('2024-01-01');
    expect(() => validateDate('2024-01-02', 'date', { maxDate })).toThrow(ValidationError);
  });
});

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('test@example.com')).toBe('test@example.com');
    expect(validateEmail('user.name@domain.co.uk')).toBe('user.name@domain.co.uk');
  });

  it('should lowercase emails', () => {
    expect(validateEmail('Test@Example.COM')).toBe('test@example.com');
  });

  it('should trim emails', () => {
    expect(validateEmail('  test@example.com  ')).toBe('test@example.com');
  });

  it('should reject invalid emails', () => {
    expect(() => validateEmail('invalid')).toThrow(ValidationError);
    expect(() => validateEmail('missing@domain')).toThrow(ValidationError);
    expect(() => validateEmail('@domain.com')).toThrow(ValidationError);
  });

  it('should reject too long emails', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    expect(() => validateEmail(longEmail)).toThrow(ValidationError);
  });

  it('should return empty string when not required', () => {
    expect(validateEmail(123, 'email', { required: false })).toBe('');
  });
});

describe('validateField', () => {
  it('should validate required fields', () => {
    expect(() => validateField('name', undefined, { required: true })).toThrow(ValidationError);
    expect(() => validateField('name', '', { required: true })).toThrow(ValidationError);
  });

  it('should skip validation for undefined non-required fields', () => {
    expect(() => validateField('name', undefined, { required: false })).not.toThrow();
  });

  it('should validate type', () => {
    expect(() => validateField('age', 'not number', { type: 'number' })).toThrow(ValidationError);
    expect(() => validateField('items', {}, { type: 'array' })).toThrow(ValidationError);
  });

  it('should validate number range', () => {
    expect(() => validateField('age', 5, { min: 10 })).toThrow(ValidationError);
    expect(() => validateField('age', 100, { max: 50 })).toThrow(ValidationError);
    expect(() => validateField('val', Infinity, {})).toThrow(ValidationError);
  });

  it('should validate string length', () => {
    expect(() => validateField('name', 'ab', { min: 3 })).toThrow(ValidationError);
    expect(() => validateField('name', 'abcdef', { max: 5 })).toThrow(ValidationError);
  });

  it('should validate pattern', () => {
    expect(() => validateField('code', 'abc', { pattern: /^\d+$/ })).toThrow(ValidationError);
  });

  it('should validate custom function', () => {
    const custom = (v: unknown) => v === 'valid';
    expect(() => validateField('field', 'invalid', { custom })).toThrow(ValidationError);
  });

  it('should use custom error message', () => {
    try {
      validateField('field', '', { required: true, message: 'Custom error' });
    } catch (e) {
      expect((e as ValidationError).message).toBe('Custom error');
    }
  });
});

describe('validateParams', () => {
  it('should validate all fields', () => {
    const params = { name: 'John', age: 25 };
    const schema = {
      name: { required: true, type: 'string' as const },
      age: { type: 'number' as const, min: 18 },
    };

    expect(() => validateParams(params, schema)).not.toThrow();
  });

  it('should collect all errors when throwAll is true', () => {
    const params = { name: '', age: 10 };
    const schema = {
      name: { required: true },
      age: { min: 18 },
    };

    try {
      validateParams(params, schema, { throwAll: true });
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationErrors);
      expect((e as ValidationErrors).errors).toHaveLength(2);
    }
  });

  it('should throw first error when throwAll is false', () => {
    const params = { name: '', age: 10 };
    const schema = {
      name: { required: true },
      age: { min: 18 },
    };

    try {
      validateParams(params, schema, { throwAll: false });
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
    }
  });

  it('should throw single error directly', () => {
    const params = { name: '' };
    const schema = { name: { required: true } };

    expect(() => validateParams(params, schema)).toThrow(ValidationError);
  });
});

describe('safeValidate', () => {
  it('should return validator result on success', () => {
    const result = safeValidate(() => 'success', 'default');
    expect(result).toBe('success');
  });

  it('should return default value on error', () => {
    const result = safeValidate(
      () => {
        throw new Error('fail');
      },
      'default'
    );
    expect(result).toBe('default');
  });

  it('should call onError callback', () => {
    let capturedError: Error | undefined;
    safeValidate(
      () => {
        throw new Error('test error');
      },
      'default',
      (e) => {
        capturedError = e;
      }
    );
    expect(capturedError?.message).toBe('test error');
  });
});

describe('CommonRules', () => {
  it('should have valid id rule', () => {
    expect(CommonRules.id.required).toBe(true);
    expect(CommonRules.id.type).toBe('number');
    expect(CommonRules.id.custom?.(1)).toBe(true);
    expect(CommonRules.id.custom?.(1.5)).toBe(false);
  });

  it('should have valid pageSize rule', () => {
    expect(CommonRules.pageSize.min).toBe(1);
    expect(CommonRules.pageSize.max).toBe(100);
  });

  it('should have valid email rule with pattern', () => {
    expect(CommonRules.email.pattern?.test('test@example.com')).toBe(true);
    expect(CommonRules.email.pattern?.test('invalid')).toBe(false);
  });
});
