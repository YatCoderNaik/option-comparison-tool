import { Option, Constraint, CriterionType } from '../../types/core';

export interface NormalizationParameters {
  min: number;
  max: number;
  outlierThreshold: {
    p5: number;
    p95: number;
  };
  criterionType: CriterionType;
  hasOutliers: boolean;
  zeroRange: boolean;
}

export interface NormalizationResult {
  normalizedValues: number[];
  parameters: NormalizationParameters;
  excludedIndices: number[]; // Options excluded due to missing values
  warnings: string[];
}

export interface ScoringMatrix {
  optionIds: string[];
  criteriaIds: string[];
  rawScores: number[][];
  normalizedScores: number[][];
  missingValueMatrix: boolean[][]; // Track which values are missing
  normalizationParameters: Record<string, NormalizationParameters>;
  excludedOptions: string[]; // Options with too many missing values
  neutralCriteria: string[]; // Criteria excluded from scoring
}

export interface WeightedScoringResult {
  optionScores: Record<string, number>;
  rankings: Array<{
    optionId: string;
    rank: number;
    score: number;
  }>;
  transparency: {
    weightsUsed: Record<string, number>;
    normalizationDetails: Record<string, NormalizationParameters>;
    neutralCriteriaExcluded: string[];
    scoringMethod: string;
  };
}

export interface ScoringEngineConfig {
  outlierHandling: {
    enabled: boolean;
    percentileThresholds: {
      lower: number; // Default: 5 (P5)
      upper: number; // Default: 95 (P95)
    };
  };
  missingValueHandling: {
    maxMissingPercentage: number; // Default: 0.5 (50%)
    penaltyFactor: number; // Default: 0.1 (10% penalty per missing value)
  };
  normalization: {
    zeroRangeDefault: number; // Default: 0.5
    minValidOptions: number; // Default: 2
  };
}