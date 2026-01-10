// API types and interfaces for the Option Comparison Tool REST API

import { 
  Option, 
  Constraint, 
  ComparisonResult, 
  ComparisonSnapshot,
  ValidationResult,
  WeightValidationResult,
  AnalysisConfig,
  ExportFormat
} from '../types/core';

// API Request/Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Comparison API types
export interface CreateComparisonRequest {
  name: string;
  description?: string;
  options: Option[];
  constraints: Constraint[];
  config?: AnalysisConfig;
}

export interface CreateComparisonResponse {
  comparisonId: string;
  result: ComparisonResult;
  createdAt: string;
}

export interface UpdateComparisonRequest {
  name?: string;
  description?: string;
  options?: Option[];
  constraints?: Constraint[];
  config?: AnalysisConfig;
}

export interface ComparisonPreviewRequest {
  options: Option[];
  constraints: Constraint[];
  config?: AnalysisConfig;
}

// Option API types
export interface CreateOptionRequest {
  option: Omit<Option, 'id' | 'metadata'>;
}

export interface UpdateOptionRequest {
  option: Partial<Omit<Option, 'id' | 'metadata'>>;
}

export interface OptionSearchRequest {
  query?: string;
  category?: string;
  attributes?: Record<string, any>;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'dateAdded' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
}

// Constraint API types
export interface CreateConstraintRequest {
  constraint: Omit<Constraint, 'id'>;
}

export interface UpdateConstraintRequest {
  constraint: Partial<Omit<Constraint, 'id'>>;
}

export interface ValidateConstraintsRequest {
  constraints: Constraint[];
}

export interface ValidateWeightsRequest {
  weights: Record<string, number>;
}

// Template API types
export interface ComparisonTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  options: Option[];
  constraints: Constraint[];
  config: AnalysisConfig;
  createdBy: string;
  createdAt: string;
  isPublic: boolean;
  usageCount: number;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: string;
  options: Option[];
  constraints: Constraint[];
  config?: AnalysisConfig;
  isPublic?: boolean;
}

export interface TemplateSearchRequest {
  query?: string;
  category?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
}

// Export API types
export interface ExportRequest {
  comparisonId: string;
  format: ExportFormat;
  includeRawData?: boolean;
  includeAnalysis?: boolean;
}

export interface ExportResponse {
  downloadUrl: string;
  filename: string;
  format: ExportFormat;
  size: number;
  expiresAt: string;
}

// Snapshot API types
export interface CreateSnapshotRequest {
  comparisonId: string;
  name: string;
  description?: string;
}

export interface SnapshotSearchRequest {
  query?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// Sharing API types
export interface CreateShareLinkRequest {
  snapshotId: string;
  accessLevel: 'view' | 'comment' | 'edit';
  scope: 'private' | 'team' | 'organization' | 'public';
  expiresAt?: string;
  allowedUsers?: string[];
  allowedRoles?: string[];
  requiresAuthentication?: boolean;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface ShareLinkResponse {
  linkId: string;
  url: string;
  accessLevel: string;
  scope: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

// Analytics API types
export interface AnalyticsRequest {
  resourceId: string;
  resourceType: 'comparison' | 'snapshot' | 'template';
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalyticsResponse {
  usage: {
    totalViews: number;
    uniqueUsers: number;
    averageSessionDuration: number;
  };
  performance: {
    averageLoadTime: number;
    errorRate: number;
  };
  trends: {
    dailyUsage: Record<string, number>;
    topUsers: Array<{ userId: string; count: number }>;
  };
}

// Error types
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: any;
  timestamp: string;
  requestId: string;
}

// Authentication types
export interface AuthContext {
  userId: string;
  roles: string[];
  permissions: string[];
  organizationId?: string;
  sessionId: string;
  tokenInfo?: {
    scope: string[];
    clientId: string;
    expiresAt: Date;
  };
}

export interface ApiRequest {
  auth?: AuthContext;
  requestId: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: any;
  params?: Record<string, string>;
}

// Health check types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services: {
    database: 'up' | 'down';
    cache: 'up' | 'down';
    storage: 'up' | 'down';
  };
  metrics: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}