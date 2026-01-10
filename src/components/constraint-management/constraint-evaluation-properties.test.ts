import * as fc from 'fast-check';
import { ConstraintValidator } from './constraint-validator';
import { ConstraintFactory } from './constraint-factory';
import {
  Constraint,
  AttributeValue,
  EvaluationOperator,
  Option
} from '../../types/core';
import { arbitraryOption } from '../../utils/generators';

describe('Constraint Evaluation Properties', () => {
  let validator: ConstraintValidator;
  let factory: ConstraintFactory;

  beforeEach(() => {
    validator = new ConstraintValidator();
    factory = new ConstraintFactory();
  });

  describe('Property 8: Constraint Evaluation Accuracy', () => {
    it('should evaluate lessThan constraints correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          (threshold, value) => {
            const constraint = factory.createConstraint({
              name: 'Test LessThan',
              type: 'budget',
              criterionType: 'cost',
              isHardRequirement: true,
              weight: 0.3,
              evaluationRule: {
                attributePath: 'test.value',
                operator: 'lessThan',
                targetValue: threshold
              },
              description: 'Test constraint'
            });

            const attributeValue: AttributeValue = { value };
            const result = validator.evaluateConstraint(constraint, attributeValue);
            
            // Property: lessThan evaluation should match mathematical comparison
            expect(result).toBe(value < threshold);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should evaluate greaterThan constraints correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          (threshold, value) => {
            const constraint = factory.createConstraint({
              name: 'Test GreaterThan',
              type: 'performance',
              criterionType: 'benefit',
              isHardRequirement: false,
              weight: 0.25,
              evaluationRule: {
                attributePath: 'test.value',
                operator: 'greaterThan',
                targetValue: threshold
              },
              description: 'Test constraint'
            });

            const attributeValue: AttributeValue = { value };
            const result = validator.evaluateConstraint(constraint, attributeValue);
            
            // Property: greaterThan evaluation should match mathematical comparison
            expect(result).toBe(value > threshold);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should evaluate equals constraints correctly', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -1000, max: 1000 }),
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          fc.oneof(
            fc.integer({ min: -1000, max: 1000 }),
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          (targetValue, actualValue) => {
            const constraint = factory.createConstraint({
              name: 'Test Equals',
              type: 'feature',
              criterionType: 'neutral',
              isHardRequirement: true,
              weight: 0,
              evaluationRule: {
                attributePath: 'test.value',
                operator: 'equals',
                targetValue
              },
              description: 'Test constraint'
            });

            const attributeValue: AttributeValue = { value: actualValue };
            const result = validator.evaluateConstraint(constraint, attributeValue);
            
            // Property: equals evaluation should match strict equality
            expect(result).toBe(actualValue === targetValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should evaluate contains constraints correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          (searchTerm, fullText) => {
            // Ensure we have both positive and negative cases
            const textWithTerm = fullText + ' ' + searchTerm + ' more text';
            
            const constraint = factory.createConstraint({
              name: 'Test Contains',
              type: 'feature',
              criterionType: 'benefit',
              isHardRequirement: false,
              weight: 0.2,
              evaluationRule: {
                attributePath: 'test.value',
                operator: 'contains',
                targetValue: searchTerm
              },
              description: 'Test constraint'
            });

            // Test positive case
            const positiveValue: AttributeValue = { value: textWithTerm };
            const positiveResult = validator.evaluateConstraint(constraint, positiveValue);
            expect(positiveResult).toBe(true);

            // Test negative case (if fullText doesn't contain searchTerm)
            if (!fullText.toLowerCase().includes(searchTerm.toLowerCase())) {
              const negativeValue: AttributeValue = { value: fullText };
              const negativeResult = validator.evaluateConstraint(constraint, negativeValue);
              expect(negativeResult).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should evaluate range constraints correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 500 }),
          fc.integer({ min: 501, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          (min, max, value) => {
            fc.pre(min < max); // Precondition: valid range

            const constraint = factory.createConstraint({
              name: 'Test Range',
              type: 'performance',
              criterionType: 'benefit',
              isHardRequirement: false,
              weight: 0.3,
              evaluationRule: {
                attributePath: 'test.value',
                operator: 'range',
                targetValue: [min, max] as [number, number]
              },
              description: 'Test constraint'
            });

            const attributeValue: AttributeValue = { value };
            const result = validator.evaluateConstraint(constraint, attributeValue);
            
            // Property: range evaluation should match mathematical range check
            expect(result).toBe(value >= min && value <= max);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle missing attribute values consistently', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<EvaluationOperator>('lessThan', 'greaterThan', 'equals', 'contains', 'range'),
          (operator: EvaluationOperator) => {
            let targetValue: any;
            
            // Generate appropriate target value for each operator
            switch (operator) {
              case 'lessThan':
              case 'greaterThan':
                targetValue = fc.sample(fc.integer({ min: 1, max: 1000 }), 1)[0];
                break;
              case 'equals':
                targetValue = fc.sample(fc.oneof(
                  fc.integer({ min: 1, max: 1000 }),
                  fc.string({ minLength: 1, maxLength: 50 })
                ), 1)[0];
                break;
              case 'contains':
                targetValue = fc.sample(fc.string({ minLength: 1, maxLength: 50 }), 1)[0];
                break;
              case 'range':
                const min = fc.sample(fc.integer({ min: 1, max: 500 }), 1)[0];
                const max = fc.sample(fc.integer({ min: 501, max: 1000 }), 1)[0];
                targetValue = [min, max];
                break;
            }

            const constraint = factory.createConstraint({
              name: 'Test Missing Value',
              type: 'custom',
              criterionType: 'benefit',
              isHardRequirement: false,
              weight: 0.2,
              evaluationRule: {
                attributePath: 'test.value',
                operator,
                targetValue
              },
              description: 'Test constraint'
            });

            // Property: missing attribute values should always fail constraint evaluation
            const result = validator.evaluateConstraint(constraint, undefined);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle type mismatches gracefully', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (numericTarget, stringValue) => {
            const constraint = factory.createConstraint({
              name: 'Test Type Mismatch',
              type: 'budget',
              criterionType: 'cost',
              isHardRequirement: false,
              weight: 0.3,
              evaluationRule: {
                attributePath: 'test.value',
                operator: 'lessThan', // Expects number
                targetValue: numericTarget
              },
              description: 'Test constraint'
            });

            const attributeValue: AttributeValue = { value: stringValue }; // Provide string
            const result = validator.evaluateConstraint(constraint, attributeValue);
            
            // Property: type mismatches should fail gracefully (return false)
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be deterministic for identical inputs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<EvaluationOperator>('lessThan', 'greaterThan', 'equals', 'contains'),
          (operator: EvaluationOperator) => {
            let targetValue: any;
            let actualValue: any;
            
            // Generate appropriate values for each operator
            switch (operator) {
              case 'lessThan':
              case 'greaterThan':
                targetValue = fc.sample(fc.integer({ min: 1, max: 1000 }), 1)[0];
                actualValue = fc.sample(fc.integer({ min: 1, max: 1000 }), 1)[0];
                break;
              case 'equals':
                const value = fc.sample(fc.oneof(
                  fc.integer({ min: 1, max: 1000 }),
                  fc.string({ minLength: 1, maxLength: 50 })
                ), 1)[0];
                targetValue = value;
                actualValue = value; // Same value for equals test
                break;
              case 'contains':
                targetValue = fc.sample(fc.string({ minLength: 1, maxLength: 20 }), 1)[0];
                actualValue = fc.sample(fc.string({ minLength: 10, maxLength: 100 }), 1)[0];
                break;
            }

            const constraint = factory.createConstraint({
              name: 'Test Deterministic',
              type: 'custom',
              criterionType: 'benefit',
              isHardRequirement: false,
              weight: 0.2,
              evaluationRule: {
                attributePath: 'test.value',
                operator,
                targetValue
              },
              description: 'Test constraint'
            });

            const attributeValue: AttributeValue = { value: actualValue };
            
            // Property: multiple evaluations with identical inputs should produce identical results
            const result1 = validator.evaluateConstraint(constraint, attributeValue);
            const result2 = validator.evaluateConstraint(constraint, attributeValue);
            const result3 = validator.evaluateConstraint(constraint, attributeValue);
            
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate constraint structure before evaluation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('budget', 'performance', 'compatibility', 'feature', 'custom'),
          fc.constantFrom('benefit', 'cost', 'neutral'),
          fc.float({ min: 0, max: 1 }),
          fc.float({ min: 0, max: 1 }),
          (name, type, criterionType, weight, confidence) => {
            const constraint = factory.createConstraint({
              name,
              type: type as any,
              criterionType: criterionType as any,
              isHardRequirement: fc.sample(fc.boolean(), 1)[0],
              weight,
              evaluationRule: {
                attributePath: 'test.value',
                operator: 'lessThan',
                targetValue: 100
              },
              description: 'Generated test constraint',
              confidenceLevel: confidence
            });

            // Property: factory should only create valid constraints
            const validation = validator.validate(constraint);
            expect(validation.isValid).toBe(true);
            
            // Property: valid constraints should be evaluable
            const attributeValue: AttributeValue = { value: 50 };
            expect(() => {
              validator.evaluateConstraint(constraint, attributeValue);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in numeric comparisons', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000 }),
          fc.float({ min: -1000, max: 1000 }),
          (threshold, value) => {
            const lessThanConstraint = factory.createConstraint({
              name: 'Test Edge Cases',
              type: 'budget',
              criterionType: 'cost',
              isHardRequirement: false,
              weight: 0.3,
              evaluationRule: {
                attributePath: 'test.value',
                operator: 'lessThan',
                targetValue: threshold
              },
              description: 'Test constraint'
            });

            const attributeValue: AttributeValue = { value };
            const result = validator.evaluateConstraint(lessThanConstraint, attributeValue);
            
            // Property: floating point comparisons should be consistent
            expect(result).toBe(value < threshold);
            
            // Property: boundary conditions should be handled correctly
            if (Math.abs(value - threshold) < Number.EPSILON) {
              // Values very close to threshold should have consistent behavior
              const nearValue: AttributeValue = { value: threshold - Number.EPSILON };
              const nearResult = validator.evaluateConstraint(lessThanConstraint, nearValue);
              expect(nearResult).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Integration with Option Attributes', () => {
    it('should evaluate constraints against real option structures', () => {
      fc.assert(
        fc.property(
          arbitraryOption(),
          fc.float({ min: 0, max: 1000 }),
          (option: Option, budgetLimit: number) => {
            // Create a budget constraint
            const budgetConstraint = factory.createBudgetConstraint(budgetLimit);
            
            // Property: constraint evaluation should work with real option data
            const pricingAttribute = validator.getAttributeValue(option.attributes, 'pricing.monthlyFee');
            
            if (pricingAttribute && typeof pricingAttribute.value === 'number') {
              const result = validator.evaluateConstraint(budgetConstraint, pricingAttribute);
              expect(result).toBe(pricingAttribute.value < budgetLimit);
            } else {
              // If no pricing attribute, constraint should fail
              const result = validator.evaluateConstraint(budgetConstraint, pricingAttribute);
              expect(result).toBe(false);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});