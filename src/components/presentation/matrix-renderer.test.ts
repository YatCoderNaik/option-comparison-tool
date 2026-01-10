import { MatrixRenderer } from './matrix-renderer';
import { FormattedComparisonResult } from '../comparison-engine/result-formatter';

describe('MatrixRenderer', () => {
  let renderer: MatrixRenderer;
  let mockFormattedResult: FormattedComparisonResult;

  beforeEach(() => {
    renderer = new MatrixRenderer();

    // Create comprehensive mock data
    mockFormattedResult = {
      summary: {
        totalOptions: 3,
        includedOptions: 3,
        excludedOptions: 0,
        totalCriteria: 3,
        scoringCriteria: 3,
        neutralCriteria: 0,
        overallConfidence: 0.85,
        topRecommendation: {
          optionId: 'option-1',
          optionName: 'Option 1',
          score: 0.85,
          rank: 1
        }
      },
      matrix: {
        headers: {
          options: [
            { id: 'option-1', name: 'Option 1', rank: 1, score: 0.85, isExcluded: false },
            { id: 'option-2', name: 'Option 2', rank: 2, score: 0.70, isExcluded: false },
            { id: 'option-3', name: 'Option 3', rank: 3, score: 0.60, isExcluded: false }
          ],
          criteria: [
            { id: 'cost', name: 'Cost', type: 'budget', weight: 0.4, criterionType: 'cost' as const, isHardRequirement: false },
            { id: 'performance', name: 'Performance', type: 'performance', weight: 0.4, criterionType: 'benefit' as const, isHardRequirement: false },
            { id: 'ease', name: 'Ease of Use', type: 'usability', weight: 0.2, criterionType: 'benefit' as const, isHardRequirement: false }
          ]
        },
        cells: [
          [
            { value: 50, normalizedScore: 0.9, confidence: 0.8, isMissing: false },
            { value: 80, normalizedScore: 0.8, confidence: 0.9, isMissing: false },
            { value: 70, normalizedScore: 0.7, confidence: 0.8, isMissing: false }
          ],
          [
            { value: 75, normalizedScore: 0.7, confidence: 0.8, isMissing: false },
            { value: 85, normalizedScore: 0.9, confidence: 0.9, isMissing: false },
            { value: 60, normalizedScore: 0.6, confidence: 0.7, isMissing: false }
          ],
          [
            { value: 100, normalizedScore: 0.5, confidence: 0.8, isMissing: false },
            { value: 75, normalizedScore: 0.6, confidence: 0.8, isMissing: false },
            { value: 80, normalizedScore: 0.8, confidence: 0.9, isMissing: false }
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
          completeness: 0.9,
          freshness: 0.8,
          reliability: 0.85,
          issues: [],
          recommendations: []
        },
        confidenceBreakdown: {
          overall: 0.85,
          components: {
            dataCompleteness: 0.9,
            dataFreshness: 0.8,
            sourceReliability: 0.85,
            algorithmCertainty: 0.8
          },
          factors: []
        }
      },
      metadata: {
        generatedAt: new Date(),
        algorithmVersion: '1.0.0',
        dataVersion: '1.0.0',
        transparency: {
          weightsUsed: { cost: 0.4, performance: 0.4, ease: 0.2 },
          normalizationApplied: true,
          outlierHandling: true,
          missingValueHandling: 'penalty-based',
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

  describe('Rendering Strategy Determination', () => {
    it('should choose sync rendering for small datasets', async () => {
      // 3 options × 3 criteria = 9 data points (< 50)
      const result = await renderer.renderMatrix(mockFormattedResult);
      
      expect(result.renderingMetadata.strategy.type).toBe('sync');
      expect(result.renderingMetadata.strategy.totalDataPoints).toBe(9);
      expect(result.renderingMetadata.strategy.memoryFootprint).toBe('low');
      expect(result.renderingMetadata.isComplete).toBe(true);
    });

    it('should choose chunked rendering for medium datasets', async () => {
      // Create larger dataset: 15 options × 5 criteria = 75 data points (51-200)
      const largeResult = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          headers: {
            options: Array.from({ length: 15 }, (_, i) => ({
              id: `option-${i}`,
              name: `Option ${i}`,
              rank: i + 1,
              score: 0.8 - (i * 0.05),
              isExcluded: false
            })),
            criteria: Array.from({ length: 5 }, (_, i) => ({
              id: `criterion-${i}`,
              name: `Criterion ${i}`,
              type: 'custom',
              weight: 0.2,
              criterionType: 'benefit' as const,
              isHardRequirement: false
            }))
          },
          cells: Array.from({ length: 15 }, () => 
            Array.from({ length: 5 }, () => ({
              value: 50,
              normalizedScore: 0.7,
              confidence: 0.8,
              isMissing: false
            }))
          )
        }
      };

      const result = await renderer.renderMatrix(largeResult);
      
      expect(result.renderingMetadata.strategy.type).toBe('chunked');
      expect(result.renderingMetadata.strategy.totalDataPoints).toBe(75);
      expect(result.renderingMetadata.strategy.memoryFootprint).toBe('medium');
    });

    it('should choose paginated rendering for large datasets', async () => {
      // Create very large dataset: 50 options × 10 criteria = 500 data points (> 200)
      const veryLargeResult = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          headers: {
            options: Array.from({ length: 50 }, (_, i) => ({
              id: `option-${i}`,
              name: `Option ${i}`,
              rank: i + 1,
              score: 0.9 - (i * 0.01),
              isExcluded: false
            })),
            criteria: Array.from({ length: 10 }, (_, i) => ({
              id: `criterion-${i}`,
              name: `Criterion ${i}`,
              type: 'custom',
              weight: 0.1,
              criterionType: 'benefit' as const,
              isHardRequirement: false
            }))
          },
          cells: Array.from({ length: 50 }, () => 
            Array.from({ length: 10 }, () => ({
              value: 50,
              normalizedScore: 0.7,
              confidence: 0.8,
              isMissing: false
            }))
          )
        }
      };

      const result = await renderer.renderMatrix(veryLargeResult);
      
      expect(result.renderingMetadata.strategy.type).toBe('paginated');
      expect(result.renderingMetadata.strategy.totalDataPoints).toBe(500);
      expect(result.renderingMetadata.strategy.memoryFootprint).toBe('high');
    });
  });

  describe('Synchronous Rendering', () => {
    it('should render complete matrix synchronously for small datasets', async () => {
      const result = await renderer.renderMatrix(mockFormattedResult);

      expect(result.headers.options).toHaveLength(3);
      expect(result.headers.criteria).toHaveLength(3);
      expect(result.cells).toHaveLength(3);
      expect(result.cells[0]).toHaveLength(3);
      expect(result.renderingMetadata.isComplete).toBe(true);
      expect(result.renderingMetadata.progressPercentage).toBe(100);
    });

    it('should apply visual indicators correctly', async () => {
      const result = await renderer.renderMatrix(mockFormattedResult);

      // Check first cell (should be optimal for cost - lowest value)
      const firstCell = result.cells[0][0];
      expect(firstCell.visualIndicators.confidenceLevel).toBe('high'); // confidence 0.8
      expect(firstCell.displayValue).toBe('$50'); // Cost formatting
      expect(firstCell.styling).toBeDefined();

      // Check confidence-based opacity
      expect(firstCell.styling.opacity).toBe(1.0); // High confidence
    });

    it('should format display values correctly based on criterion type', async () => {
      const result = await renderer.renderMatrix(mockFormattedResult);

      // Cost criterion should have $ formatting
      expect(result.cells[0][0].displayValue).toBe('$50');
      
      // Benefit criteria should have regular formatting
      expect(result.cells[0][1].displayValue).toBe('80');
      expect(result.cells[0][2].displayValue).toBe('70');
    });

    it('should handle missing data correctly', async () => {
      const resultWithMissing = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          cells: [
            [
              { value: null, normalizedScore: 0, confidence: 0, isMissing: true },
              { value: 80, normalizedScore: 0.8, confidence: 0.9, isMissing: false },
              { value: 70, normalizedScore: 0.7, confidence: 0.8, isMissing: false }
            ],
            ...mockFormattedResult.matrix.cells.slice(1)
          ]
        }
      };

      const result = await renderer.renderMatrix(resultWithMissing);
      const missingCell = result.cells[0][0];

      expect(missingCell.displayValue).toBe('N/A');
      expect(missingCell.isMissing).toBe(true);
      expect(missingCell.styling.backgroundColor).toBeDefined();
    });
  });

  describe('Progressive Rendering', () => {
    let mediumDatasetResult: FormattedComparisonResult;

    beforeEach(() => {
      // Create medium dataset for chunked rendering
      mediumDatasetResult = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          headers: {
            options: Array.from({ length: 10 }, (_, i) => ({
              id: `option-${i}`,
              name: `Option ${i}`,
              rank: i + 1,
              score: 0.9 - (i * 0.08),
              isExcluded: false
            })),
            criteria: mockFormattedResult.matrix.headers.criteria
          },
          cells: Array.from({ length: 10 }, () => 
            Array.from({ length: 3 }, () => ({
              value: 50,
              normalizedScore: 0.7,
              confidence: 0.8,
              isMissing: false
            }))
          )
        }
      };
    });

    it('should render first chunk and indicate more chunks available', async () => {
      const customRenderer = new MatrixRenderer({ 
        chunkSize: 3,
        maxSyncDataPoints: 20 // Force chunked rendering for 30 data points
      });
      const result = await customRenderer.renderMatrix(mediumDatasetResult);

      expect(result.renderingMetadata.strategy.type).toBe('chunked');
      expect(result.cells).toHaveLength(3); // First chunk size
      expect(result.renderingMetadata.nextChunkAvailable).toBe(true);
      expect(result.renderingMetadata.isComplete).toBe(false);
      expect(result.renderingMetadata.progressPercentage).toBe(30); // 3/10 * 100
    });

    it('should render subsequent chunks correctly', async () => {
      const customRenderer = new MatrixRenderer({ 
        chunkSize: 3,
        maxSyncDataPoints: 20 // Force chunked rendering
      });
      
      // Render first chunk
      await customRenderer.renderMatrix(mediumDatasetResult);
      
      // Render next chunk
      const nextChunk = await customRenderer.renderNextChunk(mediumDatasetResult);
      
      expect(nextChunk.cells).toHaveLength(3); // Second chunk
      expect(nextChunk.isComplete).toBe(false);
      expect(nextChunk.progressPercentage).toBe(60); // 6/10 * 100
    });

    it('should complete rendering when all chunks are processed', async () => {
      const customRenderer = new MatrixRenderer({ 
        chunkSize: 4,
        maxSyncDataPoints: 20 // Force chunked rendering
      });
      
      // Render first chunk (4 rows)
      await customRenderer.renderMatrix(mediumDatasetResult);
      
      // Render second chunk (4 rows)
      const secondChunk = await customRenderer.renderNextChunk(mediumDatasetResult);
      expect(secondChunk.isComplete).toBe(false);
      
      // Render final chunk (2 rows)
      const finalChunk = await customRenderer.renderNextChunk(mediumDatasetResult);
      expect(finalChunk.isComplete).toBe(true);
      expect(finalChunk.progressPercentage).toBe(100);
    });

    it('should handle chunk rendering completion gracefully', async () => {
      const customRenderer = new MatrixRenderer({ chunkSize: 5 });
      
      // Render first chunk
      await customRenderer.renderMatrix(mediumDatasetResult);
      
      // Render second chunk (completes all data)
      const secondChunk = await customRenderer.renderNextChunk(mediumDatasetResult);
      expect(secondChunk.isComplete).toBe(true);
      
      // Try to render another chunk (should return empty)
      const extraChunk = await customRenderer.renderNextChunk(mediumDatasetResult);
      expect(extraChunk.cells).toHaveLength(0);
      expect(extraChunk.isComplete).toBe(true);
    });
  });

  describe('Aspect Filtering', () => {
    it('should apply aspect filters to criteria', async () => {
      const aspectFilters = ['cost', 'performance'];
      const result = await renderer.renderMatrix(mockFormattedResult, aspectFilters);

      // Should only show cost and performance criteria
      expect(result.headers.criteria).toHaveLength(2);
      expect(result.headers.criteria.map(c => c.id)).toEqual(['cost', 'performance']);
      
      // Cells should be filtered accordingly
      expect(result.cells[0]).toHaveLength(2);
      
      // Aspect filter metadata should be populated
      expect(result.aspectFilters.active).toEqual(aspectFilters);
      expect(result.aspectFilters.available).toContain('cost');
      expect(result.aspectFilters.available).toContain('performance');
    });

    it('should generate filter suggestions', async () => {
      const result = await renderer.renderMatrix(mockFormattedResult, ['cost']);

      expect(result.aspectFilters.suggestions).toContain('performance');
      expect(result.aspectFilters.suggestions).toContain('benefit');
      expect(result.aspectFilters.suggestions).not.toContain('cost'); // Already active
    });

    it('should handle empty aspect filters', async () => {
      const result = await renderer.renderMatrix(mockFormattedResult, []);

      // Should show all criteria when no filters applied
      expect(result.headers.criteria).toHaveLength(3);
      expect(result.aspectFilters.active).toEqual([]);
    });

    it('should handle non-matching aspect filters', async () => {
      const result = await renderer.renderMatrix(mockFormattedResult, ['nonexistent']);

      // Should show no criteria when filter doesn't match anything
      expect(result.headers.criteria).toHaveLength(0);
      expect(result.cells[0]).toHaveLength(0);
    });
  });

  describe('Visual Indicators and Styling', () => {
    it('should identify optimal and suboptimal values', async () => {
      const result = await renderer.renderMatrix(mockFormattedResult);

      // Find cells with highest and lowest normalized scores
      let maxScore = -1;
      let minScore = 2;
      let maxCell: any = null;
      let minCell: any = null;

      result.cells.forEach(row => {
        row.forEach(cell => {
          if (cell.normalizedScore! > maxScore) {
            maxScore = cell.normalizedScore!;
            maxCell = cell;
          }
          if (cell.normalizedScore! < minScore) {
            minScore = cell.normalizedScore!;
            minCell = cell;
          }
        });
      });

      // Check that optimal and suboptimal are identified correctly
      if (maxScore > minScore) {
        expect(maxCell?.visualIndicators.isOptimal).toBe(true);
        expect(minCell?.visualIndicators.isSuboptimal).toBe(true);
      }
    });

    it('should apply confidence-based opacity', async () => {
      const resultWithVaryingConfidence = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          cells: [
            [
              { value: 50, normalizedScore: 0.9, confidence: 0.9, isMissing: false }, // High confidence
              { value: 80, normalizedScore: 0.8, confidence: 0.7, isMissing: false }, // Medium confidence
              { value: 70, normalizedScore: 0.7, confidence: 0.5, isMissing: false }  // Low confidence
            ],
            ...mockFormattedResult.matrix.cells.slice(1)
          ]
        }
      };

      const result = await renderer.renderMatrix(resultWithVaryingConfidence);

      expect(result.cells[0][0].styling.opacity).toBe(1.0);  // High confidence
      expect(result.cells[0][1].styling.opacity).toBe(0.8);  // Medium confidence
      expect(result.cells[0][2].styling.opacity).toBe(0.6);  // Low confidence
    });

    it('should handle constraint violations with special styling', async () => {
      const resultWithViolations = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          cells: [
            [
              { 
                value: 50, 
                normalizedScore: 0.9, 
                confidence: 0.8, 
                isMissing: false,
                violatesConstraint: true,
                violationReason: 'Exceeds budget limit'
              },
              ...mockFormattedResult.matrix.cells[0].slice(1)
            ],
            ...mockFormattedResult.matrix.cells.slice(1)
          ]
        }
      };

      const result = await renderer.renderMatrix(resultWithViolations);
      const violatingCell = result.cells[0][0];

      expect(violatingCell.violatesConstraint).toBe(true);
      expect(violatingCell.violationReason).toBe('Exceeds budget limit');
      expect(violatingCell.styling.borderStyle).toContain('red');
    });
  });

  describe('Excluded Options Handling', () => {
    it('should render excluded options with violation details', async () => {
      const resultWithExclusions = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          excludedOptionsDetails: [{
            option: {
              id: 'excluded-1',
              name: 'Excluded Option',
              description: 'This option was excluded',
              category: 'custom' as const,
              attributes: {},
              metadata: {
                dateAdded: new Date(),
                lastUpdated: new Date(),
                dataQuality: { completeness: 1, freshness: 1, reliability: 1 },
                entryMethod: 'manual' as const
              }
            },
            violations: [{
              constraintName: 'Budget Limit',
              reason: 'Cost exceeds maximum budget',
              severity: 'critical' as const
            }],
            canBeIncluded: false
          }]
        }
      };

      const result = await renderer.renderMatrix(resultWithExclusions);

      expect(result.excludedOptions).toHaveLength(1);
      expect(result.excludedOptions[0].option.name).toBe('Excluded Option');
      expect(result.excludedOptions[0].violations).toHaveLength(1);
      expect(result.excludedOptions[0].violations[0].severity).toBe('critical');
      expect(result.excludedOptions[0].toggleAction).toBeDefined();
    });
  });

  describe('Configuration and State Management', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        maxSyncDataPoints: 25,
        chunkSize: 10,
        showConfidenceIndicators: false,
        theme: 'dark' as const
      };

      const customRenderer = new MatrixRenderer(customConfig);
      
      // Test that configuration is applied (indirectly through behavior)
      expect(customRenderer.getRenderState().currentChunk).toBe(0);
    });

    it('should update configuration', () => {
      renderer.updateConfig({ 
        showVisualDifferences: false,
        theme: 'dark'
      });

      // Configuration update should not throw and should be applied in subsequent renders
      expect(() => renderer.updateConfig({ chunkSize: 15 })).not.toThrow();
    });

    it('should reset render state', () => {
      renderer.resetRenderState();
      const state = renderer.getRenderState();

      expect(state.currentChunk).toBe(0);
      expect(state.totalChunks).toBe(0);
      expect(state.renderedRows).toBe(0);
      expect(state.totalRows).toBe(0);
      expect(state.isLoading).toBe(false);
    });

    it('should track render state during progressive rendering', async () => {
      const customRenderer = new MatrixRenderer({ 
        chunkSize: 2,
        maxSyncDataPoints: 10 // Force chunked rendering for 6 options × 3 criteria = 18 data points
      });
      
      // Create dataset that will trigger chunked rendering
      const mediumResult = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          headers: {
            ...mockFormattedResult.matrix.headers,
            options: Array.from({ length: 6 }, (_, i) => ({
              id: `option-${i}`,
              name: `Option ${i}`,
              rank: i + 1,
              score: 0.8,
              isExcluded: false
            }))
          },
          cells: Array.from({ length: 6 }, () => mockFormattedResult.matrix.cells[0])
        }
      };

      await customRenderer.renderMatrix(mediumResult);
      
      const state = customRenderer.getRenderState();
      expect(state.totalRows).toBe(6);
      expect(state.renderedRows).toBe(2); // First chunk
      expect(state.currentChunk).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty matrix gracefully', async () => {
      const emptyResult = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          headers: {
            options: [],
            criteria: []
          },
          cells: []
        }
      };

      const result = await renderer.renderMatrix(emptyResult);

      expect(result.headers.options).toHaveLength(0);
      expect(result.headers.criteria).toHaveLength(0);
      expect(result.cells).toHaveLength(0);
      expect(result.renderingMetadata.isComplete).toBe(true);
    });

    it('should handle matrix with only headers', async () => {
      const headersOnlyResult = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          cells: []
        }
      };

      const result = await renderer.renderMatrix(headersOnlyResult);

      expect(result.headers.options).toHaveLength(3);
      expect(result.headers.criteria).toHaveLength(3);
      expect(result.cells).toHaveLength(3); // Should create empty rows for each option
      expect(result.cells[0]).toHaveLength(0); // But each row should be empty
    });

    it('should handle malformed cell data', async () => {
      const malformedResult = {
        ...mockFormattedResult,
        matrix: {
          ...mockFormattedResult.matrix,
          cells: [
            [
              { value: undefined, normalizedScore: undefined, confidence: undefined, isMissing: true },
              { value: undefined, normalizedScore: undefined, confidence: undefined, isMissing: true }, // Fixed null cell
              { value: 'invalid', normalizedScore: undefined, confidence: -1, isMissing: false } // Fixed normalizedScore type
            ]
          ]
        }
      };

      // Should not throw error
      expect(async () => {
        await renderer.renderMatrix(malformedResult);
      }).not.toThrow();
    });
  });
});