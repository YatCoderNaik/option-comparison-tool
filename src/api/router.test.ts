import { ApiRouter } from './router';
import { 
  ApiRequest, 
  AuthContext, 
  CreateComparisonRequest,
  ComparisonPreviewRequest,
  CreateTemplateRequest,
  CreateSnapshotRequest,
  ExportRequest,
  CreateShareLinkRequest,
  ApiErrorCode
} from './types';
import { Option, Constraint } from '../types/core';

describe('ApiRouter', () => {
  let apiRouter: ApiRouter;
  let mockAuth: AuthContext;
  let mockRequest: ApiRequest;

  beforeEach(() => {
    apiRouter = new ApiRouter();
    
    mockAuth = {
      userId: 'test-user-1',
      roles: ['user'],
      permissions: ['read', 'write', 'export', 'share'],
      sessionId: 'test-session-1'
    };

    mockRequest = {
      auth: mockAuth,
      requestId: 'test-request-1',
      timestamp: new Date().toISOString(),
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1'
    };
  });

  // Helper functions
  const createMockOption = (id: string): Option => ({
    id,
    name: `Option ${id}`,
    description: 'Test option',
    category: 'api',
    attributes: {
      cost: { value: 100, confidence: 0.8 },
      performance: { value: 50, confidence: 0.7 }
    },
    metadata: {
      dateAdded: new Date(),
      lastUpdated: new Date(),
      dataQuality: { completeness: 0.9, freshness: 0.8, reliability: 0.7 },
      entryMethod: 'manual'
    }
  });

  const createMockConstraint = (id: string): Constraint => ({
    id,
    name: `Constraint ${id}`,
    type: 'budget',
    isHardRequirement: false,
    weight: 0.5,
    criterionType: 'benefit',
    evaluationRule: {
      attributePath: 'cost',
      operator: 'lessThan',
      targetValue: 200
    },
    description: 'Test constraint',
    confidenceLevel: 0.8
  });

  describe('Health Check API', () => {
    it('should return health status', async () => {
      const response = await apiRouter.healthCheck(mockRequest);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data!.status).toBe('healthy');
      expect(response.data!.version).toBe('1.0.0');
      expect(response.data!.services).toBeDefined();
      expect(response.data!.metrics).toBeDefined();
      expect(response.metadata?.requestId).toBe(mockRequest.requestId);
    });
  });

  describe('Comparison APIs', () => {
    describe('createComparison', () => {
      it('should create a new comparison successfully', async () => {
        const options = [createMockOption('opt1'), createMockOption('opt2')];
        const constraints = [createMockConstraint('con1')];

        const createRequest: CreateComparisonRequest = {
          name: 'Test Comparison',
          description: 'A test comparison',
          options,
          constraints
        };

        const response = await apiRouter.createComparison({
          ...mockRequest,
          body: createRequest
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data!.comparisonId).toBeDefined();
        expect(response.data!.result).toBeDefined();
        expect(response.data!.createdAt).toBeDefined();
      });

      it('should reject comparison with missing required fields', async () => {
        const response = await apiRouter.createComparison({
          ...mockRequest,
          body: {} as CreateComparisonRequest
        });

        expect(response.success).toBe(false);
        expect(response.error?.code).toBe(ApiErrorCode.VALIDATION_ERROR);
        expect(response.error?.message).toContain('Missing required field');
      });

      it('should reject comparison without authentication', async () => {
        const options = [createMockOption('opt1'), createMockOption('opt2')];
        const constraints = [createMockConstraint('con1')];

        const response = await apiRouter.createComparison({
          ...mockRequest,
          auth: undefined,
          body: {
            name: 'Test Comparison',
            options,
            constraints
          }
        });

        expect(response.success).toBe(false);
        expect(response.error?.code).toBe(ApiErrorCode.UNAUTHORIZED);
      });
    });

    describe('getComparisons', () => {
      it('should return paginated comparisons', async () => {
        // First create a comparison
        const options = [createMockOption('opt1'), createMockOption('opt2')];
        const constraints = [createMockConstraint('con1')];

        await apiRouter.createComparison({
          ...mockRequest,
          body: {
            name: 'Test Comparison',
            options,
            constraints
          }
        });

        // Then retrieve comparisons
        const response = await apiRouter.getComparisons({
          ...mockRequest,
          query: { page: 1, limit: 10 }
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.pagination).toBeDefined();
        expect(response.pagination!.page).toBe(1);
        expect(response.pagination!.limit).toBe(10);
      });

      it('should require authentication', async () => {
        const response = await apiRouter.getComparisons({
          ...mockRequest,
          auth: undefined
        });

        expect(response.success).toBe(false);
        expect(response.error?.code).toBe(ApiErrorCode.UNAUTHORIZED);
      });
    });

    describe('getComparison', () => {
      it('should return specific comparison', async () => {
        // First create a comparison
        const options = [createMockOption('opt1'), createMockOption('opt2')];
        const constraints = [createMockConstraint('con1')];

        const createResponse = await apiRouter.createComparison({
          ...mockRequest,
          body: {
            name: 'Test Comparison',
            options,
            constraints
          }
        });

        const comparisonId = createResponse.data!.comparisonId;

        // Then retrieve the specific comparison
        const response = await apiRouter.getComparison({
          ...mockRequest,
          params: { id: comparisonId }
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data!.matrix).toBeDefined();
      });

      it('should return 404 for non-existent comparison', async () => {
        const response = await apiRouter.getComparison({
          ...mockRequest,
          params: { id: 'non-existent-id' }
        });

        expect(response.success).toBe(false);
        expect(response.error?.code).toBe(ApiErrorCode.NOT_FOUND);
      });
    });
  });

  describe('Interactive APIs', () => {
    describe('previewComparison', () => {
      it('should preview comparison without saving', async () => {
        const options = [createMockOption('opt1'), createMockOption('opt2')];
        const constraints = [createMockConstraint('con1')];

        const previewRequest: ComparisonPreviewRequest = {
          options,
          constraints
        };

        const response = await apiRouter.previewComparison({
          ...mockRequest,
          body: previewRequest
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data!.matrix).toBeDefined();
        expect(response.data!.confidence).toBeDefined();
      });

      it('should validate options and constraints', async () => {
        const response = await apiRouter.previewComparison({
          ...mockRequest,
          body: {
            options: [],
            constraints: []
          }
        });

        expect(response.success).toBe(false);
        expect(response.error?.code).toBe(ApiErrorCode.VALIDATION_ERROR);
      });
    });

    describe('evaluateConstraints', () => {
      it('should evaluate constraint validity', async () => {
        const constraints = [createMockConstraint('con1')];

        const response = await apiRouter.evaluateConstraints({
          ...mockRequest,
          body: { constraints }
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data!.isValid).toBeDefined();
      });
    });

    describe('validateWeights', () => {
      it('should validate constraint weights', async () => {
        const weights = { con1: 0.5, con2: 0.5 };

        const response = await apiRouter.validateWeights({
          ...mockRequest,
          body: { weights }
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data!.isValid).toBeDefined();
      });
    });
  });

  describe('Template APIs', () => {
    describe('createTemplate', () => {
      it('should create a new template', async () => {
        const options = [createMockOption('opt1')];
        const constraints = [createMockConstraint('con1')];

        const templateRequest: CreateTemplateRequest = {
          name: 'Test Template',
          description: 'A test template',
          category: 'api-comparison',
          options,
          constraints,
          isPublic: true
        };

        const response = await apiRouter.createTemplate({
          ...mockRequest,
          body: templateRequest
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data!.id).toBeDefined();
        expect(response.data!.name).toBe('Test Template');
        expect(response.data!.isPublic).toBe(true);
      });
    });

    describe('getTemplates', () => {
      it('should return paginated templates', async () => {
        // First create a template
        const options = [createMockOption('opt1')];
        const constraints = [createMockConstraint('con1')];

        await apiRouter.createTemplate({
          ...mockRequest,
          body: {
            name: 'Test Template',
            description: 'A test template',
            category: 'api-comparison',
            options,
            constraints
          }
        });

        // Then retrieve templates
        const response = await apiRouter.getTemplates({
          ...mockRequest,
          query: { page: 1, limit: 10 }
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.pagination).toBeDefined();
      });

      it('should filter templates by category', async () => {
        const response = await apiRouter.getTemplates({
          ...mockRequest,
          query: { category: 'api-comparison', page: 1, limit: 10 }
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
      });
    });
  });

  describe('Export APIs', () => {
    describe('exportComparison', () => {
      it('should export comparison in specified format', async () => {
        // First create a comparison
        const options = [createMockOption('opt1'), createMockOption('opt2')];
        const constraints = [createMockConstraint('con1')];

        const createResponse = await apiRouter.createComparison({
          ...mockRequest,
          body: {
            name: 'Test Comparison',
            options,
            constraints
          }
        });

        const comparisonId = createResponse.data!.comparisonId;

        // Then export it
        const exportRequest: ExportRequest = {
          comparisonId,
          format: 'json',
          includeRawData: true,
          includeAnalysis: true
        };

        const response = await apiRouter.exportComparison({
          ...mockRequest,
          body: exportRequest
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data!.downloadUrl).toBeDefined();
        expect(response.data!.format).toBe('json');
        expect(response.data!.filename).toContain(comparisonId);
      });

      it('should return 404 for non-existent comparison', async () => {
        const response = await apiRouter.exportComparison({
          ...mockRequest,
          body: {
            comparisonId: 'non-existent-id',
            format: 'json'
          }
        });

        expect(response.success).toBe(false);
        expect(response.error?.code).toBe(ApiErrorCode.NOT_FOUND);
      });
    });
  });

  describe('Snapshot APIs', () => {
    describe('createSnapshot', () => {
      it('should create a snapshot of a comparison', async () => {
        // First create a comparison
        const options = [createMockOption('opt1'), createMockOption('opt2')];
        const constraints = [createMockConstraint('con1')];

        const createResponse = await apiRouter.createComparison({
          ...mockRequest,
          body: {
            name: 'Test Comparison',
            options,
            constraints
          }
        });

        const comparisonId = createResponse.data!.comparisonId;

        // Then create a snapshot
        const snapshotRequest: CreateSnapshotRequest = {
          comparisonId,
          name: 'Test Snapshot',
          description: 'A test snapshot'
        };

        const response = await apiRouter.createSnapshot({
          ...mockRequest,
          body: snapshotRequest
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data!.id).toBeDefined();
        expect(response.data!.name).toBe('Test Snapshot');
      });
    });

    describe('getSnapshots', () => {
      it('should return paginated snapshots', async () => {
        const response = await apiRouter.getSnapshots({
          ...mockRequest,
          query: { page: 1, limit: 10 }
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.pagination).toBeDefined();
      });
    });
  });

  describe('Sharing APIs', () => {
    describe('createShareLink', () => {
      it('should create a shareable link for a snapshot', async () => {
        // First create a comparison and snapshot
        const options = [createMockOption('opt1'), createMockOption('opt2')];
        const constraints = [createMockConstraint('con1')];

        const createResponse = await apiRouter.createComparison({
          ...mockRequest,
          body: {
            name: 'Test Comparison',
            options,
            constraints
          }
        });

        const snapshotResponse = await apiRouter.createSnapshot({
          ...mockRequest,
          body: {
            comparisonId: createResponse.data!.comparisonId,
            name: 'Test Snapshot'
          }
        });

        const snapshotId = snapshotResponse.data!.id;

        // Then create a share link
        const shareRequest: CreateShareLinkRequest = {
          snapshotId,
          accessLevel: 'view',
          scope: 'public',
          title: 'Shared Comparison'
        };

        const response = await apiRouter.createShareLink({
          ...mockRequest,
          body: shareRequest
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data!.linkId).toBeDefined();
        expect(response.data!.url).toBeDefined();
        expect(response.data!.accessLevel).toBe('view');
        expect(response.data!.scope).toBe('public');
      });

      it('should return 404 for non-existent snapshot', async () => {
        const response = await apiRouter.createShareLink({
          ...mockRequest,
          body: {
            snapshotId: 'non-existent-id',
            accessLevel: 'view',
            scope: 'public'
          }
        });

        expect(response.success).toBe(false);
        expect(response.error?.code).toBe(ApiErrorCode.NOT_FOUND);
      });
    });
  });

  describe('Options APIs', () => {
    describe('getOptions', () => {
      it('should return paginated options', async () => {
        const response = await apiRouter.getOptions({
          ...mockRequest,
          query: { page: 1, limit: 10 }
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.pagination).toBeDefined();
      });

      it('should support search parameters', async () => {
        const response = await apiRouter.getOptions({
          ...mockRequest,
          query: {
            query: 'test',
            category: 'api',
            page: 1,
            limit: 10
          }
        });

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle internal errors gracefully', async () => {
      // Mock an internal error by passing invalid data
      const response = await apiRouter.createComparison({
        ...mockRequest,
        body: {
          name: 'Test',
          options: null as any,
          constraints: null as any
        }
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.metadata?.requestId).toBe(mockRequest.requestId);
    });

    it('should include request metadata in all responses', async () => {
      const response = await apiRouter.healthCheck(mockRequest);

      expect(response.metadata).toBeDefined();
      expect(response.metadata!.requestId).toBe(mockRequest.requestId);
      expect(response.metadata!.timestamp).toBeDefined();
      expect(response.metadata!.version).toBe('1.0.0');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await apiRouter.getComparisons({
        ...mockRequest,
        auth: undefined
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(ApiErrorCode.UNAUTHORIZED);
      expect(response.error?.message).toBe('Authentication required');
    });

    it('should reject requests with invalid authentication', async () => {
      const response = await apiRouter.getComparisons({
        ...mockRequest,
        auth: { ...mockAuth, userId: '' }
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(ApiErrorCode.UNAUTHORIZED);
    });
  });
});