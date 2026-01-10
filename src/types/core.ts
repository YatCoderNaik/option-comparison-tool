// Core data models for the Option Comparison Tool

export type OptionCategory = 'api' | 'cloud-service' | 'framework' | 'tool' | 'custom';
export type ConstraintType = 'budget' | 'performance' | 'compatibility' | 'feature' | 'custom';
export type CriterionType = 'benefit' | 'cost' | 'neutral';
export type EvaluationOperator = 'lessThan' | 'greaterThan' | 'equals' | 'contains' | 'range';
export type EntryMethod = 'manual' | 'template' | 'api';
export type ExportFormat = 'pdf' | 'csv' | 'json';

export interface AttributeValue {
  value: string | number | boolean;
  unit?: string;
  confidence?: number; // 0-1, based on data source reliability
  source?: string; // URL or reference to data source
  lastUpdated?: Date;
}

export interface QualityScore {
  completeness: number; // 0-1
  freshness: number; // 0-1
  reliability: number; // 0-1
}

export interface OptionMetadata {
  dateAdded: Date;
  lastUpdated: Date;
  dataQuality: QualityScore;
  entryMethod: EntryMethod;
}

export interface Option {
  id: string;
  name: string;
  description: string;
  category: OptionCategory;
  attributes: Record<string, AttributeValue>;
  metadata: OptionMetadata;
}

export interface EvaluationRule {
  attributePath: string; // e.g., "pricing.monthlyFee"
  operator: EvaluationOperator;
  targetValue: string | number | [number, number];
  unit?: string;
}

export interface Constraint {
  id: string;
  name: string;
  type: ConstraintType;
  isHardRequirement: boolean;
  weight: number; // 0-1 scale, validated to ensure sum ≤ 1
  criterionType: CriterionType; // For normalization
  evaluationRule: EvaluationRule;
  description: string;
  confidenceLevel: number; // 0-1 based on data quality
}

export interface ConfidenceMetrics {
  overall: number; // 0-1, weighted average of component confidences
  dataCompleteness: number; // Percentage of attributes with values
  dataFreshness: number; // Based on last update timestamps
  sourceReliability: number; // Based on data source trustworthiness
  algorithmCertainty: number; // How clear the ranking differences are
}

export interface ConstraintViolation {
  constraintId: string;
  constraintName: string;
  expectedValue: any;
  actualValue: any;
  explanation: string;
}

export interface ExcludedOption {
  option: Option;
  violatedConstraints: ConstraintViolation[];
  canBeIncluded: boolean; // User toggle state
}

export interface RankingResult {
  optionId: string;
  rank: number;
  score: number;
  normalizedScore: number;
}

export interface DecisionMatrix {
  options: Option[];
  excludedOptions: ExcludedOption[];
  criteria: Constraint[];
  scores: number[][]; // [option][criterion] - only for included options
  normalizedScores: number[][];
  weightedScores: number[];
  rankings: RankingResult[];
  constraintViolations: ConstraintViolation[];
}

export interface AnalysisPoint {
  description: string;
  attributeSource: string; // Which attribute this is derived from
  confidenceLevel: number; // 0-1 based on data quality
  reasoning: string; // Rule-based explanation of how this was determined
  ruleApplied: string; // e.g., "HighestValue", "LowestCost", "UniqueFeature"
}

export interface Differentiator {
  attribute: string;
  description: string;
  optionValues: Record<string, any>; // optionId -> value
  significance: 'high' | 'medium' | 'low';
}

export interface ScenarioGuidance {
  scenario: string; // e.g., "Budget-constrained projects"
  guidance: string; // e.g., "Consider focusing on cost-effectiveness over premium features"
  applicableOptions: string[]; // Option IDs that fit this scenario
  tradeoffExplanation: string; // What you gain/lose in this scenario
  confidenceLevel: number;
}

export interface TradeoffAnalysis {
  optionAnalyses: {
    [optionId: string]: {
      strengths: AnalysisPoint[];
      weaknesses: AnalysisPoint[];
      uniqueFeatures: AnalysisPoint[];
      dealBreakers: AnalysisPoint[];
    };
  };
  keyDifferentiators: Differentiator[];
  scenarioGuidance: ScenarioGuidance[];
}

export interface DecisionInsight {
  type: 'summary' | 'warning' | 'recommendation' | 'clarification';
  title: string;
  description: string;
  confidence: number;
  relatedOptions?: string[];
  relatedCriteria?: string[];
}

export interface ComparisonResult {
  matrix: DecisionMatrix;
  tradeoffs: TradeoffAnalysis;
  insights: DecisionInsight[];
  confidence: ConfidenceMetrics;
}

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WeightValidationResult {
  isValid: boolean;
  normalizedWeights: Record<string, number>;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Configuration interfaces
export interface AnalysisConfig {
  uniqueFeatureVarianceThreshold: number; // Default: 0.20 (20%)
  significantDifferenceThreshold: number; // Default: 0.15 (15%)
  dealBreakerConfidenceThreshold: number; // Default: 0.90 (90%)
}

// Snapshot models for immutable comparisons
export interface OptionSnapshot {
  originalOptionId: string;
  snapshotData: Option;
  dataVersion: Date;
}

export interface ComparisonSnapshot {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  optionSnapshots: OptionSnapshot[];
  constraints: Constraint[];
  results: ComparisonResult;
  metadata: {
    version: string; // Semantic version of comparison format
    algorithmVersion: string; // MCDA algorithm version used
    dataIntegrityHash: string; // Verify snapshot hasn't been tampered with
    metrics?: {
      totalSize: number;
      creationTime: number;
      optionCount: number;
      constraintCount: number;
      dataPoints: number;
    };
    formattedResults?: any; // Optional formatted results for display
  };
}