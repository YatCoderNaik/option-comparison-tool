// Tests for OptionValidator with comprehensive error handling
import { OptionValidator } from './option-validator';
import { OptionFactory } from './option-factory';
import { Option, ValidationResult } from '../../types';

describe('OptionValidator', () => {
  let validator: OptionValidator;

  beforeEach(() => {
    validator = new OptionValidator();
  });

  describe('validate', () => {
    test('should validate a correct option', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API for validation',
        category: 'api',
        attributes: {
          'pricing.cost': { value: 10, unit: 'USD/month', confidence: 0.9 }
        }
      });

      const result = validator.validate(option);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject null or undefined option', () => {
      const result1 = validator.validate(null as any);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Option is null or undefined');

      const result2 = validator.validate(undefined as any);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Option is null or undefined');
    });

    test('should reject invalid ID', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });
      
      option.id = ''; // Invalid empty ID
      const result = validator.validate(option);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option ID must be a non-empty string without leading/trailing whitespace');
    });

    test('should reject invalid name', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      // Test empty name
      option.name = '';
      let result = validator.validate(option);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option name is required and must be a string');

      // Test name with whitespace
      option.name = ' Test API ';
      result = validator.validate(option);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option name cannot have leading or trailing whitespace');

      // Test name too long
      option.name = 'A'.repeat(101);
      result = validator.validate(option);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option name cannot exceed 100 characters');
    });

    test('should reject invalid category', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      option.category = 'invalid-category' as any;
      const result = validator.validate(option);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option category must be one of: api, cloud-service, framework, tool, custom');
    });

    test('should reject invalid description', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      // Test empty description
      option.description = '';
      let result = validator.validate(option);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option description is required and must be a string');

      // Test description too long
      option.description = 'A'.repeat(501);
      result = validator.validate(option);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option description cannot exceed 500 characters');
    });
  });

  describe('validateAttributes', () => {
    test('should validate correct attributes', () => {
      const attributes = {
        'pricing.cost': { value: 10, unit: 'USD', confidence: 0.9 },
        'performance.speed': { value: 100, unit: 'ms' }
      };

      const result = validator.validateAttributes(attributes);
      expect(result.isValid).toBe(true);
    });

    test('should reject non-object attributes', () => {
      const result = validator.validateAttributes('not an object' as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Attributes must be an object');
    });

    test('should reject empty attributes', () => {
      const result = validator.validateAttributes({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option must have at least 1 attribute');
    });

    test('should reject too many attributes', () => {
      const attributes: Record<string, any> = {};
      for (let i = 0; i < 51; i++) {
        attributes[`attr${i}`] = { value: i };
      }

      const result = validator.validateAttributes(attributes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option cannot have more than 50 attributes');
    });

    test('should reject invalid attribute keys', () => {
      const attributes = {
        '': { value: 'test' }, // Empty key
        ' invalid ': { value: 'test' } // Key with whitespace
      };

      const result = validator.validateAttributes(attributes);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should warn about missing confidence and source', () => {
      const attributes = {
        'test': { value: 'test' } // Missing confidence and source
      };

      const result = validator.validateAttributes(attributes);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Attribute "test" missing confidence score');
      expect(result.warnings).toContain('Attribute "test" missing source information');
    });
  });

  describe('validateMetadata', () => {
    test('should validate correct metadata', () => {
      const metadata = {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: {
          completeness: 0.9,
          freshness: 0.8,
          reliability: 0.7
        },
        entryMethod: 'manual'
      };

      const result = validator.validateMetadata(metadata);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid dates', () => {
      const metadata = {
        dateAdded: 'not a date',
        lastUpdated: new Date('invalid'),
        dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
        entryMethod: 'manual'
      };

      const result = validator.validateMetadata(metadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Metadata must include a valid dateAdded');
      expect(result.errors).toContain('Metadata must include a valid lastUpdated');
    });

    test('should reject invalid date logic', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000);
      
      const metadata = {
        dateAdded: future,
        lastUpdated: now,
        dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
        entryMethod: 'manual'
      };

      const result = validator.validateMetadata(metadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('dateAdded cannot be after lastUpdated');
    });

    test('should reject invalid data quality scores', () => {
      const metadata = {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: {
          completeness: 1.5, // Invalid > 1
          freshness: -0.1, // Invalid < 0
          reliability: 'not a number' // Invalid type
        },
        entryMethod: 'manual'
      };

      const result = validator.validateMetadata(metadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('dataQuality.completeness must be a number between 0 and 1');
      expect(result.errors).toContain('dataQuality.freshness must be a number between 0 and 1');
      expect(result.errors).toContain('dataQuality.reliability must be a number between 0 and 1');
    });

    test('should warn about low quality scores', () => {
      const metadata = {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: {
          completeness: 0.4, // Low completeness
          freshness: 0.2, // Low freshness
          reliability: 0.6 // Low reliability
        },
        entryMethod: 'manual'
      };

      const result = validator.validateMetadata(metadata);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Data completeness is below 50%');
      expect(result.warnings).toContain('Data freshness is low (below 30%)');
      expect(result.warnings).toContain('Data reliability is below 70%');
    });

    test('should reject invalid entry method', () => {
      const metadata = {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
        entryMethod: 'invalid-method'
      };

      const result = validator.validateMetadata(metadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('entryMethod must be one of: manual, template, api');
    });
  });
});