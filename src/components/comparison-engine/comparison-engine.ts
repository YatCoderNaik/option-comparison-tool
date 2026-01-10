import { 
  Option, 
  Constraint, 
  ComparisonResult, 
  DecisionMatrix, 
  TradeoffAnalysis, 
  ConfidenceMetrics,
  DecisionInsight,
  ExcludedOption,
  ConstraintViolation
} from '../../types/core';
import { ScoringEngine } from '../scoring-engine/scoring-engine';
import { TradeoffAnalyzer } from '../tradeoff-analysis/tradeoff-analyzer';
import { ConfidenceCalculator } from '../confidence-metrics/confidence-calculator';
import { ConstraintValidator } from '../constraint-management/constraint-validator';

export class ComparisonEngine {
  private scoringEngine: ScoringEngine;
  private tradeoffAnalyzer: TradeoffAnalyzer;
  private confidenceCalculator: ConfidenceCalculator;
  private constraintValidator: ConstraintValidator;

  constructor() {
    this.scoringEngine = new ScoringEngine();
    this.tradeoffAnalyzer = new TradeoffAnalyzer();
    this.confidenceCalculator = new ConfidenceCalculator();
    this.constraintValidator = new ConstraintValidator();
  }

  /**
   * Main orchestrator method that coordinates all analysis components
   * Implements hard constraint filtering with exclusion logic
   * Calculates confidence metrics across all components
   */
  async compareOptions(
    options: Option[], 
    constraints: Constraint[]
  ): Promise<ComparisonResult> {
    // Validate inputs
    this.validateInputs(options, constraints);

    // Step 1: Filter options based on hard constraints
    const { includedOptions, excludedOptions } = this.filterByHardConstraints(options, constraints);

    // Ensure minimum options requirement (Requirements 1.3)
    if (includedOptions.length < 2) {
      throw new Error(
        `Minimum 2 options required for comparison. After applying hard constraints, only ${includedOptions.length} option(s) remain. ` +
        `Consider relaxing hard constraints or adding more options.`
      );
    }

    // Step 2: Calculate scores using MCDA scoring engine
    const scoringMatrix = this.scoringEngine.createScoringMatrix(includedOptions, constraints);
    const weightedResult = this.scoringEngine.calculateWeightedScores(scoringMatrix, constraints);

    // Step 3: Build decision matrix
    const matrix = this.buildDecisionMatrix(
      includedOptions,
      excludedOptions,
      constraints,
      scoringMatrix,
      weightedResult
    );

    // Step 4: Generate trade-off analysis
    const tradeoffs = this.tradeoffAnalyzer.analyzeTradeoffs(
      includedOptions,
      constraints,
      scoringMatrix.normalizedScores
    );

    // Step 5: Calculate confidence metrics across all components
    const confidence = this.calculateOverallConfidence(
      includedOptions,
      constraints,
      scoringMatrix,
      tradeoffs
    );

    // Step 6: Generate decision insights
    const insights = this.generateDecisionInsights(matrix, tradeoffs, confidence);

    return {
      matrix,
      tradeoffs,
      insights,
      confidence
    };
  }

  /**
   * Validates input parameters for the comparison
   */
  private validateInputs(options: Option[], constraints: Constraint[]): void {
    if (!options || options.length === 0) {
      throw new Error('At least one option is required for comparison');
    }

    if (!constraints || constraints.length === 0) {
      throw new Error('At least one constraint is required for comparison');
    }

    // Validate each constraint
    constraints.forEach(constraint => {
      const validation = this.constraintValidator.validate(constraint);
      if (!validation.isValid) {
        throw new Error(`Invalid constraint '${constraint.name}': ${validation.errors.join(', ')}`);
      }
    });

    // Validate weight sum
    const totalWeight = constraints
      .filter(c => !c.isHardRequirement)
      .reduce((sum, c) => sum + c.weight, 0);
    
    if (totalWeight > 1.01) { // Allow small floating point tolerance
      throw new Error(`Total constraint weights (${totalWeight.toFixed(3)}) exceed 1.0. Please adjust weights.`);
    }
  }

  /**
   * Filters options based on hard constraints and returns included/excluded lists
   */
  private filterByHardConstraints(
    options: Option[], 
    constraints: Constraint[]
  ): { includedOptions: Option[]; excludedOptions: ExcludedOption[] } {
    const hardConstraints = constraints.filter(c => c.isHardRequirement);
    const includedOptions: Option[] = [];
    const excludedOptions: ExcludedOption[] = [];

    options.forEach(option => {
      const violations: ConstraintViolation[] = [];

      // Check each hard constraint
      hardConstraints.forEach(constraint => {
        const attributePath = constraint.evaluationRule.attributePath;
        const attributeValue = option.attributes[attributePath]?.value;
        const targetValue = constraint.evaluationRule.targetValue;
        const operator = constraint.evaluationRule.operator;

        let isViolated = false;
        let actualValue = attributeValue;

        // Evaluate constraint based on operator
        switch (operator) {
          case 'lessThan':
            isViolated = typeof attributeValue === 'number' && 
                        typeof targetValue === 'number' && 
                        attributeValue >= targetValue;
            break;
          case 'greaterThan':
            isViolated = typeof attributeValue === 'number' && 
                        typeof targetValue === 'number' && 
                        attributeValue <= targetValue;
            break;
          case 'equals':
            isViolated = attributeValue !== targetValue;
            break;
          case 'contains':
            isViolated = typeof attributeValue === 'string' && 
                        typeof targetValue === 'string' && 
                        !attributeValue.toLowerCase().includes(targetValue.toLowerCase());
            break;
          case 'range':
            if (Array.isArray(targetValue) && typeof attributeValue === 'number') {
              const [min, max] = targetValue;
              isViolated = attributeValue < min || attributeValue > max;
            }
            break;
          default:
            isViolated = true; // Unknown operator
        }

        if (isViolated || attributeValue === null || attributeValue === undefined) {
          violations.push({
            constraintId: constraint.id,
            constraintName: constraint.name,
            expectedValue: targetValue,
            actualValue: actualValue ?? 'Not provided',
            explanation: this.generateViolationExplanation(constraint, actualValue, targetValue)
          });
        }
      });

      // Categorize option based on violations
      if (violations.length === 0) {
        includedOptions.push(option);
      } else {
        excludedOptions.push({
          option,
          violatedConstraints: violations,
          canBeIncluded: false // Default to excluded
        });
      }
    });

    return { includedOptions, excludedOptions };
  }

  /**
   * Generates human-readable explanation for constraint violations
   */
  private generateViolationExplanation(
    constraint: Constraint, 
    actualValue: any, 
    expectedValue: any
  ): string {
    const operator = constraint.evaluationRule.operator;
    const attributePath = constraint.evaluationRule.attributePath;

    if (actualValue === null || actualValue === undefined) {
      return `Missing required attribute '${attributePath}'`;
    }

    switch (operator) {
      case 'lessThan':
        return `${attributePath} (${actualValue}) must be less than ${expectedValue}`;
      case 'greaterThan':
        return `${attributePath} (${actualValue}) must be greater than ${expectedValue}`;
      case 'equals':
        return `${attributePath} (${actualValue}) must equal ${expectedValue}`;
      case 'contains':
        return `${attributePath} (${actualValue}) must contain '${expectedValue}'`;
      case 'range':
        if (Array.isArray(expectedValue)) {
          return `${attributePath} (${actualValue}) must be between ${expectedValue[0]} and ${expectedValue[1]}`;
        }
        return `${attributePath} (${actualValue}) must be within specified range`;
      default:
        return `${attributePath} (${actualValue}) violates constraint rule`;
    }
  }

  /**
   * Builds the decision matrix from scoring results and constraint information
   */
  private buildDecisionMatrix(
    includedOptions: Option[],
    excludedOptions: ExcludedOption[],
    constraints: Constraint[],
    scoringMatrix: any,
    weightedResult: any
  ): DecisionMatrix {
    // Generate rankings from weighted scores
    const rankings = weightedResult.rankings.map((ranking: any) => ({
      optionId: ranking.optionId,
      rank: ranking.rank,
      score: ranking.score,
      normalizedScore: ranking.score // Weighted scores are already normalized
    }));

    // Collect all constraint violations from excluded options
    const constraintViolations = excludedOptions.flatMap(excluded => 
      excluded.violatedConstraints
    );

    return {
      options: includedOptions,
      excludedOptions,
      criteria: constraints,
      scores: scoringMatrix.rawScores,
      normalizedScores: scoringMatrix.normalizedScores,
      weightedScores: Object.values(weightedResult.optionScores) as number[],
      rankings,
      constraintViolations
    };
  }

  /**
   * Calculates overall confidence metrics across all analysis components
   */
  private calculateOverallConfidence(
    options: Option[],
    constraints: Constraint[],
    scoringMatrix: any,
    tradeoffs: TradeoffAnalysis
  ): ConfidenceMetrics {
    // Extract weighted scores for algorithm certainty calculation
    const weightedScores = Object.values(scoringMatrix.optionScores || {}) as number[];
    
    return this.confidenceCalculator.calculateCompleteConfidence(
      options,
      weightedScores
    );
  }

  /**
   * Generates decision insights based on analysis results
   */
  private generateDecisionInsights(
    matrix: DecisionMatrix,
    tradeoffs: TradeoffAnalysis,
    confidence: ConfidenceMetrics
  ): DecisionInsight[] {
    const insights: DecisionInsight[] = [];

    // Overall confidence insight
    if (confidence.overall < 0.5) {
      insights.push({
        type: 'warning',
        title: 'Low Analysis Confidence',
        description: `Overall confidence is ${(confidence.overall * 100).toFixed(1)}%. Consider improving data quality or adding more constraints.`,
        confidence: confidence.overall,
        relatedOptions: matrix.options.map(o => o.id)
      });
    }

    // Excluded options insight
    if (matrix.excludedOptions.length > 0) {
      insights.push({
        type: 'summary',
        title: 'Options Excluded by Hard Constraints',
        description: `${matrix.excludedOptions.length} option(s) were excluded due to hard constraint violations. Review constraints if this seems unexpected.`,
        confidence: 0.9,
        relatedOptions: matrix.excludedOptions.map(e => e.option.id)
      });
    }

    // Close competition insight
    const topScores = matrix.rankings.slice(0, 3).map(r => r.score);
    if (topScores.length >= 2 && (topScores[0] - topScores[1]) < 0.1) {
      insights.push({
        type: 'clarification',
        title: 'Close Competition',
        description: 'Top options have very similar scores. Consider additional criteria or review trade-offs carefully.',
        confidence: confidence.algorithmCertainty,
        relatedOptions: matrix.rankings.slice(0, 2).map(r => r.optionId)
      });
    }

    // Data quality insight
    if (confidence.dataCompleteness < 0.7) {
      insights.push({
        type: 'warning',
        title: 'Incomplete Data',
        description: `Only ${(confidence.dataCompleteness * 100).toFixed(1)}% of required data is available. Results may be less reliable.`,
        confidence: confidence.dataCompleteness,
        relatedOptions: matrix.options.map(o => o.id)
      });
    }

    // Trade-off complexity insight
    const totalAnalysisPoints = Object.values(tradeoffs.optionAnalyses)
      .reduce((sum, analysis) => 
        sum + analysis.strengths.length + analysis.weaknesses.length + 
        analysis.uniqueFeatures.length + analysis.dealBreakers.length, 0);

    if (totalAnalysisPoints > matrix.options.length * 4) {
      insights.push({
        type: 'recommendation',
        title: 'Complex Trade-offs Identified',
        description: 'Multiple significant trade-offs found. Consider scenario-based guidance to narrow focus.',
        confidence: 0.8,
        relatedOptions: matrix.options.map(o => o.id)
      });
    }

    return insights;
  }

  /**
   * Updates configuration for all sub-components
   */
  updateConfiguration(config: {
    scoring?: any;
    tradeoff?: any;
    confidence?: any;
  }): void {
    if (config.scoring) {
      // Update scoring engine config if it supports it
    }
    if (config.tradeoff) {
      this.tradeoffAnalyzer.updateConfig(config.tradeoff);
    }
    if (config.confidence) {
      // Update confidence calculator config if it supports it
    }
  }
}