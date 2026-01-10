// Property-based tests for option validation (Property 2: Input Validation Consistency)
import fc from 'fast-check';
import { Option, ValidationResult } from '../../types';
import { arbitraryOption, arbitraryId, arbitraryOptionCategory } from '../../utils/generators';
import { OptionValidator } from './option-validator';
import { OptionFactory } from './option-factory';

/**
 * Feature: option-comparison-tool, Property 2: Input Validation Consistency
 * 
 * Property: For any input data (options, constraints, or configuration), the system 
 * should consistently validate completeness and reject invalid inputs while accepting valid ones
 * 
 * Validates: Requirements 1.2, 2.4, 6.1
 */

describe('Property 2: Input Validation Consistency', () => {
  let validator: OptionValidator;

  beforeEach(() => {
    validator = new OptionValidator();
  });

  test('Property 2: Valid options are consistently accepted', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() === s && s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
        arbitraryOptionCategory(),
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim() === s && s.trim().length > 0),
          fc.record({
            value: fc.oneof(
              fc.string({ minLength: 1, maxLength: 100 }),
              fc.float({ min: 0, max: 10000 }).filter(n => !isNaN(n) && isFinite(n)),
              fc.boolean()
            ),
            unit: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
            confidence: fc.option(fc.float({ min: 0, max: 1 }).filter(n => !isNaN(n) && isFinite(n)), { nil: undefined }),
            source: fc.option(fc.webUrl(), { nil: undefined })
          }),
          { minKeys: 1, maxKeys: 10 }
        ),
        (name, description, category, attributes) => {
          // Create a well-formed option
          const option = OptionFactory.create({
            name,
            description,
            category,
            attributes
          });

          // Action: Validate the option
          const result = validator.validate(option);

          // Assertion: Well-formed options should be valid
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Invalid IDs are consistently rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''), // Empty string
          fc.string().filter(s => s !== s.trim()), // String with whitespace
          fc.constant(null),
          fc.constant(undefined)
        ),
        (invalidId) => {
          // Create an option with invalid ID
          const option = OptionFactory.create({
            name: 'Test Option',
            description: 'Test description',
            category: 'api',
            attributes: { 'test': { value: 'test' } }
          });
          
          (option as any).id = invalidId;

          // Action: Validate the option
          const result = validator.validate(option);

          // Assertion: Invalid IDs should be rejected
          expect(result.isValid).toBe(false);
          expect(result.errors.some(error => 
            error.includes('Option ID') || error.includes('null or undefined')
          )).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 2: Invalid names are consistently rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''), // Empty string
          fc.constant(null),
          fc.constant(undefined),
          fc.string().filter(s => s !== s.trim() && s.length > 0), // String with whitespace
          fc.string({ minLength: 101 }) // Too long
        ),
        (invalidName) => {
          const option = OptionFactory.create({
            name: 'Valid Name',
            description: 'Test description',
            category: 'api',
            attributes: { 'test': { value: 'test' } }
          });
          
          (option as any).name = invalidName;

          // Action: Validate the option
          const result = validator.validate(option);

          // Assertion: Invalid names should be rejected
          expect(result.isValid).toBe(false);
          expect(result.errors.some(error => 
            error.includes('name') || error.includes('null or undefined')
          )).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 2: Invalid categories are consistently rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter(s => !['api', 'cloud-service', 'framework', 'tool', 'custom'].includes(s)),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant('')
        ),
        (invalidCategory) => {
          const option = OptionFactory.create({
            name: 'Test Option',
            description: 'Test description',
            category: 'api',
            attributes: { 'test': { value: 'test' } }
          });
          
          (option as any).category = invalidCategory;

          // Action: Validate the option
          const result = validator.validate(option);

          // Assertion: Invalid categories should be rejected
          expect(result.isValid).toBe(false);
          expect(result.errors.some(error => 
            error.includes('category') || error.includes('null or undefined')
          )).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 2: Invalid attribute structures are consistently rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant('not an object'),
          fc.constant([]), // Array instead of object
          fc.constant({}) // Empty attributes
        ),
        (invalidAttributes) => {
          const option = OptionFactory.create({
            name: 'Test Option',
            description: 'Test description',
            category: 'api',
            attributes: { 'test': { value: 'test' } }
          });
          
          (option as any).attributes = invalidAttributes;

          // Action: Validate the option
          const result = validator.validate(option);

          // Assertion: Invalid attribute structures should be rejected
          expect(result.isValid).toBe(false);
          expect(result.errors.some(error => 
            error.includes('Attributes') || error.includes('attribute') || error.includes('null or undefined')
          )).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 2: Invalid confidence values are consistently rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.float({ min: Math.fround(1.1), max: Math.fround(10) }), // > 1
          fc.float({ min: Math.fround(-10), max: Math.fround(-0.1) }), // < 0
          fc.constant(NaN),
          fc.constant(Infinity),
          fc.constant(-Infinity),
          fc.constant('not a number')
        ),
        (invalidConfidence) => {
          const option = OptionFactory.create({
            name: 'Test Option',
            description: 'Test description',
            category: 'api',
            attributes: { 
              'test': { 
                value: 'test',
                confidence: 0.8 // Start with valid confidence
              } 
            }
          });
          
          // Corrupt the confidence value
          (option.attributes.test as any).confidence = invalidConfidence;

          // Action: Validate the option
          const result = validator.validate(option);

          // Assertion: Invalid confidence values should be rejected
          expect(result.isValid).toBe(false);
          expect(result.errors.some(error => 
            error.includes('confidence')
          )).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 2: Invalid date values are consistently rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('not a date'),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(new Date('invalid')),
          fc.constant({}),
          fc.constant([])
        ),
        (invalidDate) => {
          const option = OptionFactory.create({
            name: 'Test Option',
            description: 'Test description',
            category: 'api',
            attributes: { 'test': { value: 'test' } }
          });
          
          // Corrupt the date values
          (option.metadata as any).dateAdded = invalidDate;
          (option.metadata as any).lastUpdated = invalidDate;

          // Action: Validate the option
          const result = validator.validate(option);

          // Assertion: Invalid dates should be rejected
          expect(result.isValid).toBe(false);
          expect(result.errors.some(error => 
            error.includes('date') || error.includes('Date') || error.includes('null or undefined')
          )).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 2: Validation is deterministic for same input', () => {
    fc.assert(
      fc.property(arbitraryOption(), (option) => {
        // Action: Validate the same option multiple times
        const result1 = validator.validate(option);
        const result2 = validator.validate(option);
        const result3 = validator.validate(option);

        // Assertion: Results should be identical
        expect(result1.isValid).toBe(result2.isValid);
        expect(result2.isValid).toBe(result3.isValid);
        
        expect(result1.errors).toEqual(result2.errors);
        expect(result2.errors).toEqual(result3.errors);
        
        expect(result1.warnings).toEqual(result2.warnings);
        expect(result2.warnings).toEqual(result3.warnings);
      }),
      { numRuns: 100 }
    );
  });

  test('Property 2: Validation errors are informative and specific', () => {
    fc.assert(
      fc.property(arbitraryOption(), (option) => {
        // Action: Validate the option
        const result = validator.validate(option);

        // Assertion: If invalid, errors should be informative
        if (!result.isValid) {
          expect(result.errors.length).toBeGreaterThan(0);
          
          // Each error should be a non-empty string
          for (const error of result.errors) {
            expect(typeof error).toBe('string');
            expect(error.length).toBeGreaterThan(0);
            expect(error.trim()).toBe(error);
          }
          
          // Warnings should also be well-formed if present
          for (const warning of result.warnings) {
            expect(typeof warning).toBe('string');
            expect(warning.length).toBeGreaterThan(0);
            expect(warning.trim()).toBe(warning);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  test('Property 2: Validation handles edge cases gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
          fc.constant([]),
          fc.constant('not an option'),
          fc.constant(42),
          fc.constant(true)
        ),
        (edgeCase) => {
          // Action: Validate edge case inputs
          const result = validator.validate(edgeCase as any);

          // Assertion: Should handle gracefully without throwing
          expect(result).toBeDefined();
          expect(typeof result.isValid).toBe('boolean');
          expect(Array.isArray(result.errors)).toBe(true);
          expect(Array.isArray(result.warnings)).toBe(true);
          
          // Edge cases should be invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});