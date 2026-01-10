import { ScenarioGuidanceGenerator } from './scenario-guidance-generator';
import { Option, Constraint } from '../../types/core';

describe('ScenarioGuidanceGenerator', () => {
  let generator: ScenarioGuidanceGenerator;
  let mockOptions: Option[];

  beforeEach(() => {
    generator = new ScenarioGuidanceGenerator();
    
    mockOptions = [
      {
        id: '1',
        name: 'Budget Option',
        description: 'Low cost option',
        category: 'api',
        attributes: {
          price: { value: 50 },
          performance: { value: 60 },
          reliability: { value: 70 },
          scalability: { value: 65 }
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
          reliability: { value: 90 },
          scalability: { value: 85 }
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
          reliability: { value: 85 },
          scalability: { value: 75 }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
          entryMethod: 'manual'
        }
      }
    ];
  });

  describe('generateScenarioGuidance', () => {
    it('should generate budget-constrained guidance', () => {
      const budgetConstraints: Constraint[] = [
        {
          id: 'price-constraint',
          name: 'Price',
          type: 'budget',
          isHardRequirement: false,
          weight: 0.7, // High weight on cost
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
          weight: 0.3,
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

      const scores = [[1, 0], [0, 1], [0.5, 0.5]];
      const guidance = generator.generateScenarioGuidance(mockOptions, budgetConstraints, scores);

      expect(guidance.length).toBeGreaterThan(0);
      
      const budgetGuidance = guidance.find(g => g.scenario === 'Budget-constrained projects');
      expect(budgetGuidance).toBeDefined();
      expect(budgetGuidance!.guidance).toContain('cost-effectiveness');
      expect(budgetGuidance!.applicableOptions).toContain('1'); // Budget option should be recommended
      expect(budgetGuidance!.confidenceLevel).toBeGreaterThan(0.5);
    });

    it('should generate performance-critical guidance', () => {
      const performanceConstraints: Constraint[] = [
        {
          id: 'performance-constraint',
          name: 'Performance',
          type: 'performance',
          isHardRequirement: false,
          weight: 0.8, // High weight on performance
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'performance',
            operator: 'greaterThan',
            targetValue: 70
          },
          description: 'Performance score',
          confidenceLevel: 0.9
        },
        {
          id: 'price-constraint',
          name: 'Price',
          type: 'budget',
          isHardRequirement: false,
          weight: 0.2,
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

      const scores = [[0, 1], [1, 0], [0.5, 0.5]];
      const guidance = generator.generateScenarioGuidance(mockOptions, performanceConstraints, scores);

      const performanceGuidance = guidance.find(g => g.scenario === 'Performance-critical applications');
      expect(performanceGuidance).toBeDefined();
      expect(performanceGuidance!.guidance).toContain('performance');
      expect(performanceGuidance!.applicableOptions).toContain('2'); // Premium option should be recommended
    });

    it('should generate balanced approach guidance', () => {
      const balancedConstraints: Constraint[] = [
        {
          id: 'price-constraint',
          name: 'Price',
          type: 'budget',
          isHardRequirement: false,
          weight: 0.33, // Balanced weights
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
          weight: 0.33,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'performance',
            operator: 'greaterThan',
            targetValue: 50
          },
          description: 'Performance score',
          confidenceLevel: 0.9
        },
        {
          id: 'reliability-constraint',
          name: 'Reliability',
          type: 'compatibility',
          isHardRequirement: false,
          weight: 0.34,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'reliability',
            operator: 'greaterThan',
            targetValue: 60
          },
          description: 'Reliability score',
          confidenceLevel: 0.9
        }
      ];

      const scores = [[0.5, 0.3, 0.4], [0.2, 1, 0.8], [0.8, 0.7, 0.9]];
      const guidance = generator.generateScenarioGuidance(mockOptions, balancedConstraints, scores);

      const balancedGuidance = guidance.find(g => g.scenario === 'Balanced requirements');
      expect(balancedGuidance).toBeDefined();
      expect(balancedGuidance!.guidance).toContain('balanced');
      expect(balancedGuidance!.applicableOptions).toContain('3'); // Balanced option should be recommended
    });

    it('should generate high reliability guidance', () => {
      const reliabilityConstraints: Constraint[] = [
        {
          id: 'reliability-constraint',
          name: 'Reliability',
          type: 'compatibility',
          isHardRequirement: true, // Hard requirement
          weight: 0.6,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'reliability',
            operator: 'greaterThan',
            targetValue: 80
          },
          description: 'Reliability score',
          confidenceLevel: 0.9
        },
        {
          id: 'uptime-constraint',
          name: 'Uptime',
          type: 'performance',
          isHardRequirement: false,
          weight: 0.4,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'reliability', // Using reliability as proxy for uptime
            operator: 'greaterThan',
            targetValue: 85
          },
          description: 'Uptime requirement',
          confidenceLevel: 0.9
        }
      ];

      const scores = [[0.2, 0.3], [0.8, 0.9], [0.7, 0.8]];
      const guidance = generator.generateScenarioGuidance(mockOptions, reliabilityConstraints, scores);

      const reliabilityGuidance = guidance.find(g => g.scenario === 'Mission-critical systems');
      expect(reliabilityGuidance).toBeDefined();
      expect(reliabilityGuidance!.guidance).toContain('reliability');
      expect(reliabilityGuidance!.confidenceLevel).toBeGreaterThan(0.8);
    });

    it('should generate rapid prototyping guidance', () => {
      const prototypeConstraints: Constraint[] = [
        {
          id: 'ease-constraint',
          name: 'Ease of Setup',
          type: 'feature',
          isHardRequirement: false,
          weight: 0.7,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'performance', // Using performance as proxy
            operator: 'greaterThan',
            targetValue: 50
          },
          description: 'Ease of setup',
          confidenceLevel: 0.8
        }
      ];

      const scores = [[0.8], [0.5], [0.7]];
      const guidance = generator.generateScenarioGuidance(mockOptions, prototypeConstraints, scores);

      const prototypeGuidance = guidance.find(g => g.scenario === 'Rapid prototyping and development');
      expect(prototypeGuidance).toBeDefined();
      expect(prototypeGuidance!.guidance).toContain('ease');
    });

    it('should generate scalability guidance', () => {
      const scalabilityConstraints: Constraint[] = [
        {
          id: 'scalability-constraint',
          name: 'Scalability',
          type: 'performance',
          isHardRequirement: false,
          weight: 0.8,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'scalability',
            operator: 'greaterThan',
            targetValue: 70
          },
          description: 'Scalability score',
          confidenceLevel: 0.9
        }
      ];

      const scores = [[0.3], [0.9], [0.6]];
      const guidance = generator.generateScenarioGuidance(mockOptions, scalabilityConstraints, scores);

      const scalabilityGuidance = guidance.find(g => g.scenario === 'High-growth and scalability requirements');
      expect(scalabilityGuidance).toBeDefined();
      expect(scalabilityGuidance!.guidance).toContain('scalability');
      expect(scalabilityGuidance!.applicableOptions).toContain('2'); // Premium option has highest scalability
    });

    it('should handle multiple applicable scenarios', () => {
      const mixedConstraints: Constraint[] = [
        {
          id: 'price-constraint',
          name: 'Price',
          type: 'budget',
          isHardRequirement: false,
          weight: 0.6, // Increased to trigger budget scenario
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
          id: 'reliability-constraint',
          name: 'Reliability',
          type: 'compatibility',
          isHardRequirement: true,
          weight: 0.4, // Reduced but still has hard requirement
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'reliability',
            operator: 'greaterThan',
            targetValue: 75
          },
          description: 'Reliability score',
          confidenceLevel: 0.9
        }
      ];

      const scores = [[0.8, 0.4], [0.2, 0.9], [0.5, 0.8]];
      const guidance = generator.generateScenarioGuidance(mockOptions, mixedConstraints, scores);

      // Should generate multiple scenarios
      expect(guidance.length).toBeGreaterThan(1);
      
      // Should include both budget and reliability scenarios
      const scenarios = guidance.map(g => g.scenario);
      expect(scenarios).toContain('Budget-constrained projects');
      expect(scenarios).toContain('Mission-critical systems');
    });

    it('should handle empty constraints gracefully', () => {
      const guidance = generator.generateScenarioGuidance(mockOptions, [], []);
      
      // Should still generate some guidance (like balanced approach)
      expect(guidance).toBeDefined();
      expect(Array.isArray(guidance)).toBe(true);
    });

    it('should provide meaningful trade-off explanations', () => {
      const constraints: Constraint[] = [
        {
          id: 'performance-constraint',
          name: 'Performance',
          type: 'performance',
          isHardRequirement: false,
          weight: 0.8,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'performance',
            operator: 'greaterThan',
            targetValue: 70
          },
          description: 'Performance score',
          confidenceLevel: 0.9
        }
      ];

      const scores = [[0], [1], [0.5]];
      const guidance = generator.generateScenarioGuidance(mockOptions, constraints, scores);

      for (const scenario of guidance) {
        expect(scenario.guidance).toBeTruthy();
        expect(scenario.guidance.length).toBeGreaterThan(20);
        expect(scenario.tradeoffExplanation).toBeTruthy();
        expect(scenario.tradeoffExplanation.length).toBeGreaterThan(20);
        expect(scenario.confidenceLevel).toBeGreaterThan(0);
        expect(scenario.confidenceLevel).toBeLessThanOrEqual(1);
        expect(Array.isArray(scenario.applicableOptions)).toBe(true);
      }
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customGenerator = new ScenarioGuidanceGenerator({
        significantDifferenceThreshold: 0.25,
        uniqueFeatureVarianceThreshold: 0.3
      });

      const config = customGenerator.getConfig();
      expect(config.significantDifferenceThreshold).toBe(0.25);
      expect(config.uniqueFeatureVarianceThreshold).toBe(0.3);
    });

    it('should update configuration', () => {
      generator.updateConfig({
        dealBreakerConfidenceThreshold: 0.95
      });

      const config = generator.getConfig();
      expect(config.dealBreakerConfidenceThreshold).toBe(0.95);
    });
  });
});