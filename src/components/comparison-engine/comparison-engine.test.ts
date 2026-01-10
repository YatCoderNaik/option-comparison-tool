import { ComparisonEngine } from './comparison-engine';
import { Option, Constraint } from '../../types/core';

describe('ComparisonEngine', () => {
  let engine: ComparisonEngine;

  beforeEach(() => {
    engine = new ComparisonEngine();
  });

  describe('Input Validation', () => {
    it('should throw error when no options provided', async () => {
      const constraints: Constraint[] = [{
        id: 'test-constraint',
        name: 'Test Constraint',
        type: 'custom',
        isHardRequirement: false,
        weight: 1.0,
        criterionType: 'benefit',
        evaluationRule: {
          attributePath: 'cost',
          operator: 'lessThan',
          targetValue: 100
        },
        description: 'Test constraint',
        confidenceLevel: 0.8
      }];

      await expect(engine.compareOptions([], constraints))
        .rejects.toThrow('At least one option is required for comparison');
    });

    it('should throw error when no constraints provided', async () => {
      const options: Option[] = [{
        id: 'option-1',
        name: 'Option 1',
        description: 'Test option',
        category: 'custom',
        attributes: {
          cost: { value: 50, confidence: 0.8 }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
          entryMethod: 'manual'
        }
      }];

      await expect(engine.compareOptions(options, []))
        .rejects.toThrow('At least one constraint is required for comparison');
    });

    it('should throw error when constraint weights exceed 1.0', async () => {
      const options: Option[] = [{
        id: 'option-1',
        name: 'Option 1',
        description: 'Test option',
        category: 'custom',
        attributes: {
          cost: { value: 50, confidence: 0.8 }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
          entryMethod: 'manual'
        }
      }];

      const constraints: Constraint[] = [
        {
          id: 'constraint-1',
          name: 'Constraint 1',
          type: 'custom',
          isHardRequirement: false,
          weight: 0.7,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'cost',
            operator: 'lessThan',
            targetValue: 100
          },
          description: 'Test constraint 1',
          confidenceLevel: 0.8
        },
        {
          id: 'constraint-2',
          name: 'Constraint 2',
          type: 'custom',
          isHardRequirement: false,
          weight: 0.5,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'cost',
            operator: 'lessThan',
            targetValue: 100
          },
          description: 'Test constraint 2',
          confidenceLevel: 0.8
        }
      ];

      await expect(engine.compareOptions(options, constraints))
        .rejects.toThrow(/Total constraint weights.*exceed 1\.0/);
    });
  });

  describe('Hard Constraint Filtering', () => {
    it('should exclude options that violate hard constraints', async () => {
      const options: Option[] = [
        {
          id: 'option-1',
          name: 'Expensive Option',
          description: 'High cost option',
          category: 'custom',
          attributes: {
            cost: { value: 150, confidence: 0.8 },
            performance: { value: 90, confidence: 0.8 }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        },
        {
          id: 'option-2',
          name: 'Affordable Option',
          description: 'Low cost option',
          category: 'custom',
          attributes: {
            cost: { value: 50, confidence: 0.8 },
            performance: { value: 70, confidence: 0.8 }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        },
        {
          id: 'option-3',
          name: 'Budget Option',
          description: 'Very low cost option',
          category: 'custom',
          attributes: {
            cost: { value: 30, confidence: 0.8 },
            performance: { value: 60, confidence: 0.8 }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        }
      ];

      const constraints: Constraint[] = [
        {
          id: 'budget-constraint',
          name: 'Budget Limit',
          type: 'budget',
          isHardRequirement: true, // Hard constraint
          weight: 0.0, // Weight doesn't matter for hard constraints
          criterionType: 'cost',
          evaluationRule: {
            attributePath: 'cost',
            operator: 'lessThan',
            targetValue: 100
          },
          description: 'Must be under budget',
          confidenceLevel: 0.9
        },
        {
          id: 'performance-constraint',
          name: 'Performance Score',
          type: 'performance',
          isHardRequirement: false,
          weight: 1.0,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'performance',
            operator: 'greaterThan',
            targetValue: 50
          },
          description: 'Performance scoring',
          confidenceLevel: 0.8
        }
      ];

      const result = await engine.compareOptions(options, constraints);

      // Should exclude option-1 (cost 150 > 100)
      expect(result.matrix.options).toHaveLength(2);
      expect(result.matrix.excludedOptions).toHaveLength(1);
      expect(result.matrix.excludedOptions[0].option.id).toBe('option-1');
      expect(result.matrix.excludedOptions[0].violatedConstraints).toHaveLength(1);
      expect(result.matrix.excludedOptions[0].violatedConstraints[0].constraintId).toBe('budget-constraint');
    });

    it('should throw error when less than 2 options remain after filtering', async () => {
      const options: Option[] = [{
        id: 'option-1',
        name: 'Expensive Option',
        description: 'High cost option',
        category: 'custom',
        attributes: {
          cost: { value: 150, confidence: 0.8 }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
          entryMethod: 'manual'
        }
      }];

      const constraints: Constraint[] = [{
        id: 'budget-constraint',
        name: 'Budget Limit',
        type: 'budget',
        isHardRequirement: true,
        weight: 0.0,
        criterionType: 'cost',
        evaluationRule: {
          attributePath: 'cost',
          operator: 'lessThan',
          targetValue: 100
        },
        description: 'Must be under budget',
        confidenceLevel: 0.9
      }];

      await expect(engine.compareOptions(options, constraints))
        .rejects.toThrow(/Minimum 2 options required for comparison/);
    });
  });

  describe('Successful Comparison', () => {
    it('should perform complete comparison with valid inputs', async () => {
      const options: Option[] = [
        {
          id: 'option-1',
          name: 'Option 1',
          description: 'First option',
          category: 'custom',
          attributes: {
            cost: { value: 50, confidence: 0.8 },
            performance: { value: 80, confidence: 0.9 }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        },
        {
          id: 'option-2',
          name: 'Option 2',
          description: 'Second option',
          category: 'custom',
          attributes: {
            cost: { value: 70, confidence: 0.8 },
            performance: { value: 90, confidence: 0.9 }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
            entryMethod: 'manual'
          }
        }
      ];

      const constraints: Constraint[] = [
        {
          id: 'cost-constraint',
          name: 'Cost',
          type: 'budget',
          isHardRequirement: false,
          weight: 0.4,
          criterionType: 'cost',
          evaluationRule: {
            attributePath: 'cost',
            operator: 'lessThan',
            targetValue: 100
          },
          description: 'Cost consideration',
          confidenceLevel: 0.8
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
          description: 'Performance consideration',
          confidenceLevel: 0.9
        }
      ];

      const result = await engine.compareOptions(options, constraints);

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.matrix).toBeDefined();
      expect(result.tradeoffs).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.confidence).toBeDefined();

      // Verify matrix structure
      expect(result.matrix.options).toHaveLength(2);
      expect(result.matrix.excludedOptions).toHaveLength(0);
      expect(result.matrix.criteria).toHaveLength(2);
      expect(result.matrix.rankings).toHaveLength(2);

      // Verify rankings are properly ordered
      expect(result.matrix.rankings[0].rank).toBe(1);
      expect(result.matrix.rankings[1].rank).toBe(2);
      expect(result.matrix.rankings[0].score).toBeGreaterThanOrEqual(result.matrix.rankings[1].score);

      // Verify trade-off analysis
      expect(result.tradeoffs.optionAnalyses).toBeDefined();
      expect(Object.keys(result.tradeoffs.optionAnalyses)).toHaveLength(2);
      expect(result.tradeoffs.scenarioGuidance).toBeDefined();

      // Verify confidence metrics
      expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
      expect(result.confidence.overall).toBeLessThanOrEqual(1);
      expect(result.confidence.dataCompleteness).toBeGreaterThanOrEqual(0);
      expect(result.confidence.algorithmCertainty).toBeGreaterThanOrEqual(0);

      // Verify insights are generated
      expect(Array.isArray(result.insights)).toBe(true);
    });
  });

  describe('Constraint Violation Explanations', () => {
    it('should generate clear violation explanations for different operators', async () => {
      const options: Option[] = [{
        id: 'option-1',
        name: 'Violating Option',
        description: 'Option that violates constraints',
        category: 'custom',
        attributes: {
          cost: { value: 150, confidence: 0.8 },
          name: { value: 'wrong-name', confidence: 0.8 },
          score: { value: 30, confidence: 0.8 }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
          entryMethod: 'manual'
        }
      }, {
        id: 'option-2',
        name: 'Valid Option',
        description: 'Option that passes constraints',
        category: 'custom',
        attributes: {
          cost: { value: 50, confidence: 0.8 },
          name: { value: 'good-name', confidence: 0.8 },
          score: { value: 80, confidence: 0.8 }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
          entryMethod: 'manual'
        }
      }, {
        id: 'option-3',
        name: 'Another Valid Option',
        description: 'Another option that passes constraints',
        category: 'custom',
        attributes: {
          cost: { value: 60, confidence: 0.8 },
          name: { value: 'good-option', confidence: 0.8 },
          score: { value: 70, confidence: 0.8 }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
          entryMethod: 'manual'
        }
      }];

      const constraints: Constraint[] = [
        {
          id: 'cost-limit',
          name: 'Cost Limit',
          type: 'budget',
          isHardRequirement: true,
          weight: 0.0,
          criterionType: 'cost',
          evaluationRule: {
            attributePath: 'cost',
            operator: 'lessThan',
            targetValue: 100
          },
          description: 'Cost must be under 100',
          confidenceLevel: 0.9
        },
        {
          id: 'name-contains',
          name: 'Name Contains',
          type: 'feature',
          isHardRequirement: true,
          weight: 0.0,
          criterionType: 'neutral',
          evaluationRule: {
            attributePath: 'name',
            operator: 'contains',
            targetValue: 'good'
          },
          description: 'Name must contain "good"',
          confidenceLevel: 0.9
        },
        {
          id: 'score-min',
          name: 'Minimum Score',
          type: 'performance',
          isHardRequirement: true,
          weight: 0.0,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'score',
            operator: 'greaterThan',
            targetValue: 50
          },
          description: 'Score must be above 50',
          confidenceLevel: 0.9
        },
        {
          id: 'soft-constraint',
          name: 'Soft Constraint',
          type: 'custom',
          isHardRequirement: false,
          weight: 1.0,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'score',
            operator: 'greaterThan',
            targetValue: 60
          },
          description: 'Soft scoring constraint',
          confidenceLevel: 0.8
        }
      ];

      const result = await engine.compareOptions(options, constraints);

      expect(result.matrix.excludedOptions).toHaveLength(1);
      expect(result.matrix.options).toHaveLength(2); // Two valid options remain
      
      const excluded = result.matrix.excludedOptions[0];
      expect(excluded.violatedConstraints).toHaveLength(3);

      // Check violation explanations
      const violations = excluded.violatedConstraints;
      expect(violations.some(v => v.explanation.includes('cost (150) must be less than 100'))).toBe(true);
      expect(violations.some(v => v.explanation.includes('name (wrong-name) must contain \'good\''))).toBe(true);
      expect(violations.some(v => v.explanation.includes('score (30) must be greater than 50'))).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('should allow configuration updates', () => {
      const config = {
        tradeoff: {
          uniqueFeatureVarianceThreshold: 0.25,
          significantDifferenceThreshold: 0.20
        }
      };

      expect(() => {
        engine.updateConfiguration(config);
      }).not.toThrow();
    });
  });
});