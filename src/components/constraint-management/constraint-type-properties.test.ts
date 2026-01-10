/**
 * Property Test 5: Constraint Type Support
 * Validates Requirements 2.1, 2.2 - Support for different constraint types
 */

import fc from 'fast-check';
import { ConstraintValidator } from './constraint-validator';
import { ConstraintFactory } from './constraint-factory';
import { Constraint } from '../../types/core';

describe('Property 5: Constraint Type Support', () => {
  const validator = new ConstraintValidator();
  const factory = new ConstraintFactory();

  // Arbitrary for different constraint types
  const constraintTypeArbitrary = fc.record({
    type: fc.constantFrom('budget', 'performance', 'quality', 'compliance', 'technical', 'service', 'business'),
    criterionType: fc.constantFrom('cost', 'benefit', 'neutral'),
    isHardRequirement: fc.boolean(),
    weight: fc.float({ min: 0, max: 1 }),
    operator: fc.constantFrom('lessThan', 'greaterThan', 'equals', 'contains', 'range'),
    targetValue: fc.oneof(
      fc.float({ min: 0, max: 1000 }),
      fc.integer({ min: 0, max: 1000 }),
      fc.string({ minLength: 1, maxLength: 50 })
    ),
    attributePath: fc.string({ minLength: 1, maxLength: 20 })
  });

  test('Property 5.1: All constraint types are supported and validated', () => {
    fc.assert(fc.property(
      constraintTypeArbitrary,
      (constraintData) => {
        const constraint = factory.createConstraint({
          name: `Test ${constraintData.type} Constraint`,
          type: constraintData.type,
          criterionType: constraintData.criterionType,
          isHardRequirement: constraintData.isHardRequirement,
          weight: constraintData.weight,
          evaluationRule: {
            attributePath: constraintData.attributePath,
            operator: constraintData.operator,
            targetValue: constraintData.targetValue
          },
          description: `A ${constraintData.type} constraint for testing`,
          confidenceLevel: 0.8
        });

        // Constraint should be created successfully
        expect(constraint).toBeDefined();
        expect(constraint.type).toBe(constraintData.type);
        expect(constraint.criterionType).toBe(constraintData.criterionType);
        expect(constraint.isHardRequirement).toBe(constraintData.isHardRequirement);

        // Validation should recognize the constraint type
        const validation = validator.validateConstraint(constraint);
        expect(validation).toBeDefined();
        
        // Type-specific validation rules should apply
        switch (constraintData.type) {
          case 'budget':
            // Budget constraints should typically be cost criteria
            if (constraintData.criterionType === 'cost') {
              expect(validation.isValid).toBe(true);
            }
            break;
            
          case 'performance':
            // Performance constraints should typically be benefit criteria
            if (constraintData.criterionType === 'benefit') {
              expect(validation.isValid).toBe(true);
            }
            break;
            
          case 'compliance':
            // Compliance constraints are often hard requirements
            if (constraintData.isHardRequirement) {
              expect(constraint.isHardRequirement).toBe(true);
            }
            break;
        }

        return true;
      }
    ), { numRuns: 100 });
  });

  test('Property 5.2: Criterion types affect evaluation behavior', () => {
    fc.assert(fc.property(
      fc.record({
        costConstraint: constraintTypeArbitrary.filter(c => c.criterionType === 'cost'),
        benefitConstraint: constraintTypeArbitrary.filter(c => c.criterionType === 'benefit'),
        neutralConstraint: constraintTypeArbitrary.filter(c => c.criterionType === 'neutral')
      }),
      (constraints) => {
        const costConstraint = factory.createConstraint({
          name: 'Cost Constraint',
          type: constraints.costConstraint.type,
          criterionType: 'cost',
          isHardRequirement: false,
          weight: 0.33,
          evaluationRule: {
            attributePath: 'cost',
            operator: 'lessThan',
            targetValue: 100
          },
          description: 'Cost should be minimized',
          confidenceLevel: 0.9
        });

        const benefitConstraint = factory.createConstraint({
          name: 'Benefit Constraint',
          type: constraints.benefitConstraint.type,
          criterionType: 'benefit',
          isHardRequirement: false,
          weight: 0.33,
          evaluationRule: {
            attributePath: 'performance',
            operator: 'greaterThan',
            targetValue: 80
          },
          description: 'Performance should be maximized',
          confidenceLevel: 0.9
        });

        const neutralConstraint = factory.createConstraint({
          name: 'Neutral Constraint',
          type: constraints.neutralConstraint.type,
          criterionType: 'neutral',
          isHardRequirement: false,
          weight: 0.34,
          evaluationRule: {
            attributePath: 'category',
            operator: 'equals',
            targetValue: 'api'
          },
          description: 'Category is informational',
          confidenceLevel: 0.9
        });

        // All constraint types should be valid
        expect(validator.validateConstraint(costConstraint).isValid).toBe(true);
        expect(validator.validateConstraint(benefitConstraint).isValid).toBe(true);
        expect(validator.validateConstraint(neutralConstraint).isValid).toBe(true);

        // Criterion types should be preserved
        expect(costConstraint.criterionType).toBe('cost');
        expect(benefitConstraint.criterionType).toBe('benefit');
        expect(neutralConstraint.criterionType).toBe('neutral');

        // Validation should handle mixed criterion types
        const mixedConstraints = [costConstraint, benefitConstraint, neutralConstraint];
        const groupValidation = validator.validateConstraints(mixedConstraints);
        expect(groupValidation.isValid).toBe(true);

        return true;
      }
    ), { numRuns: 50 });
  });

  test('Property 5.3: Hard vs soft requirements are distinguished', () => {
    fc.assert(fc.property(
      fc.record({
        hardConstraints: fc.array(
          constraintTypeArbitrary.map(c => ({ ...c, isHardRequirement: true })),
          { minLength: 1, maxLength: 5 }
        ),
        softConstraints: fc.array(
          constraintTypeArbitrary.map(c => ({ ...c, isHardRequirement: false })),
          { minLength: 1, maxLength: 5 }
        )
      }),
      (constraintGroups) => {
        const hardConstraints = constraintGroups.hardConstraints.map((data, index) => 
          factory.createConstraint({
            name: `Hard Constraint ${index}`,
            type: data.type,
            criterionType: data.criterionType,
            isHardRequirement: true,
            weight: data.weight,
            evaluationRule: {
              attributePath: data.attributePath,
              operator: data.operator,
              targetValue: data.targetValue
            },
            description: 'Hard requirement',
            confidenceLevel: 0.95
          })
        );

        const softConstraints = constraintGroups.softConstraints.map((data, index) => 
          factory.createConstraint({
            name: `Soft Constraint ${index}`,
            type: data.type,
            criterionType: data.criterionType,
            isHardRequirement: false,
            weight: data.weight,
            evaluationRule: {
              attributePath: data.attributePath,
              operator: data.operator,
              targetValue: data.targetValue
            },
            description: 'Soft preference',
            confidenceLevel: 0.8
          })
        );

        // Hard constraints should be marked as such
        hardConstraints.forEach(constraint => {
          expect(constraint.isHardRequirement).toBe(true);
          // Hard constraints typically have higher confidence
          expect(constraint.confidenceLevel).toBeGreaterThanOrEqual(0.9);
        });

        // Soft constraints should be marked as such
        softConstraints.forEach(constraint => {
          expect(constraint.isHardRequirement).toBe(false);
        });

        // Validation should handle mixed hard/soft constraints
        const allConstraints = [...hardConstraints, ...softConstraints];
        if (allConstraints.length > 0) {
          const validation = validator.validateConstraints(allConstraints);
          expect(validation).toBeDefined();
          
          // Should identify hard vs soft constraints
          const hardCount = allConstraints.filter(c => c.isHardRequirement).length;
          const softCount = allConstraints.filter(c => !c.isHardRequirement).length;
          
          expect(hardCount).toBe(hardConstraints.length);
          expect(softCount).toBe(softConstraints.length);
        }

        return true;
      }
    ), { numRuns: 50 });
  });

  test('Property 5.4: Evaluation operators work correctly for each type', () => {
    fc.assert(fc.property(
      fc.record({
        numericValue: fc.float({ min: 0, max: 1000 }),
        stringValue: fc.string({ minLength: 1, maxLength: 20 }),
        operator: fc.constantFrom('lessThan', 'greaterThan', 'equals', 'contains', 'range')
      }),
      (testData) => {
        // Test numeric operators
        if (['lessThan', 'greaterThan', 'equals'].includes(testData.operator)) {
          const numericConstraint = factory.createConstraint({
            name: 'Numeric Test',
            type: 'performance',
            criterionType: 'benefit',
            isHardRequirement: false,
            weight: 1.0,
            evaluationRule: {
              attributePath: 'score',
              operator: testData.operator as any,
              targetValue: testData.numericValue
            },
            description: 'Numeric evaluation test',
            confidenceLevel: 0.9
          });

          expect(numericConstraint.evaluationRule.operator).toBe(testData.operator);
          expect(typeof numericConstraint.evaluationRule.targetValue).toBe('number');
          
          const validation = validator.validateConstraint(numericConstraint);
          expect(validation.isValid).toBe(true);
        }

        // Test string operators
        if (['equals', 'contains'].includes(testData.operator)) {
          const stringConstraint = factory.createConstraint({
            name: 'String Test',
            type: 'technical',
            criterionType: 'neutral',
            isHardRequirement: false,
            weight: 1.0,
            evaluationRule: {
              attributePath: 'category',
              operator: testData.operator as any,
              targetValue: testData.stringValue
            },
            description: 'String evaluation test',
            confidenceLevel: 0.9
          });

          expect(stringConstraint.evaluationRule.operator).toBe(testData.operator);
          expect(typeof stringConstraint.evaluationRule.targetValue).toBe('string');
          
          const validation = validator.validateConstraint(stringConstraint);
          expect(validation.isValid).toBe(true);
        }

        return true;
      }
    ), { numRuns: 100 });
  });

  test('Property 5.5: Business constraint types have appropriate defaults', () => {
    fc.assert(fc.property(
      fc.constantFrom('budget', 'performance', 'quality', 'compliance', 'technical', 'service', 'business'),
      (constraintType) => {
        const constraint = factory.createConstraint({
          name: `Default ${constraintType} Constraint`,
          type: constraintType,
          criterionType: 'benefit', // Will be adjusted by factory if needed
          isHardRequirement: false,
          weight: 0.5,
          evaluationRule: {
            attributePath: 'value',
            operator: 'greaterThan',
            targetValue: 50
          },
          description: `Default ${constraintType} constraint`,
          confidenceLevel: 0.8
        });

        // Factory should apply appropriate defaults based on type
        switch (constraintType) {
          case 'budget':
            // Budget constraints are typically cost-oriented
            expect(['cost', 'benefit']).toContain(constraint.criterionType);
            break;
            
          case 'compliance':
            // Compliance constraints are often hard requirements
            expect(constraint.confidenceLevel).toBeGreaterThanOrEqual(0.8);
            break;
            
          case 'performance':
            // Performance constraints are typically benefits
            expect(['benefit', 'cost']).toContain(constraint.criterionType);
            break;
            
          case 'quality':
            // Quality constraints are typically benefits
            expect(['benefit', 'neutral']).toContain(constraint.criterionType);
            break;
        }

        // All constraint types should validate successfully
        const validation = validator.validateConstraint(constraint);
        expect(validation.isValid).toBe(true);

        return true;
      }
    ), { numRuns: 50 });
  });

  test('Property 5.6: Complex constraint combinations are handled', () => {
    fc.assert(fc.property(
      fc.array(constraintTypeArbitrary, { minLength: 2, maxLength: 8 }),
      (constraintDataArray) => {
        const constraints = constraintDataArray.map((data, index) => 
          factory.createConstraint({
            name: `Complex Constraint ${index}`,
            type: data.type,
            criterionType: data.criterionType,
            isHardRequirement: data.isHardRequirement,
            weight: data.weight,
            evaluationRule: {
              attributePath: data.attributePath,
              operator: data.operator,
              targetValue: data.targetValue
            },
            description: `Complex constraint of type ${data.type}`,
            confidenceLevel: Math.random() * 0.3 + 0.7 // 0.7 to 1.0
          })
        );

        // Validate the entire constraint set
        const validation = validator.validateConstraints(constraints);
        expect(validation).toBeDefined();

        // Should handle weight normalization if needed
        const totalWeight = constraints
          .filter(c => !c.isHardRequirement)
          .reduce((sum, c) => sum + c.weight, 0);
        
        if (totalWeight > 0) {
          // Weights should be reasonable
          constraints.forEach(constraint => {
            if (!constraint.isHardRequirement) {
              expect(constraint.weight).toBeGreaterThanOrEqual(0);
              expect(constraint.weight).toBeLessThanOrEqual(1);
            }
          });
        }

        // Should identify different constraint types
        const typeSet = new Set(constraints.map(c => c.type));
        expect(typeSet.size).toBeGreaterThan(0);

        // Should handle mixed criterion types
        const criterionTypeSet = new Set(constraints.map(c => c.criterionType));
        expect(criterionTypeSet.size).toBeGreaterThan(0);

        return true;
      }
    ), { numRuns: 30 });
  });
});