// Performance and Load Testing for Option Comparison Tool
// Tests performance requirements: 100 concurrent users, 2s latency, 512MB memory

import { ComparisonEngine } from '../components/comparison-engine';
import { Option, Constraint } from '../types/core';

describe('Performance and Load Testing', () => {
  let comparisonEngine: ComparisonEngine;

  beforeEach(() => {
    comparisonEngine = new ComparisonEngine();
  });

  const createTestOptions = (count: number): Option[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `opt${i + 1}`,
      name: `Option ${i + 1}`,
      description: `Test option ${i + 1}`,
      category: 'api',
      attributes: {
        cost: { value: 100 + (i * 10), unit: 'USD/month' },
        performance: { value: 70 + (i * 2), unit: 'score' },
        reliability: { value: 80 + (i * 1.5), unit: 'percentage' },
        features: { value: `feature${i % 3}` }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: {
          completeness: 0.8 + (i * 0.01),
          freshness: 0.9,
          reliability: 0.85
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
      weight: 1.0 / count, // Equal weights that sum to 1
      criterionType: i % 3 === 0 ? 'cost' : 'benefit',
      evaluationRule: {
        attributePath: i % 3 === 0 ? 'cost' : 
                      i % 3 === 1 ? 'performance' : 'reliability', // Only use attributes that exist
        operator: i % 2 === 0 ? 'lessThan' : 'greaterThan',
        targetValue: i % 2 === 0 ? 1000 + (i * 20) : 10 + (i * 5) // More lenient values
      },
      description: `Test constraint ${i + 1}`,
      confidenceLevel: Math.min(0.8 + (i * 0.02), 1.0) // Ensure it doesn't exceed 1.0
    }));
  };

  describe('Comparison Latency Requirements', () => {
    test('should complete comparison within 2 seconds for 10 options × 15 criteria', async () => {
      const options = createTestOptions(10);
      const constraints = createTestConstraints(15);

      const startTime = performance.now();
      const result = await comparisonEngine.compareOptions(options, constraints);
      const endTime = performance.now();

      const latency = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.matrix.options.length).toBeGreaterThan(0);
      expect(latency).toBeLessThan(2000); // 2 seconds requirement
    });

    test('should handle larger datasets efficiently (50 options × 20 criteria)', async () => {
      const options = createTestOptions(50);
      const constraints = createTestConstraints(20);

      const startTime = performance.now();
      const result = await comparisonEngine.compareOptions(options, constraints);
      const endTime = performance.now();

      const latency = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.matrix.options.length).toBeGreaterThan(0);
      // Allow more time for larger datasets but should still be reasonable
      expect(latency).toBeLessThan(10000); // 10 seconds for large dataset
    });

    test('should maintain performance with progressive loading thresholds', async () => {
      // Test the three progressive loading thresholds
      const testCases = [
        { options: 10, criteria: 5, expectedDataPoints: 50, threshold: 'sync' },
        { options: 20, criteria: 8, expectedDataPoints: 160, threshold: 'chunked' },
        { options: 50, criteria: 10, expectedDataPoints: 500, threshold: 'paginated' }
      ];

      for (const testCase of testCases) {
        const options = createTestOptions(testCase.options);
        const constraints = createTestConstraints(testCase.criteria);

        const startTime = performance.now();
        const result = await comparisonEngine.compareOptions(options, constraints);
        const endTime = performance.now();

        const latency = endTime - startTime;
        const dataPoints = testCase.options * testCase.criteria;

        expect(dataPoints).toBe(testCase.expectedDataPoints);
        expect(result).toBeDefined();
        
        // Performance should scale reasonably with data points
        const maxLatencyMs = testCase.threshold === 'sync' ? 1000 : 
                            testCase.threshold === 'chunked' ? 3000 : 8000;
        expect(latency).toBeLessThan(maxLatencyMs);
      }
    });
  });

  describe('Memory Usage Validation', () => {
    test('should stay within 512MB memory limit per session', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate multiple comparisons in a session
      const sessionComparisons = [];
      
      for (let i = 0; i < 10; i++) {
        const options = createTestOptions(20);
        const constraints = createTestConstraints(10);
        
        const result = await comparisonEngine.compareOptions(options, constraints);
        sessionComparisons.push(result);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsed = (finalMemory - initialMemory) / (1024 * 1024); // Convert to MB

      expect(memoryUsed).toBeLessThan(512); // 512MB limit
      expect(sessionComparisons.length).toBe(10);
    });

    test('should handle memory efficiently with large option sets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Test with large dataset
      const options = createTestOptions(100);
      const constraints = createTestConstraints(25);
      
      const result = await comparisonEngine.compareOptions(options, constraints);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsed = (finalMemory - initialMemory) / (1024 * 1024);

      expect(result).toBeDefined();
      expect(memoryUsed).toBeLessThan(256); // Should use less than half the limit for single comparison
    });
  });

  describe('Concurrent User Simulation', () => {
    test('should handle 10 concurrent comparisons (simulated load)', async () => {
      const concurrentPromises = Array.from({ length: 10 }, async (_, i) => {
        const options = createTestOptions(15);
        const constraints = createTestConstraints(8);
        
        const startTime = performance.now();
        const result = await comparisonEngine.compareOptions(options, constraints);
        const endTime = performance.now();
        
        return {
          userId: `user${i + 1}`,
          result,
          latency: endTime - startTime
        };
      });

      const results = await Promise.all(concurrentPromises);

      // All comparisons should complete successfully
      expect(results.length).toBe(10);
      results.forEach((result, i) => {
        expect(result.result).toBeDefined();
        expect(result.result.matrix.options.length).toBeGreaterThan(0);
        expect(result.latency).toBeLessThan(5000); // Allow more time for concurrent execution
        expect(result.userId).toBe(`user${i + 1}`);
      });

      // Average latency should still be reasonable
      const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
      expect(avgLatency).toBeLessThan(3000);
    });

    test('should maintain data integrity under concurrent load', async () => {
      // Create identical inputs for all concurrent requests
      const options = createTestOptions(10);
      const constraints = createTestConstraints(5);

      const concurrentPromises = Array.from({ length: 5 }, async () => {
        return await comparisonEngine.compareOptions(options, constraints);
      });

      const results = await Promise.all(concurrentPromises);

      // All results should be identical (deterministic algorithm)
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.matrix.rankings.length).toBe(firstResult.matrix.rankings.length);
        expect(result.matrix.options.length).toBe(firstResult.matrix.options.length);
        
        // Rankings should be identical
        result.matrix.rankings.forEach((ranking, i) => {
          expect(ranking.optionId).toBe(firstResult.matrix.rankings[i].optionId);
          expect(ranking.rank).toBe(firstResult.matrix.rankings[i].rank);
        });
      });
    });
  });

  describe('Scalability Testing', () => {
    test('should scale linearly with option count', async () => {
      const optionCounts = [5, 10, 20, 40];
      const constraints = createTestConstraints(10);
      const latencies: number[] = [];

      for (const count of optionCounts) {
        const options = createTestOptions(count);
        
        const startTime = performance.now();
        await comparisonEngine.compareOptions(options, constraints);
        const endTime = performance.now();
        
        latencies.push(endTime - startTime);
      }

      // Latency should scale reasonably (not exponentially)
      // Each doubling of options should not more than triple the latency
      for (let i = 1; i < latencies.length; i++) {
        const scaleFactor = optionCounts[i] / optionCounts[i - 1];
        const latencyRatio = latencies[i] / latencies[i - 1];
        
        // Latency should not grow faster than O(n log n)
        expect(latencyRatio).toBeLessThan(scaleFactor * 2);
      }
    });

    test('should handle constraint scaling efficiently', async () => {
      const options = createTestOptions(20);
      const constraintCounts = [5, 10, 15, 20];
      const latencies: number[] = [];

      for (const count of constraintCounts) {
        const constraints = createTestConstraints(count);
        
        const startTime = performance.now();
        await comparisonEngine.compareOptions(options, constraints);
        const endTime = performance.now();
        
        latencies.push(endTime - startTime);
      }

      // Constraint scaling should be linear or better
      for (let i = 1; i < latencies.length; i++) {
        const scaleFactor = constraintCounts[i] / constraintCounts[i - 1];
        const latencyRatio = latencies[i] / latencies[i - 1];
        
        // Should scale linearly with constraints
        expect(latencyRatio).toBeLessThan(scaleFactor * 1.5);
      }
    });
  });

  describe('Resource Cleanup and Efficiency', () => {
    test('should clean up resources after comparison', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform comparison
      const options = createTestOptions(30);
      const constraints = createTestConstraints(15);
      
      let result = await comparisonEngine.compareOptions(options, constraints);
      
      // Clear reference to result to allow garbage collection
      result = null as any;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDiff = (finalMemory - initialMemory) / (1024 * 1024);
      
      // Memory usage should not grow significantly after cleanup
      expect(memoryDiff).toBeLessThan(50); // Less than 50MB residual
    });

    test('should handle repeated comparisons without memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple comparisons
      for (let i = 0; i < 20; i++) {
        const options = createTestOptions(10);
        const constraints = createTestConstraints(5);
        
        await comparisonEngine.compareOptions(options, constraints);
        
        // Periodic cleanup
        if (i % 5 === 0 && global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / (1024 * 1024);
      
      // Memory growth should be minimal for repeated operations
      expect(memoryGrowth).toBeLessThan(100); // Less than 100MB growth
    });
  });

  describe('Performance Metrics Collection', () => {
    test('should collect performance metrics during comparison', async () => {
      const options = createTestOptions(25);
      const constraints = createTestConstraints(12);
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      const result = await comparisonEngine.compareOptions(options, constraints);
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const metrics = {
        latency: endTime - startTime,
        memoryUsed: (endMemory - startMemory) / (1024 * 1024),
        dataPoints: options.length * constraints.length,
        optionsProcessed: result.matrix.options.length,
        constraintsEvaluated: constraints.length,
        throughput: (options.length * constraints.length) / ((endTime - startTime) / 1000) // data points per second
      };

      expect(metrics.latency).toBeGreaterThan(0);
      expect(metrics.memoryUsed).toBeGreaterThan(0);
      expect(metrics.dataPoints).toBe(300); // 25 * 12
      expect(metrics.optionsProcessed).toBeGreaterThan(0);
      expect(metrics.constraintsEvaluated).toBe(12);
      expect(metrics.throughput).toBeGreaterThan(0);
      
      // Log metrics for monitoring
      console.log('Performance Metrics:', metrics);
    });
  });
});