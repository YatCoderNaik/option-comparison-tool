import { WeightValidationResult } from '../../types/core';

export interface WeightGuidance {
  type: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

export class WeightCalculator {
  private readonly WEIGHT_SUM_TOLERANCE = 0.001; // Allow small floating point errors
  private readonly SKEW_THRESHOLD = 0.5; // If any weight > 50%, consider it skewed
  private readonly CONCENTRATION_THRESHOLD = 0.8; // If top 2 weights > 80%, warn about concentration

  /**
   * Validates and normalizes constraint weights
   */
  validateWeights(weights: Record<string, number>): WeightValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for empty weights
    if (Object.keys(weights).length === 0) {
      return {
        isValid: false,
        normalizedWeights: {},
        errors: [],
        warnings: [],
        suggestions: ['Add at least one constraint with a weight > 0']
      };
    }

    // Validate individual weights
    for (const [constraintId, weight] of Object.entries(weights)) {
      if (typeof weight !== 'number') {
        errors.push(`Weight for constraint ${constraintId} must be a number`);
        continue;
      }

      if (weight < 0) {
        errors.push(`Weight for constraint ${constraintId} cannot be negative`);
        continue;
      }

      if (weight > 1) {
        errors.push(`Weight for constraint ${constraintId} cannot exceed 1.0`);
        continue;
      }

      if (weight === 0) {
        warnings.push(`Constraint ${constraintId} has zero weight and will not influence the comparison`);
      }
    }

    // If there are validation errors, return early
    if (errors.length > 0) {
      return {
        isValid: false,
        normalizedWeights: {},
        errors,
        warnings,
        suggestions
      };
    }

    // Calculate sum and check for normalization needs
    const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    if (weightSum === 0) {
      return {
        isValid: false,
        normalizedWeights: {},
        errors: [],
        warnings,
        suggestions: ['At least one constraint must have a weight greater than 0']
      };
    }

    // Check if weights need normalization
    let normalizedWeights: Record<string, number>;
    
    if (Math.abs(weightSum - 1.0) <= this.WEIGHT_SUM_TOLERANCE) {
      // Weights are already normalized (within tolerance)
      normalizedWeights = { ...weights };
    } else if (weightSum < 1.0) {
      // Auto-normalize weights that sum to less than 1
      normalizedWeights = this.normalizeWeights(weights);
      warnings.push(`Weights summed to ${weightSum.toFixed(3)}, auto-normalized to sum to 1.0`);
      suggestions.push('Consider reviewing weight distribution after normalization');
    } else {
      // Weights sum to more than 1 - this is an error
      errors.push(`Weights sum to ${weightSum.toFixed(3)}, which exceeds 1.0. Please reduce some weights.`);
      return {
        isValid: false,
        normalizedWeights: {},
        errors,
        warnings,
        suggestions: ['Reduce individual weights so the total does not exceed 1.0']
      };
    }

    // Check for weight distribution issues
    const distributionGuidance = this.analyzeWeightDistribution(normalizedWeights);
    warnings.push(...distributionGuidance.filter(g => g.type === 'warning').map(g => g.message));
    suggestions.push(...distributionGuidance.filter(g => g.suggestion).map(g => g.suggestion!));

    return {
      isValid: true,
      normalizedWeights,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Normalizes weights to sum to 1.0
   */
  normalizeWeights(weights: Record<string, number>): Record<string, number> {
    const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    if (weightSum === 0) {
      // Equal weights fallback
      const equalWeight = 1.0 / Object.keys(weights).length;
      return Object.keys(weights).reduce((normalized, constraintId) => {
        normalized[constraintId] = equalWeight;
        return normalized;
      }, {} as Record<string, number>);
    }

    // Proportional normalization
    const normalized: Record<string, number> = {};
    for (const [constraintId, weight] of Object.entries(weights)) {
      normalized[constraintId] = weight / weightSum;
    }

    return normalized;
  }

  /**
   * Detects if weights are heavily skewed toward one constraint
   */
  detectSkew(weights: Record<string, number>): boolean {
    const weightValues = Object.values(weights);
    const maxWeight = Math.max(...weightValues);
    return maxWeight > this.SKEW_THRESHOLD;
  }

  /**
   * Generates suggestions for weight improvement
   */
  generateSuggestions(weights: Record<string, number>): string[] {
    const suggestions: string[] = [];
    const guidance = this.analyzeWeightDistribution(weights);
    
    return guidance
      .filter(g => g.suggestion)
      .map(g => g.suggestion!);
  }

  /**
   * Analyzes weight distribution and provides guidance
   */
  private analyzeWeightDistribution(weights: Record<string, number>): WeightGuidance[] {
    const guidance: WeightGuidance[] = [];
    const weightEntries = Object.entries(weights).sort(([,a], [,b]) => b - a);
    const weightValues = weightEntries.map(([,weight]) => weight);

    // Check for extreme skew (one weight dominates)
    if (weightValues[0] > this.SKEW_THRESHOLD) {
      guidance.push({
        type: 'warning',
        message: `Constraint "${weightEntries[0][0]}" has ${(weightValues[0] * 100).toFixed(1)}% weight, which may overshadow other criteria`,
        suggestion: 'Consider reducing the dominant weight to allow other criteria to influence the comparison'
      });
    }

    // Check for concentration (top 2 weights dominate)
    if (weightValues.length >= 2 && (weightValues[0] + weightValues[1]) > this.CONCENTRATION_THRESHOLD) {
      guidance.push({
        type: 'warning',
        message: `Top 2 constraints account for ${((weightValues[0] + weightValues[1]) * 100).toFixed(1)}% of total weight`,
        suggestion: 'Consider distributing weights more evenly across criteria for a balanced comparison'
      });
    }

    // Check for too many near-zero weights
    const nearZeroWeights = weightValues.filter(w => w > 0 && w < 0.05).length;
    if (nearZeroWeights > 2) {
      guidance.push({
        type: 'info',
        message: `${nearZeroWeights} constraints have very low weights (< 5%)`,
        suggestion: 'Consider removing constraints with minimal impact or increasing their weights'
      });
    }

    // Check for equal weights (might indicate lack of prioritization)
    const uniqueWeights = new Set(weightValues.filter(w => w > 0));
    if (uniqueWeights.size === 1 && weightValues.length > 2) {
      guidance.push({
        type: 'info',
        message: 'All constraints have equal weights',
        suggestion: 'Consider prioritizing constraints based on their importance to your specific use case'
      });
    }

    return guidance;
  }

  /**
   * Creates equal weights for all constraints
   */
  createEqualWeights(constraintIds: string[]): Record<string, number> {
    const equalWeight = 1.0 / constraintIds.length;
    return constraintIds.reduce((weights, id) => {
      weights[id] = equalWeight;
      return weights;
    }, {} as Record<string, number>);
  }

  /**
   * Applies a weight decay to reduce the influence of a dominant constraint
   */
  applyWeightDecay(weights: Record<string, number>, decayFactor: number = 0.8): Record<string, number> {
    const weightEntries = Object.entries(weights).sort(([,a], [,b]) => b - a);
    const [dominantId, dominantWeight] = weightEntries[0];

    if (dominantWeight <= this.SKEW_THRESHOLD) {
      return weights; // No decay needed
    }

    const adjustedWeights = { ...weights };
    adjustedWeights[dominantId] = dominantWeight * decayFactor;

    // Redistribute the reduced weight proportionally to other constraints
    const redistributedAmount = dominantWeight * (1 - decayFactor);
    const otherConstraints = weightEntries.slice(1);
    const otherWeightSum = otherConstraints.reduce((sum, [,weight]) => sum + weight, 0);

    if (otherWeightSum > 0) {
      for (const [constraintId, weight] of otherConstraints) {
        const proportion = weight / otherWeightSum;
        adjustedWeights[constraintId] = weight + (redistributedAmount * proportion);
      }
    }

    return this.normalizeWeights(adjustedWeights);
  }

  /**
   * Suggests optimal weight distribution based on constraint types
   */
  suggestWeightDistribution(constraintTypes: Record<string, 'budget' | 'performance' | 'compatibility' | 'feature' | 'custom'>): Record<string, number> {
    const typeWeights = {
      budget: 0.3,      // Budget constraints are often critical
      performance: 0.25, // Performance is important for most comparisons
      feature: 0.2,     // Features matter but vary by use case
      compatibility: 0.15, // Compatibility is important but often binary
      custom: 0.1       // Custom constraints get lower default weight
    };

    const weights: Record<string, number> = {};
    let totalWeight = 0;

    // Assign base weights by type
    for (const [constraintId, type] of Object.entries(constraintTypes)) {
      weights[constraintId] = typeWeights[type];
      totalWeight += typeWeights[type];
    }

    // Normalize to sum to 1.0
    return this.normalizeWeights(weights);
  }
}