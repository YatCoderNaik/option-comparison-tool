// Tests for OptionFactory
import { OptionFactory } from './option-factory';
import { OptionValidator } from './option-validator';
import { OptionCategory } from '../../types';

describe('OptionFactory', () => {
  let validator: OptionValidator;

  beforeEach(() => {
    validator = new OptionValidator();
  });

  describe('create', () => {
    test('should create a valid option with minimal parameters', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API for validation',
        category: 'api',
        attributes: {
          'pricing.cost': { value: 10, unit: 'USD/month' }
        }
      });

      expect(option).toBeValidOption();
      expect(option.name).toBe('Test API');
      expect(option.description).toBe('A test API for validation');
      expect(option.category).toBe('api');
      expect(option.id).toBeDefined();
      expect(option.metadata.dateAdded).toBeInstanceOf(Date);
      expect(option.metadata.lastUpdated).toBeInstanceOf(Date);
      expect(option.metadata.entryMethod).toBe('manual');

      const validationResult = validator.validate(option);
      expect(validationResult.isValid).toBe(true);
    });

    test('should create option with custom entry method', () => {
      const option = OptionFactory.create({
        name: 'Template API',
        description: 'An API created from template',
        category: 'api',
        attributes: {
          'test': { value: 'test' }
        },
        entryMethod: 'template'
      });

      expect(option.metadata.entryMethod).toBe('template');
    });

    test('should trim name and description', () => {
      const option = OptionFactory.create({
        name: '  Test API  ',
        description: '  A test API  ',
        category: 'api',
        attributes: {
          'test': { value: 'test' }
        }
      });

      expect(option.name).toBe('Test API');
      expect(option.description).toBe('A test API');
    });

    test('should add timestamps to attributes', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: {
          'test': { value: 'test' }
        }
      });

      expect(option.attributes.test.lastUpdated).toBeInstanceOf(Date);
    });

    test('should set default confidence if not provided', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: {
          'test': { value: 'test' }
        }
      });

      expect(option.attributes.test.confidence).toBe(0.8);
    });

    test('should preserve provided confidence', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: {
          'test': { value: 'test', confidence: 0.95 }
        }
      });

      expect(option.attributes.test.confidence).toBe(0.95);
    });

    test('should calculate initial data quality', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: {
          'test1': { value: 'test', source: 'documentation' },
          'test2': { value: 42, confidence: 0.9 }
        }
      });

      expect(option.metadata.dataQuality.completeness).toBe(1.0);
      expect(option.metadata.dataQuality.freshness).toBe(1.0);
      expect(option.metadata.dataQuality.reliability).toBeGreaterThan(0.5);
    });
  });

  describe('createTemplate', () => {
    const categories: OptionCategory[] = ['api', 'cloud-service', 'framework', 'tool', 'custom'];

    test.each(categories)('should create template for %s category', (category) => {
      const template = OptionFactory.createTemplate(category);
      
      expect(template.category).toBe(category);
      expect(template.attributes).toBeDefined();
      expect(Object.keys(template.attributes!).length).toBeGreaterThan(0);
    });

    test('should create API template with expected attributes', () => {
      const template = OptionFactory.createTemplate('api');
      
      expect(template.attributes!['pricing.freeRequests']).toBeDefined();
      expect(template.attributes!['pricing.paidTier']).toBeDefined();
      expect(template.attributes!['performance.latency']).toBeDefined();
      expect(template.attributes!['features.authentication']).toBeDefined();
      expect(template.attributes!['reliability.uptime']).toBeDefined();
    });

    test('should create cloud-service template with expected attributes', () => {
      const template = OptionFactory.createTemplate('cloud-service');
      
      expect(template.attributes!['pricing.compute']).toBeDefined();
      expect(template.attributes!['pricing.storage']).toBeDefined();
      expect(template.attributes!['performance.cpu']).toBeDefined();
      expect(template.attributes!['features.autoScaling']).toBeDefined();
      expect(template.attributes!['compliance.soc2']).toBeDefined();
    });

    test('should create framework template with expected attributes', () => {
      const template = OptionFactory.createTemplate('framework');
      
      expect(template.attributes!['performance.bundleSize']).toBeDefined();
      expect(template.attributes!['features.typescript']).toBeDefined();
      expect(template.attributes!['community.githubStars']).toBeDefined();
      expect(template.attributes!['learning.difficulty']).toBeDefined();
    });

    test('should create tool template with expected attributes', () => {
      const template = OptionFactory.createTemplate('tool');
      
      expect(template.attributes!['pricing.license']).toBeDefined();
      expect(template.attributes!['features.platforms']).toBeDefined();
      expect(template.attributes!['usability.learningCurve']).toBeDefined();
      expect(template.attributes!['support.community']).toBeDefined();
    });

    test('template attributes should have proper structure', () => {
      const template = OptionFactory.createTemplate('api');
      const firstAttr = Object.values(template.attributes!)[0];
      
      expect(firstAttr).toHaveProperty('value');
      expect(typeof firstAttr.value).toMatch(/string|number|boolean/);
    });
  });
});