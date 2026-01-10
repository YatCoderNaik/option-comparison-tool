import { Option, Constraint, AnalysisConfig, AnalysisPoint } from '../../types/core';
import { 
  AnalysisContext, 
  AttributeStatistics, 
  AnalysisRule, 
  GeneratedAnalysisPoint 
} from './types';

export class AnalysisPointGenerator {
  private config: AnalysisConfig;
  private strengthRules!: AnalysisRule[];
  private weaknessRules!: AnalysisRule[];
  private uniqueFeatureRules!: AnalysisRule[];
  private dealBreakerRules!: AnalysisRule[];

  constructor(config?: Partial<AnalysisConfig>) {
    this.config = {
      uniqueFeatureVarianceThreshold: 0.20,
      significantDifferenceThreshold: 0.15,
      dealBreakerConfidenceThreshold: 0.90,
      ...config
    };

    this.initializeRules();
  }

  /**
   * Generates analysis points for a specific option
   */
  generateAnalysisPoints(
    option: Option,
    allOptions: Option[],
    constraints: Constraint[],
    scores: number[][]
  ): {
    strengths: AnalysisPoint[];
    weaknesses: AnalysisPoint[];
    uniqueFeatures: AnalysisPoint[];
    dealBreakers: AnalysisPoint[];
  } {
    const context: AnalysisContext = {
      options: allOptions,
      constraints,
      scores,
      config: this.config
    };

    const stats = this.calculateAttributeStatistics(allOptions);
    const optionIndex = allOptions.findIndex(o => o.id === option.id);

    if (optionIndex === -1) {
      throw new Error(`Option ${option.id} not found in options list`);
    }

    return {
      strengths: this.generateStrengths(option, context, stats),
      weaknesses: this.generateWeaknesses(option, context, stats),
      uniqueFeatures: this.generateUniqueFeatures(option, context, stats),
      dealBreakers: this.generateDealBreakers(option, context, stats)
    };
  }

  /**
   * Generates strength analysis points
   */
  private generateStrengths(
    option: Option,
    context: AnalysisContext,
    stats: Record<string, AttributeStatistics>
  ): AnalysisPoint[] {
    const strengths: GeneratedAnalysisPoint[] = [];

    for (const rule of this.strengthRules) {
      if (rule.apply(option, context, stats)) {
        const point = this.createAnalysisPoint(option, rule, context, stats);
        if (point) {
          strengths.push(point);
        }
      }
    }

    return this.convertToAnalysisPoints(strengths);
  }

  /**
   * Generates weakness analysis points
   */
  private generateWeaknesses(
    option: Option,
    context: AnalysisContext,
    stats: Record<string, AttributeStatistics>
  ): AnalysisPoint[] {
    const weaknesses: GeneratedAnalysisPoint[] = [];

    for (const rule of this.weaknessRules) {
      if (rule.apply(option, context, stats)) {
        const point = this.createAnalysisPoint(option, rule, context, stats);
        if (point) {
          weaknesses.push(point);
        }
      }
    }

    return this.convertToAnalysisPoints(weaknesses);
  }

  /**
   * Generates unique feature analysis points
   */
  private generateUniqueFeatures(
    option: Option,
    context: AnalysisContext,
    stats: Record<string, AttributeStatistics>
  ): AnalysisPoint[] {
    const uniqueFeatures: GeneratedAnalysisPoint[] = [];

    for (const rule of this.uniqueFeatureRules) {
      if (rule.apply(option, context, stats)) {
        const point = this.createAnalysisPoint(option, rule, context, stats);
        if (point) {
          uniqueFeatures.push(point);
        }
      }
    }

    return this.convertToAnalysisPoints(uniqueFeatures);
  }

  /**
   * Generates deal breaker analysis points
   */
  private generateDealBreakers(
    option: Option,
    context: AnalysisContext,
    stats: Record<string, AttributeStatistics>
  ): AnalysisPoint[] {
    const dealBreakers: GeneratedAnalysisPoint[] = [];

    for (const rule of this.dealBreakerRules) {
      if (rule.apply(option, context, stats)) {
        const point = this.createAnalysisPoint(option, rule, context, stats);
        if (point) {
          dealBreakers.push(point);
        }
      }
    }

    return this.convertToAnalysisPoints(dealBreakers);
  }

  /**
   * Calculates statistical measures for all attributes across options
   */
  private calculateAttributeStatistics(options: Option[]): Record<string, AttributeStatistics> {
    const stats: Record<string, AttributeStatistics> = {};
    
    // Collect all unique attribute paths
    const attributePaths = new Set<string>();
    for (const option of options) {
      for (const attrName of Object.keys(option.attributes)) {
        attributePaths.add(attrName);
      }
    }

    // Calculate statistics for each attribute
    for (const attrPath of attributePaths) {
      const values: number[] = [];
      
      for (const option of options) {
        const attr = option.attributes[attrPath];
        if (attr && attr.value !== null && attr.value !== undefined) {
          const numValue = this.extractNumericValue(attr.value);
          if (numValue !== null) {
            values.push(numValue);
          }
        }
      }

      if (values.length > 0) {
        stats[attrPath] = this.calculateStatistics(values);
      }
    }

    return stats;
  }

  /**
   * Calculates statistical measures for a set of values
   */
  private calculateStatistics(values: number[]): AttributeStatistics {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      mean,
      median,
      min: Math.min(...values),
      max: Math.max(...values),
      standardDeviation,
      variance,
      values: [...values]
    };
  }

  /**
   * Extracts numeric value from attribute value
   */
  private extractNumericValue(value: any): number | null {
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
  }

  /**
   * Creates an analysis point from a rule application
   */
  private createAnalysisPoint(
    option: Option,
    rule: AnalysisRule,
    context: AnalysisContext,
    stats: Record<string, AttributeStatistics>
  ): GeneratedAnalysisPoint | null {
    // Generate specific description based on rule type
    let description = rule.description;
    let attributeSource = 'multiple';
    let significance: 'high' | 'medium' | 'low' = 'medium';
    
    // Customize based on rule name
    switch (rule.name) {
      case 'HighestValue':
      case 'LowestValue':
      case 'LowestCost':
      case 'HighestCost':
        const extremeAttr = this.findExtremeAttribute(option, context, stats, rule.name);
        if (extremeAttr) {
          attributeSource = extremeAttr.attribute;
          description = `${extremeAttr.description} (${extremeAttr.value})`;
          significance = 'high';
        }
        break;
        
      case 'AboveAverage':
      case 'BelowAverage':
        const avgAttr = this.findAverageDeviationAttribute(option, context, stats, rule.name);
        if (avgAttr) {
          attributeSource = avgAttr.attribute;
          description = `${avgAttr.description} (${avgAttr.value} vs avg ${avgAttr.average})`;
          significance = 'medium';
        }
        break;
        
      case 'UniqueFeature':
      case 'OutlierValue':
        const uniqueAttr = this.findUniqueAttribute(option, context, stats);
        if (uniqueAttr) {
          attributeSource = uniqueAttr.attribute;
          description = `Unique ${uniqueAttr.attribute}: ${uniqueAttr.value}`;
          significance = 'medium';
        }
        break;
        
      case 'HardConstraintViolation':
        const violatedConstraint = this.findViolatedConstraint(option, context);
        if (violatedConstraint) {
          attributeSource = violatedConstraint.attribute;
          description = `Violates ${violatedConstraint.constraintName}: ${violatedConstraint.description}`;
          significance = 'high';
        }
        break;
        
      case 'CriticalMissingFeature':
        const missingFeatures = this.findMissingFeatures(option, context);
        if (missingFeatures.length > 0) {
          attributeSource = missingFeatures[0];
          description = `Missing critical data for ${missingFeatures.length} attribute(s)`;
          significance = 'high';
        }
        break;
    }
    
    return {
      description,
      attributeSource,
      confidenceLevel: rule.confidence,
      reasoning: `Applied rule: ${rule.name}. ${this.generateReasoning(rule.name, option, context, stats)}`,
      ruleApplied: rule.name,
      significance
    };
  }

  /**
   * Finds the attribute that makes this option extreme (highest/lowest)
   */
  private findExtremeAttribute(
    option: Option,
    context: AnalysisContext,
    stats: Record<string, AttributeStatistics>,
    ruleName: string
  ): { attribute: string; description: string; value: string } | null {
    const isHighest = ruleName.includes('Highest') || ruleName === 'LowestCost';
    const isCost = ruleName.includes('Cost');
    const targetConstraints = context.constraints.filter(c => 
      isCost ? c.criterionType === 'cost' : c.criterionType === 'benefit'
    );
    
    for (const constraint of targetConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      const stat = stats[attrPath];
      
      if (optionValue !== null && stat) {
        const isExtreme = isHighest 
          ? Math.abs(optionValue - stat.max) < Number.EPSILON
          : Math.abs(optionValue - stat.min) < Number.EPSILON;
          
        if (isExtreme) {
          return {
            attribute: attrPath,
            description: `${isHighest ? 'Highest' : 'Lowest'} ${constraint.name.toLowerCase()}`,
            value: optionValue.toString()
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Finds attributes where this option deviates significantly from average
   */
  private findAverageDeviationAttribute(
    option: Option,
    context: AnalysisContext,
    stats: Record<string, AttributeStatistics>,
    ruleName: string
  ): { attribute: string; description: string; value: string; average: string } | null {
    const isAbove = ruleName === 'AboveAverage';
    
    for (const constraint of context.constraints.filter(c => c.criterionType === 'benefit')) {
      const attrPath = constraint.evaluationRule.attributePath;
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      const stat = stats[attrPath];
      
      if (optionValue !== null && stat && stat.standardDeviation > 0) {
        const threshold = stat.mean + (stat.standardDeviation * this.config.significantDifferenceThreshold * (isAbove ? 1 : -1));
        const meetsThreshold = isAbove ? optionValue > threshold : optionValue < threshold;
        
        if (meetsThreshold) {
          return {
            attribute: attrPath,
            description: `${isAbove ? 'Above' : 'Below'} average ${constraint.name.toLowerCase()}`,
            value: optionValue.toFixed(2),
            average: stat.mean.toFixed(2)
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Finds attributes that make this option unique
   */
  private findUniqueAttribute(
    option: Option,
    context: AnalysisContext,
    stats: Record<string, AttributeStatistics>
  ): { attribute: string; value: string } | null {
    for (const [attrPath, stat] of Object.entries(stats)) {
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      
      if (optionValue !== null && stat.standardDeviation > 0) {
        const zScore = Math.abs(optionValue - stat.mean) / stat.standardDeviation;
        
        if (zScore > 2.0) { // Outlier threshold
          return {
            attribute: attrPath,
            value: optionValue.toString()
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Finds violated constraints
   */
  private findViolatedConstraint(
    option: Option,
    context: AnalysisContext
  ): { attribute: string; constraintName: string; description: string } | null {
    const hardConstraints = context.constraints.filter(c => c.isHardRequirement);
    
    for (const constraint of hardConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      
      if (optionValue === null) {
        return {
          attribute: attrPath,
          constraintName: constraint.name,
          description: 'Missing required value'
        };
      }
      
      // Check specific violation
      const targetValue = constraint.evaluationRule.targetValue;
      const operator = constraint.evaluationRule.operator;
      let violationDescription = '';
      
      switch (operator) {
        case 'lessThan':
          if (typeof targetValue === 'number' && optionValue >= targetValue) {
            violationDescription = `${optionValue} >= ${targetValue}`;
          }
          break;
        case 'greaterThan':
          if (typeof targetValue === 'number' && optionValue <= targetValue) {
            violationDescription = `${optionValue} <= ${targetValue}`;
          }
          break;
        case 'equals':
          if (optionValue !== targetValue) {
            violationDescription = `${optionValue} ≠ ${targetValue}`;
          }
          break;
      }
      
      if (violationDescription) {
        return {
          attribute: attrPath,
          constraintName: constraint.name,
          description: violationDescription
        };
      }
    }
    
    return null;
  }

  /**
   * Finds missing features
   */
  private findMissingFeatures(option: Option, context: AnalysisContext): string[] {
    const allAttributes = new Set<string>();
    for (const opt of context.options) {
      for (const attrName of Object.keys(opt.attributes)) {
        allAttributes.add(attrName);
      }
    }
    
    const missing: string[] = [];
    for (const attrName of allAttributes) {
      const optionAttr = option.attributes[attrName];
      
      if (!optionAttr || optionAttr.value === null || optionAttr.value === undefined || optionAttr.value === '') {
        missing.push(attrName);
      }
    }
    
    return missing;
  }

  /**
   * Generates reasoning text for a rule application
   */
  private generateReasoning(
    ruleName: string,
    option: Option,
    context: AnalysisContext,
    stats: Record<string, AttributeStatistics>
  ): string {
    switch (ruleName) {
      case 'HighestValue':
        return 'This option has the maximum value for at least one benefit criterion.';
      case 'LowestCost':
        return 'This option has the minimum cost for at least one cost criterion.';
      case 'AboveAverage':
        return `Performance exceeds group average by more than ${(this.config.significantDifferenceThreshold * 100).toFixed(0)}%.`;
      case 'LowestValue':
        return 'This option has the minimum value for at least one benefit criterion.';
      case 'HighestCost':
        return 'This option has the maximum cost for at least one cost criterion.';
      case 'BelowAverage':
        return `Performance falls below group average by more than ${(this.config.significantDifferenceThreshold * 100).toFixed(0)}%.`;
      case 'UniqueFeature':
        return `Has attributes with variance exceeding ${(this.config.uniqueFeatureVarianceThreshold * 100).toFixed(0)}% threshold.`;
      case 'OutlierValue':
        return 'Has values that are statistical outliers (>2 standard deviations from mean).';
      case 'HardConstraintViolation':
        return 'Fails to meet one or more mandatory requirements.';
      case 'CriticalMissingFeature':
        return 'Missing more than 30% of attributes compared to other options.';
      default:
        return 'Determined by rule-based analysis.';
    }
  }

  /**
   * Converts generated analysis points to the core AnalysisPoint interface
   */
  private convertToAnalysisPoints(generated: GeneratedAnalysisPoint[]): AnalysisPoint[] {
    return generated.map(point => ({
      description: point.description,
      attributeSource: point.attributeSource,
      confidenceLevel: point.confidenceLevel,
      reasoning: point.reasoning,
      ruleApplied: point.ruleApplied
    }));
  }

  /**
   * Initializes the analysis rules
   */
  private initializeRules(): void {
    this.strengthRules = [
      {
        name: 'HighestValue',
        description: 'Has the highest value for a benefit criterion',
        apply: (option, context, stats) => this.isHighestInBenefitCriterion(option, context, stats),
        confidence: 0.9
      },
      {
        name: 'LowestCost',
        description: 'Has the lowest cost for a cost criterion',
        apply: (option, context, stats) => this.isLowestInCostCriterion(option, context, stats),
        confidence: 0.9
      },
      {
        name: 'AboveAverage',
        description: 'Performs significantly above average',
        apply: (option, context, stats) => this.isSignificantlyAboveAverage(option, context, stats),
        confidence: 0.7
      }
    ];

    this.weaknessRules = [
      {
        name: 'LowestValue',
        description: 'Has the lowest value for a benefit criterion',
        apply: (option, context, stats) => this.isLowestInBenefitCriterion(option, context, stats),
        confidence: 0.9
      },
      {
        name: 'HighestCost',
        description: 'Has the highest cost for a cost criterion',
        apply: (option, context, stats) => this.isHighestInCostCriterion(option, context, stats),
        confidence: 0.9
      },
      {
        name: 'BelowAverage',
        description: 'Performs significantly below average',
        apply: (option, context, stats) => this.isSignificantlyBelowAverage(option, context, stats),
        confidence: 0.7
      }
    ];

    this.uniqueFeatureRules = [
      {
        name: 'UniqueFeature',
        description: 'Has a unique characteristic not found in other options',
        apply: (option, context, stats) => this.hasUniqueFeature(option, context, stats),
        confidence: 0.8
      },
      {
        name: 'OutlierValue',
        description: 'Has an outlier value that differs significantly from others',
        apply: (option, context, stats) => this.hasOutlierValue(option, context, stats),
        confidence: 0.6
      }
    ];

    this.dealBreakerRules = [
      {
        name: 'HardConstraintViolation',
        description: 'Violates a hard constraint requirement',
        apply: (option, context, stats) => this.violatesHardConstraint(option, context, stats),
        confidence: 1.0
      },
      {
        name: 'CriticalMissingFeature',
        description: 'Missing a critical required feature',
        apply: (option, context, stats) => this.hasCriticalMissingFeature(option, context, stats),
        confidence: 0.9
      }
    ];
  }

  // Rule implementation methods
  private isHighestInBenefitCriterion(option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    const benefitConstraints = context.constraints.filter(c => c.criterionType === 'benefit');
    
    for (const constraint of benefitConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      const stat = stats[attrPath];
      
      if (optionValue !== null && stat && Math.abs(optionValue - stat.max) < Number.EPSILON) {
        return true;
      }
    }
    
    return false;
  }

  private isLowestInCostCriterion(option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    const costConstraints = context.constraints.filter(c => c.criterionType === 'cost');
    
    for (const constraint of costConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      const stat = stats[attrPath];
      
      if (optionValue !== null && stat && Math.abs(optionValue - stat.min) < Number.EPSILON) {
        return true;
      }
    }
    
    return false;
  }

  private isSignificantlyAboveAverage(option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    const benefitConstraints = context.constraints.filter(c => c.criterionType === 'benefit');
    
    for (const constraint of benefitConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      const stat = stats[attrPath];
      
      if (optionValue !== null && stat && stat.standardDeviation > 0) {
        const threshold = stat.mean + (stat.standardDeviation * this.config.significantDifferenceThreshold);
        if (optionValue > threshold) {
          return true;
        }
      }
    }
    
    return false;
  }

  private isLowestInBenefitCriterion(option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    const benefitConstraints = context.constraints.filter(c => c.criterionType === 'benefit');
    
    for (const constraint of benefitConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      const stat = stats[attrPath];
      
      if (optionValue !== null && stat && Math.abs(optionValue - stat.min) < Number.EPSILON) {
        return true;
      }
    }
    
    return false;
  }

  private isHighestInCostCriterion(option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    const costConstraints = context.constraints.filter(c => c.criterionType === 'cost');
    
    for (const constraint of costConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      const stat = stats[attrPath];
      
      if (optionValue !== null && stat && Math.abs(optionValue - stat.max) < Number.EPSILON) {
        return true;
      }
    }
    
    return false;
  }

  private isSignificantlyBelowAverage(option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    const benefitConstraints = context.constraints.filter(c => c.criterionType === 'benefit');
    
    for (const constraint of benefitConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      const stat = stats[attrPath];
      
      if (optionValue !== null && stat && stat.standardDeviation > 0) {
        const threshold = stat.mean - (stat.standardDeviation * this.config.significantDifferenceThreshold);
        if (optionValue < threshold) {
          return true;
        }
      }
    }
    
    return false;
  }

  private hasUniqueFeature(option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    for (const [attrPath, stat] of Object.entries(stats)) {
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      
      if (optionValue !== null && stat.standardDeviation > 0) {
        const coefficientOfVariation = stat.standardDeviation / Math.abs(stat.mean);
        
        // Check if this attribute has high variance (indicating uniqueness)
        if (coefficientOfVariation > this.config.uniqueFeatureVarianceThreshold) {
          // Check if this option's value is significantly different from the mean
          const deviationFromMean = Math.abs(optionValue - stat.mean) / stat.standardDeviation;
          if (deviationFromMean > 1.5) { // More than 1.5 standard deviations from mean
            return true;
          }
        }
      }
    }
    
    return false;
  }

  private hasOutlierValue(option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    for (const [attrPath, stat] of Object.entries(stats)) {
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      
      if (optionValue !== null && stat.standardDeviation > 0) {
        const zScore = Math.abs(optionValue - stat.mean) / stat.standardDeviation;
        
        // Consider values more than 2 standard deviations away as outliers
        if (zScore > 2.0) {
          return true;
        }
      }
    }
    
    return false;
  }

  private violatesHardConstraint(option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    const hardConstraints = context.constraints.filter(c => c.isHardRequirement);
    
    for (const constraint of hardConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const optionValue = this.extractNumericValue(option.attributes[attrPath]?.value);
      
      if (optionValue === null) {
        // Missing value for hard constraint is a violation
        return true;
      }
      
      // Check constraint violation based on operator
      const targetValue = constraint.evaluationRule.targetValue;
      const operator = constraint.evaluationRule.operator;
      
      switch (operator) {
        case 'lessThan':
          if (typeof targetValue === 'number' && optionValue >= targetValue) {
            return true;
          }
          break;
        case 'greaterThan':
          if (typeof targetValue === 'number' && optionValue <= targetValue) {
            return true;
          }
          break;
        case 'equals':
          if (optionValue !== targetValue) {
            return true;
          }
          break;
        case 'range':
          if (Array.isArray(targetValue) && targetValue.length === 2) {
            if (optionValue < targetValue[0] || optionValue > targetValue[1]) {
              return true;
            }
          }
          break;
      }
    }
    
    return false;
  }

  private hasCriticalMissingFeature(option: Option, context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    // Check if option is missing attributes that other options have
    const allAttributes = new Set<string>();
    for (const opt of context.options) {
      for (const attrName of Object.keys(opt.attributes)) {
        allAttributes.add(attrName);
      }
    }
    
    let missingCount = 0;
    let totalAttributes = 0;
    
    for (const attrName of allAttributes) {
      totalAttributes++;
      const optionAttr = option.attributes[attrName];
      
      if (!optionAttr || optionAttr.value === null || optionAttr.value === undefined || optionAttr.value === '') {
        missingCount++;
      }
    }
    
    // Consider it critical if missing more than 30% of attributes
    const missingPercentage = missingCount / totalAttributes;
    return missingPercentage > 0.3;
  }

  /**
   * Updates the configuration
   */
  updateConfig(newConfig: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): AnalysisConfig {
    return { ...this.config };
  }
}