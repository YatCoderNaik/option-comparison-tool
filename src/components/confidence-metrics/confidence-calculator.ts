import { Option, ConfidenceMetrics } from '../../types/core';

export interface ConfidenceWeights {
  dataCompleteness: number;
  dataFreshness: number;
  sourceReliability: number;
  algorithmCertainty: number;
}

export class ConfidenceCalculator {
  private readonly defaultWeights: ConfidenceWeights = {
    dataCompleteness: 0.3,
    dataFreshness: 0.2,
    sourceReliability: 0.2,
    algorithmCertainty: 0.3
  };

  /**
   * Calculates overall confidence as weighted average of components
   */
  calculateOverallConfidence(
    components: Partial<ConfidenceMetrics>, 
    weights: Partial<ConfidenceWeights> = {}
  ): number {
    const finalWeights = { ...this.defaultWeights, ...weights };
    
    let totalWeight = 0;
    let weightedSum = 0;

    // Only include components that are provided
    if (components.dataCompleteness !== undefined) {
      weightedSum += components.dataCompleteness * finalWeights.dataCompleteness;
      totalWeight += finalWeights.dataCompleteness;
    }

    if (components.dataFreshness !== undefined) {
      weightedSum += components.dataFreshness * finalWeights.dataFreshness;
      totalWeight += finalWeights.dataFreshness;
    }

    if (components.sourceReliability !== undefined) {
      weightedSum += components.sourceReliability * finalWeights.sourceReliability;
      totalWeight += finalWeights.sourceReliability;
    }

    if (components.algorithmCertainty !== undefined) {
      weightedSum += components.algorithmCertainty * finalWeights.algorithmCertainty;
      totalWeight += finalWeights.algorithmCertainty;
    }

    // If no components provided, return 0
    if (totalWeight === 0) {
      return 0;
    }

    // Normalize by actual total weight (in case some components are missing)
    return Math.max(0, Math.min(1, weightedSum / totalWeight));
  }

  /**
   * Calculates data completeness as percentage of attributes with values
   */
  calculateDataCompleteness(options: Option[]): number {
    if (options.length === 0) {
      return 0;
    }

    let totalAttributes = 0;
    let filledAttributes = 0;

    for (const option of options) {
      const attributeKeys = Object.keys(option.attributes);
      totalAttributes += attributeKeys.length;

      for (const key of attributeKeys) {
        const attribute = option.attributes[key];
        if (attribute && attribute.value !== null && attribute.value !== undefined && attribute.value !== '') {
          filledAttributes++;
        }
      }
    }

    if (totalAttributes === 0) {
      return 1; // No attributes to fill, consider complete
    }

    return filledAttributes / totalAttributes;
  }

  /**
   * Calculates data freshness based on last update timestamps
   */
  calculateDataFreshness(options: Option[], maxAgeHours: number = 24 * 30): number {
    if (options.length === 0) {
      return 0;
    }

    const now = new Date();
    let totalFreshness = 0;
    let totalItems = 0;

    for (const option of options) {
      // Check option-level freshness
      const optionAge = this.calculateAge(option.metadata.lastUpdated, now);
      const optionFreshness = this.ageTofreshness(optionAge, maxAgeHours);
      totalFreshness += optionFreshness;
      totalItems++;

      // Check attribute-level freshness
      for (const attribute of Object.values(option.attributes)) {
        if (attribute.lastUpdated) {
          const attributeAge = this.calculateAge(attribute.lastUpdated, now);
          const attributeFreshness = this.ageTofreshness(attributeAge, maxAgeHours);
          totalFreshness += attributeFreshness;
          totalItems++;
        }
      }
    }

    return totalItems > 0 ? totalFreshness / totalItems : 0;
  }

  /**
   * Calculates source reliability based on data source trustworthiness
   */
  calculateSourceReliability(options: Option[]): number {
    if (options.length === 0) {
      return 0;
    }

    let totalReliability = 0;
    let totalSources = 0;

    for (const option of options) {
      // Use option-level quality score if available
      if (option.metadata.dataQuality.reliability !== undefined) {
        totalReliability += option.metadata.dataQuality.reliability;
        totalSources++;
      }

      // Check attribute-level source reliability
      for (const attribute of Object.values(option.attributes)) {
        if (attribute.confidence !== undefined) {
          totalReliability += attribute.confidence;
          totalSources++;
        } else if (attribute.source) {
          // Estimate reliability based on source type
          const sourceReliability = this.estimateSourceReliability(attribute.source);
          totalReliability += sourceReliability;
          totalSources++;
        }
      }
    }

    return totalSources > 0 ? totalReliability / totalSources : 0.5; // Default to medium reliability
  }

  /**
   * Calculates algorithm certainty using the specified formula
   * Formula: 1 - (standardDeviation(scores) / mean(scores))
   * Clamped to [0, 1] range
   */
  calculateAlgorithmCertainty(scores: number[]): number {
    if (scores.length === 0) {
      return 0;
    }

    if (scores.length === 1) {
      return 1; // Single score is perfectly certain
    }

    // Filter out any invalid scores
    const validScores = scores.filter(score => 
      typeof score === 'number' && !isNaN(score) && isFinite(score)
    );

    if (validScores.length === 0) {
      return 0;
    }

    if (validScores.length === 1) {
      return 1;
    }

    const mean = this.calculateMean(validScores);
    
    // Handle edge case where mean is zero or very close to zero
    if (Math.abs(mean) < Number.EPSILON) {
      // If all scores are zero or very close to zero, it's a tie (low certainty)
      return 0;
    }

    const standardDeviation = this.calculateStandardDeviation(validScores, mean);
    
    // Calculate certainty using the specified formula
    const certainty = 1 - (standardDeviation / Math.abs(mean));
    
    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, certainty));
  }

  /**
   * Creates a complete confidence metrics object
   */
  calculateCompleteConfidence(
    options: Option[], 
    scores: number[] = [],
    weights?: Partial<ConfidenceWeights>
  ): ConfidenceMetrics {
    const dataCompleteness = this.calculateDataCompleteness(options);
    const dataFreshness = this.calculateDataFreshness(options);
    const sourceReliability = this.calculateSourceReliability(options);
    const algorithmCertainty = this.calculateAlgorithmCertainty(scores);

    const components = {
      dataCompleteness,
      dataFreshness,
      sourceReliability,
      algorithmCertainty
    };

    const overall = this.calculateOverallConfidence(components, weights);

    return {
      overall,
      dataCompleteness,
      dataFreshness,
      sourceReliability,
      algorithmCertainty
    };
  }

  // Private helper methods

  private calculateAge(timestamp: Date, now: Date): number {
    return (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60); // Hours
  }

  private ageTofreshness(ageHours: number, maxAgeHours: number): number {
    if (ageHours <= 0) return 1; // Brand new data
    if (ageHours >= maxAgeHours) return 0; // Too old
    
    // Linear decay from 1 to 0 over maxAgeHours
    return Math.max(0, 1 - (ageHours / maxAgeHours));
  }

  private estimateSourceReliability(source: string): number {
    // Simple heuristic based on source URL patterns
    const lowerSource = source.toLowerCase();
    
    if (lowerSource.includes('github.com') || lowerSource.includes('official')) {
      return 0.9; // High reliability for official sources
    } else if (lowerSource.includes('docs.') || lowerSource.includes('api.')) {
      return 0.8; // Good reliability for documentation
    } else if (lowerSource.includes('wikipedia') || lowerSource.includes('stackoverflow')) {
      return 0.7; // Medium-high reliability for community sources
    } else if (lowerSource.includes('blog') || lowerSource.includes('medium')) {
      return 0.6; // Medium reliability for blogs
    } else {
      return 0.5; // Default medium reliability
    }
  }

  private calculateMean(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculateStandardDeviation(numbers: number[], mean?: number): number {
    const actualMean = mean ?? this.calculateMean(numbers);
    const squaredDifferences = numbers.map(num => Math.pow(num - actualMean, 2));
    const variance = this.calculateMean(squaredDifferences);
    return Math.sqrt(variance);
  }
}