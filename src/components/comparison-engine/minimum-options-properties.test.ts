import * as fc from 'fast-check';
import { ComparisonEngine } from './comparison-engine';
import { Option, Constraint } from '../../types/core';
import { arbitraryOption, arbitraryConstraint } from '../../utils/generators';

describe('Property 3: Minimum Options Enforcement', () => {
  let engine: ComparisonEngine;

  beforeEach(() => {
    engine = new ComparisonEngine();
  });

  /**
   * Property 3: Minimum Options Enforcement
   * Validates: Requirements 1.3
   * 
   * For any comparison request, the system must ensure at least 2 options remain 
   * after applying hard constraints, or reject the comparison with a clear error message.
   */
  describe('Feature: option-comparison-tool, Property 3: Minimum Options Enforcement', () => {
    it('should enforce minimum 2 options after hard constraint filtering', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Number of options
          fc.integer({ min: 1, max: 5 }),  // Number of constraints
          fc.float({ min: 0, max: 1 }),    // Hard constraint probability
          async (optionCount: number, constraintCount: number, hardConstraintProb: number) => {
            // Generate options with varied attribute values
            const options = fc.sample(arbitraryOption(), optionCount);
            const constraints = fc.sample(arbitraryConstraint(), constraintCount);

            // Ensure options have consistent attributes for constraint evaluation
            const commonAttributes = ['cost', 'performance', 'quality', 'ease_of_use'];
            options.forEach((option, index) => {
              commonAttributes.forEach(attr => {
                option.attributes[attr] = {
                  value: 50 + (index * 20) + Math.random() * 30, // Varied values
                  confidence: 0.8
                };
              });
            });

            // Configure constraints with some being hard requirements
            constraints.forEach((constraint, index) => {
              const attrIndex = index % commonAttributes.length;
              constraint.evaluationRule.attributePath = commonAttributes[attrIndex];
              constraint.criterionType = attrIndex % 2 === 0 ? 'benefit' : 'cost';
              
              // Use simple operators to avoid validation issues
              constraint.evaluationRule.operator = index % 2 === 0 ? 'lessThan' : 'greaterThan';
              constraint.evaluationRule.targetValue = 75; // Simple numeric value
              
              // Make some constraints hard requirements based on probability
              constraint.isHardRequirement = Math.random() < hardConstraintProb;
              
              if (constraint.isHardRequirement) {
                constraint.weight = 0; // Hard constraints don't have weights
              } else {
                constraint.weight = 1.0 / Math.max(1, constraints.filter(c => !c.isHardRequirement).length);
              }
            });

            // Ensure at least one soft constraint exists for scoring
            const softConstraints = constraints.filter(c => !c.isHardRequirement);
            if (softConstraints.length === 0 && constraints.length > 0) {
              constraints[0].isHardRequirement = false;
              constraints[0].weight = 1.0;
            } else if (softConstraints.length > 0) {
              // Redistribute weights evenly among soft constraints
              softConstraints.forEach(constraint => {
                constraint.weight = 1.0 / softConstraints.length;
              });
            }

            // Property: System must either succeed with ≥2 options or fail with clear error
            try {
              const result = await engine.compareOptions(options, constraints);
              
              // If comparison succeeds, must have at least 2 included options
              expect(result.matrix.options.length).toBeGreaterThanOrEqual(2);
              
              // Verify the result structure is complete
              expect(result.matrix).toBeDefined();
              expect(result.tradeoffs).toBeDefined();
              expect(result.insights).toBeDefined();
              expect(result.confidence).toBeDefined();
              
              // Verify rankings exist for all included options
              expect(result.matrix.rankings.length).toBe(result.matrix.options.length);
              
              // Verify rankings are properly ordered
              for (let i = 1; i < result.matrix.rankings.length; i++) {
                expect(result.matrix.rankings[i-1].score).toBeGreaterThanOrEqual(
                  result.matrix.rankings[i].score
                );
                expect(result.matrix.rankings[i-1].rank).toBeLessThan(
                  result.matrix.rankings[i].rank
                );
              }
              
            } catch (error) {
              // If comparison fails, must be due to insufficient options
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toMatch(/Minimum 2 options required/i);
              
              // Error message should be informative
              const errorMessage = (error as Error).message;
              expect(errorMessage).toMatch(/hard constraints/i);
              expect(errorMessage).toMatch(/\d+ option\(s\) remain/);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle edge case with exactly 2 options after filtering', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(3, 4, 5), // Start with more than 2 options
          async (initialOptionCount: number) => {
            // Create options where exactly 2 will pass hard constraints
            const options: Option[] = [];
            
            for (let i = 0; i < initialOptionCount; i++) {
              const option = fc.sample(arbitraryOption(), 1)[0];
              option.id = `option-${i}`;
              option.name = `Option ${i}`;
              
              // First 2 options will pass, others will fail
              const costValue = i < 2 ? 50 + (i * 10) : 150 + (i * 20); // First 2 under 100, others over
              const qualityValue = 70 + (i * 5); // All have reasonable quality
              
              option.attributes = {
                'cost': { value: costValue, confidence: 0.9 },
                'quality': { value: qualityValue, confidence: 0.9 }
              };
              
              options.push(option);
            }

            // Create hard constraint that excludes all but first 2 options
            const constraints: Constraint[] = [
              {
                id: 'cost-limit',
                name: 'Cost Limit',
                type: 'budget',
                isHardRequirement: true,
                weight: 0,
                criterionType: 'cost',
                evaluationRule: {
                  attributePath: 'cost',
                  operator: 'lessThan',
                  targetValue: 100 // Only first 2 options will pass
                },
                description: 'Hard cost constraint',
                confidenceLevel: 0.9
              },
              {
                id: 'quality-score',
                name: 'Quality Score',
                type: 'performance',
                isHardRequirement: false,
                weight: 1.0,
                criterionType: 'benefit',
                evaluationRule: {
                  attributePath: 'quality',
                  operator: 'greaterThan',
                  targetValue: 50
                },
                description: 'Quality scoring constraint',
                confidenceLevel: 0.8
              }
            ];

            // Property: Should succeed with exactly 2 options
            const result = await engine.compareOptions(options, constraints);
            
            expect(result.matrix.options.length).toBe(2);
            expect(result.matrix.excludedOptions.length).toBe(initialOptionCount - 2);
            
            // Verify the 2 remaining options are the correct ones
            const remainingIds = result.matrix.options.map(o => o.id).sort();
            expect(remainingIds).toEqual(['option-0', 'option-1']);
            
            // Verify excluded options have proper violation explanations
            result.matrix.excludedOptions.forEach(excluded => {
              expect(excluded.violatedConstraints.length).toBeGreaterThan(0);
              expect(excluded.violatedConstraints[0].constraintId).toBe('cost-limit');
              expect(excluded.violatedConstraints[0].explanation).toMatch(/cost.*must be less than 100/i);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject comparison when only 1 option remains after filtering', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // Start with multiple options
          async (initialOptionCount: number) => {
            // Create options where only 1 will pass hard constraints
            const options: Option[] = [];
            
            for (let i = 0; i < initialOptionCount; i++) {
              const option = fc.sample(arbitraryOption(), 1)[0];
              option.id = `option-${i}`;
              option.name = `Option ${i}`;
              
              // Only first option will pass, others will fail
              const costValue = i === 0 ? 50 : 150 + (i * 20); // Only first under 100
              const performanceValue = 70 + (i * 5);
              
              option.attributes = {
                'cost': { value: costValue, confidence: 0.9 },
                'performance': { value: performanceValue, confidence: 0.9 }
              };
              
              options.push(option);
            }

            // Create hard constraint that excludes all but first option
            const constraints: Constraint[] = [
              {
                id: 'cost-limit',
                name: 'Cost Limit',
                type: 'budget',
                isHardRequirement: true,
                weight: 0,
                criterionType: 'cost',
                evaluationRule: {
                  attributePath: 'cost',
                  operator: 'lessThan',
                  targetValue: 100 // Only first option will pass
                },
                description: 'Hard cost constraint',
                confidenceLevel: 0.9
              },
              {
                id: 'performance-score',
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
                description: 'Performance scoring constraint',
                confidenceLevel: 0.8
              }
            ];

            // Property: Should throw error about insufficient options
            await expect(async () => {
              await engine.compareOptions(options, constraints);
            }).rejects.toThrow(/Minimum 2 options required for comparison/);
            
            // Verify error message contains helpful information
            try {
              await engine.compareOptions(options, constraints);
              fail('Expected error to be thrown');
            } catch (error) {
              const errorMessage = (error as Error).message;
              expect(errorMessage).toMatch(/only 1 option\(s\) remain/);
              expect(errorMessage).toMatch(/hard constraints/);
              expect(errorMessage).toMatch(/relaxing.*constraints.*adding.*options/i);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject comparison when no options remain after filtering', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 4 }), // Start with some options
          async (initialOptionCount: number) => {
            // Create options that will all fail hard constraints
            const options: Option[] = [];
            
            for (let i = 0; i < initialOptionCount; i++) {
              const option = fc.sample(arbitraryOption(), 1)[0];
              option.id = `option-${i}`;
              option.name = `Option ${i}`;
              
              // All options will exceed the cost limit
              const costValue = 200 + (i * 50); // All well above 100
              const qualityValue = 60 + (i * 10);
              
              option.attributes = {
                'cost': { value: costValue, confidence: 0.9 },
                'quality': { value: qualityValue, confidence: 0.9 }
              };
              
              options.push(option);
            }

            // Create hard constraint that excludes all options
            const constraints: Constraint[] = [
              {
                id: 'cost-limit',
                name: 'Cost Limit',
                type: 'budget',
                isHardRequirement: true,
                weight: 0,
                criterionType: 'cost',
                evaluationRule: {
                  attributePath: 'cost',
                  operator: 'lessThan',
                  targetValue: 100 // No options will pass
                },
                description: 'Hard cost constraint',
                confidenceLevel: 0.9
              },
              {
                id: 'quality-score',
                name: 'Quality Score',
                type: 'performance',
                isHardRequirement: false,
                weight: 1.0,
                criterionType: 'benefit',
                evaluationRule: {
                  attributePath: 'quality',
                  operator: 'greaterThan',
                  targetValue: 50
                },
                description: 'Quality scoring constraint',
                confidenceLevel: 0.8
              }
            ];

            // Property: Should throw error about no remaining options
            await expect(async () => {
              await engine.compareOptions(options, constraints);
            }).rejects.toThrow(/Minimum 2 options required for comparison/);
            
            // Verify error message indicates 0 options remain
            try {
              await engine.compareOptions(options, constraints);
              fail('Expected error to be thrown');
            } catch (error) {
              const errorMessage = (error as Error).message;
              expect(errorMessage).toMatch(/0 option\(s\) remain/);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle mixed hard and soft constraints correctly', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 6 }), // Multiple options
          fc.integer({ min: 2, max: 4 }), // Multiple constraints
          async (optionCount: number, constraintCount: number) => {
            // Generate options with predictable attribute patterns
            const options = fc.sample(arbitraryOption(), optionCount);
            const constraints = fc.sample(arbitraryConstraint(), constraintCount);

            // Set up options with known attribute values
            options.forEach((option, index) => {
              option.attributes = {
                'budget': { value: 60 + (index * 15), confidence: 0.9 }, // 60, 75, 90, 105, 120, 135
                'score': { value: 50 + (index * 10), confidence: 0.9 },   // 50, 60, 70, 80, 90, 100
                'rating': { value: 3 + (index * 0.5), confidence: 0.8 }   // 3, 3.5, 4, 4.5, 5, 5.5
              };
            });

            // Configure constraints: mix of hard and soft
            constraints.forEach((constraint, index) => {
              const attributes = ['budget', 'score', 'rating'];
              constraint.evaluationRule.attributePath = attributes[index % attributes.length];
              
              // Make first constraint hard, others soft
              constraint.isHardRequirement = index === 0;
              
              if (constraint.isHardRequirement) {
                constraint.weight = 0;
                constraint.criterionType = 'cost';
                constraint.evaluationRule.operator = 'lessThan';
                constraint.evaluationRule.targetValue = 100; // Should allow first few options
              } else {
                constraint.weight = 1.0 / (constraints.length - 1); // Equal weights for soft constraints
                constraint.criterionType = index % 2 === 0 ? 'benefit' : 'cost';
                constraint.evaluationRule.operator = 'greaterThan';
                constraint.evaluationRule.targetValue = 40;
              }
            });

            // Property: Should succeed if ≥2 options pass hard constraints
            const expectedPassingOptions = options.filter(option => {
              const budgetValue = option.attributes['budget']?.value as number;
              return budgetValue < 100; // Based on our hard constraint
            });

            if (expectedPassingOptions.length >= 2) {
              // Should succeed
              const result = await engine.compareOptions(options, constraints);
              
              expect(result.matrix.options.length).toBeGreaterThanOrEqual(2);
              expect(result.matrix.options.length).toBe(expectedPassingOptions.length);
              
              // Verify excluded options are those that failed hard constraints
              const excludedCount = optionCount - expectedPassingOptions.length;
              expect(result.matrix.excludedOptions.length).toBe(excludedCount);
              
            } else {
              // Should fail with insufficient options
              await expect(async () => {
                await engine.compareOptions(options, constraints);
              }).rejects.toThrow(/Minimum 2 options required for comparison/);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain consistency across multiple runs with same data', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(3), // Fixed number for consistency testing
          async (optionCount: number) => {
            // Create deterministic test data
            const options: Option[] = [];
            const constraints: Constraint[] = [];
            
            for (let i = 0; i < optionCount; i++) {
              const option = fc.sample(arbitraryOption(), 1)[0];
              option.id = `option-${i}`;
              option.name = `Option ${i}`;
              option.attributes = {
                'cost': { value: 50 + (i * 30), confidence: 0.8 }, // 50, 80, 110
                'quality': { value: 70 + (i * 5), confidence: 0.8 }  // 70, 75, 80
              };
              options.push(option);
            }

            // Hard constraint that should allow first 2 options (cost < 100)
            constraints.push({
              id: 'cost-constraint',
              name: 'Cost Constraint',
              type: 'budget',
              isHardRequirement: true,
              weight: 0,
              criterionType: 'cost',
              evaluationRule: {
                attributePath: 'cost',
                operator: 'lessThan',
                targetValue: 100
              },
              description: 'Hard cost limit',
              confidenceLevel: 0.9
            });

            // Soft constraint for scoring
            constraints.push({
              id: 'quality-constraint',
              name: 'Quality Constraint',
              type: 'performance',
              isHardRequirement: false,
              weight: 1.0,
              criterionType: 'benefit',
              evaluationRule: {
                attributePath: 'quality',
                operator: 'greaterThan',
                targetValue: 60
              },
              description: 'Quality scoring',
              confidenceLevel: 0.8
            });

            // Property: Multiple runs should produce identical results
            const result1 = await engine.compareOptions(options, constraints);
            const result2 = await engine.compareOptions(options, constraints);
            const result3 = await engine.compareOptions(options, constraints);

            // Compare key structural elements
            expect(result1.matrix.options.length).toBe(result2.matrix.options.length);
            expect(result2.matrix.options.length).toBe(result3.matrix.options.length);
            
            expect(result1.matrix.excludedOptions.length).toBe(result2.matrix.excludedOptions.length);
            expect(result2.matrix.excludedOptions.length).toBe(result3.matrix.excludedOptions.length);

            // Compare rankings
            expect(result1.matrix.rankings.length).toBe(result2.matrix.rankings.length);
            expect(result2.matrix.rankings.length).toBe(result3.matrix.rankings.length);

            // Rankings should be identical
            result1.matrix.rankings.forEach((ranking, index) => {
              expect(ranking.optionId).toBe(result2.matrix.rankings[index].optionId);
              expect(ranking.optionId).toBe(result3.matrix.rankings[index].optionId);
              expect(ranking.rank).toBe(result2.matrix.rankings[index].rank);
              expect(ranking.rank).toBe(result3.matrix.rankings[index].rank);
            });
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});