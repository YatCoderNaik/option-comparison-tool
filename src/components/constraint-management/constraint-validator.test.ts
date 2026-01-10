import { ConstraintValidator } from './constraint-validator';
import {
  Constraint,
  EvaluationRule,
  AttributeValue
} from '../../types/core';

describe('ConstraintValidator', () => {
  let validator: ConstraintValidator;

  beforeEach(() => {
    validator = new ConstraintValidator();
  });

  describe('validate', () => {
    const validConstraint: Constraint = {
      id: 'test-constraint-1',
      name: 'Test Constraint',
      type: 'budget',
      isHardRequirement: true,
      weight: 0.3,
      criterionType: 'cost',
      evaluationRule: {
        attributePath: 'pricing.monthlyFee',
        operator: 'lessThan',
        targetValue: 100,
        unit: 'USD'
      },
      description: 'Monthly fee must be less than $100',
      confidenceLevel: 0.8
    };

    it('should validate a correct constraint', () => {
      const result = validator.validate(validConstraint);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject constraint with empty ID', () => {
      const constraint = { ...validConstraint, id: '' };
      const result = validator.validate(constraint);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Constraint ID is required and cannot be empty');
    });

    it('should reject constraint with empty name', () => {
      const constraint = { ...validConstraint, name: '' };
      const result = validator.validate(constraint);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Constraint name is required and cannot be empty');
    });

    it('should warn about missing description', () => {
      const constraint = { ...validConstraint, description: '' };
      const result = validator.validate(constraint);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Constraint description is recommended for clarity');
    });

    it('should reject invalid constraint type', () => {
      const constraint = { ...validConstraint, type: 'invalid' as any };
      const result = validator.validate(constraint);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid constraint type: invalid');
    });

    it('should reject invalid criterion type', () => {
      const constraint = { ...validConstraint, criterionType: 'invalid' as any };
      const result = validator.validate(constraint);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid criterion type: invalid');
    });

    it('should reject weight outside valid range', () => {
      const constraint1 = { ...validConstraint, weight: -0.1 };
      const result1 = validator.validate(constraint1);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Weight must be between 0 and 1 (inclusive)');

      const constraint2 = { ...validConstraint, weight: 1.1 };
      const result2 = validator.validate(constraint2);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Weight must be between 0 and 1 (inclusive)');
    });

    it('should warn about zero weight', () => {
      const constraint = { ...validConstraint, weight: 0 };
      const result = validator.validate(constraint);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Weight of 0 means this constraint will not influence the comparison');
    });

    it('should reject confidence level outside valid range', () => {
      const constraint1 = { ...validConstraint, confidenceLevel: -0.1 };
      const result1 = validator.validate(constraint1);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Confidence level must be between 0 and 1 (inclusive)');

      const constraint2 = { ...validConstraint, confidenceLevel: 1.1 };
      const result2 = validator.validate(constraint2);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Confidence level must be between 0 and 1 (inclusive)');
    });

    it('should warn about low confidence level', () => {
      const constraint = { ...validConstraint, confidenceLevel: 0.3 };
      const result = validator.validate(constraint);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Low confidence level may affect the reliability of this constraint');
    });
  });

  describe('validateEvaluationRule', () => {
    it('should validate correct evaluation rules', () => {
      const rules: EvaluationRule[] = [
        {
          attributePath: 'pricing.monthlyFee',
          operator: 'lessThan',
          targetValue: 100,
          unit: 'USD'
        },
        {
          attributePath: 'features.available',
          operator: 'contains',
          targetValue: 'API'
        },
        {
          attributePath: 'performance.responseTime',
          operator: 'range',
          targetValue: [100, 500],
          unit: 'ms'
        }
      ];

      rules.forEach(rule => {
        const result = validator.validateEvaluationRule(rule);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject empty attribute path', () => {
      const rule: EvaluationRule = {
        attributePath: '',
        operator: 'lessThan',
        targetValue: 100
      };
      const result = validator.validateEvaluationRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Evaluation rule attribute path is required');
    });

    it('should reject invalid attribute path format', () => {
      const rule: EvaluationRule = {
        attributePath: 'invalid-path!',
        operator: 'lessThan',
        targetValue: 100
      };
      const result = validator.validateEvaluationRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid attribute path format');
    });

    it('should reject invalid operators', () => {
      const rule: EvaluationRule = {
        attributePath: 'test.value',
        operator: 'invalidOperator' as any,
        targetValue: 100
      };
      const result = validator.validateEvaluationRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid evaluation operator: invalidOperator');
    });

    it('should validate target values based on operator', () => {
      // lessThan/greaterThan should require numbers
      const numericRule: EvaluationRule = {
        attributePath: 'test.value',
        operator: 'lessThan',
        targetValue: 'not-a-number'
      };
      const numericResult = validator.validateEvaluationRule(numericRule);
      expect(numericResult.isValid).toBe(false);
      expect(numericResult.errors[0]).toContain('lessThan operator requires a numeric target value');

      // contains should require strings
      const stringRule: EvaluationRule = {
        attributePath: 'test.value',
        operator: 'contains',
        targetValue: 123
      };
      const stringResult = validator.validateEvaluationRule(stringRule);
      expect(stringResult.isValid).toBe(false);
      expect(stringResult.errors[0]).toContain('contains operator requires a string target value');

      // range should require array of two numbers
      const rangeRule: EvaluationRule = {
        attributePath: 'test.value',
        operator: 'range',
        targetValue: [100] as any // Only one value - testing validation
      };
      const rangeResult = validator.validateEvaluationRule(rangeRule);
      expect(rangeResult.isValid).toBe(false);
      expect(rangeResult.errors[0]).toContain('range operator requires an array with exactly two numeric values');
    });

    it('should validate range operator min/max order', () => {
      const rule: EvaluationRule = {
        attributePath: 'test.value',
        operator: 'range',
        targetValue: [500, 100] // max < min
      };
      const result = validator.validateEvaluationRule(rule);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('range operator requires min value to be less than max value');
    });
  });

  describe('evaluateConstraint', () => {
    const constraint: Constraint = {
      id: 'test-constraint',
      name: 'Test Constraint',
      type: 'budget',
      isHardRequirement: true,
      weight: 0.3,
      criterionType: 'cost',
      evaluationRule: {
        attributePath: 'pricing.monthlyFee',
        operator: 'lessThan',
        targetValue: 100
      },
      description: 'Test constraint',
      confidenceLevel: 0.8
    };

    it('should evaluate lessThan operator correctly', () => {
      const lessThanConstraint = { ...constraint };
      
      const passingValue: AttributeValue = { value: 50 };
      expect(validator.evaluateConstraint(lessThanConstraint, passingValue)).toBe(true);

      const failingValue: AttributeValue = { value: 150 };
      expect(validator.evaluateConstraint(lessThanConstraint, failingValue)).toBe(false);
    });

    it('should evaluate greaterThan operator correctly', () => {
      const greaterThanConstraint = {
        ...constraint,
        evaluationRule: { ...constraint.evaluationRule, operator: 'greaterThan' as const }
      };
      
      const passingValue: AttributeValue = { value: 150 };
      expect(validator.evaluateConstraint(greaterThanConstraint, passingValue)).toBe(true);

      const failingValue: AttributeValue = { value: 50 };
      expect(validator.evaluateConstraint(greaterThanConstraint, failingValue)).toBe(false);
    });

    it('should evaluate equals operator correctly', () => {
      const equalsConstraint = {
        ...constraint,
        evaluationRule: { ...constraint.evaluationRule, operator: 'equals' as const, targetValue: 'test' }
      };
      
      const passingValue: AttributeValue = { value: 'test' };
      expect(validator.evaluateConstraint(equalsConstraint, passingValue)).toBe(true);

      const failingValue: AttributeValue = { value: 'other' };
      expect(validator.evaluateConstraint(equalsConstraint, failingValue)).toBe(false);
    });

    it('should evaluate contains operator correctly', () => {
      const containsConstraint = {
        ...constraint,
        evaluationRule: { ...constraint.evaluationRule, operator: 'contains' as const, targetValue: 'API' }
      };
      
      const passingValue: AttributeValue = { value: 'REST API support' };
      expect(validator.evaluateConstraint(containsConstraint, passingValue)).toBe(true);

      const failingValue: AttributeValue = { value: 'No web service' };
      expect(validator.evaluateConstraint(containsConstraint, failingValue)).toBe(false);
    });

    it('should evaluate range operator correctly', () => {
      const rangeConstraint = {
        ...constraint,
        evaluationRule: { ...constraint.evaluationRule, operator: 'range' as const, targetValue: [50, 150] as [number, number] }
      };
      
      const passingValue: AttributeValue = { value: 100 };
      expect(validator.evaluateConstraint(rangeConstraint, passingValue)).toBe(true);

      const failingValueLow: AttributeValue = { value: 25 };
      expect(validator.evaluateConstraint(rangeConstraint, failingValueLow)).toBe(false);

      const failingValueHigh: AttributeValue = { value: 200 };
      expect(validator.evaluateConstraint(rangeConstraint, failingValueHigh)).toBe(false);
    });

    it('should return false for missing attribute value', () => {
      expect(validator.evaluateConstraint(constraint, undefined)).toBe(false);
    });

    it('should handle evaluation errors gracefully', () => {
      const invalidConstraint = {
        ...constraint,
        evaluationRule: { ...constraint.evaluationRule, operator: 'invalid' as any }
      };
      
      const value: AttributeValue = { value: 50 };
      expect(validator.evaluateConstraint(invalidConstraint, value)).toBe(false);
    });
  });

  describe('getAttributeValue', () => {
    const attributes: Record<string, AttributeValue> = {
      'pricing.monthlyFee': { value: 100, unit: 'USD' },
      'pricing.setupFee': { value: 50, unit: 'USD' },
      'features.available': { value: 'API, Dashboard, Analytics' },
      'simpleValue': { value: 'test' }
    };

    it('should retrieve attribute values by path', () => {
      const result = validator.getAttributeValue(attributes, 'pricing.monthlyFee');
      expect(result).toEqual({ value: 100, unit: 'USD' });
    });

    it('should retrieve simple attribute values', () => {
      const result = validator.getAttributeValue(attributes, 'simpleValue');
      expect(result).toEqual({ value: 'test' });
    });

    it('should return undefined for non-existent paths', () => {
      const result = validator.getAttributeValue(attributes, 'nonexistent.path');
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid attribute structure', () => {
      const invalidAttributes: any = {
        invalid: 'not-an-attribute-value'
      };
      const result = validator.getAttributeValue(invalidAttributes, 'invalid');
      expect(result).toBeUndefined();
    });
  });
});