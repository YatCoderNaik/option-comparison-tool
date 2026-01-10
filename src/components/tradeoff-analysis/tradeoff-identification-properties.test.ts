import * as fc from 'fast-check';
import { TradeoffAnalyzer } from './tradeoff-analyzer';
import { Option, Constraint, TradeoffAnalysis } from '../../types/core';
import { arbitraryOption, arbitraryConstraint } from '../../utils/generators';

describe('Property 9: Trade-off Identification', () => {
  let analyzer: TradeoffAnalyzer;

  beforeEach(() => {
    analyzer = new TradeoffAnalyzer();
  });

  /**
   * Property 9: Trade-off Identification
   * Validates: Requirements 3.4
   * 
   * For any set of options with different attribute values, the system should identify 
   * and highlight meaningful trade-offs between aspects (e.g., cost vs performance, ease vs flexibility)
   */
  describe('Feature: option-comparison-tool, Property 9: Trade-off Identification', () => {
    it('should identify trade-offs when options have different attribute values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }), // Number of options
          fc.integer({ min: 2, max: 5 }), // Number of constraints
          (optionCount: number, constraintCount: number) => {
            // Generate options with deliberately different attribute values to ensure trade-offs exist
            const options = fc.sample(arbitraryOption(), optionCount);
            const constraints = fc.sample(arbitraryConstraint(), constraintCount);
            
            // Ensure options have overlapping attributes for meaningful comparison
            const commonAttributes = ['cost', 'performance', 'ease_of_use', 'flexibility'];
            options.forEach((option, index) => {
              commonAttributes.forEach((attr, attrIndex) => {
                // Create different values to ensure trade-offs exist
                const baseValue = 100 + (index * 50) + (attrIndex * 25);
                option.attributes[attr] = {
                  value: baseValue,
                  confidence: 0.8
                };
              });
            });

            // Update constraints to reference the common attributes
            constraints.forEach((constraint, index) => {
              const attrIndex = index % commonAttributes.length;
              constraint.evaluationRule.attributePath = commonAttributes[attrIndex];
              constraint.criterionType = attrIndex % 2 === 0 ? 'benefit' : 'cost';
            });

            // Generate mock scores (normalized between 0 and 1)
            const scores = options.map((_, optionIndex) => 
              constraints.map((_, constraintIndex) => 
                0.2 + (optionIndex * 0.2) + (constraintIndex * 0.1) % 0.8
              )
            );

            // Property: When options have different attribute values, trade-offs should be identified
            const analysis = analyzer.analyzeTradeoffs(options, constraints, scores);
            
            // Verify the analysis structure is complete
            expect(analysis).toBeDefined();
            expect(analysis.optionAnalyses).toBeDefined();
            expect(analysis.scenarioGuidance).toBeDefined();
            
            // Property: Each option should have analysis points when differences exist
            Object.keys(analysis.optionAnalyses).forEach(optionId => {
              const optionAnalysis = analysis.optionAnalyses[optionId];
              expect(optionAnalysis).toBeDefined();
              expect(optionAnalysis.strengths).toBeDefined();
              expect(optionAnalysis.weaknesses).toBeDefined();
              expect(optionAnalysis.uniqueFeatures).toBeDefined();
              expect(optionAnalysis.dealBreakers).toBeDefined();
              
              // Property: Analysis points should have required structure
              [...optionAnalysis.strengths, ...optionAnalysis.weaknesses, 
               ...optionAnalysis.uniqueFeatures, ...optionAnalysis.dealBreakers].forEach(point => {
                expect(point.description).toBeDefined();
                expect(typeof point.description).toBe('string');
                expect(point.attributeSource).toBeDefined();
                expect(typeof point.confidenceLevel).toBe('number');
                expect(point.confidenceLevel).toBeGreaterThanOrEqual(0);
                expect(point.confidenceLevel).toBeLessThanOrEqual(1);
                expect(point.reasoning).toBeDefined();
                expect(point.ruleApplied).toBeDefined();
              });
            });

            // Property: When options have different values, at least some analysis points should exist
            const totalAnalysisPoints = Object.values(analysis.optionAnalyses).reduce((total, optionAnalysis) => {
              return total + optionAnalysis.strengths.length + optionAnalysis.weaknesses.length + 
                     optionAnalysis.uniqueFeatures.length + optionAnalysis.dealBreakers.length;
            }, 0);
            
            // With different attribute values, we should identify some trade-offs
            expect(totalAnalysisPoints).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should highlight trade-offs between different aspects', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(2, 3, 4), // Fixed small number of options for clearer trade-offs
          (optionCount: number) => {
            // Create options with explicit trade-offs: cost vs performance
            const options: Option[] = [];
            for (let i = 0; i < optionCount; i++) {
              const baseOption = fc.sample(arbitraryOption(), 1)[0];
              
              // Create clear trade-off pattern: higher cost = better performance
              const costValue = 100 + (i * 200); // Increasing cost
              const performanceValue = 50 + (i * 150); // Increasing performance
              const easeValue = 300 - (i * 100); // Decreasing ease (inverse relationship)
              
              baseOption.attributes = {
                'monthly_cost': { value: costValue, confidence: 0.9 },
                'performance_score': { value: performanceValue, confidence: 0.9 },
                'ease_of_use': { value: easeValue, confidence: 0.9 }
              };
              
              options.push(baseOption);
            }

            const constraints: Constraint[] = [
              {
                id: 'cost-constraint',
                name: 'Monthly Cost',
                type: 'budget',
                isHardRequirement: false,
                weight: 0.4,
                criterionType: 'cost', // Lower is better
                evaluationRule: {
                  attributePath: 'monthly_cost',
                  operator: 'lessThan',
                  targetValue: 500
                },
                description: 'Monthly cost constraint',
                confidenceLevel: 0.9
              },
              {
                id: 'performance-constraint',
                name: 'Performance Score',
                type: 'performance',
                isHardRequirement: false,
                weight: 0.4,
                criterionType: 'benefit', // Higher is better
                evaluationRule: {
                  attributePath: 'performance_score',
                  operator: 'greaterThan',
                  targetValue: 100
                },
                description: 'Performance constraint',
                confidenceLevel: 0.9
              },
              {
                id: 'ease-constraint',
                name: 'Ease of Use',
                type: 'feature',
                isHardRequirement: false,
                weight: 0.2,
                criterionType: 'benefit', // Higher is better
                evaluationRule: {
                  attributePath: 'ease_of_use',
                  operator: 'greaterThan',
                  targetValue: 150
                },
                description: 'Ease of use constraint',
                confidenceLevel: 0.9
              }
            ];

            // Generate scores that reflect the trade-offs
            const scores = options.map((option, optionIndex) => {
              const costScore = (500 - (option.attributes['monthly_cost']?.value as number)) / 400; // Normalized cost (lower is better)
              const perfScore = ((option.attributes['performance_score']?.value as number) - 50) / 300; // Normalized performance
              const easeScore = ((option.attributes['ease_of_use']?.value as number) - 100) / 200; // Normalized ease
              
              return [
                Math.max(0, Math.min(1, costScore)),
                Math.max(0, Math.min(1, perfScore)),
                Math.max(0, Math.min(1, easeScore))
              ];
            });

            const analysis = analyzer.analyzeTradeoffs(options, constraints, scores);

            // Property: Trade-offs should be highlighted between different aspects
            let foundCostPerformanceTradeoff = false;
            let foundEasePerformanceTradeoff = false;

            Object.values(analysis.optionAnalyses).forEach(optionAnalysis => {
              // Check for cost-related analysis points
              const costRelatedPoints = [...optionAnalysis.strengths, ...optionAnalysis.weaknesses]
                .filter(point => point.attributeSource.includes('cost') || 
                               point.description.toLowerCase().includes('cost') ||
                               point.description.toLowerCase().includes('budget'));
              
              // Check for performance-related analysis points
              const performanceRelatedPoints = [...optionAnalysis.strengths, ...optionAnalysis.weaknesses]
                .filter(point => point.attributeSource.includes('performance') || 
                               point.description.toLowerCase().includes('performance'));
              
              // Check for ease-related analysis points
              const easeRelatedPoints = [...optionAnalysis.strengths, ...optionAnalysis.weaknesses]
                .filter(point => point.attributeSource.includes('ease') || 
                               point.description.toLowerCase().includes('ease'));

              if (costRelatedPoints.length > 0 && performanceRelatedPoints.length > 0) {
                foundCostPerformanceTradeoff = true;
              }
              
              if (easeRelatedPoints.length > 0 && performanceRelatedPoints.length > 0) {
                foundEasePerformanceTradeoff = true;
              }
            });

            // Property: With clear trade-off patterns, the system should identify trade-offs
            expect(foundCostPerformanceTradeoff || foundEasePerformanceTradeoff).toBe(true);

            // Property: Scenario guidance should provide trade-off explanations
            expect(analysis.scenarioGuidance.length).toBeGreaterThan(0);
            analysis.scenarioGuidance.forEach(guidance => {
              expect(guidance.tradeoffExplanation).toBeDefined();
              expect(guidance.tradeoffExplanation.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain consistency in trade-off identification across multiple runs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(3), // Fixed number for consistency testing
          (optionCount: number) => {
            // Create identical test data
            const options: Option[] = [];
            const constraints: Constraint[] = [];
            
            // Generate deterministic test data
            for (let i = 0; i < optionCount; i++) {
              const option = fc.sample(arbitraryOption(), 1)[0];
              option.id = `option-${i}`;
              option.name = `Option ${i}`;
              option.attributes = {
                'cost': { value: 100 + (i * 50), confidence: 0.8 },
                'quality': { value: 200 - (i * 30), confidence: 0.8 }
              };
              options.push(option);
            }

            for (let i = 0; i < 2; i++) {
              const constraint = fc.sample(arbitraryConstraint(), 1)[0];
              constraint.id = `constraint-${i}`;
              constraint.evaluationRule.attributePath = i === 0 ? 'cost' : 'quality';
              constraint.criterionType = i === 0 ? 'cost' : 'benefit';
              constraints.push(constraint);
            }

            const scores = [
              [0.8, 0.3], // Option 0: low cost, low quality
              [0.5, 0.6], // Option 1: medium cost, medium quality  
              [0.2, 0.9]  // Option 2: high cost, high quality
            ];

            // Property: Multiple runs with identical data should produce identical results
            const analysis1 = analyzer.analyzeTradeoffs(options, constraints, scores);
            const analysis2 = analyzer.analyzeTradeoffs(options, constraints, scores);
            const analysis3 = analyzer.analyzeTradeoffs(options, constraints, scores);

            // Compare key structural elements for consistency
            expect(Object.keys(analysis1.optionAnalyses).sort()).toEqual(Object.keys(analysis2.optionAnalyses).sort());
            expect(Object.keys(analysis2.optionAnalyses).sort()).toEqual(Object.keys(analysis3.optionAnalyses).sort());

            // Compare analysis point counts for consistency
            Object.keys(analysis1.optionAnalyses).forEach(optionId => {
              const analysis1Points = analysis1.optionAnalyses[optionId];
              const analysis2Points = analysis2.optionAnalyses[optionId];
              const analysis3Points = analysis3.optionAnalyses[optionId];

              expect(analysis1Points.strengths.length).toBe(analysis2Points.strengths.length);
              expect(analysis2Points.strengths.length).toBe(analysis3Points.strengths.length);
              
              expect(analysis1Points.weaknesses.length).toBe(analysis2Points.weaknesses.length);
              expect(analysis2Points.weaknesses.length).toBe(analysis3Points.weaknesses.length);
            });

            // Property: Scenario guidance count should be consistent
            expect(analysis1.scenarioGuidance.length).toBe(analysis2.scenarioGuidance.length);
            expect(analysis2.scenarioGuidance.length).toBe(analysis3.scenarioGuidance.length);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(2, 3), // Small number of options
          (optionCount: number) => {
            // Create edge case: options with identical attribute values (no trade-offs)
            const options: Option[] = [];
            for (let i = 0; i < optionCount; i++) {
              const option = fc.sample(arbitraryOption(), 1)[0];
              option.attributes = {
                'identical_attr': { value: 100, confidence: 0.8 } // Same value for all options
              };
              options.push(option);
            }

            const constraints: Constraint[] = [{
              id: 'test-constraint',
              name: 'Test Constraint',
              type: 'custom',
              isHardRequirement: false,
              weight: 1.0,
              criterionType: 'benefit',
              evaluationRule: {
                attributePath: 'identical_attr',
                operator: 'greaterThan',
                targetValue: 50
              },
              description: 'Test constraint',
              confidenceLevel: 0.8
            }];

            // All options have identical scores (no differentiation)
            const scores = options.map(() => [0.5]);

            // Property: System should handle identical values gracefully without errors
            expect(() => {
              const analysis = analyzer.analyzeTradeoffs(options, constraints, scores);
              
              // Should still produce valid structure even with no trade-offs
              expect(analysis).toBeDefined();
              expect(analysis.optionAnalyses).toBeDefined();
              expect(Object.keys(analysis.optionAnalyses)).toHaveLength(optionCount);
              
              // With identical values, fewer analysis points expected but structure should be valid
              Object.values(analysis.optionAnalyses).forEach(optionAnalysis => {
                expect(optionAnalysis.strengths).toBeDefined();
                expect(optionAnalysis.weaknesses).toBeDefined();
                expect(optionAnalysis.uniqueFeatures).toBeDefined();
                expect(optionAnalysis.dealBreakers).toBeDefined();
              });
              
            }).not.toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});