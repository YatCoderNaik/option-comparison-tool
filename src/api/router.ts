// Main API router for the Option Comparison Tool REST API
// Implements read-only, write, and interactive APIs as specified in requirements

import { 
  ApiResponse, 
  PaginatedResponse,
  CreateComparisonRequest,
  CreateComparisonResponse,
  ComparisonPreviewRequest,
  OptionSearchRequest,
  ValidateConstraintsRequest,
  ValidateWeightsRequest,
  ComparisonTemplate,
  CreateTemplateRequest,
  TemplateSearchRequest,
  ExportRequest,
  ExportResponse,
  CreateSnapshotRequest,
  SnapshotSearchRequest,
  CreateShareLinkRequest,
  ShareLinkResponse,
  HealthCheckResponse,
  ApiRequest,
  AuthContext,
  ApiErrorCode
} from './types';

import { 
  Option, 
  Constraint, 
  ComparisonResult, 
  ComparisonSnapshot,
  ValidationResult,
  WeightValidationResult
} from '../types/core';

import { ComparisonEngine } from '../components/comparison-engine';
import { OptionManager } from '../components/option-management';
import { WeightCalculator } from '../components/constraint-management';
import { ExportManager } from '../components/presentation';
import { SnapshotManager } from '../components/sharing';
import { SecureSharingManager } from '../components/sharing';
import { ApiSecurityManager } from './security';

/**
 * Main API Router class that handles all REST API endpoints
 * Provides versioned API access to all core functionality
 */
export class ApiRouter {
  private comparisonEngine: ComparisonEngine;
  private optionManager: OptionManager;
  private weightCalculator: WeightCalculator;
  private exportManager: ExportManager;
  private snapshotManager: SnapshotManager;
  private sharingManager: SecureSharingManager;
  private securityManager: ApiSecurityManager;
  
  // In-memory storage for demo purposes (would be replaced with database)
  private comparisons: Map<string, { result: ComparisonResult; metadata: any }>;
  private templates: Map<string, ComparisonTemplate>;

  constructor() {
    this.comparisonEngine = new ComparisonEngine();
    this.optionManager = new OptionManager();
    this.weightCalculator = new WeightCalculator();
    this.exportManager = new ExportManager();
    this.snapshotManager = new SnapshotManager();
    this.sharingManager = new SecureSharingManager({
      allowPublicSharing: true // Enable public sharing for API
    });
    this.securityManager = new ApiSecurityManager({
      enableOAuth: true,
      enableRBAC: true,
      enableAuditLogging: true,
      enableDataClassification: true
    });
    
    this.comparisons = new Map();
    this.templates = new Map();
  }

  // ============================================================================
  // READ-ONLY APIs (GET endpoints)
  // ============================================================================

  /**
   * GET /v1/comparisons
   * Retrieve all comparisons for the authenticated user
   */
  async getComparisons(
    request: ApiRequest & { 
      query?: { 
        page?: number; 
        limit?: number; 
        sortBy?: string; 
        sortOrder?: 'asc' | 'desc' 
      } 
    }
  ): Promise<PaginatedResponse<ComparisonResult>> {
    try {
      this.validateAuth(request.auth);
      
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = request.query || {};
      
      // Get all comparisons (in real implementation, filter by user)
      const allComparisons = Array.from(this.comparisons.entries()).map(([id, data]) => ({
        id,
        ...data.result,
        ...data.metadata
      }));

      // Apply sorting
      allComparisons.sort((a, b) => {
        const aVal = (a as any)[sortBy];
        const bVal = (b as any)[sortBy];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = allComparisons.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedResults,
        pagination: {
          page,
          limit,
          total: allComparisons.length,
          totalPages: Math.ceil(allComparisons.length / limit),
          hasNext: endIndex < allComparisons.length,
          hasPrev: page > 1
        },
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * GET /v1/comparisons/{id}
   * Retrieve a specific comparison by ID
   */
  async getComparison(
    request: ApiRequest & { params: { id: string } }
  ): Promise<ApiResponse<ComparisonResult>> {
    try {
      this.validateAuth(request.auth);
      
      const comparison = this.comparisons.get(request.params.id);
      if (!comparison) {
        return this.createErrorResponse(
          ApiErrorCode.NOT_FOUND,
          `Comparison with ID ${request.params.id} not found`,
          request.requestId
        );
      }

      return {
        success: true,
        data: comparison.result,
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * GET /v1/templates
   * Retrieve available comparison templates
   */
  async getTemplates(
    request: ApiRequest & { query?: TemplateSearchRequest }
  ): Promise<PaginatedResponse<ComparisonTemplate>> {
    try {
      this.validateAuth(request.auth);
      
      const { 
        query = '', 
        category, 
        isPublic, 
        page = 1, 
        limit = 20 
      } = request.query || {};

      let templates = Array.from(this.templates.values());

      // Apply filters
      if (query) {
        templates = templates.filter(t => 
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.description.toLowerCase().includes(query.toLowerCase())
        );
      }

      if (category) {
        templates = templates.filter(t => t.category === category);
      }

      if (isPublic !== undefined) {
        templates = templates.filter(t => t.isPublic === isPublic);
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = templates.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedResults,
        pagination: {
          page,
          limit,
          total: templates.length,
          totalPages: Math.ceil(templates.length / limit),
          hasNext: endIndex < templates.length,
          hasPrev: page > 1
        },
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * GET /v1/options
   * Search and retrieve options
   */
  async getOptions(
    request: ApiRequest & { query?: OptionSearchRequest }
  ): Promise<PaginatedResponse<Option>> {
    try {
      this.validateAuth(request.auth);
      
      const searchParams = request.query || {};
      const options = await this.optionManager.getOptions();

      // Apply pagination
      const { page = 1, limit = 20 } = searchParams;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = options.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedResults,
        pagination: {
          page,
          limit,
          total: options.length,
          totalPages: Math.ceil(options.length / limit),
          hasNext: endIndex < options.length,
          hasPrev: page > 1
        },
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * GET /v1/snapshots
   * Retrieve comparison snapshots
   */
  async getSnapshots(
    request: ApiRequest & { query?: SnapshotSearchRequest }
  ): Promise<PaginatedResponse<ComparisonSnapshot>> {
    try {
      this.validateAuth(request.auth);
      
      const snapshots = this.snapshotManager.listSnapshots();
      
      // Apply filters (simplified for demo)
      let filteredSnapshots = snapshots;
      if (request.query?.createdBy) {
        filteredSnapshots = snapshots.filter(s => s.createdBy === request.query!.createdBy);
      }

      // Apply pagination
      const { page = 1, limit = 20 } = request.query || {};
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = filteredSnapshots.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedResults,
        pagination: {
          page,
          limit,
          total: filteredSnapshots.length,
          totalPages: Math.ceil(filteredSnapshots.length / limit),
          hasNext: endIndex < filteredSnapshots.length,
          hasPrev: page > 1
        },
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  // ============================================================================
  // WRITE APIs (POST, PUT, DELETE endpoints)
  // ============================================================================

  /**
   * POST /v1/comparisons
   * Create a new comparison
   */
  async createComparison(
    request: ApiRequest & { body: CreateComparisonRequest }
  ): Promise<ApiResponse<CreateComparisonResponse>> {
    try {
      this.validateAuth(request.auth);
      
      // Check write permissions
      const permissionCheck = this.validateUserPermissions(request.auth!, 'write', 'internal');
      if (!permissionCheck.hasPermission) {
        return this.createErrorResponse(
          ApiErrorCode.FORBIDDEN,
          'Insufficient permissions to create comparisons',
          request.requestId,
          permissionCheck.errors
        );
      }

      this.validateRequest(request.body, ['name', 'options', 'constraints']);

      const { name, description, options, constraints } = request.body;

      // Validate options and constraints
      const optionValidation = this.validateOptionsArray(options);
      if (!optionValidation.isValid) {
        return this.createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid options provided',
          request.requestId,
          optionValidation.errors
        );
      }

      const constraintValidation = this.validateConstraintsArray(constraints);
      if (!constraintValidation.isValid) {
        return this.createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid constraints provided',
          request.requestId,
          constraintValidation.errors
        );
      }

      // Perform comparison
      const result = await this.comparisonEngine.compareOptions(options, constraints);
      
      // Store comparison
      const comparisonId = this.generateId();
      this.comparisons.set(comparisonId, {
        result,
        metadata: {
          id: comparisonId,
          name,
          description,
          createdBy: request.auth!.userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      // Audit successful creation
      this.securityManager.auditSecurityEvent(
        request.auth!,
        'create',
        'comparison',
        'success',
        {
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          method: 'POST',
          endpoint: '/v1/comparisons',
          statusCode: 201,
          dataClassification: 'internal'
        },
        comparisonId
      );

      return {
        success: true,
        data: {
          comparisonId,
          result,
          createdAt: new Date().toISOString()
        },
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * PUT /v1/comparisons/{id}/options
   * Update options in an existing comparison
   */
  async updateComparisonOptions(
    request: ApiRequest & { 
      params: { id: string }; 
      body: { options: Option[] } 
    }
  ): Promise<ApiResponse<ComparisonResult>> {
    try {
      this.validateAuth(request.auth);
      this.validateRequest(request.body, ['options']);

      const comparison = this.comparisons.get(request.params.id);
      if (!comparison) {
        return this.createErrorResponse(
          ApiErrorCode.NOT_FOUND,
          `Comparison with ID ${request.params.id} not found`,
          request.requestId
        );
      }

      // Validate new options
      const optionValidation = this.validateOptionsArray(request.body.options);
      if (!optionValidation.isValid) {
        return this.createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid options provided',
          request.requestId,
          optionValidation.errors
        );
      }

      // Re-run comparison with new options
      const constraints = comparison.result.matrix.criteria;
      const newResult = await this.comparisonEngine.compareOptions(
        request.body.options, 
        constraints
      );

      // Update stored comparison
      comparison.result = newResult;
      comparison.metadata.updatedAt = new Date().toISOString();

      return {
        success: true,
        data: newResult,
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * POST /v1/templates
   * Create a new comparison template
   */
  async createTemplate(
    request: ApiRequest & { body: CreateTemplateRequest }
  ): Promise<ApiResponse<ComparisonTemplate>> {
    try {
      this.validateAuth(request.auth);
      this.validateRequest(request.body, ['name', 'category', 'options', 'constraints']);

      const template: ComparisonTemplate = {
        id: this.generateId(),
        ...request.body,
        config: request.body.config || {
          uniqueFeatureVarianceThreshold: 0.20,
          significantDifferenceThreshold: 0.15,
          dealBreakerConfidenceThreshold: 0.90
        },
        isPublic: request.body.isPublic || false,
        createdBy: request.auth!.userId,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };

      this.templates.set(template.id, template);

      return {
        success: true,
        data: template,
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * POST /v1/snapshots
   * Create a snapshot of a comparison
   */
  async createSnapshot(
    request: ApiRequest & { body: CreateSnapshotRequest }
  ): Promise<ApiResponse<ComparisonSnapshot>> {
    try {
      this.validateAuth(request.auth);
      this.validateRequest(request.body, ['comparisonId', 'name']);

      const comparison = this.comparisons.get(request.body.comparisonId);
      if (!comparison) {
        return this.createErrorResponse(
          ApiErrorCode.NOT_FOUND,
          `Comparison with ID ${request.body.comparisonId} not found`,
          request.requestId
        );
      }

      const snapshot = await this.snapshotManager.createSnapshot(
        request.body.name,
        request.auth!.userId,
        comparison.result.matrix.options,
        comparison.result.matrix.criteria,
        comparison.result
      );

      return {
        success: true,
        data: snapshot,
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  // ============================================================================
  // INTERACTIVE APIs (POST endpoints for operations)
  // ============================================================================

  /**
   * POST /v1/compare/preview
   * Preview comparison results without saving
   */
  async previewComparison(
    request: ApiRequest & { body: ComparisonPreviewRequest }
  ): Promise<ApiResponse<ComparisonResult>> {
    try {
      this.validateAuth(request.auth);
      this.validateRequest(request.body, ['options', 'constraints']);

      const { options, constraints } = request.body;

      // Validate inputs
      const optionValidation = this.validateOptionsArray(options);
      if (!optionValidation.isValid) {
        return this.createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid options provided',
          request.requestId,
          optionValidation.errors
        );
      }

      const constraintValidation = this.validateConstraintsArray(constraints);
      if (!constraintValidation.isValid) {
        return this.createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid constraints provided',
          request.requestId,
          constraintValidation.errors
        );
      }

      // Perform comparison
      const result = await this.comparisonEngine.compareOptions(options, constraints);

      return {
        success: true,
        data: result,
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * POST /v1/constraints/evaluate
   * Evaluate constraints against options
   */
  async evaluateConstraints(
    request: ApiRequest & { body: ValidateConstraintsRequest }
  ): Promise<ApiResponse<ValidationResult>> {
    try {
      this.validateAuth(request.auth);
      this.validateRequest(request.body, ['constraints']);

      const validation = this.validateConstraintsArray(request.body.constraints);

      return {
        success: true,
        data: validation,
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * POST /v1/weights/validate
   * Validate constraint weights
   */
  async validateWeights(
    request: ApiRequest & { body: ValidateWeightsRequest }
  ): Promise<ApiResponse<WeightValidationResult>> {
    try {
      this.validateAuth(request.auth);
      this.validateRequest(request.body, ['weights']);

      const validation = this.weightCalculator.validateWeights(request.body.weights);

      return {
        success: true,
        data: validation,
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * POST /v1/export
   * Export comparison results
   */
  async exportComparison(
    request: ApiRequest & { body: ExportRequest }
  ): Promise<ApiResponse<ExportResponse>> {
    try {
      this.validateAuth(request.auth);
      
      // Check export permissions
      const permissionCheck = this.validateUserPermissions(request.auth!, 'export', 'internal');
      if (!permissionCheck.hasPermission) {
        return this.createErrorResponse(
          ApiErrorCode.FORBIDDEN,
          'Insufficient permissions to export comparisons',
          request.requestId,
          permissionCheck.errors
        );
      }

      this.validateRequest(request.body, ['comparisonId', 'format']);

      const comparison = this.comparisons.get(request.body.comparisonId);
      if (!comparison) {
        return this.createErrorResponse(
          ApiErrorCode.NOT_FOUND,
          `Comparison with ID ${request.body.comparisonId} not found`,
          request.requestId
        );
      }

      const exportResult = await this.exportManager.exportResult(
        comparison.result as any, // Cast to FormattedComparisonResult
        {
          format: request.body.format,
          includeMetadata: request.body.includeAnalysis || true,
          includeExcludedOptions: request.body.includeRawData || true,
          includeConfidenceScores: true,
          includeVisualIndicators: false
        }
      );

      // In a real implementation, this would upload to cloud storage
      const downloadUrl = `/downloads/${this.generateId()}.${request.body.format}`;

      // Audit export operation
      this.securityManager.auditSecurityEvent(
        request.auth!,
        'export',
        'comparison',
        'success',
        {
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          method: 'POST',
          endpoint: '/v1/export',
          statusCode: 200,
          dataClassification: 'internal',
          metadata: { 
            format: request.body.format,
            comparisonId: request.body.comparisonId
          }
        },
        request.body.comparisonId
      );

      return {
        success: true,
        data: {
          downloadUrl,
          filename: `comparison-${request.body.comparisonId}.${request.body.format}`,
          format: request.body.format,
          size: exportResult.size,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        },
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * POST /v1/share
   * Create a shareable link for a snapshot
   */
  async createShareLink(
    request: ApiRequest & { body: CreateShareLinkRequest }
  ): Promise<ApiResponse<ShareLinkResponse>> {
    try {
      this.validateAuth(request.auth);
      this.validateRequest(request.body, ['snapshotId', 'accessLevel', 'scope']);

      const snapshot = this.snapshotManager.getSnapshot(request.body.snapshotId);
      if (!snapshot) {
        return this.createErrorResponse(
          ApiErrorCode.NOT_FOUND,
          `Snapshot with ID ${request.body.snapshotId} not found`,
          request.requestId
        );
      }

      const shareLink = await this.sharingManager.createShareableLink(
        snapshot,
        request.auth!.userId,
        {
          accessLevel: request.body.accessLevel,
          scope: request.body.scope,
          expiresAt: request.body.expiresAt ? new Date(request.body.expiresAt) : undefined,
          allowedUsers: request.body.allowedUsers,
          allowedRoles: request.body.allowedRoles,
          requiresAuthentication: request.body.requiresAuthentication,
          title: request.body.title,
          description: request.body.description,
          tags: request.body.tags
        }
      );

      return {
        success: true,
        data: {
          linkId: shareLink.id,
          url: shareLink.url,
          accessLevel: shareLink.accessLevel,
          scope: shareLink.scope,
          expiresAt: shareLink.expiresAt?.toISOString(),
          isActive: shareLink.isActive,
          createdAt: shareLink.createdAt.toISOString()
        },
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  // ============================================================================
  // HEALTH CHECK API
  // ============================================================================

  /**
   * GET /v1/health
   * Health check endpoint
   */
  async healthCheck(request: ApiRequest): Promise<ApiResponse<HealthCheckResponse>> {
    try {
      const health: HealthCheckResponse = {
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
          cache: 'up',
          storage: 'up'
        },
        metrics: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          cpuUsage: process.cpuUsage().user / 1000000, // seconds
          activeConnections: 1 // placeholder
        }
      };

      return {
        success: true,
        data: health,
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  // ============================================================================
  // SECURITY AND AUTHORIZATION METHODS
  // ============================================================================

  /**
   * Validates user permissions for a specific action
   */
  private validateUserPermissions(
    auth: AuthContext,
    requiredPermission: 'read' | 'write' | 'delete' | 'admin' | 'export' | 'share',
    dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted'
  ): { hasPermission: boolean; errors: string[] } {
    const validation = this.securityManager.validatePermissions(
      auth,
      requiredPermission,
      dataClassification
    );

    if (!validation.hasPermission) {
      this.securityManager.auditSecurityEvent(
        auth,
        'denied',
        'permission_check',
        'failure',
        {
          ipAddress: 'unknown',
          userAgent: 'unknown',
          method: 'unknown',
          endpoint: 'unknown',
          statusCode: 403,
          failureReason: `Missing permission: ${requiredPermission}`,
          permissions: [requiredPermission],
          dataClassification
        }
      );
    }

    return {
      hasPermission: validation.hasPermission,
      errors: validation.errors
    };
  }

  /**
   * Applies security middleware to requests
   */
  async applySecurityMiddleware(request: ApiRequest): Promise<ApiResponse | null> {
    const middleware = this.securityManager.createSecurityMiddleware();
    return await middleware(request);
  }

  /**
   * Gets security audit log
   */
  async getSecurityAuditLog(
    request: ApiRequest & { 
      query?: { 
        userId?: string;
        action?: string;
        outcome?: string;
        riskLevel?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
      } 
    }
  ): Promise<ApiResponse<any[]>> {
    try {
      this.validateAuth(request.auth);
      
      // Only admins can view audit logs
      const permissionCheck = this.validateUserPermissions(request.auth!, 'admin');
      if (!permissionCheck.hasPermission) {
        return this.createErrorResponse(
          ApiErrorCode.FORBIDDEN,
          'Insufficient permissions to view audit logs',
          request.requestId,
          permissionCheck.errors
        );
      }

      const filters = request.query ? {
        userId: request.query.userId,
        action: request.query.action as any,
        outcome: request.query.outcome as any,
        riskLevel: request.query.riskLevel as any,
        startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
        endDate: request.query.endDate ? new Date(request.query.endDate) : undefined,
        limit: request.query.limit ? parseInt(request.query.limit.toString()) : undefined
      } : undefined;

      const auditLog = this.securityManager.getAuditLog(filters);

      return {
        success: true,
        data: auditLog,
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  /**
   * Gets security metrics
   */
  async getSecurityMetrics(request: ApiRequest): Promise<ApiResponse<any>> {
    try {
      this.validateAuth(request.auth);
      
      // Only admins can view security metrics
      const permissionCheck = this.validateUserPermissions(request.auth!, 'admin');
      if (!permissionCheck.hasPermission) {
        return this.createErrorResponse(
          ApiErrorCode.FORBIDDEN,
          'Insufficient permissions to view security metrics',
          request.requestId,
          permissionCheck.errors
        );
      }

      const metrics = this.securityManager.getSecurityMetrics();

      return {
        success: true,
        data: metrics,
        metadata: this.createResponseMetadata(request.requestId)
      };
    } catch (error) {
      return this.handleError(error, request.requestId);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private validateAuth(auth?: AuthContext): void {
    if (!auth || !auth.userId) {
      throw new Error('Authentication required');
    }
  }

  private validateRequest(body: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!body || body[field] === undefined || body[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  private validateOptionsArray(options: Option[]): ValidationResult {
    const errors: string[] = [];
    
    if (!Array.isArray(options) || options.length < 2) {
      errors.push('At least 2 options are required for comparison');
    }

    options.forEach((option, index) => {
      const validation = this.optionManager.validateOption(option);
      if (!validation.isValid) {
        errors.push(`Option ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private validateConstraintsArray(constraints: Constraint[]): ValidationResult {
    const errors: string[] = [];
    
    if (!Array.isArray(constraints) || constraints.length === 0) {
      errors.push('At least 1 constraint is required for comparison');
    }

    constraints.forEach((constraint, index) => {
      try {
        // Basic constraint validation
        if (!constraint.id || !constraint.name) {
          errors.push(`Constraint ${index + 1}: Missing required fields (id, name)`);
        }
        if (typeof constraint.weight !== 'number' || constraint.weight < 0 || constraint.weight > 1) {
          errors.push(`Constraint ${index + 1}: Weight must be a number between 0 and 1`);
        }
      } catch (error) {
        errors.push(`Constraint ${index + 1}: ${error instanceof Error ? error.message : 'Validation error'}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private createResponseMetadata(requestId: string) {
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      requestId
    };
  }

  private createErrorResponse(
    code: ApiErrorCode,
    message: string,
    requestId: string,
    details?: any
  ): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      metadata: this.createResponseMetadata(requestId)
    };
  }

  private handleError(error: any, requestId: string): any {
    console.error('API Error:', error);
    
    if (error.message === 'Authentication required') {
      return this.createErrorResponse(
        ApiErrorCode.UNAUTHORIZED,
        'Authentication required',
        requestId
      );
    }

    if (error.message.startsWith('Missing required field:')) {
      return this.createErrorResponse(
        ApiErrorCode.VALIDATION_ERROR,
        error.message,
        requestId
      );
    }

    return this.createErrorResponse(
      ApiErrorCode.INTERNAL_ERROR,
      'An internal error occurred',
      requestId,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
}