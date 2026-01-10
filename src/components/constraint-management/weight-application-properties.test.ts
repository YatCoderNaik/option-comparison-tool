import { WeightCalculator } from './weight-calculator';

describe('Weight Application Properties', () => {
  let calculator: WeightCalculator;

  beforeEach(() => {
    calculator = new WeightCalculator();
  });

  describe('Property 6: Weight Application Consistency', () => {
    it('should normalize weights to sum to 1.0', () => {
      const weights = { 'c1': 0.3, 'c2': 0.2, 'c3': 0.2 }; // Sum = 0.7
      const normalized = calculator.normalizeWeights(weights);
      
      const sum = Object.values(normalized).reduce((s, w) => s + w, 0);
      expect(sum).toBeCloseTo(1.0, 10);
      
      Object.values(normalized).forEach(weight => {
        expect(weight).toBeGreaterThan(0);
      });
    });

    it('should detect skew consistently', () => {
      const skewedWeights = { 'c1': 0.8, 'c2': 0.1, 'c3': 0.1 };
      const balancedWeights = { 'c1': 0.4, 'c2': 0.3, 'c3': 0.3 };
      
      expect(calculator.detectSkew(skewedWeights)).toBe(true);
      expect(calculator.detectSkew(balancedWeights)).toBe(false);
    });

    it('should create equal weights correctly', () => {
      const constraintIds = ['c1', 'c2', 'c3'];
      const equalWeights = calculator.createEqualWeights(constraintIds);
      
      expect(Object.keys(equalWeights).sort()).toEqual(constraintIds.sort());
      
      const expectedWeight = 1.0 / constraintIds.length;
      Object.values(equalWeights).forEach(weight => {
        expect(weight).toBeCloseTo(expectedWeight, 10);
      });
      
      const sum = Object.values(equalWeights).reduce((s, w) => s + w, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });
  });
});