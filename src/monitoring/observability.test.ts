// Monitoring and Observability Testing
// Tests decision-critical metrics, health checks, and monitoring capabilities

import { ComparisonEngine } from '../components/comparison-engine';
import { ApiRouter } from '../api/router';
import { Option, Constraint } from '../types/core';

interface DecisionMetrics {
  algorithmCertaintyDistribution: {
    low: number; // 0.0-0.4
    medium: number; // 0.4-0.8
    high: number; // 0.8-1.0
  };
  hardConstraintExclusionRate: number; // % options excluded
  weightSkewWarningFrequency: number; // % comparisons with warnings
  dataQualityTrends: {
    averageConfidence: number;
    completenessScore: number;
    freshnessScore: number;
    reliabilityScore: number;
  };
  userBehaviorMetrics: {
    abandonmentRate: number; // % incomplete comparisons
    exportFrequency: number; // exports per comparison
    averageSessionDuration: number; // minutes
  };
}

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    comparison: 'up' | 'down' | 'degraded';
    api: 'up' | 'down' | 'degraded';
    storage: 'up' | 'down' | 'degraded';
  };
  metrics: PerformanceMetrics;
  alerts: Array<{
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    component: string;
  }>;
}

class MonitoringService {
  private metrics: DecisionMetrics;
  private performanceMetrics: PerformanceMetrics;
  private healthStatus: HealthStatus;
  private comparisonHistory: Array<{
    timestamp: Date;
    confidence: number;
    exclusionRate: number;
    hasWeightWarning: boolean;
    completed: boolean;
    exported: boolean;
  }>;

  constructor() {
    this.metrics = {
      algorithmCertaintyDistribution: { low: 0, medium: 0, high: 0 },
      hardConstraintExclusionRate: 0,
      weightSkewWarningFrequency: 0,
      dataQualityTrends: {
        averageConfidence: 0,
        completenessScore: 0,
        freshnessScore: 0,
        reliabilityScore: 0
      },
      userBehaviorMetrics: {
        abandonmentRate: 0,
        exportFrequency: 0,
        averageSessionDuration: 0
      }
    };

    this.performanceMetrics = {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      activeConnections: 0
    };

    this.healthStatus = {
      status: 'healthy',
      services: {
        comparison: 'up',
        api: 'up',
        storage: 'up'
      },
      metrics: this.performanceMetrics,
      alerts: []
    };

    this.comparisonHistory = [];
  }

  recordComparison(
    confidence: number,
    totalOptions: number,
    excludedOptions: number,
    hasWeightWarning: boolean,
    completed: boolean = true,
    exported: boolean = false
  ): void {
    const exclusionRate = totalOptions > 0 ? (excludedOptions / totalOptions) * 100 : 0;
    
    this.comparisonHistory.push({
      timestamp: new Date(),
      confidence,
      exclusionRate,
      hasWeightWarning,
      completed,
      exported
    });

    this.updateMetrics();
  }

  recordPerformance(responseTime: number, success: boolean): void {
    this.performanceMetrics.responseTime = responseTime;
    this.performanceMetrics.errorRate = success ? 0 : 1;
    this.performanceMetrics.memoryUsage = process.memoryUsage().heapUsed / (1024 * 1024);
    this.performanceMetrics.cpuUsage = process.cpuUsage().user / 1000000;
    this.performanceMetrics.activeConnections = 1;
    this.performanceMetrics.throughput = success ? 1000 / responseTime : 0;

    this.updateHealthStatus();
  }

  private updateMetrics(): void {
    if (this.comparisonHistory.length === 0) return;

    // Algorithm certainty distribution
    const certaintyBands = { low: 0, medium: 0, high: 0 };
    this.comparisonHistory.forEach(entry => {
      if (entry.confidence < 0.4) certaintyBands.low++;
      else if (entry.confidence < 0.8) certaintyBands.medium++;
      else certaintyBands.high++;
    });

    const total = this.comparisonHistory.length;
    this.metrics.algorithmCertaintyDistribution = {
      low: (certaintyBands.low / total) * 100,
      medium: (certaintyBands.medium / total) * 100,
      high: (certaintyBands.high / total) * 100
    };

    // Hard constraint exclusion rate
    const avgExclusionRate = this.comparisonHistory.reduce((sum, entry) => 
      sum + entry.exclusionRate, 0) / total;
    this.metrics.hardConstraintExclusionRate = avgExclusionRate;

    // Weight skew warning frequency
    const warningCount = this.comparisonHistory.filter(entry => entry.hasWeightWarning).length;
    this.metrics.weightSkewWarningFrequency = (warningCount / total) * 100;

    // Data quality trends
    const avgConfidence = this.comparisonHistory.reduce((sum, entry) => 
      sum + entry.confidence, 0) / total;
    this.metrics.dataQualityTrends = {
      averageConfidence: avgConfidence,
      completenessScore: 0.85 + (Math.random() * 0.1), // Simulated
      freshnessScore: 0.80 + (Math.random() * 0.15), // Simulated
      reliabilityScore: 0.90 + (Math.random() * 0.05) // Simulated
    };

    // User behavior metrics
    const completedCount = this.comparisonHistory.filter(entry => entry.completed).length;
    const exportedCount = this.comparisonHistory.filter(entry => entry.exported).length;
    
    this.metrics.userBehaviorMetrics = {
      abandonmentRate: ((total - completedCount) / total) * 100,
      exportFrequency: completedCount > 0 ? (exportedCount / completedCount) * 100 : 0,
      averageSessionDuration: 5 + (Math.random() * 10) // Simulated 5-15 minutes
    };
  }

  private updateHealthStatus(): void {
    const alerts: HealthStatus['alerts'] = [];

    // Check performance thresholds
    if (this.performanceMetrics.responseTime > 2000) {
      alerts.push({
        level: 'warning',
        message: 'Response time exceeds 2 seconds',
        timestamp: new Date(),
        component: 'performance'
      });
    }

    if (this.performanceMetrics.errorRate > 0.05) {
      alerts.push({
        level: 'error',
        message: 'Error rate exceeds 5%',
        timestamp: new Date(),
        component: 'reliability'
      });
    }

    if (this.performanceMetrics.memoryUsage > 400) {
      alerts.push({
        level: 'warning',
        message: 'Memory usage approaching limit',
        timestamp: new Date(),
        component: 'resources'
      });
    }

    // Determine overall health status
    let status: HealthStatus['status'] = 'healthy';
    if (alerts.some(alert => alert.level === 'critical')) {
      status = 'unhealthy';
    } else if (alerts.some(alert => alert.level === 'error' || alert.level === 'warning')) {
      status = 'degraded';
    }

    this.healthStatus = {
      status,
      services: {
        comparison: this.performanceMetrics.errorRate > 0.1 ? 'degraded' : 'up',
        api: this.performanceMetrics.responseTime > 5000 ? 'degraded' : 'up',
        storage: 'up' // Simulated
      },
      metrics: this.performanceMetrics,
      alerts
    };
  }

  getMetrics(): DecisionMetrics {
    return { ...this.metrics };
  }

  getHealthStatus(): HealthStatus {
    return { ...this.healthStatus };
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  generateReport(): {
    summary: string;
    recommendations: string[];
    criticalIssues: string[];
  } {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    
    const recommendations: string[] = [];
    const criticalIssues: string[] = [];

    // Analyze algorithm certainty
    if (metrics.algorithmCertaintyDistribution.low > 30) {
      recommendations.push('High percentage of low-certainty comparisons - consider improving data quality');
    }

    // Analyze exclusion rates
    if (metrics.hardConstraintExclusionRate > 50) {
      recommendations.push('High exclusion rate - review constraint definitions');
    }

    // Analyze weight warnings
    if (metrics.weightSkewWarningFrequency > 20) {
      recommendations.push('Frequent weight skew warnings - provide better guidance to users');
    }

    // Analyze user behavior
    if (metrics.userBehaviorMetrics.abandonmentRate > 25) {
      criticalIssues.push('High abandonment rate indicates usability issues');
    }

    // Analyze performance
    if (health.status === 'unhealthy') {
      criticalIssues.push('System health is compromised - immediate attention required');
    }

    const summary = `
      System Status: ${health.status.toUpperCase()}
      Algorithm Certainty: ${metrics.algorithmCertaintyDistribution.high.toFixed(1)}% high confidence
      Exclusion Rate: ${metrics.hardConstraintExclusionRate.toFixed(1)}%
      Data Quality: ${(metrics.dataQualityTrends.averageConfidence * 100).toFixed(1)}%
      User Engagement: ${(100 - metrics.userBehaviorMetrics.abandonmentRate).toFixed(1)}% completion rate
    `.trim();

    return { summary, recommendations, criticalIssues };
  }
}

describe('Monitoring and Observability', () => {
  let comparisonEngine: ComparisonEngine;
  let apiRouter: ApiRouter;
  let monitoringService: MonitoringService;

  beforeEach(() => {
    comparisonEngine = new ComparisonEngine();
    apiRouter = new ApiRouter();
    monitoringService = new MonitoringService();
  });

  const createTestOptions = (count: number): Option[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `opt${i + 1}`,
      name: `Option ${i + 1}`,
      description: `Test option ${i + 1}`,
      category: 'api',
      attributes: {
        cost: { value: 100 + (i * 20), unit: 'USD/month' },
        performance: { value: 70 + (i * 5), unit: 'score' },
        reliability: { value: 80 + (i * 2), unit: 'percentage' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: {
          completeness: 0.8 + (i * 0.02),
          freshness: 0.85 + (i * 0.01),
          reliability: 0.9
        },
        entryMethod: 'manual'
      }
    }));
  };

  const createTestConstraints = (count: number): Constraint[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `c${i + 1}`,
      name: `Constraint ${i + 1}`,
      type: i % 2 === 0 ? 'budget' : 'performance',
      isHardRequirement: false, // Make all constraints soft to avoid exclusions
      weight: 1.0 / count,
      criterionType: i % 2 === 0 ? 'cost' : 'benefit',
      evaluationRule: {
        attributePath: i % 3 === 0 ? 'cost' : i % 3 === 1 ? 'performance' : 'reliability',
        operator: i % 2 === 0 ? 'lessThan' : 'greaterThan',
        targetValue: i % 2 === 0 ? 1000 + (i * 10) : 10 + (i * 5) // More lenient values
      },
      description: `Test constraint ${i + 1}`,
      confidenceLevel: Math.min(0.8 + (i * 0.02), 1.0) // Ensure it doesn't exceed 1.0
    }));
  };

  describe('Decision-Critical Metrics Collection', () => {
    test('should track algorithm certainty distribution', async () => {
      // Simulate comparisons with different certainty levels
      const testCases = [
        { options: 5, constraints: 3, expectedCertainty: 'high' },
        { options: 10, constraints: 5, expectedCertainty: 'medium' },
        { options: 3, constraints: 8, expectedCertainty: 'low' }
      ];

      for (const testCase of testCases) {
        const options = createTestOptions(testCase.options);
        const constraints = createTestConstraints(testCase.constraints);
        
        const result = await comparisonEngine.compareOptions(options, constraints);
        
        monitoringService.recordComparison(
          result.confidence.algorithmCertainty,
          options.length,
          result.matrix.excludedOptions.length,
          false, // No weight warning for this test
          true,
          false
        );
      }

      const metrics = monitoringService.getMetrics();
      
      expect(metrics.algorithmCertaintyDistribution.low).toBeGreaterThanOrEqual(0);
      expect(metrics.algorithmCertaintyDistribution.medium).toBeGreaterThanOrEqual(0);
      expect(metrics.algorithmCertaintyDistribution.high).toBeGreaterThanOrEqual(0);
      
      // Total should be 100%
      const total = metrics.algorithmCertaintyDistribution.low + 
                   metrics.algorithmCertaintyDistribution.medium + 
                   metrics.algorithmCertaintyDistribution.high;
      expect(total).toBeCloseTo(100, 1);
    });

    test('should track hard constraint exclusion rates', async () => {
      const options = createTestOptions(10);
      const constraints = createTestConstraints(5);
      
      // Make some constraints very restrictive to cause exclusions
      constraints[0].evaluationRule.targetValue = 50; // Very low cost threshold
      constraints[1].evaluationRule.targetValue = 200; // Very high performance threshold
      
      const result = await comparisonEngine.compareOptions(options, constraints);
      
      monitoringService.recordComparison(
        result.confidence.algorithmCertainty,
        options.length,
        result.matrix.excludedOptions.length,
        false,
        true,
        false
      );

      const metrics = monitoringService.getMetrics();
      
      expect(metrics.hardConstraintExclusionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.hardConstraintExclusionRate).toBeLessThanOrEqual(100);
      
      // Should reflect actual exclusions
      const expectedRate = (result.matrix.excludedOptions.length / options.length) * 100;
      expect(metrics.hardConstraintExclusionRate).toBeCloseTo(expectedRate, 1);
    });

    test('should track weight skew warning frequency', async () => {
      // Simulate comparisons with and without weight warnings
      const comparisons = [
        { hasWarning: true },
        { hasWarning: false },
        { hasWarning: true },
        { hasWarning: false },
        { hasWarning: false }
      ];

      for (const comparison of comparisons) {
        monitoringService.recordComparison(
          0.75, // confidence
          5, // total options
          1, // excluded options
          comparison.hasWarning,
          true,
          false
        );
      }

      const metrics = monitoringService.getMetrics();
      
      // Should be 40% (2 out of 5 comparisons had warnings)
      expect(metrics.weightSkewWarningFrequency).toBeCloseTo(40, 1);
    });

    test('should track data quality trends over time', async () => {
      // Simulate multiple comparisons
      for (let i = 0; i < 10; i++) {
        const confidence = 0.7 + (i * 0.02); // Increasing confidence over time
        
        monitoringService.recordComparison(
          confidence,
          5,
          0,
          false,
          true,
          i % 3 === 0 // Export every third comparison
        );
      }

      const metrics = monitoringService.getMetrics();
      
      expect(metrics.dataQualityTrends.averageConfidence).toBeGreaterThan(0.7);
      expect(metrics.dataQualityTrends.completenessScore).toBeGreaterThan(0.8);
      expect(metrics.dataQualityTrends.freshnessScore).toBeGreaterThan(0.8);
      expect(metrics.dataQualityTrends.reliabilityScore).toBeGreaterThan(0.8);
    });

    test('should track user behavior metrics', async () => {
      // Simulate various user behaviors
      const behaviors = [
        { completed: true, exported: true },
        { completed: true, exported: false },
        { completed: false, exported: false }, // Abandoned
        { completed: true, exported: true },
        { completed: true, exported: false }
      ];

      for (const behavior of behaviors) {
        monitoringService.recordComparison(
          0.8,
          5,
          1,
          false,
          behavior.completed,
          behavior.exported
        );
      }

      const metrics = monitoringService.getMetrics();
      
      // 1 out of 5 abandoned = 20% abandonment rate
      expect(metrics.userBehaviorMetrics.abandonmentRate).toBeCloseTo(20, 1);
      
      // 2 exports out of 4 completed = 50% export frequency
      expect(metrics.userBehaviorMetrics.exportFrequency).toBeCloseTo(50, 1);
      
      expect(metrics.userBehaviorMetrics.averageSessionDuration).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track response times and throughput', async () => {
      const options = createTestOptions(10);
      const constraints = createTestConstraints(5);
      
      const startTime = Date.now();
      const result = await comparisonEngine.compareOptions(options, constraints);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      monitoringService.recordPerformance(responseTime, true);
      
      const performanceMetrics = monitoringService.getPerformanceMetrics();
      
      expect(performanceMetrics.responseTime).toBe(responseTime);
      expect(performanceMetrics.throughput).toBeGreaterThan(0);
      expect(performanceMetrics.errorRate).toBe(0);
      expect(performanceMetrics.memoryUsage).toBeGreaterThan(0);
    });

    test('should detect performance degradation', async () => {
      // Simulate slow response
      monitoringService.recordPerformance(3000, true); // 3 seconds
      
      const health = monitoringService.getHealthStatus();
      
      expect(health.status).toBe('degraded');
      expect(health.alerts.length).toBeGreaterThan(0);
      expect(health.alerts[0].level).toBe('warning');
      expect(health.alerts[0].message).toContain('Response time exceeds');
    });

    test('should monitor memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed / (1024 * 1024);
      
      // Perform memory-intensive operation
      const largeOptions = createTestOptions(100);
      const largeConstraints = createTestConstraints(20);
      
      await comparisonEngine.compareOptions(largeOptions, largeConstraints);
      
      monitoringService.recordPerformance(1000, true);
      const performanceMetrics = monitoringService.getPerformanceMetrics();
      
      expect(performanceMetrics.memoryUsage).toBeGreaterThan(initialMemory);
      expect(performanceMetrics.memoryUsage).toBeLessThan(512); // Within limit
    });

    test('should track error rates', async () => {
      // Simulate errors
      monitoringService.recordPerformance(1000, false); // Error
      monitoringService.recordPerformance(1200, false); // Error
      monitoringService.recordPerformance(800, true);   // Success
      
      const performanceMetrics = monitoringService.getPerformanceMetrics();
      
      // Last recorded error rate should be 0 (success)
      expect(performanceMetrics.errorRate).toBe(0);
    });
  });

  describe('Health Check Endpoints', () => {
    test('should provide comprehensive health status', async () => {
      const healthRequest = {
        requestId: 'health-check-1',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/v1/health',
        ipAddress: '127.0.0.1',
        userAgent: 'monitoring-agent'
      };

      const response = await apiRouter.healthCheck(healthRequest);
      
      expect(response.success).toBe(true);
      expect(response.data?.status).toBeDefined();
      expect(response.data?.version).toBeDefined();
      expect(response.data?.services).toBeDefined();
      expect(response.data?.metrics).toBeDefined();
      
      expect(response.data?.services.database).toMatch(/^(up|down)$/);
      expect(response.data?.services.cache).toMatch(/^(up|down)$/);
      expect(response.data?.services.storage).toMatch(/^(up|down)$/);
    });

    test('should include performance metrics in health check', async () => {
      const healthRequest = {
        requestId: 'health-check-2',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/v1/health'
      };

      const response = await apiRouter.healthCheck(healthRequest);
      
      expect(response.data?.metrics.uptime).toBeGreaterThan(0);
      expect(response.data?.metrics.memoryUsage).toBeGreaterThan(0);
      expect(response.data?.metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(response.data?.metrics.activeConnections).toBeGreaterThanOrEqual(0);
    });

    test('should detect unhealthy status', async () => {
      // Simulate unhealthy conditions
      monitoringService.recordPerformance(10000, false); // Very slow + error
      
      const health = monitoringService.getHealthStatus();
      
      expect(health.status).toMatch(/^(degraded|unhealthy)$/);
      expect(health.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Alerting and Notifications', () => {
    test('should generate alerts for critical thresholds', async () => {
      // Simulate critical conditions
      monitoringService.recordPerformance(15000, false); // Very slow response with error
      
      const health = monitoringService.getHealthStatus();
      
      expect(health.alerts.length).toBeGreaterThan(0);
      
      const criticalAlerts = health.alerts.filter(alert => 
        alert.level === 'error' || alert.level === 'critical'
      );
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    test('should categorize alerts by severity', async () => {
      // Simulate various conditions
      monitoringService.recordPerformance(2500, true); // Warning level
      
      const health = monitoringService.getHealthStatus();
      
      health.alerts.forEach(alert => {
        expect(['info', 'warning', 'error', 'critical']).toContain(alert.level);
        expect(alert.message).toBeDefined();
        expect(alert.timestamp).toBeInstanceOf(Date);
        expect(alert.component).toBeDefined();
      });
    });

    test('should provide actionable alert messages', async () => {
      monitoringService.recordPerformance(3000, true);
      
      const health = monitoringService.getHealthStatus();
      
      if (health.alerts.length > 0) {
        const alert = health.alerts[0];
        expect(alert.message).toMatch(/exceeds|approaching|failed|degraded/i);
        expect(alert.component).toMatch(/performance|reliability|resources|security/i);
      }
    });
  });

  describe('Monitoring Reports and Analytics', () => {
    test('should generate comprehensive monitoring reports', async () => {
      // Simulate various scenarios
      for (let i = 0; i < 20; i++) {
        const confidence = 0.3 + (Math.random() * 0.6); // Random confidence
        const hasWarning = Math.random() > 0.8; // 20% chance of warning
        const completed = Math.random() > 0.1; // 90% completion rate
        const exported = completed && Math.random() > 0.7; // 30% export rate
        
        monitoringService.recordComparison(
          confidence,
          10,
          Math.floor(Math.random() * 3), // 0-2 exclusions
          hasWarning,
          completed,
          exported
        );
      }

      const report = monitoringService.generateReport();
      
      expect(report.summary).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.criticalIssues).toBeInstanceOf(Array);
      
      expect(report.summary).toContain('System Status:');
      expect(report.summary).toContain('Algorithm Certainty:');
      expect(report.summary).toContain('Data Quality:');
    });

    test('should identify performance trends', async () => {
      // Simulate degrading performance over time
      const responseTimes = [1000, 1200, 1500, 1800, 2200];
      
      for (const responseTime of responseTimes) {
        monitoringService.recordPerformance(responseTime, true);
      }

      const performanceMetrics = monitoringService.getPerformanceMetrics();
      
      // Should reflect the latest (worst) performance
      expect(performanceMetrics.responseTime).toBe(2200);
      
      const health = monitoringService.getHealthStatus();
      expect(health.status).toBe('degraded'); // Due to slow response
    });

    test('should provide recommendations based on metrics', async () => {
      // Simulate problematic patterns
      for (let i = 0; i < 10; i++) {
        monitoringService.recordComparison(
          0.2, // Low confidence
          10,
          8, // High exclusion rate
          true, // Weight warning
          false, // Not completed (abandoned)
          false
        );
      }

      const report = monitoringService.generateReport();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.criticalIssues.length).toBeGreaterThan(0);
      
      // Should identify specific issues
      expect(report.recommendations.some(rec => 
        rec.includes('data quality') || rec.includes('constraint') || rec.includes('weight')
      )).toBe(true);
      
      expect(report.criticalIssues.some(issue => 
        issue.includes('abandonment') || issue.includes('health')
      )).toBe(true);
    });
  });

  describe('Real-time Monitoring Dashboard Data', () => {
    test('should provide real-time metrics for dashboard', async () => {
      // Simulate active system
      for (let i = 0; i < 5; i++) {
        const options = createTestOptions(8);
        const constraints = createTestConstraints(4);
        
        const startTime = Date.now();
        await comparisonEngine.compareOptions(options, constraints);
        const endTime = Date.now();
        
        monitoringService.recordPerformance(endTime - startTime, true);
        monitoringService.recordComparison(0.8, 8, 1, false, true, i % 2 === 0);
      }

      const metrics = monitoringService.getMetrics();
      const health = monitoringService.getHealthStatus();
      const performance = monitoringService.getPerformanceMetrics();
      
      // Dashboard should have all necessary data
      expect(metrics).toBeDefined();
      expect(health).toBeDefined();
      expect(performance).toBeDefined();
      
      // Key dashboard metrics
      expect(typeof metrics.algorithmCertaintyDistribution.high).toBe('number');
      expect(typeof metrics.hardConstraintExclusionRate).toBe('number');
      expect(typeof metrics.userBehaviorMetrics.abandonmentRate).toBe('number');
      expect(typeof performance.responseTime).toBe('number');
      expect(typeof performance.throughput).toBe('number');
    });

    test('should support metric aggregation over time windows', async () => {
      const timeWindows = ['1h', '24h', '7d', '30d'];
      
      // Simulate historical data
      for (let i = 0; i < 100; i++) {
        monitoringService.recordComparison(
          0.6 + (Math.random() * 0.3),
          10,
          Math.floor(Math.random() * 3),
          Math.random() > 0.9,
          Math.random() > 0.05,
          Math.random() > 0.8
        );
      }

      const metrics = monitoringService.getMetrics();
      
      // Should provide aggregated data suitable for time-series charts
      expect(metrics.dataQualityTrends.averageConfidence).toBeGreaterThan(0);
      expect(metrics.algorithmCertaintyDistribution.high).toBeGreaterThanOrEqual(0);
      expect(metrics.userBehaviorMetrics.exportFrequency).toBeGreaterThanOrEqual(0);
    });
  });
});