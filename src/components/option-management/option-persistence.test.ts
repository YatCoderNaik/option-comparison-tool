// Property-based tests for option data persistence (Property 1: Data Round-trip Consistency)
import fc from 'fast-check';
import { Option } from '../../types';
import { arbitraryOption } from '../../utils/generators';
import { OptionValidator } from './option-validator';

/**
 * Feature: option-comparison-tool, Property 1: Data Round-trip Consistency
 * 
 * Property: For any option with valid attributes, adding it to the system and then 
 * retrieving it should return an equivalent option with all attributes preserved
 * 
 * Validates: Requirements 1.1, 1.5, 7.4
 */

// Mock storage for testing round-trip consistency
class MockOptionStorage {
  private storage = new Map<string, string>();

  save(option: Option): void {
    // Simulate serialization/deserialization that might occur in real storage
    const serialized = JSON.stringify(option);
    this.storage.set(option.id, serialized);
  }

  retrieve(id: string): Option | null {
    const serialized = this.storage.get(id);
    if (!serialized) return null;
    
    // Simulate deserialization with date parsing
    const parsed = JSON.parse(serialized);
    
    // Convert date strings back to Date objects (as would happen in real storage)
    if (parsed.metadata) {
      if (parsed.metadata.dateAdded) {
        parsed.metadata.dateAdded = new Date(parsed.metadata.dateAdded);
      }
      if (parsed.metadata.lastUpdated) {
        parsed.metadata.lastUpdated = new Date(parsed.metadata.lastUpdated);
      }
    }
    
    // Convert attribute dates
    if (parsed.attributes) {
      for (const attr of Object.values(parsed.attributes) as any[]) {
        if (attr.lastUpdated) {
          attr.lastUpdated = new Date(attr.lastUpdated);
        }
      }
    }
    
    return parsed as Option;
  }

  delete(id: string): boolean {
    return this.storage.delete(id);
  }

  clear(): void {
    this.storage.clear();
  }
}

describe('Property 1: Data Round-trip Consistency', () => {
  let storage: MockOptionStorage;
  let validator: OptionValidator;

  beforeEach(() => {
    storage = new MockOptionStorage();
    validator = new OptionValidator();
  });

  afterEach(() => {
    storage.clear();
  });

  test('Property 1: Round-trip consistency for valid options', () => {
    fc.assert(
      fc.property(arbitraryOption(), (originalOption) => {
        // Pre-condition: Option must be valid
        const validationResult = validator.validate(originalOption);
        fc.pre(validationResult.isValid);

        // Action: Save and retrieve the option
        storage.save(originalOption);
        const retrievedOption = storage.retrieve(originalOption.id);

        // Assertions: Retrieved option should be equivalent to original
        expect(retrievedOption).not.toBeNull();
        expect(retrievedOption!.id).toBe(originalOption.id);
        expect(retrievedOption!.name).toBe(originalOption.name);
        expect(retrievedOption!.description).toBe(originalOption.description);
        expect(retrievedOption!.category).toBe(originalOption.category);

        // Verify metadata preservation
        expect(retrievedOption!.metadata.entryMethod).toBe(originalOption.metadata.entryMethod);
        expect(retrievedOption!.metadata.dateAdded.getTime()).toBe(originalOption.metadata.dateAdded.getTime());
        expect(retrievedOption!.metadata.lastUpdated.getTime()).toBe(originalOption.metadata.lastUpdated.getTime());
        
        // Verify data quality preservation
        expect(retrievedOption!.metadata.dataQuality.completeness).toBe(originalOption.metadata.dataQuality.completeness);
        expect(retrievedOption!.metadata.dataQuality.freshness).toBe(originalOption.metadata.dataQuality.freshness);
        expect(retrievedOption!.metadata.dataQuality.reliability).toBe(originalOption.metadata.dataQuality.reliability);

        // Verify attributes preservation
        const originalAttrs = Object.keys(originalOption.attributes);
        const retrievedAttrs = Object.keys(retrievedOption!.attributes);
        expect(retrievedAttrs.sort()).toEqual(originalAttrs.sort());

        for (const key of originalAttrs) {
          const original = originalOption.attributes[key];
          const retrieved = retrievedOption!.attributes[key];
          
          expect(retrieved.value).toEqual(original.value);
          expect(retrieved.unit).toBe(original.unit);
          expect(retrieved.confidence).toBe(original.confidence);
          expect(retrieved.source).toBe(original.source);
          
          if (original.lastUpdated && retrieved.lastUpdated) {
            expect(retrieved.lastUpdated.getTime()).toBe(original.lastUpdated.getTime());
          }
        }

        // Verify the retrieved option is still valid
        const retrievedValidation = validator.validate(retrievedOption!);
        expect(retrievedValidation.isValid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  test('Property 1: Round-trip consistency preserves validation state', () => {
    fc.assert(
      fc.property(arbitraryOption(), (originalOption) => {
        // Action: Save and retrieve regardless of initial validity
        storage.save(originalOption);
        const retrievedOption = storage.retrieve(originalOption.id);

        // Assertion: Validation state should be preserved
        const originalValidation = validator.validate(originalOption);
        const retrievedValidation = validator.validate(retrievedOption!);
        
        expect(retrievedValidation.isValid).toBe(originalValidation.isValid);
        
        // If original was invalid, retrieved should have same or similar errors
        if (!originalValidation.isValid) {
          expect(retrievedValidation.errors.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('Property 1: Round-trip consistency for option removal', () => {
    fc.assert(
      fc.property(arbitraryOption(), (option) => {
        // Pre-condition: Option must be valid for storage
        const validationResult = validator.validate(option);
        fc.pre(validationResult.isValid);

        // Action: Save, verify exists, delete, verify gone
        storage.save(option);
        expect(storage.retrieve(option.id)).not.toBeNull();
        
        const deleted = storage.delete(option.id);
        expect(deleted).toBe(true);
        
        const retrievedAfterDelete = storage.retrieve(option.id);
        expect(retrievedAfterDelete).toBeNull();
        
        // Attempting to delete again should return false
        const deletedAgain = storage.delete(option.id);
        expect(deletedAgain).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('Property 1: Round-trip consistency with attribute modifications', () => {
    fc.assert(
      fc.property(
        arbitraryOption(),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(fc.string(), fc.float(), fc.boolean()),
        (originalOption, newAttrKey, newAttrValue) => {
          // Pre-condition: Original option must be valid
          const validationResult = validator.validate(originalOption);
          fc.pre(validationResult.isValid);
          fc.pre(!originalOption.attributes.hasOwnProperty(newAttrKey));

          // Action: Add new attribute and test round-trip
          const modifiedOption = {
            ...originalOption,
            attributes: {
              ...originalOption.attributes,
              [newAttrKey]: {
                value: newAttrValue,
                confidence: 0.8,
                lastUpdated: new Date()
              }
            }
          };

          storage.save(modifiedOption);
          const retrieved = storage.retrieve(modifiedOption.id);

          // Assertion: New attribute should be preserved
          expect(retrieved).not.toBeNull();
          expect(retrieved!.attributes[newAttrKey]).toBeDefined();
          expect(retrieved!.attributes[newAttrKey].value).toEqual(newAttrValue);
          expect(retrieved!.attributes[newAttrKey].confidence).toBe(0.8);
          
          // Original attributes should still be preserved
          for (const key of Object.keys(originalOption.attributes)) {
            expect(retrieved!.attributes[key]).toBeDefined();
            expect(retrieved!.attributes[key].value).toEqual(originalOption.attributes[key].value);
          }
        }
      ),
      { numRuns: 50 } // Fewer runs for this more complex test
    );
  });

  test('Property 1: Round-trip consistency maintains attribute order independence', () => {
    fc.assert(
      fc.property(arbitraryOption(), (option) => {
        // Pre-condition: Option must be valid
        const validationResult = validator.validate(option);
        fc.pre(validationResult.isValid);
        fc.pre(Object.keys(option.attributes).length >= 2);

        // Action: Create version with reordered attributes
        const keys = Object.keys(option.attributes);
        const reorderedKeys = [...keys].reverse();
        const reorderedAttributes: typeof option.attributes = {};
        
        for (const key of reorderedKeys) {
          reorderedAttributes[key] = option.attributes[key];
        }

        const reorderedOption = {
          ...option,
          attributes: reorderedAttributes
        };

        // Save both versions
        storage.save(option);
        const originalRetrieved = storage.retrieve(option.id);
        
        storage.save(reorderedOption);
        const reorderedRetrieved = storage.retrieve(option.id);

        // Assertion: Both should have equivalent content regardless of order
        expect(originalRetrieved).not.toBeNull();
        expect(reorderedRetrieved).not.toBeNull();
        
        const originalKeys = Object.keys(originalRetrieved!.attributes).sort();
        const reorderedKeys2 = Object.keys(reorderedRetrieved!.attributes).sort();
        expect(originalKeys).toEqual(reorderedKeys2);

        // All attribute values should be the same
        for (const key of originalKeys) {
          expect(reorderedRetrieved!.attributes[key].value)
            .toEqual(originalRetrieved!.attributes[key].value);
        }
      }),
      { numRuns: 50 }
    );
  });
});