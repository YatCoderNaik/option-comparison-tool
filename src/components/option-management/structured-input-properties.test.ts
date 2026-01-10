/**
 * Property Test 4: Structured Input Support
 * Validates Requirements 1.4 - Support for structured input formats
 */

import fc from 'fast-check';
import { OptionValidator } from './option-validator';
import { OptionFactory } from './option-factory';
import { Option } from '../../types/core';

describe('Property 4: Structured Input Support', () => {
  const validator = new OptionValidator();
  const factory = new OptionFactory();

  // Arbitrary for structured input formats
  const structuredInputArbitrary = fc.record({
    // CSV-like structure
    csvData: fc.record({
      headers: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 10 }),
      rows: fc.array(
        fc.array(fc.oneof(fc.string(), fc.float(), fc.integer()), { minLength: 3, maxLength: 10 }),
        { minLength: 1, maxLength: 50 }
      )
    }),
    
    // JSON structure
    jsonData: fc.record({
      options: fc.array(fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        category: fc.constantFrom('api', 'cloud-service', 'framework', 'tool'),
        attributes: fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.record({
            value: fc.oneof(fc.float(), fc.integer(), fc.string()),
            unit: fc.string({ minLength: 1, maxLength: 10 })
          })
        )
      }), { minLength: 1, maxLength: 20 })
    }),
    
    // API response structure
    apiData: fc.record({
      data: fc.array(fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        properties: fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.oneof(fc.float(), fc.integer(), fc.string(), fc.boolean())
        ),
        metadata: fc.record({
          source: fc.string({ minLength: 1, maxLength: 20 }),
          timestamp: fc.date(),
          version: fc.string({ minLength: 1, maxLength: 10 })
        })
      }), { minLength: 1, maxLength: 20 })
    })
  });

  test('Property 4.1: CSV input parsing preserves data integrity', () => {
    fc.assert(fc.property(
      structuredInputArbitrary,
      (input) => {
        const { csvData } = input;
        
        // Convert CSV structure to options
        const options: Partial<Option>[] = csvData.rows.map(row => {
          const option: any = { attributes: {} };
          
          csvData.headers.forEach((header, index) => {
            if (index < row.length) {
              const value = row[index];
              
              if (header === 'name') {
                option.name = String(value);
              } else if (header === 'category') {
                option.category = String(value);
              } else if (header === 'description') {
                option.description = String(value);
              } else {
                // Treat as attribute
                option.attributes[header] = {
                  value: value,
                  unit: typeof value === 'number' ? 'units' : 'text'
                };
              }
            }
          });
          
          return option;
        });
        
        // Validate that structured input can be processed
        const validOptions = options.filter(opt => 
          opt.name && 
          opt.name.length > 0 && 
          typeof opt.name === 'string'
        );
        
        if (validOptions.length === 0) return true; // Skip if no valid options
        
        // Each valid option should be processable
        validOptions.forEach(option => {
          if (option.name && option.attributes) {
            // Should be able to create a complete option
            const completeOption = factory.createOption({
              name: option.name,
              description: option.description || 'Generated from CSV',
              category: (option.category as any) || 'api',
              attributes: option.attributes
            });
            
            expect(completeOption).toBeDefined();
            expect(completeOption.name).toBe(option.name);
            expect(Object.keys(completeOption.attributes)).toEqual(
              Object.keys(option.attributes)
            );
          }
        });
        
        return true;
      }
    ), { numRuns: 50 });
  });

  test('Property 4.2: JSON input maintains attribute structure', () => {
    fc.assert(fc.property(
      structuredInputArbitrary,
      (input) => {
        const { jsonData } = input;
        
        // Process JSON options
        jsonData.options.forEach(jsonOption => {
          if (jsonOption.name && jsonOption.attributes) {
            const option = factory.createOption({
              name: jsonOption.name,
              description: 'Generated from JSON',
              category: jsonOption.category,
              attributes: jsonOption.attributes
            });
            
            // Attribute structure should be preserved
            Object.keys(jsonOption.attributes).forEach(attrKey => {
              expect(option.attributes).toHaveProperty(attrKey);
              expect(option.attributes[attrKey].value).toBeDefined();
              expect(option.attributes[attrKey].unit).toBeDefined();
            });
            
            // Validation should pass for well-formed options
            const validation = validator.validateOption(option);
            if (validation.isValid) {
              expect(option.name).toBe(jsonOption.name);
              expect(option.category).toBe(jsonOption.category);
            }
          }
        });
        
        return true;
      }
    ), { numRuns: 50 });
  });

  test('Property 4.3: API response transformation preserves metadata', () => {
    fc.assert(fc.property(
      structuredInputArbitrary,
      (input) => {
        const { apiData } = input;
        
        // Transform API data to options
        apiData.data.forEach(apiItem => {
          if (apiItem.name && apiItem.properties) {
            // Convert properties to attributes
            const attributes: Record<string, any> = {};
            Object.entries(apiItem.properties).forEach(([key, value]) => {
              attributes[key] = {
                value: value,
                unit: typeof value === 'number' ? 'units' : 'text'
              };
            });
            
            const option = factory.createOption({
              name: apiItem.name,
              description: `Imported from ${apiItem.metadata.source}`,
              category: 'api',
              attributes: attributes
            });
            
            // Metadata should be preserved in option metadata
            expect(option.metadata.entryMethod).toBe('api_import');
            expect(option.metadata.dateAdded).toBeDefined();
            
            // Original data structure should be recoverable
            Object.keys(apiItem.properties).forEach(propKey => {
              expect(option.attributes).toHaveProperty(propKey);
            });
          }
        });
        
        return true;
      }
    ), { numRuns: 50 });
  });

  test('Property 4.4: Mixed format inputs are handled consistently', () => {
    fc.assert(fc.property(
      structuredInputArbitrary,
      (input) => {
        const allOptions: Option[] = [];
        
        // Process CSV data
        if (input.csvData.rows.length > 0 && input.csvData.headers.includes('name')) {
          const nameIndex = input.csvData.headers.indexOf('name');
          input.csvData.rows.forEach(row => {
            if (row[nameIndex] && typeof row[nameIndex] === 'string') {
              const attributes: Record<string, any> = {};
              input.csvData.headers.forEach((header, index) => {
                if (header !== 'name' && index < row.length) {
                  attributes[header] = {
                    value: row[index],
                    unit: 'units'
                  };
                }
              });
              
              const option = factory.createOption({
                name: String(row[nameIndex]),
                description: 'From CSV',
                category: 'api',
                attributes: attributes
              });
              allOptions.push(option);
            }
          });
        }
        
        // Process JSON data
        input.jsonData.options.forEach(jsonOpt => {
          if (jsonOpt.name && jsonOpt.attributes) {
            const option = factory.createOption({
              name: jsonOpt.name,
              description: 'From JSON',
              category: jsonOpt.category,
              attributes: jsonOpt.attributes
            });
            allOptions.push(option);
          }
        });
        
        // All options should have consistent structure
        if (allOptions.length > 0) {
          allOptions.forEach(option => {
            expect(option.id).toBeDefined();
            expect(option.name).toBeDefined();
            expect(option.description).toBeDefined();
            expect(option.category).toBeDefined();
            expect(option.attributes).toBeDefined();
            expect(option.metadata).toBeDefined();
            
            // Metadata should indicate source
            expect(['manual', 'api_import', 'bulk_import']).toContain(option.metadata.entryMethod);
          });
          
          // Options from different sources should be comparable
          const validation = validator.validateOptions(allOptions);
          expect(validation.isValid).toBe(true);
        }
        
        return true;
      }
    ), { numRuns: 30 });
  });

  test('Property 4.5: Malformed structured input fails gracefully', () => {
    fc.assert(fc.property(
      fc.record({
        malformedCsv: fc.record({
          headers: fc.array(fc.string(), { maxLength: 5 }),
          rows: fc.array(
            fc.array(fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)), { maxLength: 10 }),
            { maxLength: 10 }
          )
        }),
        malformedJson: fc.record({
          options: fc.array(fc.record({
            name: fc.oneof(fc.string(), fc.constant(null), fc.constant('')),
            attributes: fc.oneof(
              fc.dictionary(fc.string(), fc.anything()),
              fc.constant(null),
              fc.constant({})
            )
          }), { maxLength: 5 })
        })
      }),
      (malformedInput) => {
        // Attempt to process malformed CSV
        const csvOptions: Option[] = [];
        try {
          malformedInput.malformedCsv.rows.forEach(row => {
            const nameIndex = malformedInput.malformedCsv.headers.indexOf('name');
            if (nameIndex >= 0 && row[nameIndex]) {
              const option = factory.createOption({
                name: String(row[nameIndex]),
                description: 'Malformed CSV test',
                category: 'api',
                attributes: {}
              });
              csvOptions.push(option);
            }
          });
        } catch (error) {
          // Should fail gracefully
          expect(error).toBeDefined();
        }
        
        // Attempt to process malformed JSON
        const jsonOptions: Option[] = [];
        try {
          malformedInput.malformedJson.options.forEach(jsonOpt => {
            if (jsonOpt.name && jsonOpt.name.length > 0) {
              const option = factory.createOption({
                name: jsonOpt.name,
                description: 'Malformed JSON test',
                category: 'api',
                attributes: jsonOpt.attributes || {}
              });
              jsonOptions.push(option);
            }
          });
        } catch (error) {
          // Should fail gracefully
          expect(error).toBeDefined();
        }
        
        // Valid options should still be processable
        const allValidOptions = [...csvOptions, ...jsonOptions];
        if (allValidOptions.length > 0) {
          allValidOptions.forEach(option => {
            const validation = validator.validateOption(option);
            expect(validation).toBeDefined();
            // Even if invalid, should provide meaningful error messages
            if (!validation.isValid) {
              expect(validation.errors.length).toBeGreaterThan(0);
            }
          });
        }
        
        return true;
      }
    ), { numRuns: 30 });
  });
});