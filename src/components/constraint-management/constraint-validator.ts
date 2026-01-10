import {
  Constraint,
  ValidationResult,
  EvaluationOperator,
  CriterionType,
  ConstraintType,
  EvaluationRule,
  AttributeValue
} from '../../types/core';

export class ConstraintValidator {
  validate(constraint: Constraint): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic properties
    if (!constraint.id || constraint.id.trim() === '') {
      errors.push('Constraint ID is required and cannot be empty');
    }

    if (!constraint.name || constraint.name.trim() === '') {
      errors.push('Constraint name is required and cannot be empty');
    }

    if (!constraint.description || constraint.description.trim() === '') {
      warnings.push('Constraint description is recommended for clarity');
    }

    // Validate constraint type
    const validConstraintTypes: ConstraintType[] = ['budget', 'performance', 'compatibility', 'feature', 'custom'];
    if (!validConstraintTypes.includes(constraint.type)) {
      errors.push(`Invalid constraint type: ${constraint.type}. Must be one of: ${validConstraintTypes.join(', ')}`);
    }

    // Validate criterion type
    const validCriterionTypes: CriterionType[] = ['benefit', 'cost', 'neutral'];
    if (!validCriterionTypes.includes(constraint.criterionType)) {
      errors.push(`Invalid criterion type: ${constraint.criterionType}. Must be one of: ${validCriterionTypes.join(', ')}`);
    }

    // Validate weight
    if (typeof constraint.weight !== 'number') {
      errors.push('Weight must be a number');
    } else if (constraint.weight < 0 || constraint.weight > 1) {
      errors.push('Weight must be between 0 and 1 (inclusive)');
    } else if (constraint.weight === 0) {
      warnings.push('Weight of 0 means this constraint will not influence the comparison');
    }

    // Validate confidence level
    if (typeof constraint.confidenceLevel !== 'number') {
      errors.push('Confidence level must be a number');
    } else if (constraint.confidenceLevel < 0 || constraint.confidenceLevel > 1) {
      errors.push('Confidence level must be between 0 and 1 (inclusive)');
    } else if (constraint.confidenceLevel < 0.5) {
      warnings.push('Low confidence level may affect the reliability of this constraint');
    }

    // Validate evaluation rule
    const evaluationResult = this.validateEvaluationRule(constraint.evaluationRule);
    errors.push(...evaluationResult.errors);
    warnings.push(...evaluationResult.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateEvaluationRule(rule: EvaluationRule): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate attribute path
    if (!rule.attributePath || rule.attributePath.trim() === '') {
      errors.push('Evaluation rule attribute path is required');
    } else if (!this.isValidAttributePath(rule.attributePath)) {
      errors.push('Invalid attribute path format. Use dot notation like "pricing.monthlyFee"');
    }

    // Validate operator
    const validOperators: EvaluationOperator[] = ['lessThan', 'greaterThan', 'equals', 'contains', 'range'];
    if (!validOperators.includes(rule.operator)) {
      errors.push(`Invalid evaluation operator: ${rule.operator}. Must be one of: ${validOperators.join(', ')}`);
    }

    // Validate target value based on operator
    const targetValueResult = this.validateTargetValue(rule.operator, rule.targetValue);
    errors.push(...targetValueResult.errors);
    warnings.push(...targetValueResult.warnings);

    // Validate unit consistency
    if (rule.unit && typeof rule.unit !== 'string') {
      errors.push('Unit must be a string if provided');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private isValidAttributePath(path: string): boolean {
    // Check for valid dot notation path (alphanumeric, dots, underscores)
    const pathRegex = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;
    return pathRegex.test(path);
  }

  private validateTargetValue(operator: EvaluationOperator, targetValue: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (operator) {
      case 'lessThan':
      case 'greaterThan':
        if (typeof targetValue !== 'number') {
          errors.push(`${operator} operator requires a numeric target value`);
        }
        break;

      case 'equals':
        if (targetValue === null || targetValue === undefined) {
          errors.push('equals operator requires a non-null target value');
        }
        break;

      case 'contains':
        if (typeof targetValue !== 'string') {
          errors.push('contains operator requires a string target value');
        } else if (targetValue.trim() === '') {
          warnings.push('Empty string for contains operator will match all values');
        }
        break;

      case 'range':
        if (!Array.isArray(targetValue) || targetValue.length !== 2) {
          errors.push('range operator requires an array with exactly two numeric values [min, max]');
        } else {
          const [min, max] = targetValue;
          if (typeof min !== 'number' || typeof max !== 'number') {
            errors.push('range operator requires numeric min and max values');
          } else if (min >= max) {
            errors.push('range operator requires min value to be less than max value');
          }
        }
        break;

      default:
        errors.push(`Unknown operator: ${operator}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Evaluates a constraint against an option's attribute value
   */
  evaluateConstraint(constraint: Constraint, attributeValue: AttributeValue | undefined): boolean {
    if (!attributeValue) {
      return false; // Missing attribute fails constraint
    }

    const rule = constraint.evaluationRule;
    const value = attributeValue.value;

    try {
      switch (rule.operator) {
        case 'lessThan':
          return typeof value === 'number' && typeof rule.targetValue === 'number' && 
                 value < rule.targetValue;

        case 'greaterThan':
          return typeof value === 'number' && typeof rule.targetValue === 'number' && 
                 value > rule.targetValue;

        case 'equals':
          return value === rule.targetValue;

        case 'contains':
          return typeof value === 'string' && typeof rule.targetValue === 'string' && 
                 value.toLowerCase().includes(rule.targetValue.toLowerCase());

        case 'range':
          if (typeof value === 'number' && Array.isArray(rule.targetValue) && rule.targetValue.length === 2) {
            const [min, max] = rule.targetValue;
            return typeof min === 'number' && typeof max === 'number' && 
                   value >= min && value <= max;
          }
          return false;

        default:
          return false;
      }
    } catch (error) {
      // Safe evaluation - return false on any error
      return false;
    }
  }

  /**
   * Gets the attribute value from an option using dot notation path
   * For flat attribute structures, it looks for the exact path as a key
   * For nested structures, it traverses the path
   */
  getAttributeValue(attributes: Record<string, AttributeValue>, path: string): AttributeValue | undefined {
    // First try direct key lookup (flat structure)
    if (attributes[path] && this.isAttributeValue(attributes[path])) {
      return attributes[path];
    }

    // Then try nested path traversal
    const pathParts = path.split('.');
    let current: any = attributes;

    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    // If we found a value, ensure it's an AttributeValue
    if (this.isAttributeValue(current)) {
      return current as AttributeValue;
    }

    return undefined;
  }

  private isAttributeValue(obj: any): boolean {
    return obj && typeof obj === 'object' && 'value' in obj;
  }
}