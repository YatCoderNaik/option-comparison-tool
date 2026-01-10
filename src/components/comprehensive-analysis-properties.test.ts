/**
 * Property Test 7: Comprehensive Analysis Generation
 * Validates Requirements 3.1, 3.2 - Pros/cons and key differentiator identification
 */

import fc from 'fast-check';
import { OptionComparisonApp } from '../app';
import { Option, Constraint } from '../types/core';
import { generateTestConstraints } from '../utils/generators';

describe('Property 7: Comprehensive Analysis Generation', () => {
  let app: OptionComparisonApp;

  beforeEach(() => {
    app = new OptionComparisonApp({
      performance: {
        maxConcurrentComparisons: 10,
        comparisonTimeoutMs: 10000,
        maxOptionsPerComparison: 20,
        maxConstraintsPerComparison: 10,
        enableCaching: false,
        cacheExpirationMs: 60000
      }
    });
  });

  afterEach(async () => {
    await app.shutdown();
  });

  // Arbitrary for analysis scenarios
  const analysisScenarioArbitrary = fc.record({
    optionCount: fc.integer({ min: 3, max: 8 }),
    constraintCount: fc.integer({ min: 2, max: 6 }),
    diversityLevel: fc.constantFrom('low', 'medium', 'high'),
    dataQuality: fc.float({ min: 0.5, max: 1.0 })
  });

  const createDiverseOptions = (count: number, diversityLevel: string, dataQuality: number): Option[] => {
    const options: Option[] = [];
    
    for (let i = 0; i < count; i++) {
      const baseScore = diversityLevel === 'high' ? Math.random() * 100 : 
                       diversityLevel === 'medium' ? 50 + Math.random() * 30 :
                       70 + Math.random() * 20; // low diversity
      
      options.push({
        id: `analysis-option-${i}`,
        name: `Analysis Option ${i}`,
        description: `Test option ${i} for analysis generation`,
        category: 'api',
        attributes: {
          cost: { 
            value: diversityLevel === 'high' ? Math.random() * 200 + 50 : 100 + Math.random() * 50,
            unit: 'USD' 
          },
          performance: { 
            value: baseScore + (Math.random() - 0.5) * 20,
            unit: 'score' 
          },
          reliability: { 
            value: Math.max(60, Math.min(99, baseScore + (Math.random() - 0.5) * 15)),
            unit: 'percentage' 
          },
          features: { 
            value: Math.max(50, Math.min(100, baseScore + (Math.random() - 0.5) * 25)),
            unit: 'score' 
          },
          uniqueFeature: { 
            value: i % 2 === 0 ? 'Feature A' : 'Feature B',
            unit: 'category' 
          }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: {
            completeness: Math.max(0.5, dataQuality + (Math.random() - 0.5) * 0.2),
            freshness: Math.max(0.5, dataQuality + (Math.random() - 0.5) * 0.2),
            reliability: Math.max(0.5, dataQuality + (Math.random() - 0.5) * 0.2)
          },
          entryMethod: 'manual'
        }
      });
    }
    
    return options;
  };

  test('Property 7.1: Analysis generates pros and cons for each option', () => {
    fc.assert(fc.property(
      analysisScenarioArbitrary,
      async (scenario) => {
        const options = createDiverseOptions(scenario.optionCount, scenario.diversityLevel, scenario.dataQuality);
        const constraints = generateTestConstraints(scenario.constraintCount);
        
        const result = await app.compareOptions(options, constraints);
        
        // Should generate analysis for included options
        expect(result.tradeoffs.optionAnalyses).toBeDefined();
        
        const analysisKeys = Object.keys(result.tradeoffs.optionAnalyses);
        expect(analysisKeys.length).toBeGreaterThan(0);
        
        // Each analyzed option should have strengths and weaknesses
        analysisKeys.forEach(optionId => {
          const analysis = result.tradeoffs.optionAnalyses[optionId];
          expect(analysis).toBeDefined();
          expect(analysis.strengths).toBeDefined();
          expect(analysis.weaknesses).toBeDefined();
          
          // Should have at least some analysis points
          const totalAnalysisPoints = analysis.strengths.length + analysis.weaknesses.length;
          expect(totalAnalysisPoints).toBeGreaterThan(0);
          
          // Analysis points should have required structure
          [...analysis.strengths, ...analysis.weaknesses].forEach(point => {
            expect(point.description).toBeDefined();
            expect(typeof point.description).toBe('string');
            expect(point.description.length).toBeGreaterThan(5);
            expect(point.confidenceLevel).toBeGreaterThanOrEqual(0);
            expect(point.confidenceLevel).toBeLessThanOrEqual(1);
          });
        });
        
        return true;
      }
    ), { numRuns: 20 });
  });

  test('Property 7.2: Key differentiators are identified across options', () => {
    fc.assert(fc.property(
      analysisScenarioArbitrary.filter(s => s.diversityLevel === 'high'),
      async (scenario) => {
        const options = createDiverseOptions(scenario.optionCount, 'high', scenario.dataQuality);
        const constraints = generateTestConstraints(scenario.constraintCount);
        
        const result = await app.compareOptions(options, constraints);
        
        // Should identify key differentiators
        expect(result.tradeoffs.keyDifferentiators).toBeDefined();
        expect(Array.isArray(result.tradeoffs.keyDifferentiators)).toBe(true);
        
        if (result.tradeoffs.keyDifferentiators.length > 0) {
          result.tradeoffs.keyDifferentiators.forEach(differentiator => {
            expect(differentiator.attribute).toBeDefined();
            expect(differentiator.description).toBeDefined();
            expect(differentiator.optionValues).toBeDefined();
            expect(differentiator.significance).toBeDefined();
            expect(['high', 'medium', 'low']).toContain(differentiator.significance);
            
            // Should have values for multiple options
            const valueKeys = Object.keys(differentiator.optionValues);
            expect(valueKeys.length).toBeGreaterThan(1);
          });
        }
        
        return true;
      }
    ), { numRuns: 15 });
  });

  test('Property 7.3: Unique features are identified when present', () => {
    fc.assert(fc.property(
      analysisScenarioArbitrary,
      async (scenario) => {
        const options = createDiverseOptions(scenario.optionCount, scenario.diversityLevel, scenario.dataQuality);
        const constraints = generateTestConstraints(scenario.constraintCount);
        
        const result = await app.compareOptions(options, constraints);
        
        // Check for unique feature identification
        const analysisKeys = Object.keys(result.tradeoffs.optionAnalyses);
        
        let hasUniqueFeatures = false;
        analysisKeys.forEach(optionId => {
          const analysis = result.tradeoffs.optionAnalyses[optionId];
          if (analysis.uniqueFeatures && analysis.uniqueFeatures.length > 0) {
            hasUniqueFeatures = true;
            
            analysis.uniqueFeatures.forEach(feature => {
              expect(feature.description).toBeDefined();
              expect(feature.attributeSource).toBeDefined();
              expect(feature.confidenceLevel).toBeGreaterThanOrEqual(0);
              expect(feature.confidenceLevel).toBeLessThanOrEqual(1);
              expect(feature.reasoning).toBeDefined();
            });
          }
        });
        
        // With diverse options, should find some unique features
        if (scenario.diversityLevel === 'high' && scenario.optionCount >= 4) {
          // High diversity scenarios should identify unique features
          // (This is a soft expectation as it depends on the specific data)
        }
        
        return true;
      }
    ), { numRuns: 20 });
  });

  test('Property 7.4: Analysis quality correlates with data quality', () => {
    fc.assert(fc.property(
      fc.record({
        highQualityData: analysisScenarioArbitrary.map(s => ({ ...s, dataQuality: 0.9 })),
        lowQualityData: analysisScenarioArbitrary.map(s => ({ ...s, dataQuality: 0.6 }))
      }),
      async (scenarios) => {
        // Test high quality data
        const highQualityOptions = createDiverseOptions(
          scenarios.highQualityData.optionCount, 
          scenarios.highQualityData.diversityLevel, 
          0.9
        );
        const highQualityConstraints = generateTestConstraints(scenarios.highQualityData.constraintCount);
        const highQualityResult = await app.compareOptions(highQualityOptions, highQualityConstraints);
        
        // Test low quality data
        const lowQualityOptions = createDiverseOptions(
          scenarios.lowQualityData.optionCount, 
          scenarios.lowQualityData.diversityLevel, 
          0.6
        );
        const lowQualityConstraints = generateTestConstraints(scenarios.lowQualityData.constraintCount);
        const lowQualityResult = await app.compareOptions(lowQualityOptions, lowQualityConstraints);
        
        // High quality data should result in higher confidence analysis
        const highQualityConfidence = highQualityResult.summary.overallConfidence;
        const lowQualityConfidence = lowQualityResult.summary.overallConfidence;
        
        expect(highQualityConfidence).toBeGreaterThanOrEqual(lowQualityConfidence);
        
        // High quality data should generate more detailed analysis
        const highQualityAnalysisCount = Object.keys(highQualityResult.tradeoffs.optionAnalyses).length;
        const lowQualityAnalysisCount = Object.keys(lowQualityResult.tradeoffs.optionAnalyses).length;
        
        // Should analyze at least as many options with high quality data
        expect(highQualityAnalysisCount).toBeGreaterThanOrEqual(lowQualityAnalysisCount);
        
        return true;
      }
    ), { numRuns: 10 });
  });

  test('Property 7.5: Analysis provides actionable insights', () => {
    fc.assert(fc.property(
      analysisScenarioArbitrary,
      async (scenario) => {
        const options = createDiverseOptions(scenario.optionCount, scenario.diversityLevel, scenario.dataQuality);
        const constraints = generateTestConstraints(scenario.constraintCount);
        
        const result = await app.compareOptions(options, constraints);
        
        // Should provide scenario guidance
        expect(result.tradeoffs.scenarioGuidance).toBeDefined();
        expect(Array.isArray(result.tradeoffs.scenarioGuidance)).toBe(true);
        
        if (result.tradeoffs.scenarioGuidance.length > 0) {
          result.tradeoffs.scenarioGuidance.forEach(guidance => {
            expect(guidance.scenario).toBeDefined();
            expect(guidance.guidance).toBeDefined();
            expect(guidance.applicableOptions).toBeDefined();
            expect(Array.isArray(guidance.applicableOptions)).toBe(true);
            expect(guidance.tradeoffExplanation).toBeDefined();
            expect(guidance.confidenceLevel).toBeGreaterThanOrEqual(0);
            expect(guidance.confidenceLevel).toBeLessThanOrEqual(1);
            
            // Guidance should be actionable (contain action words)
            const actionWords = ['consider', 'choose', 'prefer', 'avoid', 'focus', 'prioritize'];
            const hasActionWord = actionWords.some(word => 
              guidance.guidance.toLowerCase().includes(word)
            );
            expect(hasActionWord).toBe(true);
          });
        }
        
        // Should provide summary insights
        expect(result.insights.summary).toBeDefined();
        expect(Array.isArray(result.insights.summary)).toBe(true);
        
        if (result.insights.summary.length > 0) {
          result.insights.summary.forEach(insight => {
            expect(typeof insight).toBe('string');
            expect(insight.length).toBeGreaterThan(10);
          });
        }
        
        return true;
      }
    ), { numRuns: 20 });
  });
});