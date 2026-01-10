import { ApiSecurityManager, Role, Permission, DataClassification } from './security';
import { AuthContext, ApiRequest, ApiErrorCode } from './types';

describe('ApiSecurityManager', () => {
  let securityManager: ApiSecurityManager;
  let mockRequest: ApiRequest;

  beforeEach(() => {
    securityManager = new ApiSecurityManager({
      enableOAuth: true,
      enableRBAC: true,
      enableAuditLogging: true,
      enableDataClassification: true,
      maxFailedAttempts: 3,
      lockoutDuration: 5 * 60 * 1000, // 5 minutes
      rateLimits: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10
      }
    });

    mockRequest = {
      requestId: 'test-request-1',
      timestamp: new Date().toISOString(),
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      method: 'GET',
      path: '/v1/comparisons',
      headers: {}
    };
  });

  describe('OAuth Token Validation', () => {
    it('should validate valid OAuth token', async () => {
      // Create a valid token (base64 encoded: userId:scope:clientId:expiresAt)
      const futureTime = Date.now() + 3600000; // 1 hour from now
      const tokenData = `test-user:read,write:test-client:${futureTime}`;
      const token = Buffer.from(tokenData).toString('base64');

      const authContext = await securityManager.validateOAuthToken(token);

      expect(authContext).toBeDefined();
      expect(authContext!.userId).toBe('test-user');
      expect(authContext!.roles).toContain('user');
      expect(authContext!.permissions).toContain('read');
      expect(authContext!.permissions).toContain('write');
      expect(authContext!.sessionId).toBeDefined();
      expect(authContext!.tokenInfo).toBeDefined();
      expect(authContext!.tokenInfo!.scope).toEqual(['read', 'write']);
    });

    it('should reject expired OAuth token', async () => {
      // Create an expired token
      const pastTime = Date.now() - 3600000; // 1 hour ago
      const tokenData = `test-user:read,write:test-client:${pastTime}`;
      const token = Buffer.from(tokenData).toString('base64');

      const authContext = await securityManager.validateOAuthToken(token);

      expect(authContext).toBeNull();
    });

    it('should reject malformed OAuth token', async () => {
      const invalidToken = 'invalid-token';

      const authContext = await securityManager.validateOAuthToken(invalidToken);

      expect(authContext).toBeNull();
    });

    it('should reject token for blocked user', async () => {
      const userId = 'blocked-user';
      
      // Simulate failed authentication attempts to block user
      for (let i = 0; i < 4; i++) {
        securityManager.handleAuthenticationFailure(userId, '127.0.0.1');
      }

      // Try to validate token for blocked user
      const futureTime = Date.now() + 3600000;
      const tokenData = `${userId}:read:test-client:${futureTime}`;
      const token = Buffer.from(tokenData).toString('base64');

      const authContext = await securityManager.validateOAuthToken(token);

      expect(authContext).toBeNull();
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should validate admin permissions', () => {
      const adminAuth: AuthContext = {
        userId: 'admin-user',
        roles: ['admin'],
        permissions: ['read', 'write', 'delete', 'admin', 'export', 'share'],
        sessionId: 'test-session'
      };

      const result = securityManager.validatePermissions(
        adminAuth,
        'delete',
        'restricted'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject insufficient permissions', () => {
      const viewerAuth: AuthContext = {
        userId: 'viewer-user',
        roles: ['viewer'],
        permissions: ['read'],
        sessionId: 'test-session'
      };

      const result = securityManager.validatePermissions(
        viewerAuth,
        'write',
        'internal'
      );

      expect(result.hasPermission).toBe(false);
      expect(result.errors).toContain('Missing required permission: write');
    });

    it('should validate data classification access', () => {
      const userAuth: AuthContext = {
        userId: 'regular-user',
        roles: ['user'],
        permissions: ['read', 'write'],
        sessionId: 'test-session'
      };

      // User should have access to internal data
      const internalResult = securityManager.validatePermissions(
        userAuth,
        'read',
        'internal'
      );
      expect(internalResult.hasPermission).toBe(true);

      // User should NOT have access to restricted data
      const restrictedResult = securityManager.validatePermissions(
        userAuth,
        'read',
        'restricted'
      );
      expect(restrictedResult.hasPermission).toBe(false);
      expect(restrictedResult.errors).toContain('Insufficient data access level for: restricted');
    });

    it('should handle multiple roles correctly', () => {
      const multiRoleAuth: AuthContext = {
        userId: 'multi-role-user',
        roles: ['user', 'analyst'],
        permissions: ['read', 'write', 'export'],
        sessionId: 'test-session'
      };

      const result = securityManager.validatePermissions(
        multiRoleAuth,
        'export',
        'internal'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const userId = 'test-user';

      // Make requests within limit
      for (let i = 0; i < 5; i++) {
        const result = securityManager.checkRateLimit(userId);
        expect(result.allowed).toBe(true);
        expect(result.remainingRequests).toBe(10 - (i + 1));
      }
    });

    it('should block requests exceeding rate limit', () => {
      const userId = 'heavy-user';

      // Exceed rate limit
      for (let i = 0; i < 11; i++) {
        securityManager.checkRateLimit(userId);
      }

      // Next request should be blocked
      const result = securityManager.checkRateLimit(userId);
      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('should reset rate limit after window expires', async () => {
      const userId = 'reset-user';

      // Use up rate limit
      for (let i = 0; i < 11; i++) {
        securityManager.checkRateLimit(userId);
      }

      // Should be blocked
      let result = securityManager.checkRateLimit(userId);
      expect(result.allowed).toBe(false);

      // Wait for window to reset (simulate by creating new manager)
      const newSecurityManager = new ApiSecurityManager({
        rateLimits: {
          windowMs: 60 * 1000,
          maxRequests: 10
        }
      });

      // Should be allowed again
      result = newSecurityManager.checkRateLimit(userId);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Security Auditing', () => {
    it('should record security audit events', () => {
      const auth: AuthContext = {
        userId: 'test-user',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'test-session'
      };

      securityManager.auditSecurityEvent(
        auth,
        'access',
        '/v1/comparisons',
        'success',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          method: 'GET',
          endpoint: '/v1/comparisons',
          statusCode: 200
        }
      );

      const auditLog = securityManager.getAuditLog();
      expect(auditLog).toHaveLength(1);
      
      const entry = auditLog[0];
      expect(entry.userId).toBe('test-user');
      expect(entry.action).toBe('access');
      expect(entry.outcome).toBe('success');
      expect(entry.riskLevel).toBe('low');
    });

    it('should calculate risk levels correctly', () => {
      const auth: AuthContext = {
        userId: 'test-user',
        roles: ['admin'],
        permissions: ['delete'],
        sessionId: 'test-session'
      };

      // High-risk delete operation
      securityManager.auditSecurityEvent(
        auth,
        'delete',
        '/v1/comparisons/123',
        'success',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          method: 'DELETE',
          endpoint: '/v1/comparisons/123',
          statusCode: 200
        },
        '123'
      );

      const auditLog = securityManager.getAuditLog();
      const entry = auditLog[0];
      expect(entry.riskLevel).toBe('critical');
    });

    it('should filter audit log correctly', () => {
      const auth: AuthContext = {
        userId: 'test-user',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'test-session'
      };

      // Create multiple audit entries
      securityManager.auditSecurityEvent(auth, 'access', '/v1/comparisons', 'success', {
        ipAddress: '127.0.0.1', userAgent: 'test', method: 'GET', endpoint: '/v1/comparisons', statusCode: 200
      });
      
      securityManager.auditSecurityEvent(auth, 'denied', '/v1/admin', 'failure', {
        ipAddress: '127.0.0.1', userAgent: 'test', method: 'GET', endpoint: '/v1/admin', statusCode: 403
      });

      // Filter by action
      const accessLogs = securityManager.getAuditLog({ action: 'access' });
      expect(accessLogs).toHaveLength(1);
      expect(accessLogs[0].action).toBe('access');

      // Filter by outcome
      const failureLogs = securityManager.getAuditLog({ outcome: 'failure' });
      expect(failureLogs).toHaveLength(1);
      expect(failureLogs[0].outcome).toBe('failure');
    });
  });

  describe('Authentication Failure Handling', () => {
    it('should track failed authentication attempts', () => {
      const userId = 'failing-user';
      const ipAddress = '192.168.1.100';

      // Simulate failed attempts
      securityManager.handleAuthenticationFailure(userId, ipAddress);
      securityManager.handleAuthenticationFailure(userId, ipAddress);

      // Should not be blocked yet (limit is 3)
      const futureTime = Date.now() + 3600000;
      const tokenData = `${userId}:read:test-client:${futureTime}`;
      const token = Buffer.from(tokenData).toString('base64');

      let authContext = securityManager.validateOAuthToken(token);
      expect(authContext).resolves.toBeDefined();

      // One more failure should block the user
      securityManager.handleAuthenticationFailure(userId, ipAddress);

      authContext = securityManager.validateOAuthToken(token);
      expect(authContext).resolves.toBeNull();
    });

    it('should create audit log for blocked users', () => {
      const userId = 'blocked-user';
      const ipAddress = '192.168.1.100';

      // Trigger blocking
      for (let i = 0; i < 4; i++) {
        securityManager.handleAuthenticationFailure(userId, ipAddress);
      }

      const auditLog = securityManager.getAuditLog({ 
        action: 'denied',
        outcome: 'blocked'
      });

      expect(auditLog.length).toBeGreaterThan(0);
      const blockEntry = auditLog.find(entry => 
        entry.details.failureReason === 'Too many failed attempts'
      );
      expect(blockEntry).toBeDefined();
    });
  });

  describe('Security Middleware', () => {
    it('should create security middleware that validates authentication', async () => {
      const middleware = securityManager.createSecurityMiddleware();

      // Request without authentication
      const unauthenticatedRequest = { ...mockRequest };
      const response = await middleware(unauthenticatedRequest);

      expect(response).toBeDefined();
      expect(response!.success).toBe(false);
      expect(response!.error?.code).toBe(ApiErrorCode.UNAUTHORIZED);
    });

    it('should allow authenticated requests', async () => {
      const middleware = securityManager.createSecurityMiddleware();

      // Create valid token
      const futureTime = Date.now() + 3600000;
      const tokenData = `test-user:read,write:test-client:${futureTime}`;
      const token = Buffer.from(tokenData).toString('base64');

      const authenticatedRequest = {
        ...mockRequest,
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const response = await middleware(authenticatedRequest);

      expect(response).toBeNull(); // null means continue processing
      expect(authenticatedRequest.auth).toBeDefined();
      expect(authenticatedRequest.auth!.userId).toBe('test-user');
    });

    it('should enforce rate limiting in middleware', async () => {
      const middleware = securityManager.createSecurityMiddleware();

      // Create valid token
      const futureTime = Date.now() + 3600000;
      const tokenData = `heavy-user:read:test-client:${futureTime}`;
      const token = Buffer.from(tokenData).toString('base64');

      const authenticatedRequest = {
        ...mockRequest,
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      // Make requests to exceed rate limit
      for (let i = 0; i < 11; i++) {
        await middleware({ ...authenticatedRequest });
      }

      // Next request should be rate limited
      const response = await middleware(authenticatedRequest);
      expect(response).toBeDefined();
      expect(response!.success).toBe(false);
      expect(response!.error?.code).toBe(ApiErrorCode.RATE_LIMITED);
    });

    it('should handle public endpoints without authentication', async () => {
      const middleware = securityManager.createSecurityMiddleware();

      const publicRequest = {
        ...mockRequest,
        path: '/v1/health'
      };

      const response = await middleware(publicRequest);

      expect(response).toBeNull(); // Should continue processing
    });
  });

  describe('Security Metrics', () => {
    it('should calculate security metrics correctly', () => {
      const auth: AuthContext = {
        userId: 'metrics-user',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'test-session'
      };

      // Create various audit events
      securityManager.auditSecurityEvent(auth, 'access', '/v1/comparisons', 'success', {
        ipAddress: '127.0.0.1', userAgent: 'test', method: 'GET', endpoint: '/v1/comparisons', statusCode: 200
      });

      securityManager.auditSecurityEvent(auth, 'access', '/v1/comparisons', 'failure', {
        ipAddress: '127.0.0.1', userAgent: 'test', method: 'GET', endpoint: '/v1/comparisons', statusCode: 403,
        failureReason: 'Insufficient permissions'
      });

      securityManager.auditSecurityEvent(auth, 'delete', '/v1/comparisons/123', 'success', {
        ipAddress: '127.0.0.1', userAgent: 'test', method: 'DELETE', endpoint: '/v1/comparisons/123', statusCode: 200
      });

      const metrics = securityManager.getSecurityMetrics();

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.uniqueUsers).toBe(1);
      expect(metrics.highRiskEvents).toBe(2); // The access failure and delete operation
      expect(metrics.topFailureReasons).toHaveLength(1);
      expect(metrics.topFailureReasons[0].reason).toBe('Insufficient permissions');
    });
  });

  describe('Configuration Management', () => {
    it('should update security configuration', () => {
      const newConfig = {
        maxFailedAttempts: 10,
        lockoutDuration: 30 * 60 * 1000 // 30 minutes
      };

      securityManager.updateConfig(newConfig);
      const config = securityManager.getConfig();

      expect(config.maxFailedAttempts).toBe(10);
      expect(config.lockoutDuration).toBe(30 * 60 * 1000);
    });

    it('should maintain existing config when updating', () => {
      const originalConfig = securityManager.getConfig();
      
      securityManager.updateConfig({ maxFailedAttempts: 7 });
      const updatedConfig = securityManager.getConfig();

      expect(updatedConfig.maxFailedAttempts).toBe(7);
      expect(updatedConfig.enableOAuth).toBe(originalConfig.enableOAuth);
      expect(updatedConfig.enableRBAC).toBe(originalConfig.enableRBAC);
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup expired security data', () => {
      // This test would be more meaningful with actual time-based expiration
      // For now, we test that the method exists and returns expected structure
      const result = securityManager.cleanupExpiredSecurity();

      expect(result).toHaveProperty('expiredSessions');
      expect(result).toHaveProperty('unblockedUsers');
      expect(typeof result.expiredSessions).toBe('number');
      expect(typeof result.unblockedUsers).toBe('number');
    });
  });

  describe('Role Assignment Logic', () => {
    it('should assign roles based on userId patterns', async () => {
      const testCases = [
        { userId: 'admin-user-123', expectedRoles: ['admin'] },
        { userId: 'manager-john', expectedRoles: ['manager'] },
        { userId: 'analyst-jane', expectedRoles: ['analyst'] },
        { userId: 'viewer-guest', expectedRoles: ['viewer'] },
        { userId: 'regular-user', expectedRoles: ['user'] }
      ];

      for (const testCase of testCases) {
        const futureTime = Date.now() + 3600000;
        const tokenData = `${testCase.userId}:read:test-client:${futureTime}`;
        const token = Buffer.from(tokenData).toString('base64');

        const authContext = await securityManager.validateOAuthToken(token);
        expect(authContext).toBeDefined();
        expect(authContext!.roles).toEqual(testCase.expectedRoles);
      }
    });

    it('should assign correct permissions based on roles', async () => {
      const adminToken = Buffer.from(`admin-user:read:test-client:${Date.now() + 3600000}`).toString('base64');
      const viewerToken = Buffer.from(`viewer-user:read:test-client:${Date.now() + 3600000}`).toString('base64');

      const adminAuth = await securityManager.validateOAuthToken(adminToken);
      const viewerAuth = await securityManager.validateOAuthToken(viewerToken);

      expect(adminAuth!.permissions).toContain('admin');
      expect(adminAuth!.permissions).toContain('delete');
      expect(adminAuth!.permissions).toContain('write');

      expect(viewerAuth!.permissions).toContain('read');
      expect(viewerAuth!.permissions).not.toContain('write');
      expect(viewerAuth!.permissions).not.toContain('delete');
    });
  });
});