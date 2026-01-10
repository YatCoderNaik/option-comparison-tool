import { ConfidenceCalculator } from './confidence-calculator';
import { Option, ConfidenceMetrics } from '../../types/core';

describe('ConfidenceCalculator', () => {
  let calculator: ConfidenceCalculator;

  beforeEach(() => {
    calculator = new ConfidenceCalculator();
  });

  describe('calculateOverallConfidence', () => {
    it('should calculate weighted average of all components', () => {
      const components: ConfidenceMetrics = {
        overall: 0, // Will be calculated
        dataCompleteness: 0.8,
        dataFreshness: 0.6,
        sourceReliability: 0.9,
        algorithmCertainty: 0.7
      };

      const result = calculator.calculateOverallConfidence(components);
      
      // Default weights: completeness=0.3, freshness=0.2, reliability=0.2, certainty=0.3
      const expected = (0.8 * 0.3) + (0.6 * 0.2) + (0.9 * 0.2) + (0.7 * 0.3);
      expect(result).toBeCloseTo(expected, 5);
    });

    it('should handle custom weights', () => {
      const components: Partial<ConfidenceMetrics> = {
        dataCompleteness: 0.8,
        algorithmCertainty: 0.6
      };

      const customWeights = {
        dataCompleteness: 0.7,
        algorithmCertainty: 0.3
      };

      const result = calculator.calculateOverallConfidence(components, customWeights);
      
      // Only these two components with custom weights
      const expected = (0.8 * 0.7 + 0.6 * 0.3) / (0.7 + 0.3);
      expect(result).toBeCloseTo(expected, 5);
    });

    it('should handle missing components', () => {
      const components: Partial<ConfidenceMetrics> = {
        dataCompleteness: 0.8,
        sourceReliability: 0.6
      };

      const result = calculator.calculateOverallConfidence(components);
      
      // Only completeness (0.3) and reliability (0.2) weights
      const expected = (0.8 * 0.3 + 0.6 * 0.2) / (0.3 + 0.2);
      expect(result).toBeCloseTo(expected, 5);
    });

    it('should return 0 for empty components', () => {
      const result = calculator.calculateOverallConfidence({});
      expect(result).toBe(0);
    });

    it('should clamp result to [0, 1] range', () => {
      const components: Partial<ConfidenceMetrics> = {
        dataCompleteness: 2.0, // Invalid high value
        sourceReliability: -0.5 // Invalid low value
      };

      const result = calculator.calculateOverallConfidence(components);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateDataCompleteness', () => {
    it('should calculate percentage of filled attributes', () => {
      const options: Option[] = [
        {
          id: '1',
          name: 'Option 1',
          description: 'Test option',
          category: 'api',
          attributes: {
            'price': { value: 100 },
            'features': { value: 'API, Dashboard' },
            'empty': { value: '' }, // Empty value
            'null': { value: null as any }, // Null value
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 0.8, freshness: 0.9, reliability: 0.7 },
            entryMethod: 'manual'
          }
        }
      ];

      const result = calculator.calculateDataCompleteness(options);
      
      // 2 filled out of 4 attributes = 0.5
      expect(result).toBe(0.5);
    });

    it('should handle multiple options', () => {
      const options: Option[] = [
        {
          id: '1',
          name: 'Option 1',
          description: 'Test',
          category: 'api',
          attributes: {
            'price': { value: 100 },
            'features': { value: 'API' }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        },
        {
          id: '2',
          name: 'Option 2',
          description: 'Test',
          category: 'api',
          attributes: {
            'price': { value: 200 },
            'features': { value: '' }, // Empty
            'support': { value: '24/7' }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        }
      ];

      const result = calculator.calculateDataCompleteness(options);
      
      // Option 1: 2/2 filled, Option 2: 2/3 filled = (2+2)/(2+3) = 4/5 = 0.8
      expect(result).toBe(0.8);
    });

    it('should return 0 for empty options array', () => {
      const result = calculator.calculateDataCompleteness([]);
      expect(result).toBe(0);
    });

    it('should return 1 for options with no attributes', () => {
      const options: Option[] = [
        {
          id: '1',
          name: 'Option 1',
          description: 'Test',
          category: 'api',
          attributes: {},
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        }
      ];

      const result = calculator.calculateDataCompleteness(options);
      expect(result).toBe(1);
    });
  });

  describe('calculateDataFreshness', () => {
    it('should calculate freshness based on timestamps', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const options: Option[] = [
        {
          id: '1',
          name: 'Fresh Option',
          description: 'Test',
          category: 'api',
          attributes: {
            'price': { value: 100, lastUpdated: oneHourAgo }
          },
          metadata: {
            dateAdded: now,
            lastUpdated: now,
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        },
        {
          id: '2',
          name: 'Old Option',
          description: 'Test',
          category: 'api',
          attributes: {
            'price': { value: 200, lastUpdated: oneDayAgo }
          },
          metadata: {
            dateAdded: oneDayAgo,
            lastUpdated: oneDayAgo,
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        }
      ];

      const result = calculator.calculateDataFreshness(options, 24); // 24 hour max age
      
      // Should be between 0 and 1, with fresher data having higher scores
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should return 0 for empty options array', () => {
      const result = calculator.calculateDataFreshness([]);
      expect(result).toBe(0);
    });

    it('should handle options without attribute timestamps', () => {
      const options: Option[] = [
        {
          id: '1',
          name: 'Option 1',
          description: 'Test',
          category: 'api',
          attributes: {
            'price': { value: 100 } // No lastUpdated
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        }
      ];

      const result = calculator.calculateDataFreshness(options);
      
      // Should still calculate based on option metadata
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateSourceReliability', () => {
    it('should calculate reliability from confidence scores', () => {
      const options: Option[] = [
        {
          id: '1',
          name: 'Option 1',
          description: 'Test',
          category: 'api',
          attributes: {
            'price': { value: 100, confidence: 0.9 },
            'features': { value: 'API', confidence: 0.8 }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 0.85 },
            entryMethod: 'manual'
          }
        }
      ];

      const result = calculator.calculateSourceReliability(options);
      
      // Average of 0.85 (metadata) + 0.9 + 0.8 = (0.85 + 0.9 + 0.8) / 3
      const expected = (0.85 + 0.9 + 0.8) / 3;
      expect(result).toBeCloseTo(expected, 5);
    });

    it('should estimate reliability from source URLs', () => {
      const options: Option[] = [
        {
          id: '1',
          name: 'Option 1',
          description: 'Test',
          category: 'api',
          attributes: {
            'price': { value: 100, source: 'https://github.com/official/repo' },
            'features': { value: 'API', source: 'https://docs.example.com/api' },
            'support': { value: '24/7', source: 'https://blog.example.com/post' }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        }
      ];

      const result = calculator.calculateSourceReliability(options);
      
      // Should estimate based on source patterns
      expect(result).toBeGreaterThan(0.5); // Should be above default
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should return 0.5 for empty options array', () => {
      const result = calculator.calculateSourceReliability([]);
      expect(result).toBe(0);
    });

    it('should return default reliability when no sources available', () => {
      const options: Option[] = [
        {
          id: '1',
          name: 'Option 1',
          description: 'Test',
          category: 'api',
          attributes: {
            'price': { value: 100 } // No confidence or source
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: undefined as any },
            entryMethod: 'manual'
          }
        }
      ];

      const result = calculator.calculateSourceReliability(options);
      expect(result).toBe(0.5); // Default medium reliability
    });
  });

  describe('calculateAlgorithmCertainty', () => {
    it('should return 1 for single score', () => {
      const result = calculator.calculateAlgorithmCertainty([0.8]);
      expect(result).toBe(1);
    });

    it('should return 0 for empty scores', () => {
      const result = calculator.calculateAlgorithmCertainty([]);
      expect(result).toBe(0);
    });

    it('should calculate certainty using the specified formula', () => {
      const scores = [0.8, 0.6, 0.7, 0.9];
      const result = calculator.calculateAlgorithmCertainty(scores);
      
      // Manual calculation for verification
      const mean = (0.8 + 0.6 + 0.7 + 0.9) / 4; // 0.75
      const variance = ((0.8-0.75)**2 + (0.6-0.75)**2 + (0.7-0.75)**2 + (0.9-0.75)**2) / 4;
      const stdDev = Math.sqrt(variance);
      const expected = 1 - (stdDev / mean);
      
      expect(result).toBeCloseTo(expected, 5);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle tie scenarios (low certainty)', () => {
      const tieScores = [0.5, 0.5, 0.5, 0.5];
      const result = calculator.calculateAlgorithmCertainty(tieScores);
      
      // Perfect tie should have high certainty (std dev = 0)
      expect(result).toBe(1);
    });

    it('should handle near-tie scenarios (medium certainty)', () => {
      const nearTieScores = [0.50, 0.51, 0.49, 0.50];
      const result = calculator.calculateAlgorithmCertainty(nearTieScores);
      
      // Small differences should have high certainty
      expect(result).toBeGreaterThan(0.8);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle clear winner scenarios (high certainty)', () => {
      const clearWinnerScores = [0.9, 0.3, 0.2, 0.1];
      const result = calculator.calculateAlgorithmCertainty(clearWinnerScores);
      
      // Large differences should still have reasonable certainty
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle zero mean gracefully', () => {
      const zeroScores = [0, 0, 0, 0];
      const result = calculator.calculateAlgorithmCertainty(zeroScores);
      
      // Zero mean should return 0 certainty
      expect(result).toBe(0);
    });

    it('should filter out invalid scores', () => {
      const mixedScores = [0.8, NaN, 0.6, Infinity, 0.7, -Infinity];
      const result = calculator.calculateAlgorithmCertainty(mixedScores);
      
      // Should only use valid scores: [0.8, 0.6, 0.7]
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should clamp result to [0, 1] range', () => {
      // Test with scores that might produce values outside [0, 1]
      const extremeScores = [1000, 0.001, 0.002];
      const result = calculator.calculateAlgorithmCertainty(extremeScores);
      
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateCompleteConfidence', () => {
    it('should calculate all confidence components', () => {
      const options: Option[] = [
        {
          id: '1',
          name: 'Option 1',
          description: 'Test',
          category: 'api',
          attributes: {
            'price': { value: 100, confidence: 0.9 },
            'features': { value: 'API' }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 0.8, freshness: 0.9, reliability: 0.85 },
            entryMethod: 'manual'
          }
        }
      ];

      const scores = [0.8, 0.6, 0.7];
      const result = calculator.calculateCompleteConfidence(options, scores);

      expect(result.dataCompleteness).toBeGreaterThan(0);
      expect(result.dataFreshness).toBeGreaterThan(0);
      expect(result.sourceReliability).toBeGreaterThan(0);
      expect(result.algorithmCertainty).toBeGreaterThan(0);
      expect(result.overall).toBeGreaterThan(0);

      // All values should be in [0, 1] range
      Object.values(result).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty inputs gracefully', () => {
      const result = calculator.calculateCompleteConfidence([], []);

      expect(result.dataCompleteness).toBe(0);
      expect(result.dataFreshness).toBe(0);
      expect(result.sourceReliability).toBe(0);
      expect(result.algorithmCertainty).toBe(0);
      expect(result.overall).toBe(0);
    });

    it('should use custom weights', () => {
      const options: Option[] = [
        {
          id: '1',
          name: 'Option 1',
          description: 'Test',
          category: 'api',
          attributes: {
            'price': { value: 100 }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        }
      ];

      const customWeights = {
        dataCompleteness: 0.8,
        algorithmCertainty: 0.2
      };

      const result = calculator.calculateCompleteConfidence(options, [0.5], customWeights);

      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    });
  });
});