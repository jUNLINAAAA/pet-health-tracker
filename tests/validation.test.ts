/**
 * Unit Tests for Input Validation Module
 */
import { describe, it, expect } from 'vitest';
import {
  validateWeight,
  validateAge,
  validateTemperature,
  validateHeartRate,
  validateActivity,
  validateAppetite,
  validateHealthRecord,
  isValidUUID,
  sanitizeString,
} from '../lib/validation';

describe('validateWeight', () => {
  it('should accept valid dog weights', () => {
    expect(validateWeight(30, 'Dog').valid).toBe(true);
    expect(validateWeight(5, 'Dog').valid).toBe(true);
    expect(validateWeight(90, 'Dog').valid).toBe(true);
  });

  it('should accept valid cat weights', () => {
    expect(validateWeight(4, 'Cat').valid).toBe(true);
    expect(validateWeight(1.5, 'Cat').valid).toBe(true);
    expect(validateWeight(12, 'Cat').valid).toBe(true);
  });

  it('should reject negative weights', () => {
    expect(validateWeight(-5, 'Dog').valid).toBe(false);
    expect(validateWeight(0, 'Cat').valid).toBe(false);
  });

  it('should reject weights exceeding species maximum', () => {
    expect(validateWeight(150, 'Dog').valid).toBe(false);
    expect(validateWeight(20, 'Cat').valid).toBe(false);
    expect(validateWeight(10, 'Bird').valid).toBe(false);
  });

  it('should reject NaN', () => {
    expect(validateWeight(NaN, 'Dog').valid).toBe(false);
  });

  it('should handle unknown species with defaults', () => {
    expect(validateWeight(10, 'Dragon').valid).toBe(true);
  });
});

describe('validateAge', () => {
  it('should accept valid dog ages', () => {
    expect(validateAge(5, 'Dog').valid).toBe(true);
    expect(validateAge(0.5, 'Dog').valid).toBe(true);
    expect(validateAge(20, 'Dog').valid).toBe(true);
  });

  it('should reject ages exceeding species maximum', () => {
    expect(validateAge(30, 'Dog').valid).toBe(false); // Max 25 years
    expect(validateAge(40, 'Cat').valid).toBe(false); // Max 35 years
    expect(validateAge(10, 'Hamster').valid).toBe(false); // Max 5 years
  });

  it('should reject negative ages', () => {
    expect(validateAge(-1, 'Dog').valid).toBe(false);
  });

  it('should warn for very old pets', () => {
    const result = validateAge(22, 'Dog');
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
  });
});

describe('validateTemperature', () => {
  it('should accept normal dog temperature', () => {
    expect(validateTemperature(38.5, 'Dog').valid).toBe(true);
    expect(validateTemperature(39, 'Dog').valid).toBe(true);
  });

  it('should reject extreme temperatures', () => {
    expect(validateTemperature(25, 'Dog').valid).toBe(false);
    expect(validateTemperature(50, 'Cat').valid).toBe(false);
  });
});

describe('validateHeartRate', () => {
  it('should accept normal dog heart rates', () => {
    expect(validateHeartRate(80, 'Dog').valid).toBe(true);
    expect(validateHeartRate(120, 'Dog').valid).toBe(true);
  });

  it('should accept normal cat heart rates', () => {
    expect(validateHeartRate(180, 'Cat').valid).toBe(true);
  });

  it('should reject impossible heart rates', () => {
    expect(validateHeartRate(0, 'Dog').valid).toBe(false);
    expect(validateHeartRate(-50, 'Cat').valid).toBe(false);
    expect(validateHeartRate(1000, 'Dog').valid).toBe(false);
  });
});

describe('validateActivity', () => {
  it('should accept valid activity minutes', () => {
    expect(validateActivity(30).valid).toBe(true);
    expect(validateActivity(120).valid).toBe(true);
    expect(validateActivity(0).valid).toBe(true);
  });

  it('should reject negative activity', () => {
    expect(validateActivity(-10).valid).toBe(false);
  });

  it('should reject activity exceeding 24 hours', () => {
    expect(validateActivity(1500).valid).toBe(false);
  });
});

describe('validateAppetite', () => {
  it('should accept valid appetite scale (1-5)', () => {
    expect(validateAppetite(1).valid).toBe(true);
    expect(validateAppetite(3).valid).toBe(true);
    expect(validateAppetite(5).valid).toBe(true);
  });

  it('should reject out of range values', () => {
    expect(validateAppetite(0).valid).toBe(false);
    expect(validateAppetite(6).valid).toBe(false);
  });

  it('should reject non-integer values', () => {
    expect(validateAppetite(2.5).valid).toBe(false);
  });
});

describe('validateHealthRecord', () => {
  it('should validate weight records', () => {
    expect(validateHealthRecord('weight', 30, 'Dog').valid).toBe(true);
    expect(validateHealthRecord('weight', -5, 'Dog').valid).toBe(false);
  });

  it('should reject invalid record types', () => {
    expect(validateHealthRecord('invalid_type', 100, 'Dog').valid).toBe(false);
  });

  it('should accept flexible values for clinical_summary', () => {
    expect(validateHealthRecord('clinical_summary', 1, 'Dog').valid).toBe(true);
  });
});

describe('isValidUUID', () => {
  it('should accept valid UUIDs', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('12345')).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('should remove HTML-like characters', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
  });

  it('should trim whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('should truncate long strings', () => {
    const longString = 'a'.repeat(2000);
    expect(sanitizeString(longString, 100).length).toBe(100);
  });

  it('should handle empty strings', () => {
    expect(sanitizeString('')).toBe('');
  });
});
