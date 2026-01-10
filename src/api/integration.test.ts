// Comprehensive API Integration Tests
// Tests all API endpoints with various input combinations and error handling

import { ApiRouter } from './router';
import { ApiRequest, AuthContext, ApiErrorCode } from './types';
import { Option, Constraint, ConstraintType, CriterionType, EvaluationOperator } from '../types/core';

describe('API Integration Tests', () => {
  let router: ApiRouter;
  let testAuth: AuthContext;

  beforeEach(() => {
    router = new ApiRouter();
    testAuth = {
      userId: 'integration-test-user',
      roles: ['user'],
      permissions: ['read', 'write', 'export', 'share'],
      sessionId: 'test-session-integration',
      tokenInfo: {
        scope: ['read', 'write', 'export'],
        clientId: 'test-client',
        expiresAt: new Date(Date.now() + 3600000)
      }
    };
  });

  const createTestOptions = (): Option[] => [
    {
      id: 'opt1',
      name: 'Option A',
      description: 'First API option',
      category: 'api',
      attributes: {
        cost: { value: 100, unit: 'USD/month' },
        performance: { value: 85, unit: 'score' },
        reliability: { value: 90, unit: 'percentage' },
        features: { value: 'auth,caching,monitoring' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: {
          completeness: 0.9,
          freshness: 0.8,
          reliability: 0.9
        },
        entryMethod: 'manual'
      }
    },
    {
      id: 'opt2',
      name: 'Option B',
      description: 'Second API option',
      category: 'api',
      attributes: {
        cost: { value: 150, unit: 'USD/month' },
        performance: { value: 95, unit: 'score' },
        reliability: { value: 85, unit: 'percentage' },
        features: { value: 'auth,analytics,scaling' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: {
          completeness: 0.85,
          freshness: 0.9,
          reliability: 0.85
        },
        entryMethod: 'manual'
      }
    },
    {
      id: 'opt3',
      name: 'Option C',
      description: 'Third API option',
      category: 'api',
      attributes: {
        cost: { value: 75, unit: 'USD/month' },
        performance: { value: 70, unit: 'score' },
        reliability: { value: 95, unit: 'percentage' },
        features: { value: 'auth,monitoring' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: {
          completeness: 0.8,
          freshness: 0.7,
          reliability: 0.8
        },
        entryMethod: 'manual'
      }
    }
  ];

  const createTestConstraints = (): Constraint[] => [
    {
      id: 'c1',
      name: 'Cost',
      type: 'budget',
      isHardRequirement: false,
      weight: 0.4,
      criterionType: 'cost',
      evaluationRule: {
        attributePath: 'cost',
        operator: 'lessThan',
        targetValue: 120
      },
      description: 'Monthly cost should be under $120',
      confidenceLevel: 0.9
    },
    {
      id: 'c2',
      name: 'Performance',
      type: 'performance',
      isHardRequirement: false,
      weight: 0.35,
      criterionType: 'benefit',
      evaluationRule: {
        attributePath: 'performance',
        operator: 'greaterThan',
        targetValue: 80
      },
      description: 'Performance score should be above 80',
      confidenceLevel: 0.85
    },
    {
      id: 'c3',
      name: 'Reliability',
      type: 'performance',
      isHardRequirement: false,
      weight: 0.25,
      criterionType: 'benefit',
      evaluationRule: {
        attributePath: 'reliability',
        operator: 'greaterThan',
        targetValue: 85
      },
      description: 'Reliability should be above 85%',
      confidenceLevel: 0.8
    }
  ];

  describe('Comparison API Endpoints', () => {
    test('POST /v1/comparisons - should create comparison successfully', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-1',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          name: 'Integration Test Comparison',
          description: 'Test comparison for API integration',
          options: createTestOptions(),
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.createComparison(request as any);

      expect(response.success).toBe(true);
      expect(response.data?.comparisonId).toBeDefined();
      expect(response.data?.result).toBeDefined();
      expect(response.data?.result.matrix).toBeDefined();
      expect(response.data?.result.matrix.options.length).toBeGreaterThan(0);
      expect(response.data?.createdAt).toBeDefined();
      expect(response.metadata?.requestId).toBe('test-create-1');
    });

    test('POST /v1/comparisons - should validate required fields', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-2',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          // Missing required fields
          description: 'Test comparison without required fields'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.createComparison(request as any);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(ApiErrorCode.VALIDATION_ERROR);
      expect(response.error?.message).toContain('Missing required field');
    });

    test('POST /v1/comparisons - should validate minimum options requirement', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-3',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          name: 'Invalid Comparison',
          options: [createTestOptions()[0]], // Only one option
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.createComparison(request as any);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(ApiErrorCode.VALIDATION_ERROR);
      expect(response.error?.message).toContain('Invalid options provided');
    });

    test('GET /v1/comparisons - should retrieve comparisons with pagination', async () => {
      // First create some comparisons
      const createRequests = Array.from({ length: 5 }, (_, i) => ({
        auth: testAuth,
        requestId: `test-create-bulk-${i}`,
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          name: `Bulk Test Comparison ${i + 1}`,
          options: createTestOptions(),
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      }));

      for (const req of createRequests) {
        await router.createComparison(req as any);
      }

      // Test pagination
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-get-1',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/v1/comparisons',
        query: {
          page: 1,
          limit: 3,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.getComparisons(request as any);

      expect(response.success).toBe(true);
      expect(response.data?.length).toBeLessThanOrEqual(3);
      expect(response.pagination).toBeDefined();
      expect(response.pagination?.page).toBe(1);
      expect(response.pagination?.limit).toBe(3);
      expect(response.pagination?.total).toBeGreaterThan(0);
    });

    test('GET /v1/comparisons/{id} - should retrieve specific comparison', async () => {
      // Create a comparison first
      const createRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-for-get',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          name: 'Specific Test Comparison',
          options: createTestOptions(),
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const createResponse = await router.createComparison(createRequest as any);
      expect(createResponse.success).toBe(true);

      // Retrieve the specific comparison
      const getRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-get-specific',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: `/v1/comparisons/${createResponse.data?.comparisonId}`,
        params: { id: createResponse.data?.comparisonId! },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const getResponse = await router.getComparison(getRequest as any);

      expect(getResponse.success).toBe(true);
      expect(getResponse.data?.matrix).toBeDefined();
      expect(getResponse.data?.matrix.options.length).toBe(3);
    });

    test('GET /v1/comparisons/{id} - should handle non-existent comparison', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-get-nonexistent',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/v1/comparisons/nonexistent-id',
        params: { id: 'nonexistent-id' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.getComparison(request as any);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(ApiErrorCode.NOT_FOUND);
      expect(response.error?.message).toContain('not found');
    });

    test('PUT /v1/comparisons/{id}/options - should update comparison options', async () => {
      // Create a comparison first
      const createRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-for-update',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          name: 'Update Test Comparison',
          options: createTestOptions(),
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const createResponse = await router.createComparison(createRequest as any);
      expect(createResponse.success).toBe(true);

      // Update the options
      const updatedOptions = createTestOptions();
      updatedOptions[0].attributes.cost = { value: 90, unit: 'USD/month' }; // Change cost

      const updateRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-update-options',
        timestamp: new Date().toISOString(),
        method: 'PUT',
        path: `/v1/comparisons/${createResponse.data?.comparisonId}/options`,
        params: { id: createResponse.data?.comparisonId! },
        body: { options: updatedOptions },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const updateResponse = await router.updateComparisonOptions(updateRequest as any);

      expect(updateResponse.success).toBe(true);
      expect(updateResponse.data?.matrix).toBeDefined();
      // Verify the updated cost is reflected in the result
      const updatedOption = updateResponse.data?.matrix.options.find(opt => opt.id === 'opt1');
      expect(updatedOption?.attributes.cost.value).toBe(90);
    });
  });

  describe('Preview and Validation Endpoints', () => {
    test('POST /v1/compare/preview - should preview comparison without saving', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-preview-1',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/compare/preview',
        body: {
          options: createTestOptions(),
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.previewComparison(request as any);

      expect(response.success).toBe(true);
      expect(response.data?.matrix).toBeDefined();
      expect(response.data?.matrix.options.length).toBe(3);
      expect(response.data?.tradeoffs).toBeDefined();
      expect(response.data?.confidence).toBeDefined();
    });

    test('POST /v1/constraints/evaluate - should validate constraints', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-validate-constraints',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/constraints/evaluate',
        body: {
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.evaluateConstraints(request as any);

      expect(response.success).toBe(true);
      expect(response.data?.isValid).toBe(true);
      expect(Array.isArray(response.data?.errors)).toBe(true);
      expect(Array.isArray(response.data?.warnings)).toBe(true);
    });

    test('POST /v1/constraints/evaluate - should detect invalid constraints', async () => {
      const invalidConstraints = [
        {
          id: 'invalid1',
          name: '', // Empty name
          type: 'budget' as ConstraintType,
          isHardRequirement: false,
          weight: 0.5,
          criterionType: 'cost' as CriterionType,
          evaluationRule: {
            attributePath: 'cost',
            operator: 'lessThan' as EvaluationOperator,
            targetValue: 100
          },
          description: 'Invalid constraint with empty name',
          confidenceLevel: 0.5
        },
        {
          id: 'invalid2',
          name: 'Invalid Weight',
          type: 'performance' as ConstraintType,
          isHardRequirement: false,
          weight: 1.5, // Invalid weight > 1
          criterionType: 'benefit' as CriterionType,
          evaluationRule: {
            attributePath: 'performance',
            operator: 'greaterThan' as EvaluationOperator,
            targetValue: 50
          },
          description: 'Invalid constraint with weight > 1',
          confidenceLevel: 0.5
        }
      ];

      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-validate-invalid',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/constraints/evaluate',
        body: {
          constraints: invalidConstraints
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.evaluateConstraints(request as any);

      expect(response.success).toBe(true);
      expect(response.data?.isValid).toBe(false);
      expect(response.data?.errors.length).toBeGreaterThan(0);
    });

    test('POST /v1/weights/validate - should validate constraint weights', async () => {
      const weights = {
        c1: 0.4,
        c2: 0.35,
        c3: 0.25
      };

      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-validate-weights',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/weights/validate',
        body: { weights },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.validateWeights(request as any);

      expect(response.success).toBe(true);
      expect(response.data?.isValid).toBe(true);
      expect(response.data?.normalizedWeights).toBeDefined();
      expect(Object.values(response.data?.normalizedWeights || {}).reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 2);
    });
  });

  describe('Template API Endpoints', () => {
    test('POST /v1/templates - should create template successfully', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-template',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/templates',
        body: {
          name: 'API Comparison Template',
          description: 'Template for comparing API options',
          category: 'api',
          options: createTestOptions(),
          constraints: createTestConstraints(),
          isPublic: true
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.createTemplate(request as any);

      expect(response.success).toBe(true);
      expect(response.data?.id).toBeDefined();
      expect(response.data?.name).toBe('API Comparison Template');
      expect(response.data?.category).toBe('api');
      expect(response.data?.isPublic).toBe(true);
      expect(response.data?.createdBy).toBe(testAuth.userId);
    });

    test('GET /v1/templates - should retrieve templates with filtering', async () => {
      // Create a few templates first
      const templateRequests = [
        {
          name: 'API Template 1',
          category: 'api',
          isPublic: true
        },
        {
          name: 'Database Template',
          category: 'database',
          isPublic: false
        },
        {
          name: 'API Template 2',
          category: 'api',
          isPublic: true
        }
      ];

      for (const templateData of templateRequests) {
        const createRequest: ApiRequest = {
          auth: testAuth,
          requestId: `test-create-template-${templateData.name}`,
          timestamp: new Date().toISOString(),
          method: 'POST',
          path: '/v1/templates',
          body: {
            ...templateData,
            description: `Description for ${templateData.name}`,
            options: createTestOptions(),
            constraints: createTestConstraints()
          },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        };

        await router.createTemplate(createRequest as any);
      }

      // Test filtering by category
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-get-templates',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/v1/templates',
        query: {
          category: 'api',
          isPublic: true,
          page: 1,
          limit: 10
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.getTemplates(request as any);

      expect(response.success).toBe(true);
      expect(response.data?.length).toBeGreaterThanOrEqual(2);
      expect(response.data?.every(template => template.category === 'api')).toBe(true);
      expect(response.data?.every(template => template.isPublic === true)).toBe(true);
    });
  });

  describe('Export API Endpoints', () => {
    test('POST /v1/export - should export comparison in JSON format', async () => {
      // Create a comparison first
      const createRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-for-export',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          name: 'Export Test Comparison',
          options: createTestOptions(),
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const createResponse = await router.createComparison(createRequest as any);
      expect(createResponse.success).toBe(true);

      // Export the comparison
      const exportRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-export-json',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/export',
        body: {
          comparisonId: createResponse.data?.comparisonId,
          format: 'json',
          includeRawData: true,
          includeAnalysis: true
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const exportResponse = await router.exportComparison(exportRequest as any);

      expect(exportResponse.success).toBe(true);
      expect(exportResponse.data?.downloadUrl).toBeDefined();
      expect(exportResponse.data?.filename).toContain('.json');
      expect(exportResponse.data?.format).toBe('json');
      expect(typeof exportResponse.data?.size).toBe('number');
      expect(exportResponse.data?.expiresAt).toBeDefined();
    });

    test('POST /v1/export - should export comparison in CSV format', async () => {
      // Create a comparison first
      const createRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-for-csv-export',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          name: 'CSV Export Test Comparison',
          options: createTestOptions(),
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const createResponse = await router.createComparison(createRequest as any);
      expect(createResponse.success).toBe(true);

      // Export as CSV
      const exportRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-export-csv',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/export',
        body: {
          comparisonId: createResponse.data?.comparisonId,
          format: 'csv'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const exportResponse = await router.exportComparison(exportRequest as any);

      expect(exportResponse.success).toBe(true);
      expect(exportResponse.data?.filename).toContain('.csv');
      expect(exportResponse.data?.format).toBe('csv');
    });
  });

  describe('Snapshot and Sharing Endpoints', () => {
    test('POST /v1/snapshots - should create snapshot successfully', async () => {
      // Create a comparison first
      const createRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-for-snapshot',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          name: 'Snapshot Test Comparison',
          options: createTestOptions(),
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const createResponse = await router.createComparison(createRequest as any);
      expect(createResponse.success).toBe(true);

      // Create snapshot
      const snapshotRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-snapshot',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/snapshots',
        body: {
          comparisonId: createResponse.data?.comparisonId,
          name: 'Test Snapshot',
          description: 'Snapshot for integration testing'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const snapshotResponse = await router.createSnapshot(snapshotRequest as any);

      expect(snapshotResponse.success).toBe(true);
      expect(snapshotResponse.data?.id).toBeDefined();
      expect(snapshotResponse.data?.name).toBe('Test Snapshot');
      expect(snapshotResponse.data?.createdBy).toBe(testAuth.userId);
      expect(snapshotResponse.data?.metadata).toBeDefined();
    });

    test('GET /v1/snapshots - should retrieve snapshots', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-get-snapshots',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/v1/snapshots',
        query: {
          page: 1,
          limit: 10
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.getSnapshots(request as any);

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.pagination).toBeDefined();
    });

    test('POST /v1/share - should create shareable link', async () => {
      // Create comparison and snapshot first
      const createRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-for-share',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          name: 'Share Test Comparison',
          options: createTestOptions(),
          constraints: createTestConstraints()
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const createResponse = await router.createComparison(createRequest as any);
      expect(createResponse.success).toBe(true);

      const snapshotRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-snapshot-for-share',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/snapshots',
        body: {
          comparisonId: createResponse.data?.comparisonId,
          name: 'Share Test Snapshot'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const snapshotResponse = await router.createSnapshot(snapshotRequest as any);
      expect(snapshotResponse.success).toBe(true);

      // Create share link
      const shareRequest: ApiRequest = {
        auth: testAuth,
        requestId: 'test-create-share-link',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/share',
        body: {
          snapshotId: snapshotResponse.data?.id,
          accessLevel: 'view',
          scope: 'team',
          title: 'Shared Test Comparison',
          description: 'Shared for integration testing'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const shareResponse = await router.createShareLink(shareRequest as any);

      expect(shareResponse.success).toBe(true);
      expect(shareResponse.data?.linkId).toBeDefined();
      expect(shareResponse.data?.url).toBeDefined();
      expect(shareResponse.data?.accessLevel).toBe('view');
      expect(shareResponse.data?.scope).toBe('team');
      expect(shareResponse.data?.isActive).toBe(true);
    });
  });

  describe('Health Check Endpoint', () => {
    test('GET /v1/health - should return health status', async () => {
      const request: ApiRequest = {
        requestId: 'test-health-check',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/v1/health',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.healthCheck(request);

      expect(response.success).toBe(true);
      expect(response.data?.status).toBe('healthy');
      expect(response.data?.version).toBeDefined();
      expect(response.data?.timestamp).toBeDefined();
      expect(response.data?.services).toBeDefined();
      expect(response.data?.metrics).toBeDefined();
      expect(typeof response.data?.metrics.uptime).toBe('number');
      expect(typeof response.data?.metrics.memoryUsage).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON in request body', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-malformed-json',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: null, // Malformed body
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.createComparison(request as any);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });

    test('should handle internal server errors gracefully', async () => {
      // Create a request that will cause an internal error
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-internal-error',
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/v1/comparisons',
        body: {
          name: 'Error Test',
          options: createTestOptions(),
          constraints: [
            {
              id: 'invalid-constraint',
              name: 'Invalid Constraint',
              type: 'custom' as ConstraintType, // Valid type but might cause issues
              isHardRequirement: false,
              weight: 0.5,
              criterionType: 'benefit' as CriterionType,
              evaluationRule: {
                attributePath: 'nonexistent',
                operator: 'equals' as EvaluationOperator,
                targetValue: 100
              },
              description: 'Constraint with nonexistent attribute',
              confidenceLevel: 0.5
            }
          ]
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.createComparison(request as any);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBeDefined();
      expect(response.metadata?.requestId).toBe('test-internal-error');
    });

    test('should validate request parameters', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-invalid-params',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/v1/comparisons/invalid-id-format',
        params: { id: '' }, // Empty ID
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.getComparison(request as any);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(ApiErrorCode.NOT_FOUND);
    });
  });

  describe('API Versioning', () => {
    test('should handle versioned endpoints correctly', async () => {
      // Test that v1 endpoints work as expected
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-versioning',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/v1/health', // Explicitly test v1 endpoint
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.healthCheck(request);

      expect(response.success).toBe(true);
      expect(response.metadata?.version).toBe('1.0.0');
    });

    test('should include version information in all responses', async () => {
      const request: ApiRequest = {
        auth: testAuth,
        requestId: 'test-version-metadata',
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/v1/comparisons',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const response = await router.getComparisons(request as any);

      expect(response.metadata?.version).toBeDefined();
      expect(response.metadata?.timestamp).toBeDefined();
      expect(response.metadata?.requestId).toBe('test-version-metadata');
    });
  });
});