import { Option, Constraint, CriterionType } from '../../types/core';
import { 
  NormalizationParameters, 
  NormalizationResult, 
  ScoringEngineConfig 
} from './types';

export class NormalizationEngine {
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
  }

  /**
   * Normalizes values for a single criterion across all options
   */
  normalizeCriterion(
    options: Option[],
    constraint: Constraint
  ): NormalizationResult {
    const warnings: string[] = [];
    
    // Extract raw values
    const rawValues = this.extractValues(options, constraint.evaluationRule.attributePath);
    
    // Filter out missing values and track excluded indices
    const allEntries = rawValues.map((value, index) => ({ value, index }));
    const validEntries = allEntries.filter((entry): entry is { value: number; index: number } => 
      entry.value !== null && entry.value !== undefined
    );
    
    const excludedIndices = allEntries
      .filter(entry => entry.value === null || entry.value === undefined)
      .map(entry => entry.index);

    if (validEntries.length === 0) {
      // No valid values - return all zeros
      return {
        normalizedValues: new Array(options.length).fill(0),
        parameters: this.createEmptyParameters(constraint.criterionType),
        excludedIndices,
        warnings: ['No valid values found for criterion']
      };
    }

    if (validEntries.length < this.config.normalization.minValidOptions) {
      warnings.push(`Only ${validEntries.length} valid values found, results may be unreliable`);
    }

    const validValues: number[] = validEntries.map(entry => entry.value);
    
    // Calculate percentiles for outlier handling
    const sortedValues = [...validValues].sort((a, b) => a - b);
    const p5 = this.calculatePercentile(sortedValues, this.config.outlierHandling.percentileThresholds.lower);
    const p95 = this.calculatePercentile(sortedValues, this.config.outlierHandling.percentileThresholds.upper);
    
    // Apply outlier capping if enabled
    let processedValues: number[] = validValues;
    let hasOutliers = false;
    
    if (this.config.outlierHandling.enabled) {
      processedValues = validValues.map(value => {
        if (value < p5) {
          hasOutliers = true;
          return p5;
        } else if (value > p95) {
          hasOutliers = true;
          return p95;
        }
        return value;
      });
      
      if (hasOutliers) {
        warnings.push(`Outliers detected and capped to P${this.config.outlierHandling.percentileThresholds.lower}-P${this.config.outlierHandling.percentileThresholds.upper} range`);
      }
    }

    // Calculate min/max for normalization
    const min = Math.min(...processedValues);
    const max = Math.max(...processedValues);
    const zeroRange = Math.abs(max - min) < Number.EPSILON;

    if (zeroRange) {
      warnings.push('All values are equal - using default score for all options');
    }

    // Create normalization parameters
    const parameters: NormalizationParameters = {
      min,
      max,
      outlierThreshold: { p5, p95 },
      criterionType: constraint.criterionType,
      hasOutliers,
      zeroRange
    };

    // Normalize values
    const normalizedValues = new Array(options.length).fill(0);
    
    validEntries.forEach((entry, validIndex) => {
      const processedValue: number = processedValues[validIndex];
      const normalizedValue = this.normalizeValue(
        processedValue, 
        min, 
        max, 
        constraint.criterionType,
        zeroRange
      );
      normalizedValues[entry.index] = normalizedValue;
    });

    return {
      normalizedValues,
      parameters,
      excludedIndices,
      warnings
    };
  }

  /**
   * Extracts numeric values from options for a given attribute path
   */
  private extractValues(options: Option[], attributePath: string): (number | null)[] {
    return options.map(option => {
      try {
        const value = this.getNestedValue(option.attributes, attributePath);
        
        if (value === null || value === undefined || value === '') {
          return null;
        }

        // Convert to number if possible
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
   * Normalizes a single value based on criterion type
   */
  private normalizeValue(
    value: number, 
    min: number, 
    max: number, 
    criterionType: CriterionType,
    zeroRange: boolean
  ): number {
    if (zeroRange) {
      return this.config.normalization.zeroRangeDefault;
    }

    const range = max - min;
    
    switch (criterionType) {
      case 'benefit': // Higher is better
        return (value - min) / range;
      
      case 'cost': // Lower is better
        return (max - value) / range;
      
      case 'neutral': // Not used in scoring
        return 0.5; // Neutral value
      
      default:
        throw new Error(`Unknown criterion type: ${criterionType}`);
    }
  }

  /**
   * Calculates percentile value from sorted array
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];
    
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Creates empty normalization parameters for edge cases
   */
  private createEmptyParameters(criterionType: CriterionType): NormalizationParameters {
    return {
      min: 0,
      max: 0,
      outlierThreshold: { p5: 0, p95: 0 },
      criterionType,
      hasOutliers: false,
      zeroRange: true
    };
  }

  /**
   * Validates that options have sufficient data for normalization
   */
  validateDataSufficiency(
    options: Option[], 
    constraints: Constraint[]
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (options.length < this.config.normalization.minValidOptions) {
      errors.push(`Minimum ${this.config.normalization.minValidOptions} options required for normalization`);
    }

    // Check each constraint for data availability
    for (const constraint of constraints) {
      if (constraint.criterionType === 'neutral') {
        continue; // Skip neutral criteria
      }

      const values = this.extractValues(options, constraint.evaluationRule.attributePath);
      const validCount = values.filter(v => v !== null).length;
      const missingPercentage = (values.length - validCount) / values.length;

      if (validCount === 0) {
        errors.push(`No valid data found for criterion: ${constraint.name}`);
      } else if (missingPercentage > this.config.missingValueHandling.maxMissingPercentage) {
        warnings.push(`High missing data rate (${Math.round(missingPercentage * 100)}%) for criterion: ${constraint.name}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}