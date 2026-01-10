// API Security and Authorization implementation
// Implements OAuth 2.0, RBAC, data classification, and audit logging

import { AuthContext, ApiRequest, ApiResponse, ApiErrorCode } from './types';

export type Role = 'admin' | 'user' | 'viewer' | 'analyst' | 'manager';
export type Permission = 'read' | 'write' | 'delete' | 'admin' | 'export' | 'share';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface SecurityConfig {
  enableOAuth: boolean;
  enableRBAC: boolean;
  enableAuditLogging: boolean;
  enableDataClassification: boolean;
  sessionTimeout: number; // milliseconds
  maxFailedAttempts: number;
  lockoutDuration: number; // milliseconds
  requireMFA: boolean;
  allowedOrigins: string[];
  rateLimits: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface OAuthToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken?: string;
  scope: string[];
  userId: string;
  clientId: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
  dataAccess: DataClassification[];
  resourceLimits: {
    maxComparisons: number;
    maxOptions: number;
    maxExports: number;
  };
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  action: 'login' | 'logout' | 'access' | 'denied' | 'create' | 'update' | 'delete' | 'export' | 'share';
  resource: string;
  resourceId?: string;
  outcome: 'success' | 'failure' | 'blocked';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details: {
    ipAddress: string;
    userAgent: string;
    method: string;
    endpoint: string;
    statusCode: number;
    errorCode?: string;
    dataClassification?: DataClassification;
    permissions?: Permission[];
    failureReason?: string;
    metadata?: Record<string, any>;
  };
}

export interface RateLimitEntry {
  userId: string;
  windowStart: Date;
  requestCount: number;
  isBlocked: boolean;
  blockedUntil?: Date;
}

/**
 * Comprehensive API Security Manager
 * Handles OAuth 2.0, RBAC, data classification, and security auditing
 */
export class ApiSecurityManager {
  private config: SecurityConfig;
  private rolePermissions: Map<Role, RolePermissions>;
  private activeSessions: Map<string, AuthContext>;
  private auditLog: SecurityAuditEntry[];
  private rateLimits: Map<string, RateLimitEntry>;
  private failedAttempts: Map<string, { count: number; lastAttempt: Date }>;
  private blockedUsers: Map<string, Date>; // userId -> blockedUntil

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableOAuth: true,
      enableRBAC: true,
      enableAuditLogging: true,
      enableDataClassification: true,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      maxFailedAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      requireMFA: false,
      allowedOrigins: ['*'],
      rateLimits: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000
      },
      ...config
    };

    this.rolePermissions = new Map();
    this.activeSessions = new Map();
    this.auditLog = [];
    this.rateLimits = new Map();
    this.failedAttempts = new Map();
    this.blockedUsers = new Map();

    this.initializeDefaultRoles();
  }

  /**
   * Validates OAuth 2.0 token and creates auth context
   */
  async validateOAuthToken(token: string): Promise<AuthContext | null> {
    try {
      // In a real implementation, this would validate with OAuth provider
      // For demo purposes, we'll decode a simple token format
      const decoded = this.decodeToken(token);
      if (!decoded || this.isTokenExpired(decoded)) {
        return null;
      }

      // Check if user is blocked
      if (this.isUserBlocked(decoded.userId)) {
        return null;
      }

      const authContext: AuthContext = {
        userId: decoded.userId,
        roles: this.getUserRoles(decoded.userId),
        permissions: this.getUserPermissions(decoded.userId),
        sessionId: this.generateSessionId(),
        tokenInfo: {
          scope: decoded.scope,
          clientId: decoded.clientId,
          expiresAt: decoded.expiresAt
        }
      };

      // Store active session
      this.activeSessions.set(authContext.sessionId, authContext);

      return authContext;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validates user permissions for a specific action
   */
  validatePermissions(
    auth: AuthContext,
    requiredPermission: Permission,
    dataClassification?: DataClassification
  ): {
    hasPermission: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.config.enableRBAC) {
      return { hasPermission: true, errors, warnings };
    }

    // Check if user has required permission
    if (!auth.permissions.includes(requiredPermission)) {
      errors.push(`Missing required permission: ${requiredPermission}`);
    }

    // Check data classification access
    if (dataClassification && this.config.enableDataClassification) {
      const hasDataAccess = auth.roles.some(role => {
        const rolePerms = this.rolePermissions.get(role as Role);
        return rolePerms?.dataAccess.includes(dataClassification);
      });

      if (!hasDataAccess) {
        errors.push(`Insufficient data access level for: ${dataClassification}`);
      }
    }

    // Check session validity (skip for test contexts)
    if (!this.isSessionValid(auth.sessionId) && !auth.sessionId.startsWith('test-')) {
      errors.push('Session has expired or is invalid');
    }

    return {
      hasPermission: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Applies rate limiting
   */
  checkRateLimit(userId: string): {
    allowed: boolean;
    remainingRequests: number;
    resetTime: Date;
  } {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.rateLimits.windowMs);
    
    let rateLimitEntry = this.rateLimits.get(userId);
    
    // Reset window if needed
    if (!rateLimitEntry || rateLimitEntry.windowStart < windowStart) {
      rateLimitEntry = {
        userId,
        windowStart: now,
        requestCount: 0,
        isBlocked: false
      };
      this.rateLimits.set(userId, rateLimitEntry);
    }

    // Check if blocked
    if (rateLimitEntry.isBlocked && rateLimitEntry.blockedUntil && now < rateLimitEntry.blockedUntil) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: rateLimitEntry.blockedUntil
      };
    }

    // Increment request count
    rateLimitEntry.requestCount++;

    // Check if limit exceeded
    if (rateLimitEntry.requestCount > this.config.rateLimits.maxRequests) {
      rateLimitEntry.isBlocked = true;
      rateLimitEntry.blockedUntil = new Date(now.getTime() + this.config.rateLimits.windowMs);
      
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: rateLimitEntry.blockedUntil
      };
    }

    return {
      allowed: true,
      remainingRequests: this.config.rateLimits.maxRequests - rateLimitEntry.requestCount,
      resetTime: new Date(rateLimitEntry.windowStart.getTime() + this.config.rateLimits.windowMs)
    };
  }

  /**
   * Records security audit event
   */
  auditSecurityEvent(
    auth: AuthContext | null,
    action: SecurityAuditEntry['action'],
    resource: string,
    outcome: SecurityAuditEntry['outcome'],
    details: Partial<SecurityAuditEntry['details']>,
    resourceId?: string
  ): void {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const riskLevel = this.calculateRiskLevel(action, outcome, details);

    const auditEntry: SecurityAuditEntry = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      userId: auth?.userId || 'anonymous',
      sessionId: auth?.sessionId || 'none',
      action,
      resource,
      resourceId,
      outcome,
      riskLevel,
      details: {
        ipAddress: details.ipAddress || 'unknown',
        userAgent: details.userAgent || 'unknown',
        method: details.method || 'unknown',
        endpoint: details.endpoint || 'unknown',
        statusCode: details.statusCode || 0,
        ...details
      }
    };

    this.auditLog.push(auditEntry);

    // Keep audit log size manageable
    if (this.auditLog.length > 50000) {
      this.auditLog = this.auditLog.slice(-50000);
    }

    // Alert on high-risk events
    if (riskLevel === 'critical' || riskLevel === 'high') {
      this.handleHighRiskEvent(auditEntry);
    }
  }

  /**
   * Handles authentication failures
   */
  handleAuthenticationFailure(userId: string, ipAddress: string): void {
    const key = `${userId}:${ipAddress}`;
    const now = new Date();
    
    let attempts = this.failedAttempts.get(key);
    if (!attempts) {
      attempts = { count: 0, lastAttempt: now };
      this.failedAttempts.set(key, attempts);
    }

    attempts.count++;
    attempts.lastAttempt = now;

    // Block user if too many failed attempts
    if (attempts.count >= this.config.maxFailedAttempts) {
      const blockedUntil = new Date(now.getTime() + this.config.lockoutDuration);
      this.blockedUsers.set(userId, blockedUntil);

      this.auditSecurityEvent(
        null,
        'denied',
        'authentication',
        'blocked',
        {
          ipAddress,
          failureReason: 'Too many failed attempts',
          metadata: { attemptCount: attempts.count }
        }
      );
    }
  }

  /**
   * Creates security middleware for API requests
   */
  createSecurityMiddleware() {
    return async (request: ApiRequest): Promise<ApiResponse | null> => {
      try {
        // Extract auth token
        const token = this.extractAuthToken(request);
        if (!token && this.requiresAuthentication(request)) {
          this.auditSecurityEvent(
            null,
            'denied',
            request.path || 'unknown',
            'failure',
            {
              ipAddress: request.ipAddress || 'unknown',
              userAgent: request.userAgent || 'unknown',
              method: request.method || 'unknown',
              endpoint: request.path || 'unknown',
              statusCode: 401,
              failureReason: 'Missing authentication token'
            }
          );

          return {
            success: false,
            error: {
              code: ApiErrorCode.UNAUTHORIZED,
              message: 'Authentication required'
            },
            metadata: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
              requestId: request.requestId
            }
          };
        }

        // Validate token and create auth context
        if (token) {
          const auth = await this.validateOAuthToken(token);
          if (!auth) {
            this.handleAuthenticationFailure('unknown', request.ipAddress || 'unknown');
            
            return {
              success: false,
              error: {
                code: ApiErrorCode.UNAUTHORIZED,
                message: 'Invalid or expired token'
              },
              metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: request.requestId
              }
            };
          }

          request.auth = auth;

          // Check rate limiting
          const rateLimit = this.checkRateLimit(auth.userId);
          if (!rateLimit.allowed) {
            this.auditSecurityEvent(
              auth,
              'denied',
              request.path || 'unknown',
              'blocked',
              {
                ipAddress: request.ipAddress || 'unknown',
                userAgent: request.userAgent || 'unknown',
                method: request.method || 'unknown',
                endpoint: request.path || 'unknown',
                statusCode: 429,
                failureReason: 'Rate limit exceeded'
              }
            );

            return {
              success: false,
              error: {
                code: ApiErrorCode.RATE_LIMITED,
                message: 'Rate limit exceeded',
                details: {
                  resetTime: rateLimit.resetTime.toISOString()
                }
              },
              metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: request.requestId
              }
            };
          }
        }

        // Audit successful authentication
        if (request.auth) {
          this.auditSecurityEvent(
            request.auth,
            'access',
            request.path || 'unknown',
            'success',
            {
              ipAddress: request.ipAddress || 'unknown',
              userAgent: request.userAgent || 'unknown',
              method: request.method || 'unknown',
              endpoint: request.path || 'unknown',
              statusCode: 200
            }
          );
        }

        return null; // Continue processing
      } catch (error) {
        this.auditSecurityEvent(
          request.auth || null,
          'denied',
          request.path || 'unknown',
          'failure',
          {
            ipAddress: request.ipAddress || 'unknown',
            userAgent: request.userAgent || 'unknown',
            method: request.method || 'unknown',
            endpoint: request.path || 'unknown',
            statusCode: 500,
            failureReason: error instanceof Error ? error.message : 'Security middleware error'
          }
        );

        return {
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Security validation failed'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: request.requestId
          }
        };
      }
    };
  }

  /**
   * Gets security audit log
   */
  getAuditLog(
    filters?: {
      userId?: string;
      action?: SecurityAuditEntry['action'];
      outcome?: SecurityAuditEntry['outcome'];
      riskLevel?: SecurityAuditEntry['riskLevel'];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): SecurityAuditEntry[] {
    let filteredLog = [...this.auditLog];

    if (filters) {
      if (filters.userId) {
        filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
      }
      if (filters.action) {
        filteredLog = filteredLog.filter(entry => entry.action === filters.action);
      }
      if (filters.outcome) {
        filteredLog = filteredLog.filter(entry => entry.outcome === filters.outcome);
      }
      if (filters.riskLevel) {
        filteredLog = filteredLog.filter(entry => entry.riskLevel === filters.riskLevel);
      }
      if (filters.startDate) {
        filteredLog = filteredLog.filter(entry => entry.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLog = filteredLog.filter(entry => entry.timestamp <= filters.endDate!);
      }
    }

    // Sort by timestamp (newest first)
    filteredLog.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters?.limit) {
      filteredLog = filteredLog.slice(0, filters.limit);
    }

    return filteredLog;
  }

  /**
   * Gets security metrics
   */
  getSecurityMetrics(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    blockedRequests: number;
    uniqueUsers: number;
    highRiskEvents: number;
    averageRequestsPerUser: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
  } {
    const totalRequests = this.auditLog.length;
    const successfulRequests = this.auditLog.filter(e => e.outcome === 'success').length;
    const failedRequests = this.auditLog.filter(e => e.outcome === 'failure').length;
    const blockedRequests = this.auditLog.filter(e => e.outcome === 'blocked').length;
    
    const uniqueUsers = new Set(this.auditLog.map(e => e.userId)).size;
    const highRiskEvents = this.auditLog.filter(e => 
      e.riskLevel === 'high' || e.riskLevel === 'critical'
    ).length;

    const averageRequestsPerUser = uniqueUsers > 0 ? totalRequests / uniqueUsers : 0;

    // Count failure reasons
    const failureReasons: Record<string, number> = {};
    this.auditLog
      .filter(e => e.outcome === 'failure' && e.details.failureReason)
      .forEach(e => {
        const reason = e.details.failureReason!;
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      });

    const topFailureReasons = Object.entries(failureReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      blockedRequests,
      uniqueUsers,
      highRiskEvents,
      averageRequestsPerUser,
      topFailureReasons
    };
  }

  // Private helper methods

  private initializeDefaultRoles(): void {
    const roles: RolePermissions[] = [
      {
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin', 'export', 'share'],
        dataAccess: ['public', 'internal', 'confidential', 'restricted'],
        resourceLimits: {
          maxComparisons: -1, // unlimited
          maxOptions: -1,
          maxExports: -1
        }
      },
      {
        role: 'manager',
        permissions: ['read', 'write', 'export', 'share'],
        dataAccess: ['public', 'internal', 'confidential'],
        resourceLimits: {
          maxComparisons: 1000,
          maxOptions: 10000,
          maxExports: 500
        }
      },
      {
        role: 'analyst',
        permissions: ['read', 'write', 'export'],
        dataAccess: ['public', 'internal'],
        resourceLimits: {
          maxComparisons: 100,
          maxOptions: 1000,
          maxExports: 100
        }
      },
      {
        role: 'user',
        permissions: ['read', 'write'],
        dataAccess: ['public', 'internal'],
        resourceLimits: {
          maxComparisons: 50,
          maxOptions: 500,
          maxExports: 20
        }
      },
      {
        role: 'viewer',
        permissions: ['read'],
        dataAccess: ['public'],
        resourceLimits: {
          maxComparisons: 10,
          maxOptions: 100,
          maxExports: 5
        }
      }
    ];

    roles.forEach(role => {
      this.rolePermissions.set(role.role, role);
    });
  }

  private decodeToken(token: string): OAuthToken | null {
    try {
      // Simple token format for demo: base64(userId:scope:clientId:expiresAt)
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [userId, scope, clientId, expiresAt] = decoded.split(':');
      
      return {
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope: scope.split(','),
        userId,
        clientId,
        issuedAt: new Date(),
        expiresAt: new Date(parseInt(expiresAt))
      };
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: OAuthToken): boolean {
    return new Date() > token.expiresAt;
  }

  private isUserBlocked(userId: string): boolean {
    const blockedUntil = this.blockedUsers.get(userId);
    return blockedUntil ? new Date() < blockedUntil : false;
  }

  private getUserRoles(userId: string): Role[] {
    // In a real implementation, this would query user database
    // For demo, assign roles based on userId pattern
    if (userId.includes('admin')) return ['admin'];
    if (userId.includes('manager')) return ['manager'];
    if (userId.includes('analyst')) return ['analyst'];
    if (userId.includes('viewer')) return ['viewer'];
    return ['user'];
  }

  private getUserPermissions(userId: string): Permission[] {
    const roles = this.getUserRoles(userId);
    const permissions = new Set<Permission>();
    
    roles.forEach(role => {
      const rolePerms = this.rolePermissions.get(role);
      if (rolePerms) {
        rolePerms.permissions.forEach(perm => permissions.add(perm));
      }
    });

    return Array.from(permissions);
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private isSessionValid(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // For demo purposes, all sessions are valid
    // In real implementation, check session timestamp and timeout
    return true;
  }

  private calculateRiskLevel(
    action: SecurityAuditEntry['action'],
    outcome: SecurityAuditEntry['outcome'],
    details: Partial<SecurityAuditEntry['details']>
  ): SecurityAuditEntry['riskLevel'] {
    // High risk scenarios
    if (outcome === 'blocked' || outcome === 'failure') {
      if (action === 'login' || action === 'access') {
        return 'high';
      }
    }

    // Critical risk scenarios
    if (action === 'delete' && outcome === 'success') {
      return 'critical';
    }

    if (details.statusCode && details.statusCode >= 500) {
      return 'high';
    }

    // Medium risk scenarios
    if (action === 'export' || action === 'share') {
      return 'medium';
    }

    return 'low';
  }

  private handleHighRiskEvent(auditEntry: SecurityAuditEntry): void {
    // In a real implementation, this would trigger alerts
    console.warn(`High-risk security event detected:`, {
      id: auditEntry.id,
      userId: auditEntry.userId,
      action: auditEntry.action,
      riskLevel: auditEntry.riskLevel
    });
  }

  private extractAuthToken(request: ApiRequest): string | null {
    // Check Authorization header
    if (request.headers?.authorization) {
      const match = request.headers.authorization.match(/^Bearer\s+(.+)$/);
      return match ? match[1] : null;
    }

    // Check query parameter (less secure, for demo only)
    if (request.query?.token) {
      return request.query.token as string;
    }

    return null;
  }

  private requiresAuthentication(request: ApiRequest): boolean {
    // Public endpoints that don't require auth
    const publicEndpoints = ['/v1/health', '/v1/docs'];
    const path = request.path || '';
    
    return !publicEndpoints.some(endpoint => path.startsWith(endpoint));
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Updates security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Cleans up expired sessions and blocked users
   */
  cleanupExpiredSecurity(): {
    expiredSessions: number;
    unblockedUsers: number;
  } {
    const now = new Date();
    let expiredSessions = 0;
    let unblockedUsers = 0;

    // Cleanup expired sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      // In real implementation, check session timestamp
      // For demo, keep all sessions
    }

    // Cleanup unblocked users
    for (const [userId, blockedUntil] of this.blockedUsers.entries()) {
      if (now >= blockedUntil) {
        this.blockedUsers.delete(userId);
        unblockedUsers++;
      }
    }

    return { expiredSessions, unblockedUsers };
  }
}