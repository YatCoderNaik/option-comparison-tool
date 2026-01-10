import { Option, Constraint, ScenarioGuidance, AnalysisConfig } from '../../types/core';
import { AnalysisContext, AttributeStatistics } from './types';

export interface ScenarioRule {
  name: string;
  scenario: string;
  condition: (context: AnalysisContext, stats: Record<string, AttributeStatistics>) => boolean;
  generateGuidance: (
    context: AnalysisContext, 
    stats: Record<string, AttributeStatistics>
  ) => {
    guidance: string;
    applicableOptions: string[];
    tradeoffExplanation: string;
    confidenceLevel: number;
  };
}

export class ScenarioGuidanceGenerator {
  private config: AnalysisConfig;
  private scenarioRules: ScenarioRule[] = [];

  constructor(config?: Partial<AnalysisConfig>) {
    this.config = {
      uniqueFeatureVarianceThreshold: 0.20,
      significantDifferenceThreshold: 0.15,
      dealBreakerConfidenceThreshold: 0.90,
      ...config
    };

    this.initializeScenarioRules();
  }

  /**
   * Generates scenario-based guidance for the given context
   */
  generateScenarioGuidance(
    options: Option[],
    constraints: Constraint[],
    scores: number[][]
  ): ScenarioGuidance[] {
    const context: AnalysisContext = {
      options,
      constraints,
      scores,
      config: this.config
    };

    const stats = this.calculateAttributeStatistics(options);
    const guidance: ScenarioGuidance[] = [];

    for (const rule of this.scenarioRules) {
      if (rule.condition(context, stats)) {
        const result = rule.generateGuidance(context, stats);
        
        guidance.push({
          scenario: rule.scenario,
          guidance: result.guidance,
          applicableOptions: result.applicableOptions,
          tradeoffExplanation: result.tradeoffExplanation,
          confidenceLevel: result.confidenceLevel
        });
      }
    }

    return guidance;
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
   * Initializes the scenario rules
   */
  private initializeScenarioRules(): void {
    this.scenarioRules = [
      {
        name: 'BudgetConstrained',
        scenario: 'Budget-constrained projects',
        condition: (context, stats) => this.isBudgetConstrainedScenario(context, stats),
        generateGuidance: (context, stats) => this.generateBudgetConstrainedGuidance(context, stats)
      },
      {
        name: 'PerformanceCritical',
        scenario: 'Performance-critical applications',
        condition: (context, stats) => this.isPerformanceCriticalScenario(context, stats),
        generateGuidance: (context, stats) => this.generatePerformanceCriticalGuidance(context, stats)
      },
      {
        name: 'BalancedApproach',
        scenario: 'Balanced requirements',
        condition: (context, stats) => this.isBalancedApproachScenario(context, stats),
        generateGuidance: (context, stats) => this.generateBalancedApproachGuidance(context, stats)
      },
      {
        name: 'HighReliability',
        scenario: 'Mission-critical systems',
        condition: (context, stats) => this.isHighReliabilityScenario(context, stats),
        generateGuidance: (context, stats) => this.generateHighReliabilityGuidance(context, stats)
      },
      {
        name: 'RapidPrototyping',
        scenario: 'Rapid prototyping and development',
        condition: (context, stats) => this.isRapidPrototypingScenario(context, stats),
        generateGuidance: (context, stats) => this.generateRapidPrototypingGuidance(context, stats)
      },
      {
        name: 'ScalabilityFocused',
        scenario: 'High-growth and scalability requirements',
        condition: (context, stats) => this.isScalabilityFocusedScenario(context, stats),
        generateGuidance: (context, stats) => this.generateScalabilityFocusedGuidance(context, stats)
      }
    ];
  }

  // Scenario condition methods
  private isBudgetConstrainedScenario(context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    // Check if cost constraints have high weight or there are hard budget limits
    const costConstraints = context.constraints.filter(c => c.criterionType === 'cost');
    const totalCostWeight = costConstraints.reduce((sum, c) => sum + c.weight, 0);
    
    return totalCostWeight > 0.5 || costConstraints.some(c => c.isHardRequirement);
  }

  private isPerformanceCriticalScenario(context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    // Check if performance-related constraints have high weight
    const performanceConstraints = context.constraints.filter(c => 
      c.type === 'performance' || 
      c.name.toLowerCase().includes('performance') ||
      c.name.toLowerCase().includes('speed') ||
      c.name.toLowerCase().includes('latency')
    );
    const totalPerformanceWeight = performanceConstraints.reduce((sum, c) => sum + c.weight, 0);
    
    return totalPerformanceWeight > 0.4;
  }

  private isBalancedApproachScenario(context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    // Check if weights are relatively evenly distributed
    const weights = context.constraints.map(c => c.weight);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights.filter(w => w > 0));
    
    return maxWeight - minWeight < 0.3; // Weights are relatively balanced
  }

  private isHighReliabilityScenario(context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    // Check if reliability-related constraints exist and have significant weight
    const reliabilityConstraints = context.constraints.filter(c => 
      c.name.toLowerCase().includes('reliability') ||
      c.name.toLowerCase().includes('uptime') ||
      c.name.toLowerCase().includes('availability') ||
      c.isHardRequirement
    );
    
    return reliabilityConstraints.length > 0 && 
           reliabilityConstraints.reduce((sum, c) => sum + c.weight, 0) > 0.3;
  }

  private isRapidPrototypingScenario(context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    // Check if ease-of-use or development speed constraints exist
    const easeConstraints = context.constraints.filter(c => 
      c.name.toLowerCase().includes('ease') ||
      c.name.toLowerCase().includes('simple') ||
      c.name.toLowerCase().includes('quick') ||
      c.name.toLowerCase().includes('setup')
    );
    
    return easeConstraints.length > 0;
  }

  private isScalabilityFocusedScenario(context: AnalysisContext, stats: Record<string, AttributeStatistics>): boolean {
    // Check if scalability-related constraints exist
    const scalabilityConstraints = context.constraints.filter(c => 
      c.name.toLowerCase().includes('scalability') ||
      c.name.toLowerCase().includes('scale') ||
      c.name.toLowerCase().includes('growth') ||
      c.name.toLowerCase().includes('capacity')
    );
    
    return scalabilityConstraints.length > 0;
  }

  // Guidance generation methods
  private generateBudgetConstrainedGuidance(
    context: AnalysisContext, 
    stats: Record<string, AttributeStatistics>
  ): { guidance: string; applicableOptions: string[]; tradeoffExplanation: string; confidenceLevel: number } {
    const costConstraints = context.constraints.filter(c => c.criterionType === 'cost');
    const applicableOptions: string[] = [];
    
    // Find options with lowest costs
    for (const constraint of costConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const stat = stats[attrPath];
      
      if (stat) {
        for (const option of context.options) {
          const value = this.extractNumericValue(option.attributes[attrPath]?.value);
          if (value !== null && Math.abs(value - stat.min) < stat.standardDeviation * 0.1) {
            if (!applicableOptions.includes(option.id)) {
              applicableOptions.push(option.id);
            }
          }
        }
      }
    }

    return {
      guidance: 'Focus on cost-effectiveness and essential features. Consider options with the lowest total cost of ownership, even if they require some trade-offs in premium features.',
      applicableOptions,
      tradeoffExplanation: 'You may sacrifice some advanced features or performance for significant cost savings. Ensure core functionality meets your minimum requirements.',
      confidenceLevel: 0.85
    };
  }

  private generatePerformanceCriticalGuidance(
    context: AnalysisContext, 
    stats: Record<string, AttributeStatistics>
  ): { guidance: string; applicableOptions: string[]; tradeoffExplanation: string; confidenceLevel: number } {
    const performanceConstraints = context.constraints.filter(c => 
      c.type === 'performance' || c.criterionType === 'benefit'
    );
    const applicableOptions: string[] = [];
    
    // Find options with highest performance values
    for (const constraint of performanceConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const stat = stats[attrPath];
      
      if (stat) {
        for (const option of context.options) {
          const value = this.extractNumericValue(option.attributes[attrPath]?.value);
          if (value !== null && Math.abs(value - stat.max) < stat.standardDeviation * 0.1) {
            if (!applicableOptions.includes(option.id)) {
              applicableOptions.push(option.id);
            }
          }
        }
      }
    }

    return {
      guidance: 'Prioritize performance and reliability over cost considerations. Choose options with proven track records in high-load scenarios.',
      applicableOptions,
      tradeoffExplanation: 'Higher costs are justified by superior performance and reliability. Consider the long-term benefits of reduced latency and improved user experience.',
      confidenceLevel: 0.90
    };
  }

  private generateBalancedApproachGuidance(
    context: AnalysisContext, 
    stats: Record<string, AttributeStatistics>
  ): { guidance: string; applicableOptions: string[]; tradeoffExplanation: string; confidenceLevel: number } {
    const applicableOptions: string[] = [];
    
    // Find options that perform well across multiple criteria (near median/mean values)
    for (const option of context.options) {
      let balanceScore = 0;
      let criteriaCount = 0;
      
      for (const constraint of context.constraints) {
        const attrPath = constraint.evaluationRule.attributePath;
        const stat = stats[attrPath];
        const value = this.extractNumericValue(option.attributes[attrPath]?.value);
        
        if (value !== null && stat && stat.standardDeviation > 0) {
          // Calculate how close to median this value is (normalized)
          const distanceFromMedian = Math.abs(value - stat.median) / stat.standardDeviation;
          balanceScore += Math.max(0, 1 - distanceFromMedian); // Closer to median = higher score
          criteriaCount++;
        }
      }
      
      if (criteriaCount > 0) {
        const avgBalance = balanceScore / criteriaCount;
        if (avgBalance > 0.6) { // Good balance across criteria
          applicableOptions.push(option.id);
        }
      }
    }

    return {
      guidance: 'Look for well-rounded options that perform consistently across all criteria. Avoid extreme choices in favor of reliable, balanced solutions.',
      applicableOptions,
      tradeoffExplanation: 'Balanced options may not excel in any single area but provide predictable performance across all requirements, reducing overall risk.',
      confidenceLevel: 0.75
    };
  }

  private generateHighReliabilityGuidance(
    context: AnalysisContext, 
    stats: Record<string, AttributeStatistics>
  ): { guidance: string; applicableOptions: string[]; tradeoffExplanation: string; confidenceLevel: number } {
    const reliabilityConstraints = context.constraints.filter(c => 
      c.name.toLowerCase().includes('reliability') ||
      c.name.toLowerCase().includes('uptime') ||
      c.isHardRequirement
    );
    const applicableOptions: string[] = [];
    
    // Find options that meet all hard requirements and have high reliability scores
    for (const option of context.options) {
      let meetsAllHardRequirements = true;
      
      for (const constraint of context.constraints.filter(c => c.isHardRequirement)) {
        const attrPath = constraint.evaluationRule.attributePath;
        const value = this.extractNumericValue(option.attributes[attrPath]?.value);
        
        if (value === null) {
          meetsAllHardRequirements = false;
          break;
        }
        
        // Check constraint satisfaction (simplified)
        const targetValue = constraint.evaluationRule.targetValue;
        if (typeof targetValue === 'number') {
          const satisfies = constraint.evaluationRule.operator === 'greaterThan' 
            ? value > targetValue 
            : value < targetValue;
          
          if (!satisfies) {
            meetsAllHardRequirements = false;
            break;
          }
        }
      }
      
      if (meetsAllHardRequirements) {
        applicableOptions.push(option.id);
      }
    }

    return {
      guidance: 'Prioritize proven reliability and compliance with all hard requirements. Consider options with strong SLAs and established track records.',
      applicableOptions,
      tradeoffExplanation: 'Higher upfront costs and potentially lower flexibility are acceptable trade-offs for guaranteed reliability and reduced operational risk.',
      confidenceLevel: 0.95
    };
  }

  private generateRapidPrototypingGuidance(
    context: AnalysisContext, 
    stats: Record<string, AttributeStatistics>
  ): { guidance: string; applicableOptions: string[]; tradeoffExplanation: string; confidenceLevel: number } {
    // For rapid prototyping, prefer options that are easy to set up and use
    const applicableOptions = context.options
      .filter(option => {
        // Simple heuristic: options with fewer complex attributes or good documentation
        const attributeCount = Object.keys(option.attributes).length;
        return attributeCount <= 5; // Simpler options
      })
      .map(option => option.id);

    return {
      guidance: 'Choose options that minimize setup time and complexity. Prioritize ease of use and quick implementation over advanced features.',
      applicableOptions,
      tradeoffExplanation: 'You may sacrifice some advanced capabilities for faster time-to-market and reduced development complexity. Plan for potential migration later.',
      confidenceLevel: 0.70
    };
  }

  private generateScalabilityFocusedGuidance(
    context: AnalysisContext, 
    stats: Record<string, AttributeStatistics>
  ): { guidance: string; applicableOptions: string[]; tradeoffExplanation: string; confidenceLevel: number } {
    const scalabilityConstraints = context.constraints.filter(c => 
      c.name.toLowerCase().includes('scalability') ||
      c.name.toLowerCase().includes('capacity')
    );
    const applicableOptions: string[] = [];
    
    // Find options with high scalability scores
    for (const constraint of scalabilityConstraints) {
      const attrPath = constraint.evaluationRule.attributePath;
      const stat = stats[attrPath];
      
      if (stat) {
        for (const option of context.options) {
          const value = this.extractNumericValue(option.attributes[attrPath]?.value);
          if (value !== null && value >= stat.mean + stat.standardDeviation * 0.5) {
            if (!applicableOptions.includes(option.id)) {
              applicableOptions.push(option.id);
            }
          }
        }
      }
    }

    return {
      guidance: 'Focus on options with proven scalability and flexible architecture. Consider future growth requirements and infrastructure costs.',
      applicableOptions,
      tradeoffExplanation: 'Higher initial complexity and costs are justified by the ability to handle future growth without major architectural changes.',
      confidenceLevel: 0.80
    };
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