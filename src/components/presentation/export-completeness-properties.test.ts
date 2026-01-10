import * as fc from 'fast-check';
import { ExportManager } from './export-manager';
import { FormattedComparisonResult } from '../comparison-engine/result-formatter';

/**
 * Property 19: Complete Export Functionality
 * 
 * This property validates that exports preserve complete context and maintain data integrity
 * across all supported formats (JSON, CSV, PDF).
 * 
 * Validates Requirements:
 * - 7.1: Export in common formats (PDF, CSV, JSON)
 * - 7.2: Complete context in exports (constraints, weights, timestamps)
 */

describe('Property 19: Complete Export Functionality', () => {
  let exportManager: ExportManager;

  beforeEach(() => {
    exportManager = new ExportManager();
  });

  // Create a valid mock result for testing
  const createMockResult = (): FormattedComparisonResult => ({
    summary: {
      totalOptions: 3,
      includedOptions: 2,
      excludedOptions: 1,
      totalCriteria: 3,
      scoringCriteria: 2,
      neutralCriteria: 1,
      overallConfidence: 0.85,
      topRecommendation: {
        optionId: 'opt1',
        optionName: 'Option 1',
        score: 0.92,
        rank: 1
      }
    },
    matrix: {
      headers: {
        options: [
          { id: 'opt1', name: 'Option 1', rank: 1, score: 0.92, isExcluded: false },
          { id: 'opt2', name: 'Option 2', rank: 2, score: 0.78, isExcluded: false },
          { id: 'opt3', name: 'Option 3', rank: 3, score: 0.45, isExcluded: true }
        ],
        criteria: [
          { id: 'crit1', name: 'Performance', type: 'number', weight: 0.4, criterionType: 'benefit' as const, isHardRequirement: false },
          { id: 'crit2', name: 'Cost', type: 'number', weight: 0.4, criterionType: 'cost' as const, isHardRequirement: true },
          { id: 'crit3', name: 'License', type: 'string', weight: 0.2, criterionType: 'neutral' as const, isHardRequirement: false }
        ]
      },
      cells: [
        [
          { value: 95, normalizedScore: 0.95, confidence: 0.9, isMissing: false },
          { value: 1000, normalizedScore: 0.8, confidence: 0.85, isMissing: false },
          { value: 'MIT', normalizedScore: undefined, confidence: 0.95, isMissing: false }
        ],
        [
          { value: 87, normalizedScore: 0.87, confidence: 0.8, isMissing: false },
          { value: 1200, normalizedScore: 0.7, confidence: 0.9, isMissing: false },
          { value: 'Apache', normalizedScore: undefined, confidence: 0.9, isMissing: false }
        ],
        [
          { value: 65, normalizedScore: 0.65, confidence: 0.7, isMissing: false },
          { value: 2000, normalizedScore: 0.3, confidence: 0.8, isMissing: false, violatesConstraint: true, violationReason: 'Exceeds budget limit' },
          { value: 'GPL', normalizedScore: undefined, confidence: 0.85, isMissing: false }
        ]
      ],
      excludedOptionsDetails: []
    },
    tradeoffs: {
      optionAnalyses: {},
      scenarioGuidance: [],
      keyDifferentiators: []
    },
    insights: {
      summary: [],
      dataQuality: {
        completeness: 0.85,
        freshness: 0.9,
        reliability: 0.8,
        issues: [],
        recommendations: []
      },
      confidenceBreakdown: {
        overall: 0.85,
        components: {
          dataCompleteness: 0.85,
          dataFreshness: 0.9,
          sourceReliability: 0.8,
          algorithmCertainty: 0.85
        },
        factors: []
      }
    },
    metadata: {
      generatedAt: new Date('2024-01-15T10:00:00Z'),
      algorithmVersion: '1.0.0',
      dataVersion: '1.0.0',
      transparency: {
        weightsUsed: { crit1: 0.4, crit2: 0.4, crit3: 0.2 },
        normalizationApplied: true,
        outlierHandling: false,
        missingValueHandling: 'exclude',
        excludedCriteria: []
      },
      validation: {
        inputValidation: true,
        constraintValidation: true,
        dataQualityCheck: true,
        warnings: []
      }
    }
  });

  // Arbitraries for generating test variations
  const exportConfigArbitrary = fc.record({
    format: fc.constantFrom('json' as const, 'csv' as const, 'pdf' as const),
    includeMetadata: fc.boolean(),
    includeExcludedOptions: fc.boolean(),
    includeConfidenceScores: fc.boolean(),
    includeVisualIndicators: fc.boolean()
  });

  const optionCountArbitrary = fc.integer({ min: 1, max: 10 });
  const criteriaCountArbitrary = fc.integer({ min: 1, max: 8 });

  describe('JSON Export Completeness', () => {
    it('should preserve all essential data in JSON exports', () => {
      fc.assert(
        fc.asyncProperty(
          optionCountArbitrary,
          criteriaCountArbitrary,
          fc.boolean(), // includeMetadata
          async (optionCount, criteriaCount, includeMetadata) => {
            const result = createMockResult();
            
            // Adjust the mock result based on generated parameters
            result.summary.totalOptions = optionCount;
            result.summary.totalCriteria = criteriaCount;
            
            const exportResult = await exportManager.exportResult(result, { 
              format: 'json',
              includeMetadata
            });

            expect(exportResult.success).toBe(true);
            expect(exportResult.data).toBeDefined();
            expect(exportResult.checksum).toBeDefined();

            const exportedData = JSON.parse(exportResult.data as string);
            
            // Verify essential structure preservation
            expect(exportedData.summary).toBeDefined();
            expect(exportedData.matrix).toBeDefined();
            expect(exportedData.metadata).toBeDefined();

            // Verify summary data preservation
            expect(exportedData.summary.totalOptions).toBe(result.summary.totalOptions);
            expect(exportedData.summary.overallConfidence).toBe(result.summary.overallConfidence);

            // Verify metadata preservation
            expect(exportedData.metadata.exportTimestamp).toBeDefined();
            expect(exportedData.metadata.originalAnalysisTimestamp).toBeDefined();
            expect(exportedData.metadata.dataIntegrityHash).toBeDefined();

            // Conditional metadata inclusion
            if (includeMetadata) {
              expect(exportedData.tradeoffs).toBeDefined();
              expect(exportedData.insights).toBeDefined();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain data integrity across export configurations', () => {
      fc.assert(
        fc.asyncProperty(
          exportConfigArbitrary,
          async (config) => {
            const result = createMockResult();
            const exportResult = await exportManager.exportResult(result, config);

            expect(exportResult.success).toBe(true);
            expect(exportResult.checksum).toBeDefined();
            expect(exportResult.size).toBeGreaterThan(0);

            if (config.format === 'json') {
              const exportedData = JSON.parse(exportResult.data as string);

              // Core data should always be present
              expect(exportedData.summary).toBeDefined();
              expect(exportedData.matrix).toBeDefined();

              // Optional data should respect configuration
              if (config.includeMetadata) {
                expect(exportedData.tradeoffs).toBeDefined();
                expect(exportedData.insights).toBeDefined();
              }

              // Excluded options handling
              if (!config.includeExcludedOptions) {
                const hasExcludedOptions = exportedData.matrix.headers.options.some(
                  (option: any) => option.isExcluded
                );
                expect(hasExcludedOptions).toBe(false);
              }

              // Confidence scores handling
              if (!config.includeConfidenceScores && exportedData.matrix.cells.length > 0) {
                const firstCell = exportedData.matrix.cells[0][0];
                if (firstCell) {
                  expect(firstCell.confidence).toBeUndefined();
                }
              }
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('CSV Export Completeness', () => {
    it('should preserve tabular data structure in CSV exports', () => {
      fc.assert(
        fc.asyncProperty(
          optionCountArbitrary,
          criteriaCountArbitrary,
          fc.boolean(), // includeMetadata
          async (optionCount, criteriaCount, includeMetadata) => {
            const result = createMockResult();
            result.summary.totalOptions = optionCount;
            result.summary.totalCriteria = criteriaCount;

            const exportResult = await exportManager.exportResult(result, { 
              format: 'csv',
              includeMetadata
            });

            expect(exportResult.success).toBe(true);
            expect(exportResult.mimeType).toBe('text/csv');

            const csvContent = exportResult.data as string;
            const lines = csvContent.split('\n').filter(line => line.trim());

            // Should have data header row
            const headerLine = lines.find(line => line.startsWith('Option,'));
            expect(headerLine).toBeDefined();

            // Should include all criteria in headers
            result.matrix.headers.criteria.forEach(criterion => {
              expect(csvContent).toContain(criterion.name);
            });

            // Metadata handling
            if (includeMetadata) {
              expect(lines.some(line => line.includes('Export Metadata'))).toBe(true);
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Cross-Format Consistency', () => {
    it('should maintain core data consistency across all export formats', () => {
      fc.assert(
        fc.asyncProperty(
          optionCountArbitrary,
          async (optionCount) => {
            const result = createMockResult();
            result.summary.totalOptions = optionCount;

            const jsonExport = await exportManager.exportResult(result, { 
              format: 'json',
              includeMetadata: false // For easier comparison
            });
            const csvExport = await exportManager.exportResult(result, { 
              format: 'csv',
              includeMetadata: false
            });
            const pdfExport = await exportManager.exportResult(result, { 
              format: 'pdf',
              includeMetadata: false
            });

            // All exports should succeed
            expect(jsonExport.success).toBe(true);
            expect(csvExport.success).toBe(true);
            expect(pdfExport.success).toBe(true);

            // All should have valid checksums
            expect(jsonExport.checksum).toBeDefined();
            expect(csvExport.checksum).toBeDefined();
            expect(pdfExport.checksum).toBeDefined();

            // JSON should contain the core summary data
            const jsonData = JSON.parse(jsonExport.data as string);
            expect(jsonData.summary.totalOptions).toBe(result.summary.totalOptions);
            expect(jsonData.summary.overallConfidence).toBe(result.summary.overallConfidence);

            // CSV should contain the same option names
            const csvContent = csvExport.data as string;
            result.matrix.headers.options
              .filter(opt => !opt.isExcluded)
              .forEach(option => {
                expect(csvContent).toContain(option.name);
              });

            // PDF should contain summary information
            const pdfContent = (pdfExport.data as Buffer).toString();
            expect(pdfContent).toContain('Total Options');
            expect(pdfContent).toContain(result.summary.totalOptions.toString());
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Data Integrity Verification', () => {
    it('should generate consistent checksums for identical data', () => {
      fc.assert(
        fc.asyncProperty(
          fc.float({ min: 0, max: 1 }), // confidence variation
          async (confidence) => {
            const result = createMockResult();
            result.summary.overallConfidence = confidence;

            const export1 = await exportManager.exportResult(result, { format: 'json' });
            const export2 = await exportManager.exportResult(result, { format: 'json' });

            expect(export1.success).toBe(true);
            expect(export2.success).toBe(true);

            // Parse and re-stringify to normalize any timestamp differences
            const data1 = JSON.parse(export1.data as string);
            const data2 = JSON.parse(export2.data as string);

            // Data integrity hashes should be the same for the core data
            expect(data1.metadata.dataIntegrityHash).toBe(data2.metadata.dataIntegrityHash);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should detect data corruption through checksum verification', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // totalOptions variation
          async (totalOptions) => {
            const result = createMockResult();
            result.summary.totalOptions = totalOptions;

            const exportResult = await exportManager.exportResult(result, { format: 'json' });
            
            expect(exportResult.success).toBe(true);
            
            const originalData = exportResult.data as string;
            const corruptedData = originalData.replace(/"totalOptions":\s*\d+/, '"totalOptions": 999');
            
            const isValid = exportManager.verifyDataIntegrity(
              result,
              corruptedData,
              exportResult.checksum
            );
            
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Export Configuration Handling', () => {
    it('should handle all valid export configurations without errors', () => {
      fc.assert(
        fc.asyncProperty(
          exportConfigArbitrary,
          fc.option(fc.string({ minLength: 1, maxLength: 50 })), // custom filename
          async (config, customFileName) => {
            const result = createMockResult();
            const exportConfig = customFileName ? { ...config, customFileName } : config;

            const exportResult = await exportManager.exportResult(result, exportConfig);

            expect(exportResult.success).toBe(true);
            expect(exportResult.fileName).toBeDefined();
            expect(exportResult.mimeType).toBeDefined();
            expect(exportResult.size).toBeGreaterThan(0);
            expect(exportResult.checksum).toBeDefined();

            if (customFileName) {
              expect(exportResult.fileName).toBe(customFileName);
            }

            // Verify MIME type matches format
            switch (config.format) {
              case 'json':
                expect(exportResult.mimeType).toBe('application/json');
                break;
              case 'csv':
                expect(exportResult.mimeType).toBe('text/csv');
                break;
              case 'pdf':
                expect(exportResult.mimeType).toBe('application/pdf');
                break;
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});