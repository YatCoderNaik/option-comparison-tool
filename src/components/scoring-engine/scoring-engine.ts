import { Option, Constraint } from '../../types/core';
import { NormalizationEngine } from './normalization-engine';
import { 
  ScoringMatrix, 
  WeightedScoringResult, 
  ScoringEngineConfig,
  NormalizationParameters 
} from './types';

export class ScoringEngine {
  private normalizationEngine: NormalizationEngine;
  private config: ScoringEngineConfig;

  constructor(config?: Partial<ScoringEngineConfig>) {
    this.config = {
      outlierHandling: {
        enabled: true,
        percentileThresholds: {
          lower: 5,
          upper: 95
        }
      },
      missingValueHandling: {
        maxMissingPercentage: 0.5,
        penaltyFactor: 0.1
      },
      normalization: {
        zeroRangeDefault: 0.5,
        minValidOptions: 2
      },
      ...config
    };
    
    this.normalizationEngine = new NormalizationEngine(this.config);
  }

  /**
   * Creates a complete scoring matrix with normalization
   */
  createScoringMatrix(
    options: Option[],
    constraints: Constraint[]
  ): ScoringMatrix {
    // Validate input data
    const validation = this.normalizationEngine.validateDataSufficiency(options, constraints);
    if (!validation.isValid) {
      throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
    }

    // Separate scoring criteria from neutral criteria
    const scoringCriteria = constraints.filter(c => c.criterionType !== 'neutral');
    const neutralCriteria = constraints.filter(c => c.criterionType === 'neutral');

    if (scoringCriteria.length === 0) {
      throw new Error('No scoring criteria found - at least one benefit or cost criterion is required');
    }

    // Initialize matrices
    const optionIds = options.map(o => o.id);
    const criteriaIds = scoringCriteria.map(c => c.id);
    const rawScores: number[][] = [];
    const normalizedScores: number[][] = [];
    const normalizationParameters: Record<string, NormalizationParameters> = {};
    const excludedOptions: string[] = [];
    const missingValueMatrix: boolean[][] = []; // Track which values are missing

    // Process each criterion
    for (let criterionIndex = 0; criterionIndex < scoringCriteria.length; criterionIndex++) {
      const constraint = scoringCriteria[criterionIndex];
      
      try {
        const normResult = this.normalizationEngine.normalizeCriterion(options, constraint);
        
        // Store normalization parameters
        normalizationParameters[constraint.id] = normResult.parameters;
        
        // Extract raw values for this criterion
        const rawValues = this.extractRawValues(options, constraint.evaluationRule.attributePath);
        
        // Add to matrices
        for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
          if (!rawScores[optionIndex]) {
            rawScores[optionIndex] = [];
            normalizedScores[optionIndex] = [];
            missingValueMatrix[optionIndex] = [];
          }
          
          const rawValue = rawValues[optionIndex];
          const isMissing = normResult.excludedIndices.includes(optionIndex);
          
          rawScores[optionIndex][criterionIndex] = rawValue ?? 0;
          normalizedScores[optionIndex][criterionIndex] = normResult.normalizedValues[optionIndex];
          missingValueMatrix[optionIndex][criterionIndex] = isMissing;
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to process criterion ${constraint.name}: ${errorMessage}`);
      }
    }

    // Identify options with too many missing values
    for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
      const missingCount = missingValueMatrix[optionIndex].filter(missing => missing).length;
      const missingPercentage = missingCount / scoringCriteria.length;
      
      if (missingPercentage > this.config.missingValueHandling.maxMissingPercentage) {
        excludedOptions.push(options[optionIndex].id);
      }
    }

    return {
      optionIds,
      criteriaIds,
      rawScores,
      normalizedScores,
      missingValueMatrix,
      normalizationParameters,
      excludedOptions,
      neutralCriteria: neutralCriteria.map(c => c.id)
    };
  }

  /**
   * Calculates weighted scores using Weighted Sum Model (WSM)
   */
  calculateWeightedScores(
    scoringMatrix: ScoringMatrix,
    constraints: Constraint[]
  ): WeightedScoringResult {
    const scoringCriteria = constraints.filter(c => c.criterionType !== 'neutral');
    
    if (scoringCriteria.length === 0) {
      throw new Error('No scoring criteria available for weighted calculation');
    }

    // Validate and normalize weights
    const weightsResult = this.validateAndNormalizeWeights(scoringCriteria);
    if (!weightsResult.isValid) {
      throw new Error(`Weight validation failed: ${weightsResult.errors.join(', ')}`);
    }

    const normalizedWeights = weightsResult.normalizedWeights;
    
    // Calculate weighted scores for each option
    const optionScores: Record<string, number> = {};
    
    for (let optionIndex = 0; optionIndex < scoringMatrix.optionIds.length; optionIndex++) {
      const optionId = scoringMatrix.optionIds[optionIndex];
      
      // Skip excluded options
      if (scoringMatrix.excludedOptions.includes(optionId)) {
        optionScores[optionId] = 0;
        continue;
      }

      let weightedSum = 0;
      let totalWeight = 0;
      let missingCount = 0;

      for (let criterionIndex = 0; criterionIndex < scoringMatrix.criteriaIds.length; criterionIndex++) {
        const criterionId = scoringMatrix.criteriaIds[criterionIndex];
        const weight = normalizedWeights[criterionId] || 0;
        const normalizedScore = scoringMatrix.normalizedScores[optionIndex][criterionIndex];
        const isMissing = scoringMatrix.missingValueMatrix[optionIndex][criterionIndex];
        
        if (!isMissing) {
          weightedSum += normalizedScore * weight;
          totalWeight += weight;
        } else {
          missingCount++;
        }
      }

      // Apply missing value penalty
      const missingPenalty = missingCount * this.config.missingValueHandling.penaltyFactor;
      
      // Normalize by actual total weight and apply penalty
      const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
      optionScores[optionId] = Math.max(0, baseScore * (1 - missingPenalty));
    }

    // Generate rankings
    const rankings = Object.entries(optionScores)
      .filter(([optionId]) => !scoringMatrix.excludedOptions.includes(optionId))
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .map(([optionId, score], index) => ({
        optionId,
        rank: index + 1,
        score
      }));

    return {
      optionScores,
      rankings,
      transparency: {
        weightsUsed: normalizedWeights,
        normalizationDetails: scoringMatrix.normalizationParameters,
        neutralCriteriaExcluded: scoringMatrix.neutralCriteria,
        scoringMethod: 'Weighted Sum Model (WSM)'
      }
    };
  }

  /**
   * Extracts raw numeric values from options for a given attribute path
   */
  private extractRawValues(options: Option[], attributePath: string): (number | null)[] {
    return options.map(option => {
      try {
        const value = this.getNestedValue(option.attributes, attributePath);
        
        if (value === null || value === undefined || value === '') {
          return null;
        }

        if (typeof value === 'number') {
          return isFinite(value) ? value : null;
        }

        if (typeof value === 'string') {
          const numValue = parseFloat(value);
          return isFinite(numValue) ? numValue : null;
        }

        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }

        return null;
      } catch (error) {
        return null;
      }
    });
  }

  /**
   * Gets nested value from object using dot notation path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return current[key].value !== undefined ? current[key].value : current[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Validates and normalizes constraint weights
   */
  private validateAndNormalizeWeights(constraints: Constraint[]): {
    isValid: boolean;
    normalizedWeights: Record<string, number>;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalizedWeights: Record<string, number> = {};

    // Extract weights
    const weights = constraints.map(c => ({ id: c.id, weight: c.weight }));
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

    // Validate weight sum
    if (totalWeight > 1.001) { // Allow small floating point tolerance
      errors.push(`Total weight sum (${totalWeight.toFixed(3)}) exceeds 1.0`);
      return { isValid: false, normalizedWeights: {}, errors, warnings };
    }

    if (totalWeight < 0.001) {
      errors.push('Total weight sum is effectively zero');
      return { isValid: false, normalizedWeights: {}, errors, warnings };
    }

    // Check for weight concentration
    const maxWeight = Math.max(...weights.map(w => w.weight));
    if (maxWeight > 0.6) {
      warnings.push(`High weight concentration detected (${(maxWeight * 100).toFixed(1)}% on single criterion)`);
    }

    // Normalize weights
    if (totalWeight < 0.999) {
      warnings.push(`Weights sum to ${totalWeight.toFixed(3)}, auto-normalizing to 1.0`);
    }

    for (const { id, weight } of weights) {
      normalizedWeights[id] = weight / totalWeight;
    }

    return {
      isValid: true,
      normalizedWeights,
      errors,
      warnings
    };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): ScoringEngineConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration
   */
  updateConfig(newConfig: Partial<ScoringEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.normalizationEngine = new NormalizationEngine(this.config);
  }
}