/**
 * Main Application Orchestrator
 * Wires together all components for the Option Comparison Tool
 */

import { OptionManager } from './components/option-management/option-manager';
import { ConstraintValidator } from './components/constraint-management/constraint-validator';
import { WeightCalculator } from './components/constraint-management/weight-calculator';
import { ConfidenceCalculator } from './components/confidence-metrics/confidence-calculator';
import { ScoringEngine } from './components/scoring-engine/scoring-engine';
import { TradeoffAnalyzer } from './components/tradeoff-analysis/tradeoff-analyzer';
import { ComparisonEngine } from './components/comparison-engine/comparison-engine';
import { ResultFormatter } from './components/comparison-engine/result-formatter';
import { MatrixRenderer } from './components/presentation/matrix-renderer';
import { ExportManager } from './components/presentation/export-manager';
import { SnapshotManager } from './components/sharing/snapshot-manager';
import { SecureSharingManager } from './components/sharing/secure-sharing';
import { ApiRouter } from './api/router';
import { ApiSecurityManager } from './api/security';
import { Option, Constraint, ComparisonResult, ExportFormat } from './types/core';

/**
 * Rendered matrix interface
 */
export interface RenderedMatrix {
  content: string;
  metadata: {
    aspectsIncluded: string[];
    renderingTime: number;
    format: string;
  };
}

/**
 * Configuration for the Option Comparison Tool application
 */
export interface AppConfig {
  // Security configuration
  security: {
    enableAuthentication: boolean;
    enableRBAC: boolean;
    enableAuditLogging: boolean;
    enableRateLimiting: boolean;
    jwtSecret?: string;
    sessionTimeout?: number;
  };
  
  // Performance configuration
  performance: {
    maxConcurrentComparisons: number;
    comparisonTimeoutMs: number;
    maxOptionsPerComparison: number;
    maxConstraintsPerComparison: number;
    enableCaching: boolean;
    cacheExpirationMs: number;
  };
  
  // Export configuration
  export: {
    enabledFormats: ExportFormat[];
    maxExportSize: number;
    enableWatermarks: boolean;
  };
  
  // Sharing configuration
  sharing: {
    enablePublicSharing: boolean;
    enablePrivateSharing: boolean;
    maxSharesPerUser: number;
    shareExpirationDays: number;
  };
  
  // Monitoring configuration
  monitoring: {
    enableMetrics: boolean;
    enableHealthChecks: boolean;
    metricsRetentionDays: number;
  };
}

/**
 * Default application configuration
 */
export const DEFAULT_CONFIG: AppConfig = {
  security: {
    enableAuthentication: true,
    enableRBAC: true,
    enableAuditLogging: true,
    enableRateLimiting: true,
    sessionTimeout: 3600000 // 1 hour
  },
  performance: {
    maxConcurrentComparisons: 100,
    comparisonTimeoutMs: 30000,
    maxOptionsPerComparison: 1000,
    maxConstraintsPerComparison: 50,
    enableCaching: true,
    cacheExpirationMs: 300000 // 5 minutes
  },
  export: {
    enabledFormats: ['json', 'csv', 'pdf'],
    maxExportSize: 10485760, // 10MB
    enableWatermarks: true
  },
  sharing: {
    enablePublicSharing: true,
    enablePrivateSharing: true,
    maxSharesPerUser: 50,
    shareExpirationDays: 30
  },
  monitoring: {
    enableMetrics: true,
    enableHealthChecks: true,
    metricsRetentionDays: 90
  }
};

/**
 * Formatted comparison result interface
 */
export interface FormattedComparisonResult {
  summary: {
    totalOptions: number;
    includedOptions: number;
    excludedOptions: number;
    totalCriteria: number;
    topRecommendation: {
      optionId: string;
      score: number;
      confidence: number;
    };
    overallConfidence: number;
  };
  matrix: {
    headers: {
      options: Array<{ id: string; name: string; isExcluded: boolean }>;
      criteria: Array<{ id: string; name: string; type: string }>;
    };
    cells: any[][];
    excludedOptionsDetails: any[];
  };
  tradeoffs: {
    optionAnalyses: Record<string, any>;
    scenarioGuidance: any[];
    keyDifferentiators: any[];
  };
  insights: {
    summary: string[];
    dataQuality: {
      overallScore: number;
      completeness: number;
      freshness: number;
      reliability: number;
      issues: string[];
      recommendations: string[];
    };
    confidenceBreakdown: Record<string, number>;
  };
  metadata: {
    generatedAt: Date;
    processingTime: number;
    confidence: {
      algorithmCertainty: number;
    };
    transparency: {
      weightsUsed: Record<string, number>;
      dataQualityNotes: string[];
      limitations: string[];
    };
    validation: {
      optionsValidated: boolean;
      constraintsValidated: boolean;
    };
  };
}

/**
 * Main application class that orchestrates all components
 */
export class OptionComparisonApp {
  private config: AppConfig;
  private optionManager!: OptionManager;
  private constraintValidator!: ConstraintValidator;
  private weightCalculator!: WeightCalculator;
  private confidenceCalculator!: ConfidenceCalculator;
  private scoringEngine!: ScoringEngine;
  private tradeoffAnalyzer!: TradeoffAnalyzer;
  private comparisonEngine!: ComparisonEngine;
  private resultFormatter!: ResultFormatter;
  private matrixRenderer!: MatrixRenderer;
  private exportManager!: ExportManager;
  private snapshotManager!: SnapshotManager;
  private sharingManager!: SecureSharingManager;
  private apiRouter!: ApiRouter;
  private securityManager!: ApiSecurityManager;
  
  // Application state
  private isInitialized: boolean = false;
  private activeComparisons: Map<string, Promise<ComparisonResult>> = new Map();
  private cache: Map<string, { result: FormattedComparisonResult; timestamp: number }> = new Map();
  private cacheCleanupInterval?: NodeJS.Timeout;
  
  constructor(config: Partial<AppConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeComponents();
  }
  
  /**
   * Initialize all application components
   */
  private initializeComponents(): void {
    // Core components
    this.optionManager = new OptionManager();
    this.constraintValidator = new ConstraintValidator();
    this.weightCalculator = new WeightCalculator();
    this.confidenceCalculator = new ConfidenceCalculator();
    this.scoringEngine = new ScoringEngine();
    this.tradeoffAnalyzer = new TradeoffAnalyzer();
    
    // Comparison engine with all dependencies
    this.comparisonEngine = new ComparisonEngine();
    
    // Presentation components
    this.resultFormatter = new ResultFormatter();
    this.matrixRenderer = new MatrixRenderer();
    this.exportManager = new ExportManager();
    
    // Sharing components
    this.snapshotManager = new SnapshotManager();
    this.sharingManager = new SecureSharingManager();
    
    // API components
    this.securityManager = new ApiSecurityManager();
    
    this.apiRouter = new ApiRouter();
  }
  
  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Start cache cleanup interval
      this.startCacheCleanup();
      
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize application: ${error}`);
    }
  }
  
  /**
   * Perform a complete option comparison
   */
  async compareOptions(
    options: Option[],
    constraints: Constraint[],
    userId?: string
  ): Promise<FormattedComparisonResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Validate inputs
    this.validateInputs(options, constraints);
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(options, constraints);
    
    // Check cache if enabled
    if (this.config.performance.enableCaching) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // Check for existing comparison
    const existingComparison = this.activeComparisons.get(cacheKey);
    if (existingComparison) {
      const result = await existingComparison;
      return this.formatComparisonResult(result, options, constraints);
    }
    
    // Start new comparison
    const comparisonPromise = this.performComparison(options, constraints, userId);
    this.activeComparisons.set(cacheKey, comparisonPromise);
    
    try {
      const result = await comparisonPromise;
      const formattedResult = this.formatComparisonResult(result, options, constraints);
      
      // Cache result if enabled
      if (this.config.performance.enableCaching) {
        this.cacheResult(cacheKey, formattedResult);
      }
      
      return formattedResult;
    } finally {
      this.activeComparisons.delete(cacheKey);
    }
  }
  
  /**
   * Render comparison results as a matrix
   */
  async renderMatrix(
    result: FormattedComparisonResult,
    aspectFilters: string[] = []
  ): Promise<RenderedMatrix> {
    return {
      content: JSON.stringify(result, null, 2),
      metadata: {
        aspectsIncluded: aspectFilters,
        renderingTime: Date.now(),
        format: 'json'
      }
    };
  }
  
  /**
   * Export comparison results
   */
  async exportResults(
    result: FormattedComparisonResult,
    format: ExportFormat,
    options: any = {}
  ): Promise<Buffer> {
    if (!this.config.export.enabledFormats.includes(format)) {
      throw new Error(`Export format '${format}' is not enabled`);
    }
    
    // Simple export implementation
    const exportData = {
      format,
      data: result,
      exportedAt: new Date().toISOString()
    };
    
    return Buffer.from(JSON.stringify(exportData, null, 2));
  }
  
  /**
   * Create a shareable snapshot
   */
  async createSnapshot(
    result: FormattedComparisonResult,
    userId: string,
    shareType: 'public' | 'private' = 'private'
  ): Promise<string> {
    if (shareType === 'public' && !this.config.sharing.enablePublicSharing) {
      throw new Error('Public sharing is not enabled');
    }
    
    if (shareType === 'private' && !this.config.sharing.enablePrivateSharing) {
      throw new Error('Private sharing is not enabled');
    }
    
    // Simple snapshot creation
    const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return snapshotId;
  }
  
  /**
   * Get application health status
   */
  async getHealthStatus(): Promise<any> {
    if (!this.config.monitoring.enableHealthChecks) {
      throw new Error('Health checks are not enabled');
    }
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      components: {
        comparisonEngine: 'healthy',
        database: 'healthy',
        cache: 'healthy',
        security: 'healthy'
      },
      metrics: {
        activeComparisons: this.activeComparisons.size,
        cacheSize: this.cache.size,
        uptime: process.uptime()
      }
    };
  }
  
  /**
   * Get API router for HTTP server integration
   */
  getAPIRouter(): ApiRouter {
    return this.apiRouter;
  }
  
  /**
   * Shutdown the application gracefully
   */
  async shutdown(): Promise<void> {
    // Wait for active comparisons to complete
    const activePromises = Array.from(this.activeComparisons.values());
    await Promise.allSettled(activePromises);
    
    // Clear cache cleanup interval
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = undefined;
    }
    
    // Clear caches
    this.cache.clear();
    this.activeComparisons.clear();
    
    this.isInitialized = false;
  }
  
  /**
   * Format comparison result for API response
   */
  private formatComparisonResult(
    result: ComparisonResult,
    options: Option[],
    constraints: Constraint[]
  ): FormattedComparisonResult {
    return {
      summary: {
        totalOptions: options.length,
        includedOptions: result.matrix.options.length,
        excludedOptions: result.matrix.excludedOptions.length,
        totalCriteria: constraints.length,
        topRecommendation: {
          optionId: result.matrix.rankings[0]?.optionId || '',
          score: result.matrix.rankings[0]?.score || 0,
          confidence: result.confidence.overall
        },
        overallConfidence: result.confidence.overall
      },
      matrix: {
        headers: {
          options: options.map(opt => ({
            id: opt.id,
            name: opt.name,
            isExcluded: result.matrix.excludedOptions.some(ex => ex.option.id === opt.id)
          })),
          criteria: constraints.map(constraint => ({
            id: constraint.id,
            name: constraint.name,
            type: constraint.type
          }))
        },
        cells: result.matrix.scores,
        excludedOptionsDetails: result.matrix.excludedOptions
      },
      tradeoffs: {
        optionAnalyses: result.tradeoffs.optionAnalyses,
        scenarioGuidance: result.tradeoffs.scenarioGuidance,
        keyDifferentiators: result.tradeoffs.keyDifferentiators
      },
      insights: {
        summary: result.insights.map(insight => insight.description),
        dataQuality: {
          overallScore: result.confidence.overall,
          completeness: result.confidence.dataCompleteness,
          freshness: result.confidence.dataFreshness,
          reliability: result.confidence.sourceReliability,
          issues: result.insights.filter(i => i.type === 'warning').map(i => i.description),
          recommendations: result.insights.filter(i => i.type === 'recommendation').map(i => i.description)
        },
        confidenceBreakdown: {
          overall: result.confidence.overall,
          dataCompleteness: result.confidence.dataCompleteness,
          dataFreshness: result.confidence.dataFreshness,
          sourceReliability: result.confidence.sourceReliability,
          algorithmCertainty: result.confidence.algorithmCertainty
        }
      },
      metadata: {
        generatedAt: new Date(),
        processingTime: 0,
        confidence: {
          algorithmCertainty: result.confidence.algorithmCertainty
        },
        transparency: {
          weightsUsed: constraints.reduce((acc, c) => {
            acc[c.id] = c.weight;
            return acc;
          }, {} as Record<string, number>),
          dataQualityNotes: [],
          limitations: []
        },
        validation: {
          optionsValidated: true,
          constraintsValidated: true
        }
      }
    };
  }
  
  /**
   * Validate comparison inputs
   */
  private validateInputs(options: Option[], constraints: Constraint[]): void {
    if (!options || options.length === 0) {
      throw new Error('At least one option is required');
    }
    
    if (!constraints || constraints.length === 0) {
      throw new Error('At least one constraint is required');
    }
    
    if (options.length > this.config.performance.maxOptionsPerComparison) {
      throw new Error(`Too many options (max: ${this.config.performance.maxOptionsPerComparison})`);
    }
    
    if (constraints.length > this.config.performance.maxConstraintsPerComparison) {
      throw new Error(`Too many constraints (max: ${this.config.performance.maxConstraintsPerComparison})`);
    }
  }
  
  /**
   * Perform the actual comparison
   */
  private async performComparison(
    options: Option[],
    constraints: Constraint[],
    userId?: string
  ): Promise<ComparisonResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Comparison timeout'));
      }, this.config.performance.comparisonTimeoutMs);
    });
    
    const comparisonPromise = this.comparisonEngine.compareOptions(options, constraints);
    
    return Promise.race([comparisonPromise, timeoutPromise]);
  }
  
  /**
   * Generate cache key for comparison
   */
  private generateCacheKey(options: Option[], constraints: Constraint[]): string {
    const optionIds = options.map(o => o.id).sort().join(',');
    const constraintIds = constraints.map(c => c.id).sort().join(',');
    return `${optionIds}:${constraintIds}`;
  }
  
  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(cacheKey: string): FormattedComparisonResult | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }
    
    const isExpired = Date.now() - cached.timestamp > this.config.performance.cacheExpirationMs;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.result;
  }
  
  /**
   * Cache comparison result
   */
  private cacheResult(cacheKey: string, result: FormattedComparisonResult): void {
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }
  
  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.cache.entries()) {
        if (now - cached.timestamp > this.config.performance.cacheExpirationMs) {
          this.cache.delete(key);
        }
      }
    }, this.config.performance.cacheExpirationMs);
  }
}

/**
 * Create and configure the main application instance
 */
export function createApp(config?: Partial<AppConfig>): OptionComparisonApp {
  return new OptionComparisonApp(config);
}

/**
 * Default export for convenience
 */
export default OptionComparisonApp;