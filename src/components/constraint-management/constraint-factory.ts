import {
  Constraint,
  ConstraintType,
  CriterionType,
  EvaluationOperator,
  EvaluationRule
} from '../../types/core';
import { ConstraintValidator } from './constraint-validator';

export interface ConstraintTemplate {
  name: string;
  type: ConstraintType;
  criterionType: CriterionType;
  description: string;
  evaluationRule: Omit<EvaluationRule, 'targetValue'>;
  defaultWeight: number;
  confidenceLevel: number;
}

export class ConstraintFactory {
  private validator: ConstraintValidator;
  private static idCounter = 1;

  constructor() {
    this.validator = new ConstraintValidator();
  }

  /**
   * Creates a new constraint with validation
   */
  createConstraint(params: {
    name: string;
    type: ConstraintType;
    criterionType: CriterionType;
    isHardRequirement: boolean;
    weight: number;
    evaluationRule: EvaluationRule;
    description: string;
    confidenceLevel?: number;
  }): Constraint {
    const constraint: Constraint = {
      id: this.generateId(),
      name: params.name,
      type: params.type,
      isHardRequirement: params.isHardRequirement,
      weight: params.weight,
      criterionType: params.criterionType,
      evaluationRule: params.evaluationRule,
      description: params.description,
      confidenceLevel: params.confidenceLevel ?? 0.8
    };

    const validation = this.validator.validate(constraint);
    if (!validation.isValid) {
      throw new Error(`Invalid constraint: ${validation.errors.join(', ')}`);
    }

    return constraint;
  }

  /**
   * Creates a constraint from a template with specific target value
   */
  createFromTemplate(template: ConstraintTemplate, targetValue: any, isHardRequirement: boolean = false): Constraint {
    const evaluationRule: EvaluationRule = {
      ...template.evaluationRule,
      targetValue
    };

    return this.createConstraint({
      name: template.name,
      type: template.type,
      criterionType: template.criterionType,
      isHardRequirement,
      weight: template.defaultWeight,
      evaluationRule,
      description: template.description,
      confidenceLevel: template.confidenceLevel
    });
  }

  /**
   * Predefined constraint templates for common use cases
   */
  getTemplates(): ConstraintTemplate[] {
    return [
      // Budget constraints
      {
        name: 'Maximum Monthly Cost',
        type: 'budget',
        criterionType: 'cost',
        description: 'Monthly subscription or usage cost must not exceed the specified amount',
        evaluationRule: {
          attributePath: 'pricing.monthlyFee',
          operator: 'lessThan',
          unit: 'USD'
        },
        defaultWeight: 0.3,
        confidenceLevel: 0.9
      },
      {
        name: 'Setup Cost Limit',
        type: 'budget',
        criterionType: 'cost',
        description: 'One-time setup or implementation cost limit',
        evaluationRule: {
          attributePath: 'pricing.setupFee',
          operator: 'lessThan',
          unit: 'USD'
        },
        defaultWeight: 0.2,
        confidenceLevel: 0.8
      },

      // Performance constraints
      {
        name: 'Minimum Response Time',
        type: 'performance',
        criterionType: 'benefit',
        description: 'API response time must be faster than specified threshold',
        evaluationRule: {
          attributePath: 'performance.responseTime',
          operator: 'lessThan',
          unit: 'ms'
        },
        defaultWeight: 0.25,
        confidenceLevel: 0.85
      },
      {
        name: 'Minimum Uptime',
        type: 'performance',
        criterionType: 'benefit',
        description: 'Service uptime percentage must meet minimum requirement',
        evaluationRule: {
          attributePath: 'performance.uptime',
          operator: 'greaterThan',
          unit: '%'
        },
        defaultWeight: 0.3,
        confidenceLevel: 0.9
      },

      // Compatibility constraints
      {
        name: 'Required Programming Language',
        type: 'compatibility',
        criterionType: 'neutral',
        description: 'Must support the specified programming language',
        evaluationRule: {
          attributePath: 'compatibility.languages',
          operator: 'contains'
        },
        defaultWeight: 0.0, // Neutral criteria don't affect scoring
        confidenceLevel: 0.95
      },
      {
        name: 'Platform Compatibility',
        type: 'compatibility',
        criterionType: 'neutral',
        description: 'Must be compatible with the specified platform',
        evaluationRule: {
          attributePath: 'compatibility.platforms',
          operator: 'contains'
        },
        defaultWeight: 0.0,
        confidenceLevel: 0.9
      },

      // Feature constraints
      {
        name: 'Required Feature',
        type: 'feature',
        criterionType: 'benefit',
        description: 'Must include the specified feature or capability',
        evaluationRule: {
          attributePath: 'features.available',
          operator: 'contains'
        },
        defaultWeight: 0.2,
        confidenceLevel: 0.8
      },
      {
        name: 'API Rate Limit',
        type: 'feature',
        criterionType: 'benefit',
        description: 'API rate limit must be at least the specified value',
        evaluationRule: {
          attributePath: 'features.rateLimit',
          operator: 'greaterThan',
          unit: 'requests/hour'
        },
        defaultWeight: 0.15,
        confidenceLevel: 0.85
      }
    ];
  }

  /**
   * Creates a budget constraint for maximum cost
   */
  createBudgetConstraint(maxAmount: number, attributePath: string = 'pricing.monthlyFee', isHard: boolean = true): Constraint {
    return this.createConstraint({
      name: `Maximum Budget: $${maxAmount}`,
      type: 'budget',
      criterionType: 'cost',
      isHardRequirement: isHard,
      weight: isHard ? 0 : 0.3, // Hard constraints don't need weights
      evaluationRule: {
        attributePath,
        operator: 'lessThan',
        targetValue: maxAmount,
        unit: 'USD'
      },
      description: `Total cost must not exceed $${maxAmount}`,
      confidenceLevel: 0.9
    });
  }

  /**
   * Creates a performance constraint for minimum threshold
   */
  createPerformanceConstraint(
    minValue: number, 
    attributePath: string, 
    unit: string, 
    name: string,
    isHard: boolean = false
  ): Constraint {
    return this.createConstraint({
      name,
      type: 'performance',
      criterionType: 'benefit',
      isHardRequirement: isHard,
      weight: isHard ? 0 : 0.25,
      evaluationRule: {
        attributePath,
        operator: 'greaterThan',
        targetValue: minValue,
        unit
      },
      description: `${name} must be at least ${minValue} ${unit}`,
      confidenceLevel: 0.85
    });
  }

  /**
   * Creates a feature requirement constraint
   */
  createFeatureConstraint(requiredFeature: string, attributePath: string = 'features.available', isHard: boolean = true): Constraint {
    return this.createConstraint({
      name: `Required Feature: ${requiredFeature}`,
      type: 'feature',
      criterionType: 'benefit',
      isHardRequirement: isHard,
      weight: isHard ? 0 : 0.2,
      evaluationRule: {
        attributePath,
        operator: 'contains',
        targetValue: requiredFeature
      },
      description: `Must include ${requiredFeature} feature`,
      confidenceLevel: 0.8
    });
  }

  private generateId(): string {
    return `constraint_${ConstraintFactory.idCounter++}_${Date.now()}`;
  }
}