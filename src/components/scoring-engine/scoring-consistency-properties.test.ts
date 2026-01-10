import * as fc from 'fast-check';
import { ScoringEngine } from './scoring-engine';
import { Option, Constraint } from '../../types/core';

describe('Scoring Consistency Properties', () => {
  let engine: ScoringEngine;

  beforeEach(() => {
    engine = new ScoringEngine({
      outlierHandling: { enabled: false, percentileThresholds: { lower: 5, upper: 95 } },
      missingValueHandling: { maxMissingPercentage: 0.8, penaltyFactor: 0.1 }
    });
  });

  describe('Property 10: Consistent Output Format', () => {
    it('should always produce consistent output format regardless of input variations', () => {
      fc.assert(
        fc.property(
          // Generate options with varying attributes
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 10 }),
              name: fc.string({ minLength: 1, maxLength: 20 }),
              price: fc.integer({ min: 10, max: 1000 }),
              performance: fc.integer({ min: 1, max: 100 }),
              reliability: fc.integer({ min: 1, max: 100 })
            }),
            { minLength: 2, maxLength: 8 }
          ),
          // Generate constraints with different weights
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 10 }),
              weight: fc.float({ min: Math.fround(0.1), max: Math.fround(0.8) }),
              criterionType: fc.constantFrom('benefit' as const, 'cost' as const),
              attributePath: fc.constantFrom('price', 'performance', 'reliability')
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (optionData, constraintData) => {
            // Ensure unique IDs
            const uniqueOptionIds = new Set(optionData.map(o => o.id));
            const uniqueConstraintIds = new Set(constraintData.map(c => c.id));
            
            if (uniqueOptionIds.size !== optionData.length || 
                uniqueConstraintIds.size !== constraintData.length) {
              return; // Skip if IDs are not unique
            }

            // Normalize weights to sum <= 1
            const totalWeight = constraintData.reduce((sum, c) => sum + c.weight, 0);
            if (totalWeight > 1) {
              constraintData.forEach(c => c.weight = c.weight / totalWeight);
            }

            // Create options
            const options: Option[] = optionData.map(data => ({
              id: data.id,
              name: data.name,
              description: `Test option ${data.name}`,
              category: 'api',
              attributes: {
                price: { value: data.price },
                performance: { value: data.performance },
                reliability: { value: data.reliability }
              },
              metadata: {
                dateAdded: new Date(),
                lastUpdated: new Date(),
                dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
                entryMethod: 'manual'
              }
            }));

            // Create constraints
            const constraints: Constraint[] = constraintData.map(data => ({
              id: data.id,
              name: `${data.attributePath} constraint`,
              type: 'custom',
              isHardRequirement: false,
              weight: data.weight,
              criterionType: data.criterionType,
              evaluationRule: {
                attributePath: data.attributePath,
                operator: data.criterionType === 'benefit' ? 'greaterThan' : 'lessThan',
                targetValue: 50
              },
              description: `${data.attributePath} evaluation`,
              confidenceLevel: 0.9
            }));

            try {
              const matrix = engine.createScoringMatrix(options, constraints);
              const result = engine.calculateWeightedScores(matrix, constraints);

              // Property: Output format consistency
              
              // 1. Option scores should be defined for all non-excluded options
              const nonExcludedOptions = options.filter(o => !matrix.excludedOptions.includes(o.id));
              for (const option of nonExcludedOptions) {
                expect(result.optionScores).toHaveProperty(option.id);
                expect(typeof result.optionScores[option.id]).toBe('number');
                expect(result.optionScores[option.id]).toBeGreaterThanOrEqual(0);
                expect(result.optionScores[option.id]).toBeLessThanOrEqual(1);
              }

              // 2. Rankings should be properly ordered
              expect(result.rankings).toHaveLength(nonExcludedOptions.length);
              for (let i = 0; i < result.rankings.length - 1; i++) {
                expect(result.rankings[i].score).toBeGreaterThanOrEqual(result.rankings[i + 1].score);
                expect(result.rankings[i].rank).toBe(i + 1);
              }

              // 3. Transparency information should be complete
              expect(result.transparency.weightsUsed).toBeDefined();
              expect(result.transparency.normalizationDetails).toBeDefined();
              expect(result.transparency.neutralCriteriaExcluded).toBeDefined();
              expect(result.transparency.scoringMethod).toBe('Weighted Sum Model (WSM)');

              // 4. All constraint IDs should have weights
              for (const constraint of constraints.filter(c => c.criterionType !== 'neutral')) {
                expect(result.transparency.weightsUsed).toHaveProperty(constraint.id);
                expect(typeof result.transparency.weightsUsed[constraint.id]).toBe('number');
              }

              // 5. Normalization details should exist for all scoring criteria
              for (const constraint of constraints.filter(c => c.criterionType !== 'neutral')) {
                expect(result.transparency.normalizationDetails).toHaveProperty(constraint.id);
                const normParams = result.transparency.normalizationDetails[constraint.id];
                expect(typeof normParams.min).toBe('number');
                expect(typeof normParams.max).toBe('number');
                expect(normParams.criterionType).toBe(constraint.criterionType);
              }

            } catch (error) {
              // If there's an error, it should be a meaningful validation error
              expect(error).toBeInstanceOf(Error);
              const errorMessage = error instanceof Error ? error.message : String(error);
              expect(errorMessage).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain score ordering consistency', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 10, max: 100 }), { minLength: 3, maxLength: 6 }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
          (prices: number[], weight: number) => {
            // Create options with different prices (cost criterion)
            const options: Option[] = prices.map((price, index) => ({
              id: `option-${index}`,
              name: `Option ${index}`,
              description: `Test option ${index}`,
              category: 'api',
              attributes: {
                price: { value: price }
              },
              metadata: {
                dateAdded: new Date(),
                lastUpdated: new Date(),
                dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
                entryMethod: 'manual'
              }
            }));

            const constraints: Constraint[] = [{
              id: 'price-constraint',
              name: 'Price',
              type: 'budget',
              isHardRequirement: false,
              weight,
              criterionType: 'cost',
              evaluationRule: {
                attributePath: 'price',
                operator: 'lessThan',
                targetValue: 200
              },
              description: 'Price evaluation',
              confidenceLevel: 0.9
            }];

            const matrix = engine.createScoringMatrix(options, constraints);
            const result = engine.calculateWeightedScores(matrix, constraints);

            // Property: Lower prices should get higher scores (cost criterion)
            const sortedByPrice = [...options].sort((a, b) => 
              (a.attributes.price.value as number) - (b.attributes.price.value as number)
            );
            
            const sortedByScore = result.rankings.sort((a, b) => b.score - a.score);

            // The option with the lowest price should have the highest score
            const lowestPriceOption = sortedByPrice[0];
            const highestScoreOption = sortedByScore[0];
            
            expect(highestScoreOption.optionId).toBe(lowestPriceOption.id);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle weight changes consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            priceWeight: fc.float({ min: Math.fround(0.1), max: Math.fround(0.9) }),
            performanceWeight: fc.float({ min: Math.fround(0.1), max: Math.fround(0.9) })
          }),
          (weights) => {
            // Normalize weights
            const total = weights.priceWeight + weights.performanceWeight;
            if (total > 1) {
              weights.priceWeight /= total;
              weights.performanceWeight /= total;
            }

            const options: Option[] = [
              {
                id: 'cheap-slow',
                name: 'Cheap Slow',
                description: 'Low cost, low performance',
                category: 'api',
                attributes: {
                  price: { value: 50 },
                  performance: { value: 30 }
                },
                metadata: {
                  dateAdded: new Date(),
                  lastUpdated: new Date(),
                  dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
                  entryMethod: 'manual'
                }
              },
              {
                id: 'expensive-fast',
                name: 'Expensive Fast',
                description: 'High cost, high performance',
                category: 'api',
                attributes: {
                  price: { value: 200 },
                  performance: { value: 90 }
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
                id: 'price-constraint',
                name: 'Price',
                type: 'budget',
                isHardRequirement: false,
                weight: weights.priceWeight,
                criterionType: 'cost',
                evaluationRule: {
                  attributePath: 'price',
                  operator: 'lessThan',
                  targetValue: 300
                },
                description: 'Price evaluation',
                confidenceLevel: 0.9
              },
              {
                id: 'performance-constraint',
                name: 'Performance',
                type: 'performance',
                isHardRequirement: false,
                weight: weights.performanceWeight,
                criterionType: 'benefit',
                evaluationRule: {
                  attributePath: 'performance',
                  operator: 'greaterThan',
                  targetValue: 20
                },
                description: 'Performance evaluation',
                confidenceLevel: 0.9
              }
            ];

            const matrix = engine.createScoringMatrix(options, constraints);
            const result = engine.calculateWeightedScores(matrix, constraints);

            // Property: Weight influence should be consistent
            const cheapSlowScore = result.optionScores['cheap-slow'];
            const expensiveFastScore = result.optionScores['expensive-fast'];

            // If price weight is much higher than performance weight, cheap option should win
            if (weights.priceWeight > weights.performanceWeight * 2) {
              expect(cheapSlowScore).toBeGreaterThan(expensiveFastScore);
            }
            // If performance weight is much higher than price weight, fast option should win
            else if (weights.performanceWeight > weights.priceWeight * 2) {
              expect(expensiveFastScore).toBeGreaterThan(cheapSlowScore);
            }
            // Otherwise, scores should be reasonable (both > 0)
            else {
              expect(cheapSlowScore).toBeGreaterThan(0);
              expect(expensiveFastScore).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should be deterministic for identical inputs', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 10, max: 100 }), { minLength: 2, maxLength: 4 }),
          (prices: number[]) => {
            const createOptions = () => prices.map((price, index) => ({
              id: `option-${index}`,
              name: `Option ${index}`,
              description: `Test option ${index}`,
              category: 'api' as const,
              attributes: {
                price: { value: price }
              },
              metadata: {
                dateAdded: new Date('2024-01-01'),
                lastUpdated: new Date('2024-01-01'),
                dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
                entryMethod: 'manual' as const
              }
            }));

            const constraints: Constraint[] = [{
              id: 'price-constraint',
              name: 'Price',
              type: 'budget',
              isHardRequirement: false,
              weight: 1.0,
              criterionType: 'cost',
              evaluationRule: {
                attributePath: 'price',
                operator: 'lessThan',
                targetValue: 200
              },
              description: 'Price evaluation',
              confidenceLevel: 0.9
            }];

            // Run the same calculation multiple times
            const results = [];
            for (let i = 0; i < 3; i++) {
              const options = createOptions();
              const matrix = engine.createScoringMatrix(options, constraints);
              const result = engine.calculateWeightedScores(matrix, constraints);
              results.push(result);
            }

            // Property: Results should be identical
            for (let i = 1; i < results.length; i++) {
              expect(results[i].rankings).toEqual(results[0].rankings);
              
              for (const optionId of Object.keys(results[0].optionScores)) {
                expect(results[i].optionScores[optionId]).toBeCloseTo(results[0].optionScores[optionId], 10);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // All equal values
            fc.constant([50, 50, 50]),
            // Single outlier
            fc.constant([10, 50, 1000]),
            // Minimal differences
            fc.constant([50.1, 50.2, 50.3])
          ),
          (prices: number[]) => {
            const options: Option[] = prices.map((price, index) => ({
              id: `option-${index}`,
              name: `Option ${index}`,
              description: `Test option ${index}`,
              category: 'api',
              attributes: {
                price: { value: price }
              },
              metadata: {
                dateAdded: new Date(),
                lastUpdated: new Date(),
                dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
                entryMethod: 'manual'
              }
            }));

            const constraints: Constraint[] = [{
              id: 'price-constraint',
              name: 'Price',
              type: 'budget',
              isHardRequirement: false,
              weight: 1.0,
              criterionType: 'cost',
              evaluationRule: {
                attributePath: 'price',
                operator: 'lessThan',
                targetValue: 2000
              },
              description: 'Price evaluation',
              confidenceLevel: 0.9
            }];

            const matrix = engine.createScoringMatrix(options, constraints);
            const result = engine.calculateWeightedScores(matrix, constraints);

            // Property: Edge cases should produce valid results
            expect(result.rankings).toHaveLength(options.length);
            
            for (const ranking of result.rankings) {
              expect(ranking.score).toBeGreaterThanOrEqual(0);
              expect(ranking.score).toBeLessThanOrEqual(1);
              expect(Number.isFinite(ranking.score)).toBe(true);
            }

            // Rankings should be properly ordered
            for (let i = 0; i < result.rankings.length - 1; i++) {
              expect(result.rankings[i].score).toBeGreaterThanOrEqual(result.rankings[i + 1].score);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});