import { Option, Constraint, AnalysisConfig } from '../../types/core';

export interface AnalysisContext {
  options: Option[];
  constraints: Constraint[];
  scores: number[][]; // [option][criterion] normalized scores
  config: AnalysisConfig;
}

export interface AttributeStatistics {
  mean: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
  variance: number;
  values: number[];
}

export interface AnalysisRule {
  name: string;
  description: string;
  apply: (option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>) => boolean;
  confidence: number; // 0-1 base confidence for this rule
}

export interface GeneratedAnalysisPoint {
  description: string;
  attributeSource: string;
  confidenceLevel: number;
  reasoning: string;
  ruleApplied: string;
  significance: 'high' | 'medium' | 'low';
}