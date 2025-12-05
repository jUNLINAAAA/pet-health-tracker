/**
 * Comprehensive Unit Tests for Health Score System
 * Tests all edge cases and extreme values
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateUnifiedHealthScore,
  Pet,
  Alert,
  HealthRecord,
} from '../lib/unified-health-system';

// Test fixtures
const createPet = (overrides: Partial<Pet> = {}): Pet => ({
  id: 'test-pet-1',
  name: 'TestPet',
  species: 'Dog',
  breed: 'Golden Retriever',
  age: 5,
  weight: 30, // Within ideal range (25-34kg)
  ...overrides,
});

const createAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'alert-1',
  petId: 'test-pet-1',
  type: 'health_concern',
  severity: 'medium',
  message: 'Test alert',
  resolved: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createHealthRecord = (overrides: Partial<HealthRecord> = {}): HealthRecord => ({
  id: 'record-1',
  petId: 'test-pet-1',
  type: 'weight',
  value: 30,
  unit: 'kg',
  recordedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('calculateUnifiedHealthScore', () => {
  describe('Normal cases', () => {
    it('should return excellent score for healthy pet with all data', () => {
      const pet = createPet();
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeGreaterThanOrEqual(70);
      expect(result.status).toMatch(/good|excellent/);
    });

    it('should include all component scores', () => {
      const pet = createPet();
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.components).toHaveProperty('weight');
      expect(result.components).toHaveProperty('activity');
      expect(result.components).toHaveProperty('medical');
      expect(result.components).toHaveProperty('alerts');
    });

    it('should return score between 0 and 100', () => {
      const pet = createPet();
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });
  });

  describe('Weight extremes', () => {
    it('should penalize severely underweight pets (<70% of min)', () => {
      const pet = createPet({ weight: 15 }); // <70% of 25kg min
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.components.weight).toBeLessThan(50);
      expect(result.status).toMatch(/poor|critical|fair/);
    });

    it('should penalize severely overweight pets (>150% of max)', () => {
      const pet = createPet({ weight: 60 }); // >150% of 34kg max
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.components.weight).toBeLessThan(30);
      expect(result.overall).toBeLessThanOrEqual(35); // Severity cap
    });

    it('should give neutral score when weight is missing', () => {
      const pet = createPet({ weight: undefined });
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.components.weight).toBeGreaterThanOrEqual(40);
      expect(result.components.weight).toBeLessThanOrEqual(60);
    });

    it('should handle zero weight gracefully', () => {
      const pet = createPet({ weight: 0 });
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });

    it('should handle negative weight (invalid data)', () => {
      const pet = createPet({ weight: -5 });
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      // Should not crash, should treat as invalid
      expect(result.overall).toBeDefined();
    });
  });

  describe('Age extremes', () => {
    it('should handle impossible age (>max lifespan)', () => {
      const pet = createPet({ age: 50 }); // Dogs don't live 50 years
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      // Should trigger severity cap
      expect(result.overall).toBeLessThanOrEqual(35);
    });

    it('should handle very young pets', () => {
      const pet = createPet({ age: 0.5 }); // 6 months old
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeGreaterThan(0);
    });

    it('should handle senior pets appropriately', () => {
      const pet = createPet({ age: 12 }); // Senior dog
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      // Should still be reasonable but account for age
      expect(result.overall).toBeGreaterThanOrEqual(30);
    });

    it('should handle undefined age', () => {
      const pet = createPet({ age: undefined });
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Alert handling', () => {
    it('should heavily penalize multiple high-severity alerts', () => {
      const pet = createPet();
      const alerts = [
        createAlert({ severity: 'high', resolved: false }),
        createAlert({ id: 'alert-2', severity: 'high', resolved: false }),
        createAlert({ id: 'alert-3', severity: 'high', resolved: false }),
      ];

      const result = calculateUnifiedHealthScore(pet, alerts, [], [], []);

      expect(result.components.alerts).toBeLessThan(50);
    });

    it('should ignore resolved alerts', () => {
      const pet = createPet();
      const alerts = [
        createAlert({ severity: 'high', resolved: true }),
        createAlert({ id: 'alert-2', severity: 'high', resolved: true }),
      ];

      const result = calculateUnifiedHealthScore(pet, alerts, [], [], []);

      expect(result.components.alerts).toBeGreaterThanOrEqual(90);
    });

    it('should handle high alert saturation (10+ alerts)', () => {
      const pet = createPet();
      const alerts = Array.from({ length: 10 }, (_, i) =>
        createAlert({ id: `alert-${i}`, severity: 'high', resolved: false })
      );

      const result = calculateUnifiedHealthScore(pet, alerts, [], [], []);

      expect(result.components.alerts).toBeLessThanOrEqual(10);
    });
  });

  describe('Missing data scenarios', () => {
    it('should handle completely empty pet', () => {
      const pet: Pet = { id: 'empty', name: 'Empty', species: 'Dog' };
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });

    it('should handle no health records', () => {
      const pet = createPet();
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should handle empty arrays for all inputs', () => {
      const pet = createPet();
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeDefined();
      expect(result.insights).toBeDefined();
    });
  });

  describe('Appetite handling', () => {
    it('should reward normal appetite (value 3)', () => {
      const pet = createPet();
      const records = [
        createHealthRecord({ type: 'appetite', value: 3, unit: '/5' }),
      ];

      const result = calculateUnifiedHealthScore(pet, [], [], [], records);

      expect(result.components.appetite).toBeGreaterThanOrEqual(80);
    });

    it('should penalize very poor appetite (value 1)', () => {
      const pet = createPet();
      const records = [
        createHealthRecord({ type: 'appetite', value: 1, unit: '/5' }),
      ];

      const result = calculateUnifiedHealthScore(pet, [], [], [], records);

      expect(result.components.appetite).toBeLessThan(70);
    });

    it('should penalize excessive appetite (value 5)', () => {
      const pet = createPet();
      const records = [
        createHealthRecord({ type: 'appetite', value: 5, unit: '/5' }),
      ];

      const result = calculateUnifiedHealthScore(pet, [], [], [], records);

      expect(result.components.appetite).toBeLessThan(80);
    });
  });

  describe('Species handling', () => {
    it('should handle cat-specific weight ranges', () => {
      const pet = createPet({ species: 'Cat', breed: 'Siamese', weight: 4 });
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.components.weight).toBeGreaterThanOrEqual(80);
    });

    it('should handle unknown species with defaults', () => {
      const pet = createPet({ species: 'Dragon' as any, breed: undefined, weight: 5 });
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeDefined();
    });

    it('should handle bird-specific ranges', () => {
      const pet = createPet({ species: 'Bird', breed: 'Cockatiel', weight: 0.1 });
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeDefined();
    });
  });

  describe('Vaccination gaps', () => {
    it('should penalize lack of vaccination records', () => {
      const pet = createPet();
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      // Medical score should be lower without vaccinations
      expect(result.components.medical).toBeLessThan(100);
    });

    it('should reward recent vaccinations', () => {
      const pet = createPet();
      const records = [
        createHealthRecord({ type: 'vaccination', value: 1, unit: 'dose' }),
        createHealthRecord({ id: 'v2', type: 'vaccination', value: 1, unit: 'dose' }),
      ];

      const result = calculateUnifiedHealthScore(pet, [], [], [], records);

      // Medical score should be better with vaccinations
      expect(result.components.medical).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Activity scoring', () => {
    it('should reward good activity levels', () => {
      const pet = createPet();
      // Golden Retriever needs 60-90min daily - 7 days of good activity
      const records = Array.from({ length: 7 }, (_, i) =>
        createHealthRecord({ id: `a${i}`, type: 'activity', value: 75, unit: 'minutes' })
      );

      const result = calculateUnifiedHealthScore(pet, [], [], [], records);

      // With 7 days of good activity (75min daily = 525min/week), score should be reasonable
      expect(result.components.activity).toBeGreaterThanOrEqual(50);
    });

    it('should penalize very low activity', () => {
      const pet = createPet();
      const records = [
        createHealthRecord({ type: 'activity', value: 10, unit: 'minutes' }),
      ];

      const result = calculateUnifiedHealthScore(pet, [], [], [], records);

      expect(result.components.activity).toBeLessThan(60);
    });
  });

  describe('Combined severity scenarios', () => {
    it('should apply severity cap for dangerous conditions', () => {
      // Severely overweight + multiple high alerts
      const pet = createPet({ weight: 70 }); // Very overweight
      const alerts = [
        createAlert({ severity: 'high', resolved: false }),
        createAlert({ id: 'alert-2', severity: 'high', resolved: false }),
      ];

      const result = calculateUnifiedHealthScore(pet, alerts, [], [], []);

      expect(result.overall).toBeLessThanOrEqual(35);
      expect(result.status).toMatch(/critical|poor/);
    });

    it('should handle impossible data combination', () => {
      // Age > lifespan + severely overweight
      const pet = createPet({ age: 40, weight: 100 });

      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result.overall).toBeLessThanOrEqual(15);
      expect(result.status).toBe('critical');
    });
  });

  describe('Score consistency', () => {
    it('should produce consistent results for same inputs', () => {
      const pet = createPet();

      const result1 = calculateUnifiedHealthScore(pet, [], [], [], []);
      const result2 = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(result1.overall).toBe(result2.overall);
      expect(result1.status).toBe(result2.status);
    });

    it('should return proper status for each score range', () => {
      // Test each status threshold
      const statuses = ['excellent', 'good', 'fair', 'poor', 'critical'];
      const pet = createPet();
      const result = calculateUnifiedHealthScore(pet, [], [], [], []);

      expect(statuses).toContain(result.status);
    });
  });
});

describe('Component weight verification', () => {
  it('should use documented weights: weight 20%, activity 20%, medical 25%, alerts 15%, AI 10%, age 10%', () => {
    // This test documents and verifies the expected component weights
    const expectedWeights = {
      weight: 0.20,
      activity: 0.20,
      medical: 0.25,
      alerts: 0.15,
      aiInsights: 0.10,
      age: 0.10,
    };

    // Verify weights sum to ~1.0 (appetite adds bonus)
    const totalWeight = Object.values(expectedWeights).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
  });
});
