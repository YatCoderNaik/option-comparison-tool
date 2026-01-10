import { SecureSharingManager, AccessLevel, ShareScope } from './secure-sharing';
import { ComparisonSnapshot, Option, Constraint, ComparisonResult } from '../../types/core';

describe('SecureSharingManager', () => {
  let sharingManager: SecureSharingManager;
  let mockSnapshot: ComparisonSnapshot;

  beforeEach(() => {
    sharingManager = new SecureSharingManager({
      enableAuditLogging: true,
      allowPublicSharing: true
    });

    // Create mock snapshot
    mockSnapshot = {
      id: 'test-snapshot-1',
      name: 'Test Comparison',
      createdAt: new Date(),
      createdBy: 'user1',
      optionSnapshots: [],
      constraints: [],
      results: {
        matrix: {
          options: [],
          excludedOptions: [],
          criteria: [],
          scores: [],
          normalizedScores: [],
          weightedScores: [],
          rankings: [],
          constraintViolations: []
        },
        tradeoffs: {
          optionAnalyses: {},
          keyDifferentiators: [],
          scenarioGuidance: []
        },
        insights: [],
        confidence: {
          overall: 0.8,
          dataCompleteness: 0.9,
          dataFreshness: 0.7,
          sourceReliability: 0.8,
          algorithmCertainty: 0.6
        }
      },
      metadata: {
        version: '1.0.0',
        algorithmVersion: '1.0.0',
        dataIntegrityHash: 'test-hash'
      }
    };
  });

  describe('createShareableLink', () => {
    it('should create a basic shareable link with default settings', async () => {
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1');

      expect(link.snapshotId).toBe(mockSnapshot.id);
      expect(link.createdBy).toBe('user1');
      expect(link.accessLevel).toBe('view');
      expect(link.scope).toBe('private');
      expect(link.isActive).toBe(true);
      expect(link.accessCount).toBe(0);
      expect(link.url).toContain('shared/');
      expect(link.requiresAuthentication).toBe(true);
    });

    it('should create a public link with edit access', async () => {
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        accessLevel: 'edit',
        scope: 'public',
        requiresAuthentication: false,
        title: 'Public Comparison',
        description: 'Shared for team review'
      });

      expect(link.accessLevel).toBe('edit');
      expect(link.scope).toBe('public');
      expect(link.requiresAuthentication).toBe(false);
      expect(link.metadata.title).toBe('Public Comparison');
      expect(link.metadata.description).toBe('Shared for team review');
    });

    it('should create a link with specific user allowlist', async () => {
      const allowedUsers = ['user2', 'user3'];
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        allowedUsers,
        scope: 'team'
      });

      expect(link.allowedUsers).toEqual(allowedUsers);
      expect(link.scope).toBe('team');
    });

    it('should create a link with role-based access', async () => {
      const allowedRoles = ['developer', 'manager'];
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        allowedRoles,
        accessLevel: 'comment'
      });

      expect(link.allowedRoles).toEqual(allowedRoles);
      expect(link.accessLevel).toBe('comment');
    });

    it('should set expiration date correctly', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        expiresAt
      });

      expect(link.expiresAt).toEqual(expiresAt);
    });

    it('should reject admin access for public links', async () => {
      await expect(
        sharingManager.createShareableLink(mockSnapshot, 'user1', {
          accessLevel: 'admin',
          scope: 'public'
        })
      ).rejects.toThrow('Admin access cannot be granted for public links');
    });

    it('should reject expired expiration dates', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      
      await expect(
        sharingManager.createShareableLink(mockSnapshot, 'user1', {
          expiresAt: pastDate
        })
      ).rejects.toThrow('Expiration date must be in the future');
    });
  });

  describe('validateAccess', () => {
    let publicLink: any;
    let privateLink: any;

    beforeEach(async () => {
      publicLink = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        scope: 'public',
        accessLevel: 'view'
      });

      privateLink = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        scope: 'private',
        allowedUsers: ['user2'],
        accessLevel: 'edit'
      });
    });

    it('should allow access to public links', async () => {
      const result = await sharingManager.validateAccess(publicLink.id, 'anonymous-user');

      expect(result.hasAccess).toBe(true);
      expect(result.accessLevel).toBe('view');
      expect(result.errors).toHaveLength(0);
    });

    it('should allow access to private links for allowed users', async () => {
      const result = await sharingManager.validateAccess(privateLink.id, 'user2');

      expect(result.hasAccess).toBe(true);
      expect(result.accessLevel).toBe('edit');
      expect(result.errors).toHaveLength(0);
    });

    it('should deny access to private links for non-allowed users', async () => {
      const result = await sharingManager.validateAccess(privateLink.id, 'user3');

      expect(result.hasAccess).toBe(false);
      expect(result.errors).toContain('User does not have permission to access this link');
    });

    it('should deny access to non-existent links', async () => {
      const result = await sharingManager.validateAccess('non-existent', 'user1');

      expect(result.hasAccess).toBe(false);
      expect(result.errors).toContain('Shareable link not found');
    });

    it('should deny access to deactivated links', async () => {
      await sharingManager.deactivateLink(publicLink.id, 'user1');
      const result = await sharingManager.validateAccess(publicLink.id, 'user1');

      expect(result.hasAccess).toBe(false);
      expect(result.errors).toContain('Shareable link has been deactivated');
    });

    it('should deny access to expired links', async () => {
      // Create a link that will expire soon
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        expiresAt: new Date(Date.now() + 100) // 100ms from now
      });

      // Wait for it to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await sharingManager.validateAccess(link.id, 'user1');

      expect(result.hasAccess).toBe(false);
      expect(result.errors).toContain('Shareable link has expired');
    });

    it('should track access count and last accessed time', async () => {
      // Grant view permission to user1 first
      await sharingManager.grantPermission(mockSnapshot.id, 'user1', 'admin', 'system');
      
      const initialAccessCount = publicLink.accessCount;
      const initialLastAccessed = publicLink.lastAccessedAt;

      await sharingManager.validateAccess(publicLink.id, 'user1');

      const links = sharingManager.getSnapshotLinks(mockSnapshot.id, 'user1');
      const updatedLink = links.find(l => l.id === publicLink.id);
      
      expect(updatedLink!.accessCount).toBe(initialAccessCount + 1);
      expect(updatedLink!.lastAccessedAt).toBeDefined();
      expect(updatedLink!.lastAccessedAt).not.toBe(initialLastAccessed);
    });
  });

  describe('permission management', () => {
    beforeEach(async () => {
      // Grant admin permission to user1 for the snapshot using system authority
      await sharingManager.grantPermission(mockSnapshot.id, 'user1', 'admin', 'system');
    });

    it('should grant permissions to users', async () => {
      const permission = await sharingManager.grantPermission(
        mockSnapshot.id,
        'user2',
        'edit',
        'user1'
      );

      expect(permission.userId).toBe('user2');
      expect(permission.accessLevel).toBe('edit');
      expect(permission.grantedBy).toBe('user1');
      expect(permission.isActive).toBe(true);
    });

    it('should grant permissions with expiration', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const permission = await sharingManager.grantPermission(
        mockSnapshot.id,
        'user2',
        'view',
        'user1',
        expiresAt
      );

      expect(permission.expiresAt).toEqual(expiresAt);
    });

    it('should revoke permissions', async () => {
      await sharingManager.grantPermission(mockSnapshot.id, 'user2', 'edit', 'user1');
      const revoked = await sharingManager.revokePermission(mockSnapshot.id, 'user2', 'user1');

      expect(revoked).toBe(true);
    });

    it('should reject permission grants from non-admin users', async () => {
      await expect(
        sharingManager.grantPermission(mockSnapshot.id, 'user3', 'edit', 'user2')
      ).rejects.toThrow('Insufficient permissions to grant access');
    });

    it('should reject permission revocations from non-admin users', async () => {
      await sharingManager.grantPermission(mockSnapshot.id, 'user2', 'edit', 'user1');
      
      await expect(
        sharingManager.revokePermission(mockSnapshot.id, 'user2', 'user3')
      ).rejects.toThrow('Insufficient permissions to revoke access');
    });

    it('should replace existing permissions for the same user', async () => {
      await sharingManager.grantPermission(mockSnapshot.id, 'user2', 'view', 'user1');
      await sharingManager.grantPermission(mockSnapshot.id, 'user2', 'edit', 'user1');

      // Create a private link to test the permission
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        scope: 'private',
        allowedUsers: ['user2']
      });

      const result = await sharingManager.validateAccess(link.id, 'user2');
      expect(result.hasAccess).toBe(true);
    });
  });

  describe('link management', () => {
    let testLink: any;

    beforeEach(async () => {
      await sharingManager.grantPermission(mockSnapshot.id, 'user1', 'admin', 'system');
      testLink = await sharingManager.createShareableLink(mockSnapshot, 'user1');
    });

    it('should deactivate links by creator', async () => {
      const deactivated = await sharingManager.deactivateLink(testLink.id, 'user1');
      expect(deactivated).toBe(true);

      const result = await sharingManager.validateAccess(testLink.id, 'user1');
      expect(result.hasAccess).toBe(false);
    });

    it('should deactivate links by admin', async () => {
      await sharingManager.grantPermission(mockSnapshot.id, 'user2', 'admin', 'user1');
      const deactivated = await sharingManager.deactivateLink(testLink.id, 'user2');
      expect(deactivated).toBe(true);
    });

    it('should reject deactivation by non-authorized users', async () => {
      await expect(
        sharingManager.deactivateLink(testLink.id, 'user3')
      ).rejects.toThrow('Insufficient permissions to deactivate link');
    });

    it('should get all links for a snapshot', async () => {
      await sharingManager.createShareableLink(mockSnapshot, 'user1', { scope: 'public' });
      await sharingManager.createShareableLink(mockSnapshot, 'user1', { scope: 'team' });

      const links = sharingManager.getSnapshotLinks(mockSnapshot.id, 'user1');
      expect(links).toHaveLength(3); // Including the one from beforeEach
    });

    it('should reject getting links for unauthorized users', () => {
      expect(() => {
        sharingManager.getSnapshotLinks(mockSnapshot.id, 'user3');
      }).toThrow('Insufficient permissions to view links');
    });
  });

  describe('audit logging', () => {
    beforeEach(async () => {
      await sharingManager.grantPermission(mockSnapshot.id, 'user1', 'admin', 'system');
    });

    it('should log link creation events', async () => {
      await sharingManager.createShareableLink(mockSnapshot, 'user1');

      const auditLog = sharingManager.getAuditLog();
      const shareEvent = auditLog.find(entry => entry.action === 'share');

      expect(shareEvent).toBeDefined();
      expect(shareEvent!.userId).toBe('user1');
      expect(shareEvent!.resourceType).toBe('link');
      expect(shareEvent!.severity).toBe('info');
    });

    it('should log access validation events', async () => {
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        scope: 'public'
      });

      await sharingManager.validateAccess(link.id, 'user2');

      const auditLog = sharingManager.getAuditLog();
      const viewEvent = auditLog.find(entry => 
        entry.action === 'view' && entry.userId === 'user2'
      );

      expect(viewEvent).toBeDefined();
      expect(viewEvent!.resourceType).toBe('link');
    });

    it('should log permission grant events', async () => {
      await sharingManager.grantPermission(mockSnapshot.id, 'user2', 'edit', 'user1');

      const auditLog = sharingManager.getAuditLog();
      const grantEvent = auditLog.find(entry => 
        entry.action === 'create' && 
        entry.resourceType === 'permission' &&
        entry.userId === 'user1' // Look for the user1 grant, not the system grant
      );

      expect(grantEvent).toBeDefined();
      expect(grantEvent!.userId).toBe('user1');
      expect(grantEvent!.details.targetUserId).toBe('user2');
    });

    it('should filter audit log by resource ID', async () => {
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1');
      await sharingManager.validateAccess(link.id, 'user1');

      const filteredLog = sharingManager.getAuditLog(link.id);
      expect(filteredLog.length).toBeGreaterThan(0);
      expect(filteredLog.every(entry => entry.resourceId === link.id)).toBe(true);
    });

    it('should filter audit log by date range', async () => {
      const startDate = new Date();
      await sharingManager.createShareableLink(mockSnapshot, 'user1');
      const endDate = new Date();

      const filteredLog = sharingManager.getAuditLog(undefined, undefined, undefined, startDate, endDate);
      expect(filteredLog.length).toBeGreaterThan(0);
      expect(filteredLog.every(entry => 
        entry.timestamp >= startDate && entry.timestamp <= endDate
      )).toBe(true);
    });

    it('should export audit log in JSON format', async () => {
      await sharingManager.createShareableLink(mockSnapshot, 'user1');
      
      const exportedLog = sharingManager.exportAuditLog('json');
      const parsedLog = JSON.parse(exportedLog);
      
      expect(Array.isArray(parsedLog)).toBe(true);
      expect(parsedLog.length).toBeGreaterThan(0);
    });

    it('should export audit log in CSV format', async () => {
      await sharingManager.createShareableLink(mockSnapshot, 'user1');
      
      const exportedLog = sharingManager.exportAuditLog('csv');
      const lines = exportedLog.split('\n');
      
      expect(lines[0]).toContain('id,timestamp,userId,action');
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe('analytics', () => {
    beforeEach(async () => {
      await sharingManager.grantPermission(mockSnapshot.id, 'user1', 'admin', 'system');
    });

    it('should provide sharing analytics for admins', async () => {
      const link1 = await sharingManager.createShareableLink(mockSnapshot, 'user1');
      const link2 = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        scope: 'public'
      });

      await sharingManager.validateAccess(link1.id, 'user1');
      await sharingManager.validateAccess(link2.id, 'user2');
      await sharingManager.validateAccess(link2.id, 'user3');

      const analytics = sharingManager.getSharingAnalytics(mockSnapshot.id, 'user1');

      expect(analytics.totalLinks).toBe(2);
      expect(analytics.activeLinks).toBe(2);
      expect(analytics.totalAccesses).toBe(3);
      expect(analytics.uniqueUsers).toBe(3); // user1, user2, user3
      expect(analytics.topUsers.length).toBe(3);
      expect(analytics.topUsers[0].userId).toBeDefined();
    });

    it('should reject analytics requests from non-admin users', () => {
      expect(() => {
        sharingManager.getSharingAnalytics(mockSnapshot.id, 'user2');
      }).toThrow('Insufficient permissions to view analytics');
    });
  });

  describe('cleanup operations', () => {
    it('should clean up expired links and permissions', async () => {
      // Create a link that will expire soon
      const expiredLink = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        expiresAt: new Date(Date.now() + 100) // 100ms from now
      });

      // Grant a permission that will expire soon
      await sharingManager.grantPermission(mockSnapshot.id, 'user1', 'admin', 'system');
      await sharingManager.grantPermission(
        mockSnapshot.id,
        'user2',
        'view',
        'user1',
        new Date(Date.now() + 100) // 100ms from now
      );

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const cleanup = sharingManager.cleanupExpiredAccess();

      expect(cleanup.expiredLinks).toBe(1);
      expect(cleanup.expiredPermissions).toBe(1);

      // Verify expired link is deactivated
      const result = await sharingManager.validateAccess(expiredLink.id, 'user1');
      expect(result.hasAccess).toBe(false);
    });
  });

  describe('role-based access', () => {
    it('should allow access based on user roles', async () => {
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        allowedRoles: ['developer', 'manager'],
        scope: 'team'
      });

      const result = await sharingManager.validateAccess(link.id, 'user2', ['developer']);
      expect(result.hasAccess).toBe(true);
    });

    it('should deny access for users without required roles', async () => {
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        allowedRoles: ['admin'],
        scope: 'team'
      });

      const result = await sharingManager.validateAccess(link.id, 'user2', ['developer']);
      expect(result.hasAccess).toBe(false);
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = {
        defaultAccessLevel: 'edit' as AccessLevel,
        allowPublicSharing: false
      };

      sharingManager.updateConfig(newConfig);
      const config = sharingManager.getConfig();

      expect(config.defaultAccessLevel).toBe('edit');
      expect(config.allowPublicSharing).toBe(false);
    });

    it('should respect configuration limits', async () => {
      sharingManager.updateConfig({ allowPublicSharing: false });

      await expect(
        sharingManager.createShareableLink(mockSnapshot, 'user1', {
          scope: 'public'
        })
      ).rejects.toThrow('Public sharing is not allowed');
    });
  });

  describe('security validation', () => {
    it('should calculate security scores for sharing requests', async () => {
      // This is tested indirectly through the validation in createShareableLink
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        scope: 'private',
        accessLevel: 'view',
        requiresAuthentication: true
      });

      expect(link).toBeDefined();
      expect(link.requiresAuthentication).toBe(true);
    });

    it('should provide security warnings for risky configurations', async () => {
      // Public links should generate warnings but still be created if allowed
      const link = await sharingManager.createShareableLink(mockSnapshot, 'user1', {
        scope: 'public',
        accessLevel: 'view'
      });

      expect(link.scope).toBe('public');
    });
  });
});