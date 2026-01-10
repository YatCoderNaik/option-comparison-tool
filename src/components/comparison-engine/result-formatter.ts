import { 
  ComparisonResult, 
  DecisionMatrix, 
  Option, 
  Constraint, 
  ConstraintViolation,
  ExcludedOption,
  RankingResult,
  TradeoffAnalysis,
  ConfidenceMetrics,
  DecisionInsight
} from '../../types/core';

export interface FormattedComparisonResult {
  summary: ComparisonSummary;
  matrix: FormattedDecisionMatrix;
  tradeoffs: FormattedTradeoffAnalysis;
  insights: FormattedInsights;
  metadata: ResultMetadata;
}

export interface ComparisonSummary {
  totalOptions: number;
  includedOptions: number;
  excludedOptions: number;
  totalCriteria: number;
  scoringCriteria: number;
  neutralCriteria: number;
  overallConfidence: number;
  topRecommendation: {
    optionId: string;
    optionName: string;
    score: number;
    rank: number;
  } | null;
}

export interface FormattedDecisionMatrix {
  headers: {
    options: Array<{
      id: string;
      name: string;
      rank: number;
      score: number;
      isExcluded: boolean;
    }>;
    criteria: Array<{
      id: string;
      name: string;
      type: string;
      weight: number;
      criterionType: 'benefit' | 'cost' | 'neutral';
      isHardRequirement: boolean;
    }>;
  };
  cells: Array<Array<{
    value: any;
    normalizedScore?: number;
    confidence?: number;
    isMissing: boolean;
    violatesConstraint?: boolean;
    violationReason?: string;
  }>>;
  excludedOptionsDetails: Array<{
    option: Option;
    violations: Array<{
      constraintName: string;
      reason: string;
      severity: 'critical' | 'warning';
    }>;
    canBeIncluded: boolean;
  }>;
}

export interface FormattedTradeoffAnalysis {
  optionAnalyses: {
    [optionId: string]: {
      optionName: string;
      rank: number;
      score: number;
      strengths: Array<{
        description: string;
        confidence: number;
        category: string;
      }>;
      weaknesses: Array<{
        description: string;
        confidence: number;
        category: string;
      }>;
      uniqueFeatures: Array<{
        description: string;
        confidence: number;
        significance: 'high' | 'medium' | 'low';
      }>;
      dealBreakers: Array<{
        description: string;
        confidence: number;
        severity: 'critical' | 'major' | 'minor';
      }>;
    };
  };
  scenarioGuidance: Array<{
    scenario: string;
    guidance: string;
    applicableOptions: Array<{
      optionId: string;
      optionName: string;
      fitScore: number;
    }>;
    tradeoffExplanation: string;
    confidence: number;
  }>;
  keyDifferentiators: Array<{
    attribute: string;
    description: string;
    significance: 'high' | 'medium' | 'low';
    optionValues: Array<{
      optionId: string;
      optionName: string;
      value: any;
      isAdvantage: boolean;
    }>;
  }>;
}

export interface FormattedInsights {
  summary: Array<{
    type: 'summary' | 'warning' | 'recommendation' | 'clarification';
    title: string;
    description: string;
    confidence: number;
    priority: 'high' | 'medium' | 'low';
    actionable: boolean;
    relatedOptions?: string[];
  }>;
  dataQuality: {
    completeness: number;
    freshness: number;
    reliability: number;
    issues: string[];
    recommendations: string[];
  };
  confidenceBreakdown: {
    overall: number;
    components: {
      dataCompleteness: number;
      dataFreshness: number;
      sourceReliability: number;
      algorithmCertainty: number;
    };
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      description: string;
    }>;
  };
}

export interface ResultMetadata {
  generatedAt: Date;
  processingTime?: number;
  algorithmVersion: string;
  dataVersion: string;
  transparency: {
    weightsUsed: Record<string, number>;
    normalizationApplied: boolean;
    outlierHandling: boolean;
    missingValueHandling: string;
    excludedCriteria: string[];
  };
  validation: {
    inputValidation: boolean;
    constraintValidation: boolean;
    dataQualityCheck: boolean;
    warnings: string[];
  };
}

export class ResultFormatter {
  /**
   * Formats a complete comparison result for presentation
   */
  formatComparisonResult(
    result: ComparisonResult,
    processingStartTime?: Date
  ): FormattedComparisonResult {
    const processingTime = processingStartTime 
      ? Date.now() - processingStartTime.getTime()
      : undefined;

    return {
      summary: this.formatSummary(result),
      matrix: this.formatDecisionMatrix(result.matrix),
      tradeoffs: this.formatTradeoffAnalysis(result.tradeoffs, result.matrix),
      insights: this.formatInsights(result.insights, result.confidence),
      metadata: this.formatMetadata(result, processingTime)
    };
  }

  /**
   * Creates a high-level summary of the comparison
   */
  private formatSummary(result: ComparisonResult): ComparisonSummary {
    const matrix = result.matrix;
    const scoringCriteria = matrix.criteria.filter(c => c.criterionType !== 'neutral');
    const neutralCriteria = matrix.criteria.filter(c => c.criterionType === 'neutral');
    
    let topRecommendation = null;
    if (matrix.rankings.length > 0) {
      const topRanking = matrix.rankings[0];
      const topOption = matrix.options.find(o => o.id === topRanking.optionId);
      
      if (topOption) {
        topRecommendation = {
          optionId: topOption.id,
          optionName: topOption.name,
          score: topRanking.score,
          rank: topRanking.rank
        };
      }
    }

    return {
      totalOptions: matrix.options.length + matrix.excludedOptions.length,
      includedOptions: matrix.options.length,
      excludedOptions: matrix.excludedOptions.length,
      totalCriteria: matrix.criteria.length,
      scoringCriteria: scoringCriteria.length,
      neutralCriteria: neutralCriteria.length,
      overallConfidence: result.confidence.overall,
      topRecommendation
    };
  }

  /**
   * Formats the decision matrix with enhanced metadata
   */
  private formatDecisionMatrix(matrix: DecisionMatrix): FormattedDecisionMatrix {
    // Format option headers with ranking information
    const optionHeaders = matrix.options.map(option => {
      const ranking = matrix.rankings.find(r => r.optionId === option.id);
      return {
        id: option.id,
        name: option.name,
        rank: ranking?.rank || 0,
        score: ranking?.score || 0,
        isExcluded: false
      };
    });

    // Add excluded options to headers
    matrix.excludedOptions.forEach(excluded => {
      optionHeaders.push({
        id: excluded.option.id,
        name: excluded.option.name,
        rank: 999, // Excluded options get lowest rank
        score: 0,
        isExcluded: true
      });
    });

    // Format criteria headers
    const criteriaHeaders = matrix.criteria.map(criterion => ({
      id: criterion.id,
      name: criterion.name,
      type: criterion.type,
      weight: criterion.weight,
      criterionType: criterion.criterionType,
      isHardRequirement: criterion.isHardRequirement
    }));

    // Format matrix cells with enhanced information
    const cells: Array<Array<any>> = [];
    
    // Process included options
    for (let optionIndex = 0; optionIndex < matrix.options.length; optionIndex++) {
      const option = matrix.options[optionIndex];
      const optionCells: Array<any> = [];

      for (let criterionIndex = 0; criterionIndex < matrix.criteria.length; criterionIndex++) {
        const criterion = matrix.criteria[criterionIndex];
        const attributePath = criterion.evaluationRule.attributePath;
        const attribute = option.attributes[attributePath];
        
        const rawScore = matrix.scores[optionIndex]?.[criterionIndex];
        const normalizedScore = matrix.normalizedScores[optionIndex]?.[criterionIndex];
        
        // Check for constraint violations
        const violation = matrix.constraintViolations.find(v => 
          v.constraintId === criterion.id && 
          this.getOptionFromViolation(v, [...matrix.options, ...matrix.excludedOptions.map(e => e.option)])?.id === option.id
        );

        optionCells.push({
          value: attribute?.value || null,
          normalizedScore: normalizedScore,
          confidence: attribute?.confidence || 0,
          isMissing: !attribute || attribute.value === null || attribute.value === undefined,
          violatesConstraint: !!violation,
          violationReason: violation?.explanation
        });
      }
      
      cells.push(optionCells);
    }

    // Format excluded options details
    const excludedOptionsDetails = matrix.excludedOptions.map(excluded => ({
      option: excluded.option,
      violations: excluded.violatedConstraints.map(violation => ({
        constraintName: violation.constraintName,
        reason: violation.explanation,
        severity: this.getViolationSeverity(violation)
      })),
      canBeIncluded: excluded.canBeIncluded
    }));

    return {
      headers: {
        options: optionHeaders,
        criteria: criteriaHeaders
      },
      cells,
      excludedOptionsDetails
    };
  }

  /**
   * Formats trade-off analysis with enhanced presentation data
   */
  private formatTradeoffAnalysis(
    tradeoffs: TradeoffAnalysis, 
    matrix: DecisionMatrix
  ): FormattedTradeoffAnalysis {
    const formattedOptionAnalyses: { [optionId: string]: any } = {};

    // Format option analyses
    Object.entries(tradeoffs.optionAnalyses).forEach(([optionId, analysis]) => {
      const option = matrix.options.find(o => o.id === optionId);
      const ranking = matrix.rankings.find(r => r.optionId === optionId);

      if (option) {
        formattedOptionAnalyses[optionId] = {
          optionName: option.name,
          rank: ranking?.rank || 0,
          score: ranking?.score || 0,
          strengths: analysis.strengths.map(strength => ({
            description: strength.description,
            confidence: strength.confidenceLevel,
            category: this.categorizeAnalysisPoint(strength.attributeSource)
          })),
          weaknesses: analysis.weaknesses.map(weakness => ({
            description: weakness.description,
            confidence: weakness.confidenceLevel,
            category: this.categorizeAnalysisPoint(weakness.attributeSource)
          })),
          uniqueFeatures: analysis.uniqueFeatures.map(feature => ({
            description: feature.description,
            confidence: feature.confidenceLevel,
            significance: this.getFeatureSignificance(feature.confidenceLevel)
          })),
          dealBreakers: analysis.dealBreakers.map(dealBreaker => ({
            description: dealBreaker.description,
            confidence: dealBreaker.confidenceLevel,
            severity: this.getDealBreakerSeverity(dealBreaker.confidenceLevel)
          }))
        };
      }
    });

    // Format scenario guidance
    const formattedScenarioGuidance = tradeoffs.scenarioGuidance.map(guidance => ({
      scenario: guidance.scenario,
      guidance: guidance.guidance,
      applicableOptions: guidance.applicableOptions.map(optionId => {
        const option = matrix.options.find(o => o.id === optionId);
        const ranking = matrix.rankings.find(r => r.optionId === optionId);
        return {
          optionId,
          optionName: option?.name || 'Unknown',
          fitScore: this.calculateScenarioFit(optionId, guidance, matrix)
        };
      }),
      tradeoffExplanation: guidance.tradeoffExplanation,
      confidence: guidance.confidenceLevel
    }));

    // Format key differentiators
    const formattedDifferentiators = tradeoffs.keyDifferentiators.map(diff => ({
      attribute: diff.attribute,
      description: diff.description,
      significance: diff.significance,
      optionValues: Object.entries(diff.optionValues).map(([optionId, value]) => {
        const option = matrix.options.find(o => o.id === optionId);
        return {
          optionId,
          optionName: option?.name || 'Unknown',
          value,
          isAdvantage: this.isValueAdvantage(value, diff.optionValues, diff.significance)
        };
      })
    }));

    return {
      optionAnalyses: formattedOptionAnalyses,
      scenarioGuidance: formattedScenarioGuidance,
      keyDifferentiators: formattedDifferentiators
    };
  }

  /**
   * Formats insights with priority and actionability information
   */
  private formatInsights(
    insights: DecisionInsight[], 
    confidence: ConfidenceMetrics
  ): FormattedInsights {
    const formattedInsights = insights.map(insight => ({
      type: insight.type,
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence,
      priority: this.getInsightPriority(insight),
      actionable: this.isInsightActionable(insight),
      relatedOptions: insight.relatedOptions
    }));

    // Generate data quality assessment
    const dataQuality = {
      completeness: confidence.dataCompleteness,
      freshness: confidence.dataFreshness,
      reliability: confidence.sourceReliability,
      issues: this.identifyDataQualityIssues(confidence),
      recommendations: this.generateDataQualityRecommendations(confidence)
    };

    // Generate confidence breakdown
    const confidenceBreakdown = {
      overall: confidence.overall,
      components: {
        dataCompleteness: confidence.dataCompleteness,
        dataFreshness: confidence.dataFreshness,
        sourceReliability: confidence.sourceReliability,
        algorithmCertainty: confidence.algorithmCertainty
      },
      factors: this.analyzeConfidenceFactors(confidence)
    };

    return {
      summary: formattedInsights,
      dataQuality,
      confidenceBreakdown
    };
  }

  /**
   * Formats comprehensive metadata about the comparison
   */
  private formatMetadata(
    result: ComparisonResult, 
    processingTime?: number
  ): ResultMetadata {
    const scoringCriteria = result.matrix.criteria.filter(c => c.criterionType !== 'neutral');
    const weightsUsed: Record<string, number> = {};
    
    scoringCriteria.forEach(criterion => {
      weightsUsed[criterion.id] = criterion.weight;
    });

    return {
      generatedAt: new Date(),
      processingTime,
      algorithmVersion: '1.0.0',
      dataVersion: '1.0.0',
      transparency: {
        weightsUsed,
        normalizationApplied: true,
        outlierHandling: true,
        missingValueHandling: 'penalty-based',
        excludedCriteria: result.matrix.criteria
          .filter(c => c.criterionType === 'neutral')
          .map(c => c.id)
      },
      validation: {
        inputValidation: true,
        constraintValidation: true,
        dataQualityCheck: true,
        warnings: this.generateValidationWarnings(result)
      }
    };
  }

  // Helper methods
  private getOptionFromViolation(violation: ConstraintViolation, allOptions: Option[]): Option | undefined {
    // This is a simplified implementation - in practice, you'd need to track which option caused each violation
    return allOptions[0]; // Placeholder
  }

  private getViolationSeverity(violation: ConstraintViolation): 'critical' | 'warning' {
    return 'critical'; // All hard constraint violations are critical
  }

  private categorizeAnalysisPoint(attributeSource: string): string {
    if (attributeSource.includes('cost') || attributeSource.includes('price')) return 'Financial';
    if (attributeSource.includes('performance') || attributeSource.includes('speed')) return 'Performance';
    if (attributeSource.includes('ease') || attributeSource.includes('usability')) return 'Usability';
    return 'General';
  }

  private getFeatureSignificance(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  private getDealBreakerSeverity(confidence: number): 'critical' | 'major' | 'minor' {
    if (confidence >= 0.9) return 'critical';
    if (confidence >= 0.7) return 'major';
    return 'minor';
  }

  private calculateScenarioFit(optionId: string, guidance: any, matrix: DecisionMatrix): number {
    // Simplified fit calculation based on ranking
    const ranking = matrix.rankings.find(r => r.optionId === optionId);
    return ranking ? (1 - (ranking.rank - 1) / matrix.rankings.length) : 0;
  }

  private isValueAdvantage(value: any, allValues: Record<string, any>, significance: string): boolean {
    // Simplified advantage calculation
    const values = Object.values(allValues);
    if (typeof value === 'number') {
      const max = Math.max(...values.filter(v => typeof v === 'number') as number[]);
      return value === max;
    }
    return false;
  }

  private getInsightPriority(insight: DecisionInsight): 'high' | 'medium' | 'low' {
    if (insight.type === 'warning' && insight.confidence > 0.8) return 'high';
    if (insight.type === 'recommendation' && insight.confidence > 0.7) return 'high';
    if (insight.confidence > 0.6) return 'medium';
    return 'low';
  }

  private isInsightActionable(insight: DecisionInsight): boolean {
    return insight.type === 'recommendation' || insight.type === 'warning';
  }

  private identifyDataQualityIssues(confidence: ConfidenceMetrics): string[] {
    const issues: string[] = [];
    if (confidence.dataCompleteness < 0.7) issues.push('Incomplete data detected');
    if (confidence.dataFreshness < 0.5) issues.push('Outdated information found');
    if (confidence.sourceReliability < 0.6) issues.push('Low source reliability');
    if (confidence.algorithmCertainty < 0.5) issues.push('High uncertainty in rankings');
    return issues;
  }

  private generateDataQualityRecommendations(confidence: ConfidenceMetrics): string[] {
    const recommendations: string[] = [];
    if (confidence.dataCompleteness < 0.8) {
      recommendations.push('Fill in missing attribute values to improve analysis accuracy');
    }
    if (confidence.dataFreshness < 0.7) {
      recommendations.push('Update outdated information for more reliable results');
    }
    if (confidence.sourceReliability < 0.7) {
      recommendations.push('Verify data from more reliable sources');
    }
    return recommendations;
  }

  private analyzeConfidenceFactors(confidence: ConfidenceMetrics): Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }> {
    const factors = [];
    
    if (confidence.dataCompleteness > 0.8) {
      factors.push({
        factor: 'Data Completeness',
        impact: 'positive' as const,
        description: 'High data completeness increases analysis reliability'
      });
    } else if (confidence.dataCompleteness < 0.6) {
      factors.push({
        factor: 'Data Completeness',
        impact: 'negative' as const,
        description: 'Missing data reduces analysis confidence'
      });
    }

    if (confidence.algorithmCertainty < 0.5) {
      factors.push({
        factor: 'Algorithm Certainty',
        impact: 'negative' as const,
        description: 'Close scores indicate uncertain ranking'
      });
    }

    return factors;
  }

  private generateValidationWarnings(result: ComparisonResult): string[] {
    const warnings: string[] = [];
    
    if (result.matrix.excludedOptions.length > 0) {
      warnings.push(`${result.matrix.excludedOptions.length} option(s) excluded by hard constraints`);
    }
    
    if (result.confidence.overall < 0.6) {
      warnings.push('Low overall confidence in results');
    }

    return warnings;
  }
}