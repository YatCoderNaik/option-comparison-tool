import { ConstraintFactory } from './constraint-factory';
import { Constraint } from '../../types/core';

describe('ConstraintFactory', () => {
  let factory: ConstraintFactory;

  beforeEach(() => {
    factory = new ConstraintFactory();
  });

  describe('createConstraint', () => {
    it('should create a valid constraint', () => {
      const constraint = factory.createConstraint({
        name: 'Test Constraint',
        type: 'budget',
        criterionType: 'cost',
        isHardRequirement: true,
        weight: 0.3,
        evaluationRule: {
          attributePath: 'pricing.monthlyFee',
          operator: 'lessThan',
          targetValue: 100,
          unit: 'USD'
        },
        description: 'Monthly fee must be less than $100',
        confidenceLevel: 0.8
      });

      expect(constraint.id).toBeDefined();
      expect(constraint.name).toBe('Test Constraint');
      expect(constraint.type).toBe('budget');
      expect(constraint.criterionType).toBe('cost');
      expect(constraint.isHardRequirement).toBe(true);
      expect(constraint.weight).toBe(0.3);
      expect(constraint.confidenceLevel).toBe(0.8);
    });

    it('should use default confidence level when not provided', () => {
      const constraint = factory.createConstraint({
        name: 'Test Constraint',
        type: 'budget',
        criterionType: 'cost',
        isHardRequirement: true,
        weight: 0.3,
        evaluationRule: {
          attributePath: 'pricing.monthlyFee',
          operator: 'lessThan',
          targetValue: 100
        },
        description: 'Test constraint'
      });

      expect(constraint.confidenceLevel).toBe(0.8);
    });

    it('should throw error for invalid constraint', () => {
      expect(() => {
        factory.createConstraint({
          name: '', // Invalid empty name
          type: 'budget',
          criterionType: 'cost',
          isHardRequirement: true,
          weight: 0.3,
          evaluationRule: {
            attributePath: 'pricing.monthlyFee',
            operator: 'lessThan',
            targetValue: 100
          },
          description: 'Test constraint'
        });
      }).toThrow('Invalid constraint');
    });

    it('should generate unique IDs', () => {
      const constraint1 = factory.createConstraint({
        name: 'Test Constraint 1',
        type: 'budget',
        criterionType: 'cost',
        isHardRequirement: true,
        weight: 0.3,
        evaluationRule: {
          attributePath: 'pricing.monthlyFee',
          operator: 'lessThan',
          targetValue: 100
        },
        description: 'Test constraint 1'
      });

      const constraint2 = factory.createConstraint({
        name: 'Test Constraint 2',
        type: 'performance',
        criterionType: 'benefit',
        isHardRequirement: false,
        weight: 0.2,
        evaluationRule: {
          attributePath: 'performance.responseTime',
          operator: 'lessThan',
          targetValue: 200
        },
        description: 'Test constraint 2'
      });

      expect(constraint1.id).not.toBe(constraint2.id);
    });
  });

  describe('createFromTemplate', () => {
    it('should create constraint from template', () => {
      const templates = factory.getTemplates();
      const budgetTemplate = templates.find(t => t.name === 'Maximum Monthly Cost')!;
      
      const constraint = factory.createFromTemplate(budgetTemplate, 150, true);

      expect(constraint.name).toBe('Maximum Monthly Cost');
      expect(constraint.type).toBe('budget');
      expect(constraint.criterionType).toBe('cost');
      expect(constraint.isHardRequirement).toBe(true);
      expect(constraint.evaluationRule.targetValue).toBe(150);
      expect(constraint.evaluationRule.operator).toBe('lessThan');
      expect(constraint.evaluationRule.attributePath).toBe('pricing.monthlyFee');
    });

    it('should use template defaults for optional parameters', () => {
      const templates = factory.getTemplates();
      const performanceTemplate = templates.find(t => t.name === 'Minimum Response Time')!;
      
      const constraint = factory.createFromTemplate(performanceTemplate, 100);

      expect(constraint.isHardRequirement).toBe(false); // Default parameter
      expect(constraint.weight).toBe(performanceTemplate.defaultWeight);
      expect(constraint.confidenceLevel).toBe(performanceTemplate.confidenceLevel);
    });
  });

  describe('getTemplates', () => {
    it('should return predefined templates', () => {
      const templates = factory.getTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      
      // Check for expected template categories
      const budgetTemplates = templates.filter(t => t.type === 'budget');
      const performanceTemplates = templates.filter(t => t.type === 'performance');
      const compatibilityTemplates = templates.filter(t => t.type === 'compatibility');
      const featureTemplates = templates.filter(t => t.type === 'feature');

      expect(budgetTemplates.length).toBeGreaterThan(0);
      expect(performanceTemplates.length).toBeGreaterThan(0);
      expect(compatibilityTemplates.length).toBeGreaterThan(0);
      expect(featureTemplates.length).toBeGreaterThan(0);
    });

    it('should have valid template structure', () => {
      const templates = factory.getTemplates();
      
      templates.forEach(template => {
        expect(template.name).toBeDefined();
        expect(template.type).toBeDefined();
        expect(template.criterionType).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.evaluationRule).toBeDefined();
        expect(template.evaluationRule.attributePath).toBeDefined();
        expect(template.evaluationRule.operator).toBeDefined();
        expect(typeof template.defaultWeight).toBe('number');
        expect(typeof template.confidenceLevel).toBe('number');
        expect(template.defaultWeight).toBeGreaterThanOrEqual(0);
        expect(template.defaultWeight).toBeLessThanOrEqual(1);
        expect(template.confidenceLevel).toBeGreaterThanOrEqual(0);
        expect(template.confidenceLevel).toBeLessThanOrEqual(1);
      });
    });

    it('should have neutral criteria with zero weight', () => {
      const templates = factory.getTemplates();
      const neutralTemplates = templates.filter(t => t.criterionType === 'neutral');
      
      neutralTemplates.forEach(template => {
        expect(template.defaultWeight).toBe(0);
      });
    });
  });

  describe('createBudgetConstraint', () => {
    it('should create budget constraint with defaults', () => {
      const constraint = factory.createBudgetConstraint(100);

      expect(constraint.name).toBe('Maximum Budget: $100');
      expect(constraint.type).toBe('budget');
      expect(constraint.criterionType).toBe('cost');
      expect(constraint.isHardRequirement).toBe(true);
      expect(constraint.weight).toBe(0); // Hard constraints have zero weight
      expect(constraint.evaluationRule.attributePath).toBe('pricing.monthlyFee');
      expect(constraint.evaluationRule.operator).toBe('lessThan');
      expect(constraint.evaluationRule.targetValue).toBe(100);
      expect(constraint.evaluationRule.unit).toBe('USD');
    });

    it('should create soft budget constraint', () => {
      const constraint = factory.createBudgetConstraint(100, 'pricing.monthlyFee', false);

      expect(constraint.isHardRequirement).toBe(false);
      expect(constraint.weight).toBe(0.3); // Soft constraints have weight
    });

    it('should allow custom attribute path', () => {
      const constraint = factory.createBudgetConstraint(500, 'pricing.setupFee');

      expect(constraint.evaluationRule.attributePath).toBe('pricing.setupFee');
    });
  });

  describe('createPerformanceConstraint', () => {
    it('should create performance constraint', () => {
      const constraint = factory.createPerformanceConstraint(
        200, 
        'performance.responseTime', 
        'ms', 
        'Maximum Response Time'
      );

      expect(constraint.name).toBe('Maximum Response Time');
      expect(constraint.type).toBe('performance');
      expect(constraint.criterionType).toBe('benefit');
      expect(constraint.isHardRequirement).toBe(false);
      expect(constraint.weight).toBe(0.25);
      expect(constraint.evaluationRule.attributePath).toBe('performance.responseTime');
      expect(constraint.evaluationRule.operator).toBe('greaterThan');
      expect(constraint.evaluationRule.targetValue).toBe(200);
      expect(constraint.evaluationRule.unit).toBe('ms');
    });

    it('should create hard performance constraint', () => {
      const constraint = factory.createPerformanceConstraint(
        99.9, 
        'performance.uptime', 
        '%', 
        'Minimum Uptime',
        true
      );

      expect(constraint.isHardRequirement).toBe(true);
      expect(constraint.weight).toBe(0); // Hard constraints have zero weight
    });
  });

  describe('createFeatureConstraint', () => {
    it('should create feature constraint with defaults', () => {
      const constraint = factory.createFeatureConstraint('API');

      expect(constraint.name).toBe('Required Feature: API');
      expect(constraint.type).toBe('feature');
      expect(constraint.criterionType).toBe('benefit');
      expect(constraint.isHardRequirement).toBe(true);
      expect(constraint.weight).toBe(0); // Hard constraints have zero weight
      expect(constraint.evaluationRule.attributePath).toBe('features.available');
      expect(constraint.evaluationRule.operator).toBe('contains');
      expect(constraint.evaluationRule.targetValue).toBe('API');
    });

    it('should create soft feature constraint', () => {
      const constraint = factory.createFeatureConstraint('Dashboard', 'features.available', false);

      expect(constraint.isHardRequirement).toBe(false);
      expect(constraint.weight).toBe(0.2); // Soft constraints have weight
    });

    it('should allow custom attribute path', () => {
      const constraint = factory.createFeatureConstraint('OAuth', 'security.authentication');

      expect(constraint.evaluationRule.attributePath).toBe('security.authentication');
    });
  });
});