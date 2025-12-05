/**
 * Input Validation Module
 * Validates health record values against species-specific bounds
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

// Species-specific weight ranges (kg)
const WEIGHT_RANGES: Record<string, { min: number; max: number }> = {
  dog: { min: 0.5, max: 100 },     // Chihuahua to Great Dane
  cat: { min: 1, max: 15 },        // Kitten to large Maine Coon
  bird: { min: 0.01, max: 5 },     // Finch to large parrot
  rabbit: { min: 0.5, max: 10 },
  hamster: { min: 0.02, max: 0.2 },
  fish: { min: 0.001, max: 5 },
  reptile: { min: 0.01, max: 100 }, // Gecko to large iguana
  default: { min: 0.01, max: 500 },
};

// Species-specific age ranges (years)
const AGE_RANGES: Record<string, { max: number }> = {
  dog: { max: 25 },      // Oldest recorded dog was 29
  cat: { max: 35 },      // Oldest recorded cat was 38
  bird: { max: 100 },    // Parrots can live very long
  rabbit: { max: 15 },
  hamster: { max: 5 },
  fish: { max: 50 },     // Koi can live decades
  reptile: { max: 150 }, // Tortoises
  default: { max: 100 },
};

// Temperature ranges (Celsius)
const TEMP_RANGES: Record<string, { min: number; max: number }> = {
  dog: { min: 35, max: 43 },
  cat: { min: 35, max: 43 },
  bird: { min: 38, max: 45 },
  default: { min: 30, max: 45 },
};

// Heart rate ranges (bpm)
const HEART_RATE_RANGES: Record<string, { min: number; max: number }> = {
  dog: { min: 30, max: 250 },
  cat: { min: 80, max: 300 },
  bird: { min: 100, max: 600 },
  default: { min: 20, max: 600 },
};

// Activity ranges (minutes per session)
const ACTIVITY_RANGES = { min: 0, max: 1440 }; // Max 24 hours

// Appetite scale (1-5)
const APPETITE_RANGES = { min: 1, max: 5 };

// Respiratory rate ranges (breaths per minute)
const RESPIRATORY_RANGES: Record<string, { min: number; max: number }> = {
  dog: { min: 10, max: 60 },
  cat: { min: 15, max: 60 },
  default: { min: 5, max: 100 },
};

/**
 * Validate weight value for a species
 */
export function validateWeight(value: number, species?: string): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Weight must be a valid number' };
  }

  const range = WEIGHT_RANGES[species?.toLowerCase() || 'default'] || WEIGHT_RANGES.default;

  if (value <= 0) {
    return { valid: false, error: 'Weight must be a positive number' };
  }

  if (value < range.min) {
    return { valid: false, error: `Weight ${value}kg is below minimum for ${species || 'pet'} (${range.min}kg)` };
  }

  if (value > range.max) {
    return { valid: false, error: `Weight ${value}kg exceeds maximum for ${species || 'pet'} (${range.max}kg)` };
  }

  // Warning for extreme values
  if (value < range.min * 1.5) {
    return { valid: true, warning: `Weight ${value}kg is quite low for ${species || 'pet'}` };
  }

  if (value > range.max * 0.8) {
    return { valid: true, warning: `Weight ${value}kg is quite high for ${species || 'pet'}` };
  }

  return { valid: true };
}

/**
 * Validate age value for a species
 */
export function validateAge(value: number, species?: string): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Age must be a valid number' };
  }

  const range = AGE_RANGES[species?.toLowerCase() || 'default'] || AGE_RANGES.default;

  if (value < 0) {
    return { valid: false, error: 'Age cannot be negative' };
  }

  if (value > range.max) {
    return { valid: false, error: `Age ${value} years exceeds maximum lifespan for ${species || 'pet'} (${range.max} years)` };
  }

  // Warning for very young or old
  if (value > range.max * 0.8) {
    return { valid: true, warning: `Age ${value} is quite advanced for ${species || 'pet'}` };
  }

  return { valid: true };
}

/**
 * Validate temperature value for a species
 */
export function validateTemperature(value: number, species?: string): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Temperature must be a valid number' };
  }

  const range = TEMP_RANGES[species?.toLowerCase() || 'default'] || TEMP_RANGES.default;

  if (value < range.min || value > range.max) {
    return { valid: false, error: `Temperature ${value}°C is outside valid range for ${species || 'pet'} (${range.min}-${range.max}°C)` };
  }

  return { valid: true };
}

/**
 * Validate heart rate value for a species
 */
export function validateHeartRate(value: number, species?: string): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Heart rate must be a valid number' };
  }

  const range = HEART_RATE_RANGES[species?.toLowerCase() || 'default'] || HEART_RATE_RANGES.default;

  if (value <= 0) {
    return { valid: false, error: 'Heart rate must be a positive number' };
  }

  if (value < range.min || value > range.max) {
    return { valid: false, error: `Heart rate ${value} bpm is outside valid range for ${species || 'pet'} (${range.min}-${range.max} bpm)` };
  }

  return { valid: true };
}

/**
 * Validate activity minutes
 */
export function validateActivity(value: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Activity must be a valid number' };
  }

  if (value < ACTIVITY_RANGES.min) {
    return { valid: false, error: 'Activity minutes cannot be negative' };
  }

  if (value > ACTIVITY_RANGES.max) {
    return { valid: false, error: `Activity ${value} minutes exceeds 24 hours in a day` };
  }

  return { valid: true };
}

/**
 * Validate appetite scale (1-5)
 */
export function validateAppetite(value: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Appetite must be a valid number' };
  }

  if (!Number.isInteger(value)) {
    return { valid: false, error: 'Appetite must be a whole number (1-5)' };
  }

  if (value < APPETITE_RANGES.min || value > APPETITE_RANGES.max) {
    return { valid: false, error: `Appetite must be between ${APPETITE_RANGES.min} and ${APPETITE_RANGES.max}` };
  }

  return { valid: true };
}

/**
 * Validate respiratory rate for a species
 */
export function validateRespiratoryRate(value: number, species?: string): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Respiratory rate must be a valid number' };
  }

  const range = RESPIRATORY_RANGES[species?.toLowerCase() || 'default'] || RESPIRATORY_RANGES.default;

  if (value <= 0) {
    return { valid: false, error: 'Respiratory rate must be a positive number' };
  }

  if (value < range.min || value > range.max) {
    return { valid: false, error: `Respiratory rate ${value} breaths/min is outside valid range for ${species || 'pet'} (${range.min}-${range.max})` };
  }

  return { valid: true };
}

/**
 * Valid health record types
 */
export const VALID_RECORD_TYPES = [
  'weight',
  'temperature',
  'heart_rate',
  'respiratory_rate',
  'activity',
  'vaccination',
  'medication',
  'clinical_summary',
  'lab_result',
  'appetite',
] as const;

export type HealthRecordType = typeof VALID_RECORD_TYPES[number];

/**
 * Validate a complete health record
 */
export function validateHealthRecord(
  type: string,
  value: number,
  species?: string
): ValidationResult {
  // Validate record type
  if (!VALID_RECORD_TYPES.includes(type as HealthRecordType)) {
    return { valid: false, error: `Invalid record type: ${type}. Valid types: ${VALID_RECORD_TYPES.join(', ')}` };
  }

  // Validate value based on type
  switch (type) {
    case 'weight':
      return validateWeight(value, species);
    case 'temperature':
      return validateTemperature(value, species);
    case 'heart_rate':
      return validateHeartRate(value, species);
    case 'respiratory_rate':
      return validateRespiratoryRate(value, species);
    case 'activity':
      return validateActivity(value);
    case 'appetite':
      return validateAppetite(value);
    case 'vaccination':
    case 'medication':
    case 'clinical_summary':
    case 'lab_result':
      // These types have flexible values
      if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, error: 'Value must be a valid number' };
      }
      return { valid: true };
    default:
      return { valid: true };
  }
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove basic HTML brackets
    .trim();
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
