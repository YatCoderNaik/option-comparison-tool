import { ScoringEngine } from './scoring-engine';
import { Option, Constraint } from '../../types/core';

describe('ScoringEngine', () => {
  let engine: ScoringEngine;
  let mockOptions: Option[];
  let mockConstraints: Constraint[];

  beforeEach(() => {
    engine = new ScoringEngine({
      missingValueHandling: {
        maxMissingPercentage: 0.8, // Allow up to 80% missing data
        penaltyFactor: 0.1
      }
    });
    
    mockOptions = [
      {
        id: '1',
        name: 'Option 1',
        description: 'Test option 1',
        category: 'api',
        attributes: {
          price: { value: 100 },
          performance: { value: 80 },
          category: { value: 'basic' }
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
        description: 'Test option 2',
        category: 'api',
        attributes: {
          price: { value: 200 },
          performance: { value: 90 },
          category: { value: 'premium' }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
          entryMethod: 'manual'
        }
      },
      {
        id: '3',
        name: 'Option 3',
        description: 'Test option 3',
        category: 'api',
        attributes: {
          price: { value: 150 },
          performance: { value: 85 },
          category: { value: 'standard' }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
          entryMethod: 'manual'
        }
      }
    ];

    mockConstraints = [
      {
        id: 'price-constraint',
        name: 'Price',
        type: 'budget',
        isHardRequirement: false,
        weight: 0.4,
        criterionType: 'cost',
        evaluationRule: {
          attributePath: 'price',
          operator: 'lessThan',
          targetValue: 300
        },
        description: 'Monthly cost',
        confidenceLevel: 0.9
      }
    ];
  });
  describe('createScoringMatrix', () => {
    it('should create scoring matrix with normalization', () => {
      const matrix = engine.createScoringMatrix(mockOptions, mockConstraints);

      expect(matrix.optionIds).toEqual(['1', '2', '3']);
      expect(matrix.criteriaIds).toEqual(['price-constraint']);
      expect(matrix.rawScores).toHaveLength(3);
      expect(matrix.normalizedScores).toHaveLength(3);
      expect(matrix.normalizationParameters['price-constraint']).toBeDefined();
      expect(matrix.excludedOptions).toHaveLength(0);
    });

    it('should exclude neutral criteria from scoring', () => {
      const constraintsWithNeutral = [
        ...mockConstraints,
        {
          id: 'category-constraint',
          name: 'Category',
          type: 'feature' as const,
          isHardRequirement: false,
          weight: 0.2,
          criterionType: 'neutral' as const,
          evaluationRule: {
            attributePath: 'category',
            operator: 'equals' as const,
            targetValue: 'premium'
          },
          description: 'Service category',
          confidenceLevel: 0.8
        }
      ];

      const matrix = engine.createScoringMatrix(mockOptions, constraintsWithNeutral);

      expect(matrix.criteriaIds).toEqual(['price-constraint']);
      expect(matrix.neutralCriteria).toEqual(['category-constraint']);
    });

    it('should handle multiple scoring criteria', () => {
      const multipleConstraints = [
        ...mockConstraints,
        {
          id: 'performance-constraint',
          name: 'Performance',
          type: 'performance' as const,
          isHardRequirement: false,
          weight: 0.6,
          criterionType: 'benefit' as const,
          evaluationRule: {
            attributePath: 'performance',
            operator: 'greaterThan' as const,
            targetValue: 70
          },
          description: 'Performance score',
          confidenceLevel: 0.9
        }
      ];

      const matrix = engine.createScoringMatrix(mockOptions, multipleConstraints);

      expect(matrix.criteriaIds).toHaveLength(2);
      expect(matrix.rawScores[0]).toHaveLength(2); // Two criteria per option
      expect(matrix.normalizedScores[0]).toHaveLength(2);
    });

    it('should exclude options with too many missing values', () => {
      const optionsWithMissing = [
        ...mockOptions,
        {
          id: '4',
          name: 'Incomplete Option',
          description: 'Missing most data',
          category: 'api' as const,
          attributes: {
            // Missing price and performance
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 0.1, freshness: 1, reliability: 1 },
            entryMethod: 'manual' as const
          }
        }
      ];

      const matrix = engine.createScoringMatrix(optionsWithMissing, mockConstraints);

      expect(matrix.excludedOptions).toContain('4');
    });

    it('should throw error for insufficient data', () => {
      expect(() => {
        engine.createScoringMatrix([mockOptions[0]], mockConstraints);
      }).toThrow('Data validation failed');
    });

    it('should throw error for no scoring criteria', () => {
      const neutralOnly = [{
        ...mockConstraints[0],
        criterionType: 'neutral' as const
      }];

      expect(() => {
        engine.createScoringMatrix(mockOptions, neutralOnly);
      }).toThrow('No scoring criteria found');
    });
  });

  describe('calculateWeightedScores', () => {
    it('should calculate WSM scores correctly', () => {
      const matrix = engine.createScoringMatrix(mockOptions, mockConstraints);
      const result = engine.calculateWeightedScores(matrix, mockConstraints);

      expect(result.optionScores).toHaveProperty('1');
      expect(result.optionScores).toHaveProperty('2');
      expect(result.optionScores).toHaveProperty('3');
      
      // Option 1 has lowest price (100) so should have highest score for cost criterion
      expect(result.optionScores['1']).toBeGreaterThan(result.optionScores['2']);
      expect(result.optionScores['1']).toBeGreaterThan(result.optionScores['3']);
      
      expect(result.rankings).toHaveLength(3);
      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[0].optionId).toBe('1');
    });

    it('should handle multiple criteria with different weights', () => {
      const multipleConstraints = [
        {
          ...mockConstraints[0],
          weight: 0.3 // Price weight
        },
        {
          id: 'performance-constraint',
          name: 'Performance',
          type: 'performance' as const,
          isHardRequirement: false,
          weight: 0.7, // Higher weight on performance
          criterionType: 'benefit' as const,
          evaluationRule: {
            attributePath: 'performance',
            operator: 'greaterThan' as const,
            targetValue: 70
          },
          description: 'Performance score',
          confidenceLevel: 0.9
        }
      ];

      const matrix = engine.createScoringMatrix(mockOptions, multipleConstraints);
      const result = engine.calculateWeightedScores(matrix, multipleConstraints);

      // With higher weight on performance, Option 2 (performance: 90) should rank higher
      expect(result.rankings[0].optionId).toBe('2');
      
      expect(result.transparency.weightsUsed['price-constraint']).toBeCloseTo(0.3);
      expect(result.transparency.weightsUsed['performance-constraint']).toBeCloseTo(0.7);
      expect(result.transparency.scoringMethod).toBe('Weighted Sum Model (WSM)');
    });

    it('should normalize weights when sum < 1', () => {
      const unnormalizedConstraints = [{
        ...mockConstraints[0],
        weight: 0.3 // Sum = 0.3 < 1
      }];

      const matrix = engine.createScoringMatrix(mockOptions, unnormalizedConstraints);
      const result = engine.calculateWeightedScores(matrix, unnormalizedConstraints);

      // Weight should be normalized to 1.0
      expect(result.transparency.weightsUsed['price-constraint']).toBeCloseTo(1.0);
    });

    it('should reject weights when sum > 1', () => {
      const invalidConstraints = [
        { ...mockConstraints[0], weight: 0.7 },
        {
          id: 'performance-constraint',
          name: 'Performance',
          type: 'performance' as const,
          isHardRequirement: false,
          weight: 0.8, // Total = 1.5 > 1
          criterionType: 'benefit' as const,
          evaluationRule: {
            attributePath: 'performance',
            operator: 'greaterThan' as const,
            targetValue: 70
          },
          description: 'Performance score',
          confidenceLevel: 0.9
        }
      ];

      const matrix = engine.createScoringMatrix(mockOptions, invalidConstraints);
      
      expect(() => {
        engine.calculateWeightedScores(matrix, invalidConstraints);
      }).toThrow('Weight validation failed');
    });

    it('should apply missing value penalty', () => {
      const optionsWithMissing = [
        mockOptions[0], // Complete data
        {
          ...mockOptions[1],
          attributes: {
            performance: { value: 90 } // Missing price
          }
        }
      ];

      const matrix = engine.createScoringMatrix(optionsWithMissing, mockConstraints);
      const result = engine.calculateWeightedScores(matrix, mockConstraints);

      // Option with missing data should have lower score due to penalty
      expect(result.optionScores['1']).toBeGreaterThan(result.optionScores['2']);
    });

    it('should exclude options from rankings', () => {
      const matrix = engine.createScoringMatrix(mockOptions, mockConstraints);
      matrix.excludedOptions = ['2']; // Manually exclude option 2

      const result = engine.calculateWeightedScores(matrix, mockConstraints);

      expect(result.rankings).toHaveLength(2); // Only 2 options ranked
      expect(result.rankings.find(r => r.optionId === '2')).toBeUndefined();
      expect(result.optionScores['2']).toBe(0); // Excluded option gets 0 score
    });

    it('should provide transparency information', () => {
      const matrix = engine.createScoringMatrix(mockOptions, mockConstraints);
      const result = engine.calculateWeightedScores(matrix, mockConstraints);

      expect(result.transparency.weightsUsed).toBeDefined();
      expect(result.transparency.normalizationDetails).toBeDefined();
      expect(result.transparency.neutralCriteriaExcluded).toBeDefined();
      expect(result.transparency.scoringMethod).toBe('Weighted Sum Model (WSM)');
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customEngine = new ScoringEngine({
        missingValueHandling: {
          maxMissingPercentage: 0.3,
          penaltyFactor: 0.2
        }
      });

      const config = customEngine.getConfig();
      expect(config.missingValueHandling.maxMissingPercentage).toBe(0.3);
      expect(config.missingValueHandling.penaltyFactor).toBe(0.2);
    });

    it('should update configuration', () => {
      engine.updateConfig({
        outlierHandling: {
          enabled: false,
          percentileThresholds: { lower: 10, upper: 90 }
        }
      });

      const config = engine.getConfig();
      expect(config.outlierHandling.enabled).toBe(false);
    });
  });
});