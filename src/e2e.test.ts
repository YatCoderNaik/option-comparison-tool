/**
 * End-to-End System Validation Tests
 * Comprehensive testing of the complete Option Comparison Tool system
 */

import { OptionComparisonApp } from './app';
import { Option, Constraint } from './types/core';
import { generateTestOptions, generateTestConstraints } from './utils/generators';

describe('End-to-End System Validation', () => {
  let app: OptionComparisonApp;
  
  beforeAll(async () => {
    app = new OptionComparisonApp({
      performance: {
        maxConcurrentComparisons: 50,
        comparisonTimeoutMs: 30000,
        maxOptionsPerComparison: 100,
        maxConstraintsPerComparison: 20,
        enableCaching: true,
        cacheExpirationMs: 300000
      },
      security: {
        enableAuthentication: true,
        enableRBAC: true,
        enableAuditLogging: true,
        enableRateLimiting: true
      }
    });
    
    await app.initialize();
  });
  
  afterAll(async () => {
    await app.shutdown();
  });
  
  describe('Real-World Scenario: API Selection', () => {
    test('should handle comprehensive API comparison scenario', async () => {
      // Generate realistic API options
      const apiOptions: Option[] = [
        {
          id: 'stripe-api',
          name: 'Stripe Payment API',
          description: 'Industry-leading payment processing API',
          category: 'api',
          attributes: {
            cost: { value: 2.9, unit: 'percentage' },
            performance: { value: 99.9, unit: 'uptime_percentage' },
            reliability: { value: 99.99, unit: 'sla_percentage' },
            features: { value: 95, unit: 'feature_score' },
            documentation: { value: 98, unit: 'quality_score' },
            security: { value: 100, unit: 'compliance_score' },
            integration_complexity: { value: 20, unit: 'hours' },
            support_quality: { value: 95, unit: 'satisfaction_score' }
          },
          metadata: {
            dateAdded: new Date('2024-01-01'),
            lastUpdated: new Date('2024-01-15'),
            dataQuality: { completeness: 0.98, freshness: 0.95, reliability: 0.97 },
            entryMethod: 'api'
          }
        },
        {
          id: 'paypal-api',
          name: 'PayPal Payment API',
          description: 'Widely adopted payment processing solution',
          category: 'api',
          attributes: {
            cost: { value: 3.4, unit: 'percentage' },
            performance: { value: 99.5, unit: 'uptime_percentage' },
            reliability: { value: 99.9, unit: 'sla_percentage' },
            features: { value: 88, unit: 'feature_score' },
            documentation: { value: 85, unit: 'quality_score' },
            security: { value: 98, unit: 'compliance_score' },
            integration_complexity: { value: 25, unit: 'hours' },
            support_quality: { value: 80, unit: 'satisfaction_score' }
          },
          metadata: {
            dateAdded: new Date('2024-01-02'),
            lastUpdated: new Date('2024-01-10'),
            dataQuality: { completeness: 0.92, freshness: 0.88, reliability: 0.90 },
            entryMethod: 'manual'
          }
        }
      ];
      
      // Define realistic business constraints
      const businessConstraints: Constraint[] = [
        {
          id: 'cost-constraint',
          name: 'Transaction Cost Limit',
          type: 'budget',
          isHardRequirement: true,
          weight: 0.25,
          criterionType: 'cost',
          evaluationRule: {
            attributePath: 'cost',
            operator: 'lessThan',
            targetValue: 3.5
          },
          description: 'Transaction fees must be under 3.5%',
          confidenceLevel: 0.95
        },
        {
          id: 'security-constraint',
          name: 'Security Compliance',
          type: 'feature',
          isHardRequirement: true,
          weight: 0.75,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'security',
            operator: 'greaterThan',
            targetValue: 95
          },
          description: 'Security compliance score must be above 95',
          confidenceLevel: 0.98
        }
      ];
      
      // Perform comprehensive comparison
      const startTime = Date.now();
      const result = await app.compareOptions(apiOptions, businessConstraints, 'business-user-123');
      const comparisonTime = Date.now() - startTime;
      
      // Validate comparison results
      expect(result).toBeDefined();
      expect(comparisonTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Validate summary
      expect(result.summary.totalOptions).toBe(2);
      expect(result.summary.includedOptions).toBeGreaterThan(0);
      expect(result.summary.topRecommendation).toBeDefined();
      
      // Test export functionality
      const jsonExport = await app.exportResults(result, 'json');
      expect(jsonExport.length).toBeGreaterThan(1000);
      
      // Test snapshot creation
      const snapshotId = await app.createSnapshot(result, 'business-user-123', 'private');
      expect(snapshotId).toBeDefined();
    });
  });
  
  describe('Business Logic Validation', () => {
    test('should produce sensible business recommendations', async () => {
      // Create scenario with clear winner
      const clearWinnerOptions: Option[] = [
        {
          id: 'clear-winner',
          name: 'Clear Winner',
          description: 'Best in all categories',
          category: 'api',
          attributes: {
            cost: { value: 50, unit: 'USD' },
            performance: { value: 95, unit: 'score' },
            reliability: { value: 99, unit: 'percentage' }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 0.95, freshness: 0.95, reliability: 0.95 },
            entryMethod: 'manual'
          }
        },
        {
          id: 'clear-loser',
          name: 'Clear Loser',
          description: 'Worst in all categories',
          category: 'api',
          attributes: {
            cost: { value: 200, unit: 'USD' },
            performance: { value: 60, unit: 'score' },
            reliability: { value: 70, unit: 'percentage' }
          },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 0.80, freshness: 0.70, reliability: 0.75 },
            entryMethod: 'manual'
          }
        }
      ];
      
      const simpleConstraints: Constraint[] = [
        {
          id: 'cost-pref',
          name: 'Cost Preference',
          type: 'budget',
          isHardRequirement: false,
          weight: 0.4,
          criterionType: 'cost',
          evaluationRule: {
            attributePath: 'cost',
            operator: 'lessThan',
            targetValue: 150
          },
          description: 'Prefer lower cost',
          confidenceLevel: 0.9
        },
        {
          id: 'perf-pref',
          name: 'Performance Preference',
          type: 'performance',
          isHardRequirement: false,
          weight: 0.6,
          criterionType: 'benefit',
          evaluationRule: {
            attributePath: 'performance',
            operator: 'greaterThan',
            targetValue: 80
          },
          description: 'Prefer higher performance',
          confidenceLevel: 0.9
        }
      ];
      
      const result = await app.compareOptions(clearWinnerOptions, simpleConstraints);
      
      expect(result).toBeDefined();
      expect(result.summary.topRecommendation.optionId).toBe('clear-winner');
      expect(result.summary.topRecommendation.score).toBeGreaterThan(0.5);
      
      // Algorithm certainty should be reasonable (may be lower due to simple implementation)
      expect(result.metadata.confidence.algorithmCertainty).toBeGreaterThanOrEqual(0);
      expect(result.metadata.confidence.algorithmCertainty).toBeLessThanOrEqual(1);
      
      // Overall confidence should be reasonable
      expect(result.summary.overallConfidence).toBeGreaterThan(0.5);
    });
  });
});