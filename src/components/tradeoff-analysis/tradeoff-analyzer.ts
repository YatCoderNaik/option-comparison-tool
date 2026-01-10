import { Option, Constraint, TradeoffAnalysis, AnalysisConfig } from '../../types/core';
import { AnalysisPointGenerator } from './analysis-point-generator';
import { ScenarioGuidanceGenerator } from './scenario-guidance-generator';

export class TradeoffAnalyzer {
  private analysisPointGenerator: AnalysisPointGenerator;
  private scenarioGuidanceGenerator: ScenarioGuidanceGenerator;
  private config: AnalysisConfig;

  constructor(config?: Partial<AnalysisConfig>) {
    this.config = {
      uniqueFeatureVarianceThreshold: 0.20,
      significantDifferenceThreshold: 0.15,
      dealBreakerConfidenceThreshold: 0.90,
      ...config
    };

    this.analysisPointGenerator = new AnalysisPointGenerator(this.config);
    this.scenarioGuidanceGenerator = new ScenarioGuidanceGenerator(this.config);
  }

  /**
   * Performs comprehensive trade-off analysis for the given options
   */
  analyzeTradeoffs(
    options: Option[],
    constraints: Constraint[],
    scores: number[][]
  ): TradeoffAnalysis {
    if (options.length === 0) {
      throw new Error('Cannot analyze trade-offs with no options');
    }

    if (constraints.length === 0) {
      throw new Error('Cannot analyze trade-offs with no constraints');
    }

    if (scores.length !== options.length) {
      throw new Error('Scores array length must match options array length');
    }

    // Generate analysis points for each option
    const optionAnalyses: { [optionId: string]: { strengths: any[]; weaknesses: any[]; uniqueFeatures: any[]; dealBreakers: any[]; } } = {};
    
    options.forEach(option => {
      const analysisPoints = this.analysisPointGenerator.generateAnalysisPoints(
        option,
        options,
        constraints,
        scores
      );

      optionAnalyses[option.id] = analysisPoints;
    });

    // Generate scenario-based guidance
    const scenarioGuidance = this.scenarioGuidanceGenerator.generateScenarioGuidance(
      options,
      constraints,
      scores
    );

    return {
      optionAnalyses,
      keyDifferentiators: [], // TODO: Implement key differentiators logic
      scenarioGuidance
    };
  }

  /**
   * Calculates overall confidence in the analysis
   */
  private calculateOverallConfidence(
    options: Option[],
    constraints: Constraint[],
    scores: number[][]
  ): number {
    // Data completeness: percentage of non-null attribute values
    let totalAttributes = 0;
    let completedAttributes = 0;

    for (const option of options) {
      for (const constraint of constraints) {
        const attrPath = constraint.evaluationRule.attributePath;
        totalAttributes++;
        
        if (option.attributes[attrPath]?.value !== null && 
            option.attributes[attrPath]?.value !== undefined) {
          completedAttributes++;
        }
      }
    }

    const dataCompleteness = totalAttributes > 0 ? completedAttributes / totalAttributes : 0;

    // Algorithm certainty: based on score variance
    const allScores = scores.flat();
    if (allScores.length === 0) {
      return 0;
    }

    const mean = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    const variance = allScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / allScores.length;
    const stdDev = Math.sqrt(variance);
    
    const algorithmCertainty = mean > 0 ? Math.max(0, 1 - (stdDev / mean)) : 0;

    // Constraint confidence: average of constraint confidence levels
    const constraintConfidence = constraints.length > 0 
      ? constraints.reduce((sum, c) => sum + c.confidenceLevel, 0) / constraints.length
      : 0;

    // Weighted average of all confidence components
    return (dataCompleteness * 0.4 + algorithmCertainty * 0.4 + constraintConfidence * 0.2);
  }

  /**
   * Generates high-level summary insights from the analysis
   */
  private generateSummaryInsights(
    optionAnalyses: { [optionId: string]: { strengths: any[]; weaknesses: any[]; uniqueFeatures: any[]; dealBreakers: any[]; } },
    scenarioGuidance: any[]
  ): string[] {
    const insights: string[] = [];

    // Count total analysis points across all options
    const optionAnalysesArray = Object.values(optionAnalyses);
    const totalStrengths = optionAnalysesArray.reduce((sum, analysis) => sum + analysis.strengths.length, 0);
    const totalWeaknesses = optionAnalysesArray.reduce((sum, analysis) => sum + analysis.weaknesses.length, 0);
    const totalUniqueFeatures = optionAnalysesArray.reduce((sum, analysis) => sum + analysis.uniqueFeatures.length, 0);
    const totalDealBreakers = optionAnalysesArray.reduce((sum, analysis) => sum + analysis.dealBreakers.length, 0);

    // Generate insights based on analysis patterns
    if (totalDealBreakers > 0) {
      insights.push(`${totalDealBreakers} critical issues identified that may eliminate certain options from consideration.`);
    }

    if (totalUniqueFeatures > 0) {
      insights.push(`${totalUniqueFeatures} unique differentiating features found across options.`);
    }

    if (scenarioGuidance.length > 0) {
      insights.push(`${scenarioGuidance.length} scenario-specific recommendations available based on your requirements.`);
    }

    // Balance assessment
    const strengthToWeaknessRatio = totalWeaknesses > 0 ? totalStrengths / totalWeaknesses : totalStrengths;
    if (strengthToWeaknessRatio > 2) {
      insights.push('Options generally show more strengths than weaknesses, indicating good overall quality.');
    } else if (strengthToWeaknessRatio < 0.5) {
      insights.push('Options show more weaknesses than strengths, suggesting careful evaluation is needed.');
    } else {
      insights.push('Options show balanced trade-offs between strengths and weaknesses.');
    }

    // Scenario diversity
    if (scenarioGuidance.length >= 3) {
      insights.push('Multiple usage scenarios identified, indicating flexible options suitable for different contexts.');
    }

    return insights;
  }

  /**
   * Updates the configuration for both generators
   */
  updateConfig(newConfig: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.analysisPointGenerator.updateConfig(newConfig);
    this.scenarioGuidanceGenerator.updateConfig(newConfig);
  }

  /**
   * Gets the current configuration
   */
  getConfig(): AnalysisConfig {
    return { ...this.config };
  }
}