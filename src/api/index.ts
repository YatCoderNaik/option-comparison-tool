// API module exports for the Option Comparison Tool REST API

export { ApiRouter } from './router';
export * from './types';

// Re-export commonly used types for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  CreateComparisonRequest,
  CreateComparisonResponse,
  ComparisonPreviewRequest,
  CreateOptionRequest,
  UpdateOptionRequest,
  OptionSearchRequest,
  CreateConstraintRequest,
  UpdateConstraintRequest,
  ComparisonTemplate,
  CreateTemplateRequest,
  ExportRequest,
  ExportResponse,
  CreateSnapshotRequest,
  CreateShareLinkRequest,
  ShareLinkResponse,
  HealthCheckResponse,
  AuthContext,
  ApiRequest,
  ApiError,
  ApiErrorCode
} from './types';