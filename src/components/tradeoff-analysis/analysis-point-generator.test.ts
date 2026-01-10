import { AnalysisPointGenerator } from './analysis-point-generator';
import { Option, Constraint } from '../../types/core';

describe('AnalysisPointGenerator', () => {
  let generator: AnalysisPointGenerator;
  let mockOptions: Option[];
  let mockConstraints: Constraint[];

  beforeEach(() => {
    generator = new AnalysisPointGenerator();
    
    mockOptions = [
      {
        id: '1',
        name: 'Budget Option',
        description: 'Low cost option',
        category: 'api',
        attributes: {
          price: { value: 50 },
          performance: { value: 60 },
          reliability: { value: 70 }
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
        name: 'Premium Option',
        description: 'High performance option',
        category: 'api',
        attributes: {
          price: { value: 200 },
          performance: { value: 95 },
          reliability: { value: 90 }
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
        name: 'Balanced Option',
        description: 'Balanced option',
        category: 'api',
        attributes: {
          price: { value: 100 },
          performance: { value: 80 },
          reliability: { value: 85 }
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
      },
      {
        id: 'performance-constraint',
        name: 'Performance',
        type: 'performance',
        isHardRequirement: false,
        weight: 0.6,
        criterionType: 'benefit',
        evaluationRule: {
          attributePath: 'performance',
          operator: 'greaterThan',
          targetValue: 50
        },
        description: 'Performance score',
        confidenceLevel: 0.9
      }
    ];
  });

  describe('generateAnalysisPoints', () => {
    it('should generate analysis points for all categories', () => {
      const scores = [[1, 0], [0, 1], [0.5, 0.5]]; // Mock normalized scores
      
      const result = generator.generateAnalysisPoints(
        mockOptions[0], // Budget option
        mockOptions,
        mockConstraints,
        scores
      );

      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('weaknesses');
      expect(result).toHaveProperty('uniqueFeatures');
      expect(result).toHaveProperty('dealBreakers');
      
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.weaknesses)).toBe(true);
      expect(Array.isArray(result.uniqueFeatures)).toBe(true);
      expect(Array.isArray(result.dealBreakers)).toBe(true);
    });

    it('should identify strengths correctly', () => {
      const scores = [[1, 0], [0, 1], [0.5, 0.5]];
      
      // Budget option should have strength in low cost
      const budgetResult = generator.generateAnalysisPoints(
        mockOptions[0],
        mockOptions,
        mockConstraints,
        scores
      );

      expect(budgetResult.strengths.length).toBeGreaterThan(0);
      
      // Premium option should have strength in high performance
      const premiumResult = generator.generateAnalysisPoints(
        mockOptions[1],
        mockOptions,
        mockConstraints,
        scores
      );

      expect(premiumResult.strengths.length).toBeGreaterThan(0);
    });

    it('should identify weaknesses correctly', () => {
      const scores = [[1, 0], [0, 1], [0.5, 0.5]];
      
      // Budget option should have weakness in low performance
      const budgetResult = generator.generateAnalysisPoints(
        mockOptions[0],
        mockOptions,
        mockConstraints,
        scores
      );

      // Premium option should have weakness in high cost
      const premiumResult = generator.generateAnalysisPoints(
        mockOptions[1],
        mockOptions,
        mockConstraints,
        scores
      );

      // At least one option should have identified weaknesses
      const totalWeaknesses = budgetResult.weaknesses.length + premiumResult.weaknesses.length;
      expect(totalWeaknesses).toBeGreaterThan(0);
    });

    it('should handle options with missing attributes', () => {
      const incompleteOption: Option = {
        id: '4',
        name: 'Incomplete Option',
        description: 'Missing some data',
        category: 'api',
        attributes: {
          price: { value: 75 }
          // Missing performance and reliability
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 0.3, freshness: 1, reliability: 1 },
          entryMethod: 'manual'
        }
      };

      const optionsWithIncomplete = [...mockOptions, incompleteOption];
      const scores = [[1, 0], [0, 1], [0.5, 0.5], [0.8, 0]];

      const result = generator.generateAnalysisPoints(
        incompleteOption,
        optionsWithIncomplete,
        mockConstraints,
        scores
      );

      // Should identify missing features as deal breakers
      expect(result.dealBreakers.length).toBeGreaterThan(0);
    });

    it('should handle hard constraint violations', () => {
      const hardConstraint: Constraint = {
        id: 'hard-price-limit',
        name: 'Hard Price Limit',
        type: 'budget',
        isHardRequirement: true,
        weight: 0.5,
        criterionType: 'cost',
        evaluationRule: {
          attributePath: 'price',
          operator: 'lessThan',
          targetValue: 150
        },
        description: 'Maximum budget',
        confidenceLevel: 1.0
      };

      const constraintsWithHard = [...mockConstraints, hardConstraint];
      const scores = [[1, 0], [0, 1], [0.5, 0.5]];

      // Premium option (price: 200) should violate hard constraint (< 150)
      const result = generator.generateAnalysisPoints(
        mockOptions[1], // Premium option with price 200
        mockOptions,
        constraintsWithHard,
        scores
      );

      expect(result.dealBreakers.length).toBeGreaterThan(0);
      const violation = result.dealBreakers.find(db => 
        db.ruleApplied === 'HardConstraintViolation'
      );
      expect(violation).toBeDefined();
    });

    it('should throw error for option not in list', () => {
      const unknownOption: Option = {
        id: 'unknown',
        name: 'Unknown',
        description: 'Not in list',
        category: 'api',
        attributes: {},
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 0, freshness: 0, reliability: 0 },
          entryMethod: 'manual'
        }
      };

      const scores = [[1, 0], [0, 1], [0.5, 0.5]];

      expect(() => {
        generator.generateAnalysisPoints(
          unknownOption,
          mockOptions,
          mockConstraints,
          scores
        );
      }).toThrow('Option unknown not found in options list');
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customGenerator = new AnalysisPointGenerator({
        uniqueFeatureVarianceThreshold: 0.5,
        significantDifferenceThreshold: 0.3,
        dealBreakerConfidenceThreshold: 0.95
      });

      const config = customGenerator.getConfig();
      expect(config.uniqueFeatureVarianceThreshold).toBe(0.5);
      expect(config.significantDifferenceThreshold).toBe(0.3);
      expect(config.dealBreakerConfidenceThreshold).toBe(0.95);
    });

    it('should update configuration', () => {
      generator.updateConfig({
        significantDifferenceThreshold: 0.25
      });

      const config = generator.getConfig();
      expect(config.significantDifferenceThreshold).toBe(0.25);
      // Other values should remain default
      expect(config.uniqueFeatureVarianceThreshold).toBe(0.20);
    });
  });

  describe('statistical analysis', () => {
    it('should identify outlier values correctly', () => {
      const outlierOptions: Option[] = [
        ...mockOptions,
        {
          id: '4',
          name: 'Outlier Option',
          description: 'Has extreme values',
          category: 'api',
          attributes: {
            price: { value: 1000 }, // Extreme outlier
            performance: { value: 75 },
            reliability: { value: 80 }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        }
      ];

      const scores = [[1, 0], [0, 1], [0.5, 0.5], [0, 0.3]];

      const result = generator.generateAnalysisPoints(
        outlierOptions[3], // Outlier option
        outlierOptions,
        mockConstraints,
        scores
      );

      // Should identify unique features due to outlier price
      expect(result.uniqueFeatures.length).toBeGreaterThan(0);
    });

    it('should handle boolean attributes', () => {
      const booleanOptions: Option[] = mockOptions.map(option => ({
        ...option,
        attributes: {
          ...option.attributes,
          hasFeature: { value: option.id === '2' } // Only premium option has feature
        }
      }));

      const scores = [[1, 0], [0, 1], [0.5, 0.5]];

      const result = generator.generateAnalysisPoints(
        booleanOptions[1], // Premium option with unique boolean feature
        booleanOptions,
        mockConstraints,
        scores
      );

      // Should work without errors
      expect(result).toBeDefined();
      expect(result.strengths).toBeDefined();
      expect(result.weaknesses).toBeDefined();
      expect(result.uniqueFeatures).toBeDefined();
      expect(result.dealBreakers).toBeDefined();
    });

    it('should handle string attributes gracefully', () => {
      const stringOptions: Option[] = mockOptions.map(option => ({
        ...option,
        attributes: {
          ...option.attributes,
          category: { value: 'premium' }, // Non-numeric attribute
          version: { value: '1.2.3' } // Non-numeric string
        }
      }));

      const scores = [[1, 0], [0, 1], [0.5, 0.5]];

      const result = generator.generateAnalysisPoints(
        stringOptions[0],
        stringOptions,
        mockConstraints,
        scores
      );

      // Should work without errors even with non-numeric attributes
      expect(result).toBeDefined();
    });
  });

  describe('analysis point quality', () => {
    it('should generate meaningful descriptions', () => {
      const scores = [[1, 0], [0, 1], [0.5, 0.5]];
      
      const result = generator.generateAnalysisPoints(
        mockOptions[0], // Budget option
        mockOptions,
        mockConstraints,
        scores
      );

      // Check that analysis points have meaningful content
      const allPoints = [
        ...result.strengths,
        ...result.weaknesses,
        ...result.uniqueFeatures,
        ...result.dealBreakers
      ];

      for (const point of allPoints) {
        expect(point.description).toBeTruthy();
        expect(point.description.length).toBeGreaterThan(5);
        expect(point.attributeSource).toBeTruthy();
        expect(point.reasoning).toBeTruthy();
        expect(point.ruleApplied).toBeTruthy();
        expect(point.confidenceLevel).toBeGreaterThan(0);
        expect(point.confidenceLevel).toBeLessThanOrEqual(1);
      }
    });

    it('should provide appropriate confidence levels', () => {
      const scores = [[1, 0], [0, 1], [0.5, 0.5]];
      
      const result = generator.generateAnalysisPoints(
        mockOptions[1], // Premium option
        mockOptions,
        mockConstraints,
        scores
      );

      const allPoints = [
        ...result.strengths,
        ...result.weaknesses,
        ...result.uniqueFeatures,
        ...result.dealBreakers
      ];

      // All confidence levels should be reasonable
      for (const point of allPoints) {
        expect(point.confidenceLevel).toBeGreaterThanOrEqual(0.5); // At least medium confidence
        expect(point.confidenceLevel).toBeLessThanOrEqual(1.0);
      }
    });
  });
});