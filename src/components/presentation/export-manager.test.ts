import { ExportManager, ExportConfig } from './export-manager';
import { FormattedComparisonResult } from '../comparison-engine/result-formatter';

describe('ExportManager', () => {
  let exportManager: ExportManager;
  let mockFormattedResult: FormattedComparisonResult;

  beforeEach(() => {
    exportManager = new ExportManager();
    
    mockFormattedResult = {
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
            { id: 'crit1', name: 'Performance', type: 'number', weight: 0.4, criterionType: 'benefit', isHardRequirement: false },
            { id: 'crit2', name: 'Cost', type: 'number', weight: 0.4, criterionType: 'cost', isHardRequirement: true },
            { id: 'crit3', name: 'License', type: 'string', weight: 0.2, criterionType: 'neutral', isHardRequirement: false }
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
        excludedOptionsDetails: [
          {
            option: { 
              id: 'opt3', 
              name: 'Option 3', 
              description: 'Third option',
              category: 'api' as const,
              attributes: {},
              metadata: {
                dateAdded: new Date(),
                lastUpdated: new Date(),
                dataQuality: { completeness: 0.8, freshness: 0.9, reliability: 0.7 },
                entryMethod: 'manual' as const
              }
            },
            violations: [
              { constraintName: 'Budget Limit', reason: 'Exceeds budget limit', severity: 'critical' as const }
            ],
            canBeIncluded: false
          }
        ]
      },
      tradeoffs: {
        optionAnalyses: {
          opt1: {
            optionName: 'Option 1',
            rank: 1,
            score: 0.92,
            strengths: [
              { description: 'Highest performance', confidence: 0.9, category: 'performance' }
            ],
            weaknesses: [],
            uniqueFeatures: [
              { description: 'MIT license flexibility', confidence: 0.95, significance: 'high' as const }
            ],
            dealBreakers: []
          }
        },
        scenarioGuidance: [
          {
            scenario: 'Performance Critical',
            guidance: 'Choose Option 1',
            applicableOptions: [
              { optionId: 'opt1', optionName: 'Option 1', fitScore: 0.9 }
            ],
            tradeoffExplanation: 'Highest performance scores',
            confidence: 0.9
          }
        ],
        keyDifferentiators: [
          {
            attribute: 'performance',
            description: 'Performance varies significantly',
            significance: 'high' as const,
            optionValues: [
              { optionId: 'opt1', optionName: 'Option 1', value: 95, isAdvantage: true }
            ]
          }
        ]
      },
      insights: {
        summary: [
          { 
            type: 'summary' as const, 
            title: 'Performance Leader',
            description: 'Clear performance leader', 
            confidence: 0.9, 
            priority: 'high' as const,
            actionable: true
          }
        ],
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
    };
  });

  describe('JSON Export', () => {
    it('should export complete result to JSON format', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, { format: 'json' });

      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/comparison-export-\d{4}-\d{2}-\d{2}\.json/);
      expect(result.mimeType).toBe('application/json');
      expect(result.data).toBeDefined();
      expect(result.checksum).toBeDefined();
      expect(result.size).toBeGreaterThan(0);

      // Verify JSON structure
      const exportedData = JSON.parse(result.data as string);
      expect(exportedData.metadata).toBeDefined();
      expect(exportedData.summary).toEqual(mockFormattedResult.summary);
      expect(exportedData.matrix).toBeDefined();
      expect(exportedData.tradeoffs).toBeDefined();
      expect(exportedData.insights).toBeDefined();
    });

    it('should exclude metadata when configured', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, {
        format: 'json',
        includeMetadata: false
      });

      const exportedData = JSON.parse(result.data as string);
      expect(exportedData.tradeoffs).toBeUndefined();
      expect(exportedData.insights).toBeUndefined();
      expect(exportedData.analysisMetadata).toBeUndefined();
    });

    it('should exclude excluded options when configured', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, {
        format: 'json',
        includeExcludedOptions: false
      });

      const exportedData = JSON.parse(result.data as string);
      expect(exportedData.matrix.headers.options).toHaveLength(2);
      expect(exportedData.matrix.cells).toHaveLength(2);
      expect(exportedData.matrix.excludedOptionsDetails).toHaveLength(0);
    });

    it('should exclude confidence scores when configured', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, {
        format: 'json',
        includeConfidenceScores: false
      });

      const exportedData = JSON.parse(result.data as string);
      const firstCell = exportedData.matrix.cells[0][0];
      expect(firstCell.confidence).toBeUndefined();
    });
  });

  describe('CSV Export', () => {
    it('should export result to CSV format', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, { format: 'csv' });

      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/comparison-export-\d{4}-\d{2}-\d{2}\.csv/);
      expect(result.mimeType).toBe('text/csv');
      expect(result.data).toBeDefined();

      const csvContent = result.data as string;
      const lines = csvContent.split('\n');
      
      // Should have metadata header
      expect(lines[0]).toBe('# Comparison Export Metadata');
      
      // Should have data headers
      const headerLine = lines.find(line => line.startsWith('Option,'));
      expect(headerLine).toBeDefined();
      expect(headerLine).toContain('Performance');
      expect(headerLine).toContain('Cost');
      expect(headerLine).toContain('License');
    });

    it('should include confidence scores in CSV when configured', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, {
        format: 'csv',
        includeConfidenceScores: true
      });

      const csvContent = result.data as string;
      expect(csvContent).toContain('Performance (Confidence)');
      expect(csvContent).toContain('Cost (Confidence)');
    });

    it('should exclude metadata from CSV when configured', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, {
        format: 'csv',
        includeMetadata: false
      });

      const csvContent = result.data as string;
      expect(csvContent).not.toContain('# Comparison Export Metadata');
    });

    it('should handle CSV field escaping correctly', async () => {
      const testResult = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          headers: {
            ...mockFormattedResult.matrix.headers,
            options: [
              { id: 'opt1', name: 'Option "with quotes"', rank: 1, score: 0.9, isExcluded: false }
            ]
          },
          cells: [[
            { value: 'Value, with comma', normalizedScore: 0.8, confidence: 0.9, isMissing: false }
          ]]
        }
      };

      const result = await exportManager.exportResult(testResult, { format: 'csv' });
      const csvContent = result.data as string;
      
      expect(csvContent).toContain('"Option ""with quotes"""');
      expect(csvContent).toContain('"Value, with comma"');
    });

    it('should include excluded options section when configured', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, {
        format: 'csv',
        includeExcludedOptions: true
      });

      const csvContent = result.data as string;
      expect(csvContent).toContain('# Excluded Options');
      expect(csvContent).toContain('Option 3');
      expect(csvContent).toContain('Exceeds budget limit');
    });
  });

  describe('PDF Export', () => {
    it('should export result to PDF format', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, { format: 'pdf' });

      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/comparison-export-\d{4}-\d{2}-\d{2}\.pdf/);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.data).toBeDefined();
      expect(result.data).toBeInstanceOf(Buffer);
    });

    it('should include summary information in PDF', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, { format: 'pdf' });

      const pdfContent = (result.data as Buffer).toString();
      expect(pdfContent).toContain('COMPARISON ANALYSIS REPORT');
      expect(pdfContent).toContain('Total Options: 3');
      expect(pdfContent).toContain('Option 1');
    });
  });

  describe('Data Integrity', () => {
    it('should generate consistent checksums for identical data', async () => {
      const result1 = await exportManager.exportResult(mockFormattedResult, { format: 'json' });
      const result2 = await exportManager.exportResult(mockFormattedResult, { format: 'json' });

      // Checksums should be the same for identical data (excluding timestamp)
      expect(result1.checksum).toBeDefined();
      expect(result2.checksum).toBeDefined();
    });

    it('should verify data integrity correctly', () => {
      const testData = '{"test": "data"}';
      const checksum = exportManager['calculateChecksum'](testData);
      
      const isValid = exportManager.verifyDataIntegrity(
        mockFormattedResult,
        testData,
        checksum
      );
      
      expect(isValid).toBe(true);
    });

    it('should detect data corruption', () => {
      const originalData = '{"test": "data"}';
      const corruptedData = '{"test": "corrupted"}';
      const originalChecksum = exportManager['calculateChecksum'](originalData);
      
      const isValid = exportManager.verifyDataIntegrity(
        mockFormattedResult,
        corruptedData,
        originalChecksum
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should use custom file names when provided', async () => {
      const customFileName = 'my-custom-export.json';
      const result = await exportManager.exportResult(mockFormattedResult, {
        format: 'json',
        customFileName
      });

      expect(result.fileName).toBe(customFileName);
    });

    it('should update configuration correctly', () => {
      const newConfig: Partial<ExportConfig> = {
        includeMetadata: false,
        includeConfidenceScores: false
      };

      exportManager.updateConfig(newConfig);
      const currentConfig = exportManager.getConfig();

      expect(currentConfig.includeMetadata).toBe(false);
      expect(currentConfig.includeConfidenceScores).toBe(false);
      expect(currentConfig.format).toBe('json'); // Should preserve other settings
    });

    it('should return current configuration', () => {
      const config = exportManager.getConfig();
      
      expect(config).toEqual({
        format: 'json',
        includeMetadata: true,
        includeExcludedOptions: true,
        includeConfidenceScores: true,
        includeVisualIndicators: false
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported export formats gracefully', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, {
        format: 'xml' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported export format');
    });

    it('should handle malformed data gracefully', async () => {
      const malformedResult = {
        ...mockFormattedResult,
        matrix: null as any
      };

      const result = await exportManager.exportResult(malformedResult, { format: 'json' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Context Preservation', () => {
    it('should preserve complete context in metadata', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, { format: 'json' });
      const exportedData = JSON.parse(result.data as string);

      expect(exportedData.metadata.exportTimestamp).toBeDefined();
      expect(exportedData.metadata.originalAnalysisTimestamp).toBeDefined();
      expect(exportedData.metadata.dataIntegrityHash).toBeDefined();
      expect(exportedData.metadata.includeFlags).toBeDefined();
      expect(exportedData.metadata.contextPreservation).toBeDefined();
    });

    it('should maintain original analysis timestamp', async () => {
      const result = await exportManager.exportResult(mockFormattedResult, { format: 'json' });
      const exportedData = JSON.parse(result.data as string);

      expect(new Date(exportedData.metadata.originalAnalysisTimestamp))
        .toEqual(mockFormattedResult.metadata.generatedAt);
    });
  });
});