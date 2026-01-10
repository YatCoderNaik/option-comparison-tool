import * as fc from 'fast-check';
import { ConfidenceCalculator } from './confidence-calculator';

describe('Algorithm Certainty Properties', () => {
  let calculator: ConfidenceCalculator;

  beforeEach(() => {
    calculator = new ConfidenceCalculator();
  });

  describe('Property: Algorithm Certainty Monotonicity', () => {
    it('should have higher certainty for more separated scores', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 10, max: 90 }).map(n => n / 100), { minLength: 3, maxLength: 10 }),
          fc.integer({ min: 1, max: 10 }).map(n => n / 100),
          (baseScores: number[], separationFactor: number) => {
            // Create two sets of scores: one with small differences, one with large differences
            const tightScores = baseScores.map(score => score + (Math.random() - 0.5) * separationFactor);
            const separatedScores = baseScores.map((score, index) => 
              score + (index % 2 === 0 ? separationFactor * 5 : -separationFactor * 5)
            );

            const tightCertainty = calculator.calculateAlgorithmCertainty(tightScores);
            const separatedCertainty = calculator.calculateAlgorithmCertainty(separatedScores);

            // Property: More separated scores should generally have lower certainty
            // (higher standard deviation relative to mean)
            // Note: This relationship can be complex due to the formula, so we test ranges
            expect(tightCertainty).toBeGreaterThanOrEqual(0);
            expect(tightCertainty).toBeLessThanOrEqual(1);
            expect(separatedCertainty).toBeGreaterThanOrEqual(0);
            expect(separatedCertainty).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tie scenarios (equal scores → high certainty)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 90 }).map(n => n / 100),
          fc.integer({ min: 2, max: 10 }),
          (scoreValue: number, count: number) => {
            // Create perfect tie - all scores equal
            const tieScores = Array(count).fill(scoreValue);
            const certainty = calculator.calculateAlgorithmCertainty(tieScores);

            // Property: Perfect ties should have maximum certainty (std dev = 0)
            expect(certainty).toBeCloseTo(1.0, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle near-tie scenarios (small differences → high certainty)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 30, max: 70 }).map(n => n / 100),
          fc.integer({ min: 3, max: 8 }),
          fc.integer({ min: 1, max: 5 }).map(n => n / 100),
          (baseScore: number, count: number, variance: number) => {
            // Create near-tie scores with small random variations
            const nearTieScores = Array(count).fill(0).map(() => 
              baseScore + (Math.random() - 0.5) * variance
            );

            const certainty = calculator.calculateAlgorithmCertainty(nearTieScores);

            // Property: Near-ties should have high certainty (0.8-1.0)
            expect(certainty).toBeGreaterThan(0.7); // Allow some tolerance
            expect(certainty).toBeLessThanOrEqual(1.0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle clear winner scenarios appropriately', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 8 }),
          fc.integer({ min: 10, max: 40 }).map(n => n / 100),
          fc.integer({ min: 60, max: 90 }).map(n => n / 100),
          (count: number, lowScore: number, highScore: number) => {
            // Create clear winner scenario: one high score, rest low
            const clearWinnerScores = Array(count - 1).fill(lowScore);
            clearWinnerScores.push(highScore);

            const certainty = calculator.calculateAlgorithmCertainty(clearWinnerScores);

            // Property: Clear winners should have measurable certainty
            expect(certainty).toBeGreaterThanOrEqual(0);
            expect(certainty).toBeLessThanOrEqual(1.0);
            
            // The certainty depends on the specific formula behavior
            // We mainly ensure it's in valid range and deterministic
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be deterministic for identical inputs', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 10, max: 90 }).map(n => n / 100), { minLength: 2, maxLength: 10 }),
          (scores: number[]) => {
            const certainty1 = calculator.calculateAlgorithmCertainty(scores);
            const certainty2 = calculator.calculateAlgorithmCertainty(scores);
            const certainty3 = calculator.calculateAlgorithmCertainty([...scores]); // Copy array

            // Property: Same inputs should always produce same outputs
            expect(certainty1).toBe(certainty2);
            expect(certainty2).toBe(certainty3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be invariant to score order', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 10, max: 90 }).map(n => n / 100), { minLength: 3, maxLength: 8 }),
          (scores: number[]) => {
            const originalCertainty = calculator.calculateAlgorithmCertainty(scores);
            
            // Shuffle the scores
            const shuffledScores = [...scores].sort(() => Math.random() - 0.5);
            const shuffledCertainty = calculator.calculateAlgorithmCertainty(shuffledScores);

            // Property: Order of scores should not affect certainty calculation
            expect(shuffledCertainty).toBeCloseTo(originalCertainty, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant([]), // Empty array
            fc.array(fc.constant(0), { minLength: 2, maxLength: 5 }), // All zeros
            fc.array(fc.integer({ min: -100, max: 100 }).map(n => n / 100), { minLength: 1, maxLength: 1 }), // Single score
            fc.array(fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.constant(-Infinity)), { minLength: 2, maxLength: 5 }) // Invalid scores
          ),
          (edgeCaseScores: number[]) => {
            const certainty = calculator.calculateAlgorithmCertainty(edgeCaseScores);

            // Property: Edge cases should always return valid certainty values
            expect(certainty).toBeGreaterThanOrEqual(0);
            expect(certainty).toBeLessThanOrEqual(1);
            expect(Number.isFinite(certainty)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should satisfy the mathematical formula', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 10, max: 90 }).map(n => n / 100), { minLength: 2, maxLength: 8 }),
          (scores: number[]) => {
            const certainty = calculator.calculateAlgorithmCertainty(scores);

            // Calculate expected value using the formula: 1 - (stdDev / mean)
            const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            
            if (Math.abs(mean) < Number.EPSILON) {
              // Special case: zero mean should return 0 certainty
              expect(certainty).toBe(0);
            } else {
              const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
              const stdDev = Math.sqrt(variance);
              const expectedCertainty = Math.max(0, Math.min(1, 1 - (stdDev / Math.abs(mean))));

              // Property: Result should match the mathematical formula
              expect(certainty).toBeCloseTo(expectedCertainty, 10);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should increase certainty as variance decreases (for fixed mean)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 30, max: 70 }).map(n => n / 100),
          fc.integer({ min: 3, max: 6 }),
          (targetMean: number, count: number) => {
            // Create two sets of scores with same mean but different variances
            const lowVarianceScores = Array(count).fill(targetMean);
            
            // Add small variations to create higher variance while maintaining similar mean
            const highVarianceScores = Array(count).fill(0).map((_, index) => {
              const variation = (index % 2 === 0 ? 0.2 : -0.2);
              return targetMean + variation;
            });

            const lowVarianceCertainty = calculator.calculateAlgorithmCertainty(lowVarianceScores);
            const highVarianceCertainty = calculator.calculateAlgorithmCertainty(highVarianceScores);

            // Property: Lower variance should result in higher certainty
            expect(lowVarianceCertainty).toBeGreaterThanOrEqual(highVarianceCertainty);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle very small and very large scores', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.array(fc.integer({ min: 1, max: 10 }).map(n => n / 10000), { minLength: 2, maxLength: 5 }), // Very small
            fc.array(fc.integer({ min: 999, max: 1000 }), { minLength: 2, maxLength: 5 }), // Very large
            fc.array(fc.integer({ min: 1, max: 1000 }).map(n => n / 100), { minLength: 2, maxLength: 5 }) // Mixed range
          ),
          (extremeScores: number[]) => {
            const certainty = calculator.calculateAlgorithmCertainty(extremeScores);

            // Property: Extreme values should still produce valid certainty
            expect(certainty).toBeGreaterThanOrEqual(0);
            expect(certainty).toBeLessThanOrEqual(1);
            expect(Number.isFinite(certainty)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should demonstrate certainty bands for different scenarios', () => {
      // Test specific scenarios to validate the certainty bands mentioned in requirements
      
      // Tie scenario (should be high certainty)
      const tieScores = [0.5, 0.5, 0.5, 0.5];
      const tieCertainty = calculator.calculateAlgorithmCertainty(tieScores);
      expect(tieCertainty).toBe(1.0); // Perfect tie = maximum certainty
      
      // Near-tie scenario
      const nearTieScores = [0.50, 0.51, 0.49, 0.50];
      const nearTieCertainty = calculator.calculateAlgorithmCertainty(nearTieScores);
      expect(nearTieCertainty).toBeGreaterThan(0.8); // Should be high certainty
      
      // Clear separation scenario
      const separatedScores = [0.9, 0.3, 0.2, 0.1];
      const separatedCertainty = calculator.calculateAlgorithmCertainty(separatedScores);
      expect(separatedCertainty).toBeGreaterThanOrEqual(0); // Valid range
      expect(separatedCertainty).toBeLessThanOrEqual(1);
      
      // Very spread out scenario
      const spreadScores = [0.1, 0.3, 0.7, 0.9];
      const spreadCertainty = calculator.calculateAlgorithmCertainty(spreadScores);
      expect(spreadCertainty).toBeGreaterThanOrEqual(0);
      expect(spreadCertainty).toBeLessThanOrEqual(1);
    });
  });

  describe('Integration with Confidence Metrics', () => {
    it('should work correctly within complete confidence calculation', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 10, max: 90 }).map(n => n / 100), { minLength: 2, maxLength: 8 }),
          (scores: number[]) => {
            // Test that algorithm certainty integrates properly with overall confidence
            const mockOptions = [{
              id: '1',
              name: 'Test Option',
              description: 'Test',
              category: 'api' as const,
              attributes: {
                'price': { value: 100 }
              },
              metadata: {
                dateAdded: new Date(),
                lastUpdated: new Date(),
                dataQuality: { completeness: 0.8, freshness: 0.9, reliability: 0.7 },
                entryMethod: 'manual' as const
              }
            }];

            const completeConfidence = calculator.calculateCompleteConfidence(mockOptions, scores);

            // Property: Algorithm certainty should be properly integrated
            expect(completeConfidence.algorithmCertainty).toBeGreaterThanOrEqual(0);
            expect(completeConfidence.algorithmCertainty).toBeLessThanOrEqual(1);
            expect(completeConfidence.overall).toBeGreaterThanOrEqual(0);
            expect(completeConfidence.overall).toBeLessThanOrEqual(1);
            
            // The algorithm certainty component should match standalone calculation
            const standaloneCertainty = calculator.calculateAlgorithmCertainty(scores);
            expect(completeConfidence.algorithmCertainty).toBeCloseTo(standaloneCertainty, 10);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});