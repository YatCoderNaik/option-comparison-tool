import { WeightCalculator } from './weight-calculator';

describe('WeightCalculator', () => {
  let calculator: WeightCalculator;

  beforeEach(() => {
    calculator = new WeightCalculator();
  });

  describe('validateWeights', () => {
    it('should validate correct weights that sum to 1.0', () => {
      const weights = {
        'constraint1': 0.4,
        'constraint2': 0.3,
        'constraint3': 0.3
      };

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(true);
      expect(result.normalizedWeights).toEqual(weights);
      expect(result.warnings).toHaveLength(0);
    });

    it('should auto-normalize weights that sum to less than 1.0', () => {
      const weights = {
        'constraint1': 0.3,
        'constraint2': 0.2,
        'constraint3': 0.2
      }; // Sum = 0.7

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(true);
      expect(result.normalizedWeights['constraint1']).toBeCloseTo(0.3 / 0.7, 5);
      expect(result.normalizedWeights['constraint2']).toBeCloseTo(0.2 / 0.7, 5);
      expect(result.normalizedWeights['constraint3']).toBeCloseTo(0.2 / 0.7, 5);
      expect(result.warnings[0]).toContain('auto-normalized');
    });

    it('should reject weights that sum to more than 1.0', () => {
      const weights = {
        'constraint1': 0.6,
        'constraint2': 0.5,
        'constraint3': 0.3
      }; // Sum = 1.4

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(false);
      expect(result.normalizedWeights).toEqual({});
      expect(result.errors[0]).toContain('exceeds 1.0');
    });

    it('should reject negative weights', () => {
      const weights = {
        'constraint1': 0.5,
        'constraint2': -0.2,
        'constraint3': 0.3
      };

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('cannot be negative');
    });

    it('should reject weights greater than 1.0', () => {
      const weights = {
        'constraint1': 1.5,
        'constraint2': 0.2
      };

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('cannot exceed 1.0');
    });

    it('should warn about zero weights', () => {
      const weights = {
        'constraint1': 0.5,
        'constraint2': 0,
        'constraint3': 0.5
      };

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('zero weight');
    });

    it('should reject all zero weights', () => {
      const weights = {
        'constraint1': 0,
        'constraint2': 0,
        'constraint3': 0
      };

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(false);
      expect(result.suggestions[0]).toContain('greater than 0');
    });

    it('should reject empty weights', () => {
      const weights = {};

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(false);
      expect(result.suggestions[0]).toContain('Add at least one constraint');
    });

    it('should reject non-numeric weights', () => {
      const weights = {
        'constraint1': 0.5,
        'constraint2': 'invalid' as any,
        'constraint3': 0.3
      };

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be a number');
    });

    it('should warn about skewed weights', () => {
      const weights = {
        'constraint1': 0.8, // Dominant weight
        'constraint2': 0.1,
        'constraint3': 0.1
      };

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('overshadow'))).toBe(true);
    });

    it('should warn about weight concentration', () => {
      const weights = {
        'constraint1': 0.5,
        'constraint2': 0.4, // Top 2 = 90%
        'constraint3': 0.1
      };

      const result = calculator.validateWeights(weights);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Top 2 constraints'))).toBe(true);
    });
  });

  describe('normalizeWeights', () => {
    it('should normalize weights proportionally', () => {
      const weights = {
        'constraint1': 0.4,
        'constraint2': 0.2,
        'constraint3': 0.2
      }; // Sum = 0.8

      const normalized = calculator.normalizeWeights(weights);
      expect(normalized['constraint1']).toBeCloseTo(0.5, 5); // 0.4/0.8
      expect(normalized['constraint2']).toBeCloseTo(0.25, 5); // 0.2/0.8
      expect(normalized['constraint3']).toBeCloseTo(0.25, 5); // 0.2/0.8

      const sum = Object.values(normalized).reduce((s, w) => s + w, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should handle zero sum with equal weights fallback', () => {
      const weights = {
        'constraint1': 0,
        'constraint2': 0,
        'constraint3': 0
      };

      const normalized = calculator.normalizeWeights(weights);
      expect(normalized['constraint1']).toBeCloseTo(1/3, 5);
      expect(normalized['constraint2']).toBeCloseTo(1/3, 5);
      expect(normalized['constraint3']).toBeCloseTo(1/3, 5);
    });
  });

  describe('detectSkew', () => {
    it('should detect skewed weights', () => {
      const skewedWeights = {
        'constraint1': 0.7,
        'constraint2': 0.2,
        'constraint3': 0.1
      };

      expect(calculator.detectSkew(skewedWeights)).toBe(true);
    });

    it('should not detect skew in balanced weights', () => {
      const balancedWeights = {
        'constraint1': 0.4,
        'constraint2': 0.3,
        'constraint3': 0.3
      };

      expect(calculator.detectSkew(balancedWeights)).toBe(false);
    });
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions for skewed weights', () => {
      const skewedWeights = {
        'constraint1': 0.8,
        'constraint2': 0.1,
        'constraint3': 0.1
      };

      const suggestions = calculator.generateSuggestions(skewedWeights);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('reducing the dominant weight'))).toBe(true);
    });

    it('should generate suggestions for concentrated weights', () => {
      const concentratedWeights = {
        'constraint1': 0.5,
        'constraint2': 0.4,
        'constraint3': 0.1
      };

      const suggestions = calculator.generateSuggestions(concentratedWeights);
      expect(suggestions.some(s => s.includes('distributing weights more evenly'))).toBe(true);
    });

    it('should suggest prioritization for equal weights', () => {
      const equalWeights = {
        'constraint1': 1/3,
        'constraint2': 1/3,
        'constraint3': 1/3
      };

      const suggestions = calculator.generateSuggestions(equalWeights);
      expect(suggestions.some(s => s.includes('prioritizing constraints'))).toBe(true);
    });
  });

  describe('createEqualWeights', () => {
    it('should create equal weights for all constraints', () => {
      const constraintIds = ['c1', 'c2', 'c3', 'c4'];
      const weights = calculator.createEqualWeights(constraintIds);

      expect(Object.keys(weights)).toEqual(constraintIds);
      Object.values(weights).forEach(weight => {
        expect(weight).toBeCloseTo(0.25, 5);
      });

      const sum = Object.values(weights).reduce((s, w) => s + w, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should handle single constraint', () => {
      const constraintIds = ['c1'];
      const weights = calculator.createEqualWeights(constraintIds);

      expect(weights['c1']).toBe(1.0);
    });
  });

  describe('applyWeightDecay', () => {
    it('should reduce dominant weight and redistribute', () => {
      const weights = {
        'constraint1': 0.8, // Dominant
        'constraint2': 0.1,
        'constraint3': 0.1
      };

      const adjusted = calculator.applyWeightDecay(weights, 0.6);
      
      // Dominant weight should be reduced
      expect(adjusted['constraint1']).toBeLessThan(weights['constraint1']);
      
      // Other weights should increase
      expect(adjusted['constraint2']).toBeGreaterThan(weights['constraint2']);
      expect(adjusted['constraint3']).toBeGreaterThan(weights['constraint3']);

      // Should still sum to 1.0
      const sum = Object.values(adjusted).reduce((s, w) => s + w, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should not modify balanced weights', () => {
      const weights = {
        'constraint1': 0.4,
        'constraint2': 0.3,
        'constraint3': 0.3
      };

      const adjusted = calculator.applyWeightDecay(weights);
      expect(adjusted).toEqual(weights);
    });
  });

  describe('suggestWeightDistribution', () => {
    it('should suggest weights based on constraint types', () => {
      const constraintTypes = {
        'budget-constraint': 'budget' as const,
        'performance-constraint': 'performance' as const,
        'feature-constraint': 'feature' as const,
        'compatibility-constraint': 'compatibility' as const
      };

      const suggested = calculator.suggestWeightDistribution(constraintTypes);

      // Budget should have highest weight
      expect(suggested['budget-constraint']).toBeGreaterThan(suggested['performance-constraint']);
      expect(suggested['performance-constraint']).toBeGreaterThan(suggested['feature-constraint']);
      expect(suggested['feature-constraint']).toBeGreaterThan(suggested['compatibility-constraint']);

      // Should sum to 1.0
      const sum = Object.values(suggested).reduce((s, w) => s + w, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should handle custom constraint types', () => {
      const constraintTypes = {
        'custom1': 'custom' as const,
        'custom2': 'custom' as const
      };

      const suggested = calculator.suggestWeightDistribution(constraintTypes);
      
      expect(suggested['custom1']).toBe(0.5);
      expect(suggested['custom2']).toBe(0.5);
    });
  });
});