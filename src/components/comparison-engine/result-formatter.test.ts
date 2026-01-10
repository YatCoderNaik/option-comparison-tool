import { ResultFormatter } from './result-formatter';
import { 
  ComparisonResult, 
  DecisionMatrix, 
  TradeoffAnalysis, 
  ConfidenceMetrics, 
  DecisionInsight,
  Option,
  Constraint
} from '../../types/core';

describe('ResultFormatter', () => {
  let formatter: ResultFormatter;
  let mockComparisonResult: ComparisonResult;

  beforeEach(() => {
    formatter = new ResultFormatter();

    // Create mock data
    const mockOptions: Option[] = [
      {
        id: 'option-1',
        name: 'Budget Option',
        description: 'Low cost option',
        category: 'custom',
        attributes: {
          cost: { value: 50, confidence: 0.8 },
          performance: { value: 70, confidence: 0.9 }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 0.9, freshness: 0.8, reliability: 0.8 },
          entryMethod: 'manual'
        }
      },
      {
        id: 'option-2',
        name: 'Premium Option',
        description: 'High performance option',
        category: 'custom',
        attributes: {
          cost: { value: 100, confidence: 0.9 },
          performance: { value: 95, confidence: 0.9 }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 1.0, freshness: 0.9, reliability: 0.9 },
          entryMethod: 'manual'
        }
      }
    ];

    const mockConstraints: Constraint[] = [
      {
        id: 'cost-constraint',
        name: 'Cost',
        type: 'budget',
        isHardRequirement: false,
        weight: 0.4,
        criterionType: 'cost',
        evaluationRule: {
          attributePath: 'cost',
          operator: 'lessThan',
          targetValue: 200
        },
        description: 'Cost consideration',
        confidenceLevel: 0.8
      },
      {
        id: 'performance-constraint',
        name: 'Performance',
        type: 'performance',
        isHardRequirement: false,
        weight: 0.6,
        criterionType: 'benefit',
        evaluationRule: {
          attributePath: 'performance',
          operator: 'greaterThan',
          targetValue: 50
        },
        description: 'Performance consideration',
        confidenceLevel: 0.9
      }
    ];

    const mockMatrix: DecisionMatrix = {
      options: mockOptions,
      excludedOptions: [],
      criteria: mockConstraints,
      scores: [[50, 70], [100, 95]],
      normalizedScores: [[1.0, 0.74], [0.0, 1.0]],
      weightedScores: [0.84, 0.6],
      rankings: [
        { optionId: 'option-1', rank: 1, score: 0.84, normalizedScore: 0.84 },
        { optionId: 'option-2', rank: 2, score: 0.6, normalizedScore: 0.6 }
      ],
      constraintViolations: []
    };

    const mockTradeoffs: TradeoffAnalysis = {
      optionAnalyses: {
        'option-1': {
          strengths: [{
            description: 'Excellent cost efficiency',
            attributeSource: 'cost',
            confidenceLevel: 0.9,
            reasoning: 'Lowest cost among options',
            ruleApplied: 'LowestCost'
          }],
          weaknesses: [{
            description: 'Lower performance compared to premium options',
            attributeSource: 'performance',
            confidenceLevel: 0.8,
            reasoning: 'Performance below average',
            ruleApplied: 'BelowAverage'
          }],
          uniqueFeatures: [],
          dealBreakers: []
        },
        'option-2': {
          strengths: [{
            description: 'Highest performance rating',
            attributeSource: 'performance',
            confidenceLevel: 0.95,
            reasoning: 'Top performance score',
            ruleApplied: 'HighestValue'
          }],
          weaknesses: [{
            description: 'Higher cost investment required',
            attributeSource: 'cost',
            confidenceLevel: 0.85,
            reasoning: 'Above average cost',
            ruleApplied: 'AboveAverage'
          }],
          uniqueFeatures: [],
          dealBreakers: []
        }
      },
      keyDifferentiators: [
        {
          attribute: 'cost',
          description: 'Significant cost variation between options',
          optionValues: {
            'option-1': 50,
            'option-2': 100
          },
          significance: 'high'
        }
      ],
      scenarioGuidance: [
        {
          scenario: 'Budget-conscious projects',
          guidance: 'Consider option-1 for cost-effective solution',
          applicableOptions: ['option-1'],
          tradeoffExplanation: 'Lower cost but reduced performance',
          confidenceLevel: 0.8
        }
      ]
    };

    const mockConfidence: ConfidenceMetrics = {
      overall: 0.82,
      dataCompleteness: 0.95,
      dataFreshness: 0.85,
      sourceReliability: 0.85,
      algorithmCertainty: 0.65
    };

    const mockInsights: DecisionInsight[] = [
      {
        type: 'summary',
        title: 'Clear Winner Identified',
        description: 'Option-1 provides the best overall value',
        confidence: 0.84,
        relatedOptions: ['option-1']
      },
      {
        type: 'warning',
        title: 'Performance Trade-off',
        description: 'Top option has lower performance than alternatives',
        confidence: 0.75,
        relatedOptions: ['option-1', 'option-2']
      }
    ];

    mockComparisonResult = {
      matrix: mockMatrix,
      tradeoffs: mockTradeoffs,
      insights: mockInsights,
      confidence: mockConfidence
    };
  });

  describe('formatComparisonResult', () => {
    it('should format a complete comparison result', () => {
      const startTime = new Date();
      const formatted = formatter.formatComparisonResult(mockComparisonResult, startTime);

      expect(formatted).toBeDefined();
      expect(formatted.summary).toBeDefined();
      expect(formatted.matrix).toBeDefined();
      expect(formatted.tradeoffs).toBeDefined();
      expect(formatted.insights).toBeDefined();
      expect(formatted.metadata).toBeDefined();
    });

    it('should include processing time when start time provided', () => {
      const startTime = new Date(Date.now() - 1000); // 1 second ago
      const formatted = formatter.formatComparisonResult(mockComparisonResult, startTime);

      expect(formatted.metadata.processingTime).toBeDefined();
      expect(formatted.metadata.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Summary Formatting', () => {
    it('should create accurate summary statistics', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.summary.totalOptions).toBe(2);
      expect(formatted.summary.includedOptions).toBe(2);
      expect(formatted.summary.excludedOptions).toBe(0);
      expect(formatted.summary.totalCriteria).toBe(2);
      expect(formatted.summary.scoringCriteria).toBe(2);
      expect(formatted.summary.neutralCriteria).toBe(0);
      expect(formatted.summary.overallConfidence).toBe(0.82);
    });

    it('should identify top recommendation correctly', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.summary.topRecommendation).toBeDefined();
      expect(formatted.summary.topRecommendation?.optionId).toBe('option-1');
      expect(formatted.summary.topRecommendation?.optionName).toBe('Budget Option');
      expect(formatted.summary.topRecommendation?.rank).toBe(1);
    });

    it('should handle case with no options', () => {
      const emptyResult = {
        ...mockComparisonResult,
        matrix: {
          ...mockComparisonResult.matrix,
          options: [],
          rankings: []
        }
      };

      const formatted = formatter.formatComparisonResult(emptyResult);

      expect(formatted.summary.topRecommendation).toBeNull();
      expect(formatted.summary.includedOptions).toBe(0);
    });
  });

  describe('Matrix Formatting', () => {
    it('should format option headers with ranking information', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.matrix.headers.options).toHaveLength(2);
      
      const option1Header = formatted.matrix.headers.options.find(h => h.id === 'option-1');
      expect(option1Header).toBeDefined();
      expect(option1Header?.name).toBe('Budget Option');
      expect(option1Header?.rank).toBe(1);
      expect(option1Header?.score).toBe(0.84);
      expect(option1Header?.isExcluded).toBe(false);
    });

    it('should format criteria headers with weight information', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.matrix.headers.criteria).toHaveLength(2);
      
      const costCriterion = formatted.matrix.headers.criteria.find(c => c.id === 'cost-constraint');
      expect(costCriterion).toBeDefined();
      expect(costCriterion?.name).toBe('Cost');
      expect(costCriterion?.weight).toBe(0.4);
      expect(costCriterion?.criterionType).toBe('cost');
      expect(costCriterion?.isHardRequirement).toBe(false);
    });

    it('should format matrix cells with scores and metadata', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.matrix.cells).toHaveLength(2); // 2 options
      expect(formatted.matrix.cells[0]).toHaveLength(2); // 2 criteria

      const firstCell = formatted.matrix.cells[0][0];
      expect(firstCell.value).toBe(50);
      expect(firstCell.normalizedScore).toBe(1.0);
      expect(firstCell.confidence).toBe(0.8);
      expect(firstCell.isMissing).toBe(false);
    });

    it('should handle excluded options correctly', () => {
      const resultWithExclusions = {
        ...mockComparisonResult,
        matrix: {
          ...mockComparisonResult.matrix,
          excludedOptions: [{
            option: {
              id: 'excluded-option',
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
            violatedConstraints: [{
              constraintId: 'cost-constraint',
              constraintName: 'Cost',
              expectedValue: 200,
              actualValue: 300,
              explanation: 'Cost exceeds limit'
            }],
            canBeIncluded: false
          }]
        }
      };

      const formatted = formatter.formatComparisonResult(resultWithExclusions);

      expect(formatted.matrix.excludedOptionsDetails).toHaveLength(1);
      expect(formatted.matrix.excludedOptionsDetails[0].option.name).toBe('Excluded Option');
      expect(formatted.matrix.excludedOptionsDetails[0].violations).toHaveLength(1);
      expect(formatted.matrix.excludedOptionsDetails[0].violations[0].reason).toBe('Cost exceeds limit');
    });
  });

  describe('Tradeoff Analysis Formatting', () => {
    it('should format option analyses with categorized information', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.tradeoffs.optionAnalyses['option-1']).toBeDefined();
      
      const option1Analysis = formatted.tradeoffs.optionAnalyses['option-1'];
      expect(option1Analysis.optionName).toBe('Budget Option');
      expect(option1Analysis.rank).toBe(1);
      expect(option1Analysis.strengths).toHaveLength(1);
      expect(option1Analysis.strengths[0].description).toBe('Excellent cost efficiency');
      expect(option1Analysis.strengths[0].category).toBe('Financial');
    });

    it('should format scenario guidance with fit scores', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.tradeoffs.scenarioGuidance).toHaveLength(1);
      
      const guidance = formatted.tradeoffs.scenarioGuidance[0];
      expect(guidance.scenario).toBe('Budget-conscious projects');
      expect(guidance.applicableOptions).toHaveLength(1);
      expect(guidance.applicableOptions[0].optionName).toBe('Budget Option');
      expect(guidance.applicableOptions[0].fitScore).toBeGreaterThan(0);
    });

    it('should format key differentiators with advantage indicators', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.tradeoffs.keyDifferentiators).toHaveLength(1);
      
      const differentiator = formatted.tradeoffs.keyDifferentiators[0];
      expect(differentiator.attribute).toBe('cost');
      expect(differentiator.significance).toBe('high');
      expect(differentiator.optionValues).toHaveLength(2);
    });
  });

  describe('Insights Formatting', () => {
    it('should format insights with priority and actionability', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.insights.summary).toHaveLength(2);
      
      const summaryInsight = formatted.insights.summary.find(i => i.type === 'summary');
      expect(summaryInsight).toBeDefined();
      expect(summaryInsight?.priority).toBeDefined();
      expect(summaryInsight?.actionable).toBeDefined();
    });

    it('should generate data quality assessment', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.insights.dataQuality).toBeDefined();
      expect(formatted.insights.dataQuality.completeness).toBe(0.95);
      expect(formatted.insights.dataQuality.freshness).toBe(0.85);
      expect(formatted.insights.dataQuality.reliability).toBe(0.85);
      expect(Array.isArray(formatted.insights.dataQuality.issues)).toBe(true);
      expect(Array.isArray(formatted.insights.dataQuality.recommendations)).toBe(true);
    });

    it('should provide confidence breakdown', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.insights.confidenceBreakdown).toBeDefined();
      expect(formatted.insights.confidenceBreakdown.overall).toBe(0.82);
      expect(formatted.insights.confidenceBreakdown.components).toBeDefined();
      expect(Array.isArray(formatted.insights.confidenceBreakdown.factors)).toBe(true);
    });
  });

  describe('Metadata Formatting', () => {
    it('should generate comprehensive metadata', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.metadata).toBeDefined();
      expect(formatted.metadata.generatedAt).toBeInstanceOf(Date);
      expect(formatted.metadata.algorithmVersion).toBe('1.0.0');
      expect(formatted.metadata.dataVersion).toBe('1.0.0');
    });

    it('should include transparency information', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.metadata.transparency).toBeDefined();
      expect(formatted.metadata.transparency.weightsUsed).toBeDefined();
      expect(formatted.metadata.transparency.normalizationApplied).toBe(true);
      expect(formatted.metadata.transparency.outlierHandling).toBe(true);
    });

    it('should include validation information', () => {
      const formatted = formatter.formatComparisonResult(mockComparisonResult);

      expect(formatted.metadata.validation).toBeDefined();
      expect(formatted.metadata.validation.inputValidation).toBe(true);
      expect(formatted.metadata.validation.constraintValidation).toBe(true);
      expect(formatted.metadata.validation.dataQualityCheck).toBe(true);
      expect(Array.isArray(formatted.metadata.validation.warnings)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tradeoff analysis', () => {
      const emptyTradeoffResult = {
        ...mockComparisonResult,
        tradeoffs: {
          optionAnalyses: {},
          keyDifferentiators: [],
          scenarioGuidance: []
        }
      };

      const formatted = formatter.formatComparisonResult(emptyTradeoffResult);

      expect(formatted.tradeoffs.optionAnalyses).toEqual({});
      expect(formatted.tradeoffs.keyDifferentiators).toHaveLength(0);
      expect(formatted.tradeoffs.scenarioGuidance).toHaveLength(0);
    });

    it('should handle low confidence scenarios', () => {
      const lowConfidenceResult = {
        ...mockComparisonResult,
        confidence: {
          overall: 0.3,
          dataCompleteness: 0.4,
          dataFreshness: 0.3,
          sourceReliability: 0.2,
          algorithmCertainty: 0.1
        }
      };

      const formatted = formatter.formatComparisonResult(lowConfidenceResult);

      expect(formatted.insights.dataQuality.issues.length).toBeGreaterThan(0);
      expect(formatted.insights.dataQuality.recommendations.length).toBeGreaterThan(0);
      expect(formatted.metadata.validation.warnings.length).toBeGreaterThan(0);
    });
  });
});