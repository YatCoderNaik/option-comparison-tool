/**
 * Property Test 11: Insight Generation Completeness
 * Validates Requirements 4.3, 5.1 - Summary insights and scenario-based recommendations
 */

import fc from 'fast-check';
import { OptionComparisonApp } from '../app';
import { Option, Constraint } from '../types/core';
import { generateTestConstraints } from '../utils/generators';

describe('Property 11: Insight Generation Completeness', () => {
  let app: OptionComparisonApp;

  beforeEach(() => {
    app = new OptionComparisonApp({
      performance: {
        maxConcurrentComparisons: 10,
        comparisonTimeoutMs: 10000,
        maxOptionsPerComparison: 15,
        maxConstraintsPerComparison: 8,
        enableCaching: false,
        cacheExpirationMs: 60000
      }
    });
  });

  afterEach(async () => {
    await app.shutdown();
  });

  // Arbitrary for insight generation scenarios
  const insightScenarioArbitrary = fc.record({
    optionCount: fc.integer({ min: 3, max: 6 }),
    constraintCount: fc.integer({ min: 2, max: 5 }),
    scenarioType: fc.constantFrom('balanced', 'cost-focused', 'performance-focused', 'mixed'),
    dataComplexity: fc.constantFrom('simple', 'complex')
  });

  const createScenarioOptions = (count: number, scenarioType: string, complexity: string): Option[] => {
    const options: Option[] = [];
    
    for (let i = 0; i < count; i++) {
      let costValue: number, performanceValue: number, reliabilityValue: number;
      
      switch (scenarioType) {
        case 'cost-focused':
          costValue = 50 + Math.random() * 100; // Varied costs
          performanceValue = 70 + Math.random() * 20; // Similar performance
          reliabilityValue = 80 + Math.random() * 15; // Similar reliability
          break;
        case 'performance-focused':
          costValue = 100 + Math.random() * 50; // Similar costs
          performanceValue = 60 + Math.random() * 40; // Varied performance
          reliabilityValue = 75 + Math.random() * 20; // Similar reliability
          break;
        case 'mixed':
          costValue = Math.random() * 200 + 50;
          performanceValue = Math.random() * 50 + 50;
          reliabilityValue = Math.random() * 30 + 70;
          break;
        default: // balanced
          costValue = 80 + Math.random() * 40;
          performanceValue = 75 + Math.random() * 25;
          reliabilityValue = 80 + Math.random() * 15;
      }
      
      const attributes: Record<string, any> = {
        cost: { value: costValue, unit: 'USD' },
        performance: { value: performanceValue, unit: 'score' },
        reliability: { value: reliabilityValue, unit: 'percentage' }
      };
      
      // Add complexity if needed
      if (complexity === 'complex') {
        attributes.features = { value: Math.random() * 50 + 50, unit: 'score' };
        attributes.security = { value: Math.random() * 20 + 80, unit: 'score' };
        attributes.scalability = { value: Math.random() * 30 + 70, unit: 'score' };
        attributes.support = { value: Math.random() * 40 + 60, unit: 'score' };
      }
      
      options.push({
        id: `insight-option-${i}`,
        name: `Insight Option ${i}`,
        description: `Test option ${i} for insight generation`,
        category: 'api',
        attributes,
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: {
            completeness: 0.8 + Math.random() * 0.2,
            freshness: 0.7 + Math.random() * 0.3,
            reliability: 0.8 + Math.random() * 0.2
          },
          entryMethod: 'manual'
        }
      });
    }
    
    return options;
  };

  test('Property 11.1: Summary insights are generated for all comparisons', () => {
    fc.assert(fc.property(
      insightScenarioArbitrary,
      async (scenario) => {
        const options = createScenarioOptions(scenario.optionCount, scenario.scenarioType, scenario.dataComplexity);
        const constraints = generateTestConstraints(scenario.constraintCount);
        
        const result = await app.compareOptions(options, constraints);
        
        // Should always generate summary insights
        expect(result.insights.summary).toBeDefined();
        expect(Array.isArray(result.insights.summary)).toBe(true);
        expect(result.insights.summary.length).toBeGreaterThan(0);
        
        // Each insight should be meaningful
        result.insights.summary.forEach(insight => {
          expect(typeof insight).toBe('string');
          expect(insight.length).toBeGreaterThan(15); // Substantial content
          expect(insight.trim()).toBe(insight); // No leading/trailing whitespace
        });
        
        // Should provide data quality insights
        expect(result.insights.dataQuality).toBeDefined();
        expect(result.insights.dataQuality.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.insights.dataQuality.overallScore).toBeLessThanOrEqual(1);
        
        return true;
      }
    ), { numRuns: 25 });
  });

  test('Property 11.2: Scenario-based recommendations are contextual', () => {
    fc.assert(fc.property(
      insightScenarioArbitrary,
      async (scenario) => {
        const options = createScenarioOptions(scenario.optionCount, scenario.scenarioType, scenario.dataComplexity);
        const constraints = generateTestConstraints(scenario.constraintCount);
        
        const result = await app.compareOptions(options, constraints);
        
        // Should generate scenario guidance
        expect(result.tradeoffs.scenarioGuidance).toBeDefined();
        expect(Array.isArray(result.tradeoffs.scenarioGuidance)).toBe(true);
        
        if (result.tradeoffs.scenarioGuidance.length > 0) {
          result.tradeoffs.scenarioGuidance.forEach(guidance => {
            // Should have all required fields
            expect(guidance.scenario).toBeDefined();
            expect(guidance.guidance).toBeDefined();
            expect(guidance.applicableOptions).toBeDefined();
            expect(guidance.tradeoffExplanation).toBeDefined();
            expect(guidance.confidenceLevel).toBeDefined();
            
            // Scenario should be descriptive
            expect(guidance.scenario.length).toBeGreaterThan(10);
            
            // Guidance should be actionable
            expect(guidance.guidance.length).toBeGreaterThan(20);
            
            // Should reference actual options
            expect(Array.isArray(guidance.applicableOptions)).toBe(true);
            guidance.applicableOptions.forEach(optionId => {
              const optionExists = options.some(opt => opt.id === optionId);
              expect(optionExists).toBe(true);
            });
            
            // Should explain tradeoffs
            expect(guidance.tradeoffExplanation.length).toBeGreaterThan(15);
            
            // Confidence should be reasonable
            expect(guidance.confidenceLevel).toBeGreaterThanOrEqual(0);
            expect(guidance.confidenceLevel).toBeLessThanOrEqual(1);
          });
        }
        
        return true;
      }
    ), { numRuns: 20 });
  });

  test('Property 11.3: Insights reflect scenario characteristics', () => {
    fc.assert(fc.property(
      fc.constantFrom('cost-focused', 'performance-focused'),
      async (scenarioType) => {
        const options = createScenarioOptions(4, scenarioType, 'simple');
        const constraints = generateTestConstraints(3);
        
        const result = await app.compareOptions(options, constraints);
        
        // Insights should reflect the scenario focus
        const allInsightText = [
          ...result.insights.summary,
          ...result.tradeoffs.scenarioGuidance.map(g => g.guidance),
          ...result.tradeoffs.scenarioGuidance.map(g => g.tradeoffExplanation)
        ].join(' ').toLowerCase();
        
        if (scenarioType === 'cost-focused') {
          // Should mention cost-related terms
          const costTerms = ['cost', 'price', 'budget', 'expensive', 'affordable', 'cheap'];
          const hasCostFocus = costTerms.some(term => allInsightText.includes(term));
          expect(hasCostFocus).toBe(true);
        } else if (scenarioType === 'performance-focused') {
          // Should mention performance-related terms
          const performanceTerms = ['performance', 'speed', 'efficiency', 'fast', 'slow', 'optimize'];
          const hasPerformanceFocus = performanceTerms.some(term => allInsightText.includes(term));
          expect(hasPerformanceFocus).toBe(true);
        }
        
        return true;
      }
    ), { numRuns: 15 });
  });

  test('Property 11.4: Complex scenarios generate richer insights', () => {
    fc.assert(fc.property(
      fc.record({
        simpleScenario: insightScenarioArbitrary.map(s => ({ ...s, dataComplexity: 'simple' })),
        complexScenario: insightScenarioArbitrary.map(s => ({ ...s, dataComplexity: 'complex' }))
      }),
      async (scenarios) => {
        // Test simple scenario
        const simpleOptions = createScenarioOptions(
          scenarios.simpleScenario.optionCount,
          scenarios.simpleScenario.scenarioType,
          'simple'
        );
        const simpleConstraints = generateTestConstraints(scenarios.simpleScenario.constraintCount);
        const simpleResult = await app.compareOptions(simpleOptions, simpleConstraints);
        
        // Test complex scenario
        const complexOptions = createScenarioOptions(
          scenarios.complexScenario.optionCount,
          scenarios.complexScenario.scenarioType,
          'complex'
        );
        const complexConstraints = generateTestConstraints(scenarios.complexScenario.constraintCount);
        const complexResult = await app.compareOptions(complexOptions, complexConstraints);
        
        // Complex scenarios should generate more insights
        const simpleInsightCount = simpleResult.insights.summary.length;
        const complexInsightCount = complexResult.insights.summary.length;
        
        // Complex scenarios should have at least as many insights
        expect(complexInsightCount).toBeGreaterThanOrEqual(simpleInsightCount);
        
        // Complex scenarios should have more detailed analysis
        const simpleAnalysisKeys = Object.keys(simpleResult.tradeoffs.optionAnalyses);
        const complexAnalysisKeys = Object.keys(complexResult.tradeoffs.optionAnalyses);
        
        if (simpleAnalysisKeys.length > 0 && complexAnalysisKeys.length > 0) {
          const simpleAnalysisPoints = simpleAnalysisKeys.reduce((total, key) => {
            const analysis = simpleResult.tradeoffs.optionAnalyses[key];
            return total + analysis.strengths.length + analysis.weaknesses.length;
          }, 0);
          
          const complexAnalysisPoints = complexAnalysisKeys.reduce((total, key) => {
            const analysis = complexResult.tradeoffs.optionAnalyses[key];
            return total + analysis.strengths.length + analysis.weaknesses.length;
          }, 0);
          
          // Complex scenarios should generate more analysis points
          expect(complexAnalysisPoints).toBeGreaterThanOrEqual(simpleAnalysisPoints);
        }
        
        return true;
      }
    ), { numRuns: 10 });
  });

  test('Property 11.5: Insights maintain consistency across similar scenarios', () => {
    fc.assert(fc.property(
      insightScenarioArbitrary,
      async (scenario) => {
        const options1 = createScenarioOptions(scenario.optionCount, scenario.scenarioType, scenario.dataComplexity);
        const options2 = createScenarioOptions(scenario.optionCount, scenario.scenarioType, scenario.dataComplexity);
        const constraints = generateTestConstraints(scenario.constraintCount);
        
        const result1 = await app.compareOptions(options1, constraints);
        const result2 = await app.compareOptions(options2, constraints);
        
        // Similar scenarios should generate insights of similar quality
        const confidence1 = result1.summary.overallConfidence;
        const confidence2 = result2.summary.overallConfidence;
        
        // Confidence levels should be in similar ranges
        const confidenceDifference = Math.abs(confidence1 - confidence2);
        expect(confidenceDifference).toBeLessThan(0.5); // Allow reasonable variation
        
        // Should generate similar numbers of insights
        const insightCount1 = result1.insights.summary.length;
        const insightCount2 = result2.insights.summary.length;
        
        const insightCountDifference = Math.abs(insightCount1 - insightCount2);
        expect(insightCountDifference).toBeLessThanOrEqual(2); // Allow small variation
        
        // Both should have meaningful insights
        expect(insightCount1).toBeGreaterThan(0);
        expect(insightCount2).toBeGreaterThan(0);
        
        return true;
      }
    ), { numRuns: 15 });
  });
});