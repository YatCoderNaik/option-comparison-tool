// Interface definitions for the Option Comparison Tool components

import {
  Option,
  Constraint,
  ComparisonResult,
  ValidationResult,
  WeightValidationResult,
  ConfidenceMetrics,
  TradeoffAnalysis,
  DecisionMatrix,
  AnalysisConfig,
  ComparisonSnapshot,
  ExportFormat
} from './core';

// Option Management Interfaces
export interface OptionManager {
  addOption(option: Option): Promise<void>;
  removeOption(id: string): Promise<void>;
  validateOption(option: Option): ValidationResult;
  getOptions(): Promise<Option[]>;
  getOption(id: string): Promise<Option | null>;
}

export interface OptionValidator {
  validate(option: Option): ValidationResult;
  validateAttributes(attributes: Record<string, any>): ValidationResult;
  validateMetadata(metadata: any): ValidationResult;
}

export interface OptionRepository {
  save(option: Option): Promise<void>;
  findById(id: string): Promise<Option | null>;
  findAll(): Promise<Option[]>;
  delete(id: string): Promise<void>;
  update(option: Option): Promise<void>;
}

// Constraint Management Interfaces
export interface ConstraintManager {
  addConstraint(constraint: Constraint): void;
  updateWeights(weights: Record<string, number>): WeightValidationResult;
  validateConstraints(): ValidationResult;
  normalizeWeights(weights: Record<string, number>): Record<string, number>;
  getConstraints(): Constraint[];
}

export interface WeightCalculator {
  normalizeWeights(weights: Record<string, number>): Record<string, number>;
  validateWeights(weights: Record<string, number>): WeightValidationResult;
  detectSkew(weights: Record<string, number>): boolean;
  generateSuggestions(weights: Record<string, number>): string[];
}

// Comparison Engine Interfaces
export interface ComparisonEngine {
  compareOptions(options: Option[], constraints: Constraint[]): ComparisonResult;
  generateTradeoffs(options: Option[], constraints: Constraint[]): TradeoffAnalysis;
  calculateScores(options: Option[], constraints: Constraint[]): DecisionMatrix;
}

export interface ScoringEngine {
  calculateScores(options: Option[], constraints: Constraint[]): number[][];
  normalizeScores(scores: number[][], constraints: Constraint[]): number[][];
  applyWeights(normalizedScores: number[][], weights: number[]): number[];
  rankOptions(weightedScores: number[]): number[];
}

export interface TradeoffAnalyzer {
  analyzeOptions(options: Option[], constraints: Constraint[], scores: DecisionMatrix): TradeoffAnalysis;
  identifyStrengths(option: Option, scores: number[], constraints: Constraint[]): string[];
  identifyWeaknesses(option: Option, scores: number[], constraints: Constraint[]): string[];
  findUniqueFeatures(option: Option, allOptions: Option[], config: AnalysisConfig): string[];
  detectDealBreakers(option: Option, constraints: Constraint[]): string[];
}

// Confidence Metrics Interfaces
export interface ConfidenceCalculator {
  calculateOverallConfidence(components: Partial<ConfidenceMetrics>): number;
  calculateDataCompleteness(options: Option[]): number;
  calculateDataFreshness(options: Option[]): number;
  calculateSourceReliability(options: Option[]): number;
  calculateAlgorithmCertainty(scores: number[]): number;
}

// Presentation Interfaces
export interface PresentationManager {
  renderMatrix(result: ComparisonResult): MatrixView;
  generateInsights(result: ComparisonResult): InsightSummary;
  exportResults(result: ComparisonResult, format: ExportFormat): ExportData;
}

export interface MatrixRenderer {
  render(matrix: DecisionMatrix): MatrixView;
  applyVisualIndicators(matrix: DecisionMatrix): MatrixView;
  filterByAspect(matrix: DecisionMatrix, aspect: string): MatrixView;
}

export interface ExportManager {
  exportToPDF(result: ComparisonResult): Buffer;
  exportToCSV(result: ComparisonResult): string;
  exportToJSON(result: ComparisonResult): string;
  validateExportIntegrity(exported: any, original: ComparisonResult): boolean;
}

// Snapshot Management Interfaces
export interface SnapshotManager {
  createSnapshot(result: ComparisonResult, metadata: any): ComparisonSnapshot;
  validateImmutability(snapshot: ComparisonSnapshot): boolean;
  calculateIntegrityHash(snapshot: ComparisonSnapshot): string;
  verifyIntegrity(snapshot: ComparisonSnapshot): boolean;
}

// Presentation Data Types
export interface MatrixView {
  headers: string[];
  rows: MatrixRow[];
  visualIndicators: VisualIndicator[];
  metadata: ViewMetadata;
}

export interface MatrixRow {
  optionId: string;
  optionName: string;
  cells: MatrixCell[];
  overallScore: number;
  rank: number;
}

export interface MatrixCell {
  value: string | number;
  formattedValue: string;
  confidence: number;
  indicator?: VisualIndicator;
}

export interface VisualIndicator {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  intensity: 'low' | 'medium' | 'high';
  tooltip?: string;
}

export interface ViewMetadata {
  totalOptions: number;
  totalCriteria: number;
  excludedOptions: number;
  overallConfidence: number;
  generatedAt: Date;
}

export interface InsightSummary {
  keyFindings: string[];
  recommendations: string[];
  warnings: string[];
  nextSteps: string[];
}

export interface ExportData {
  format: ExportFormat;
  data: Buffer | string;
  filename: string;
  metadata: {
    exportedAt: Date;
    includesContext: boolean;
    integrityHash: string;
  };
}