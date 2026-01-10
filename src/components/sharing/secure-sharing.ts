import { ComparisonSnapshot } from '../../types/core';

export type AccessLevel = 'view' | 'comment' | 'edit' | 'admin';
export type ShareScope = 'private' | 'team' | 'organization' | 'public';

export interface ShareableLink {
  id: string;
  snapshotId: string;
  url: string;
  accessLevel: AccessLevel;
  scope: ShareScope;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  accessCount: number;
  lastAccessedAt?: Date;
  allowedUsers?: string[]; // Specific user IDs for private sharing
  allowedRoles?: string[]; // Role-based access
  requiresAuthentication: boolean;
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

export interface AccessPermission {
  userId: string;
  accessLevel: AccessLevel;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: 'create' | 'view' | 'edit' | 'share' | 'revoke' | 'export' | 'delete';
  resourceType: 'snapshot' | 'link' | 'permission';
  resourceId: string;
  details: {
    userAgent?: string;
    ipAddress?: string;
    previousValue?: any;
    newValue?: any;
    targetUserId?: string; // For permission-related actions
    snapshotId?: string;
    accessLevel?: AccessLevel;
    scope?: ShareScope;
    metadata?: Record<string, any>;
  };
  severity: 'info' | 'warning' | 'error';
}

export interface ShareConfig {
  defaultAccessLevel: AccessLevel;
  defaultScope: ShareScope;
  maxLinkDuration: number; // milliseconds
  requireAuthenticationByDefault: boolean;
  enableAuditLogging: boolean;
  allowPublicSharing: boolean;
  maxAccessCount?: number;
}

export interface ShareValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityScore: number; // 0-1
}

/**
 * Manages secure sharing of comparison snapshots with access controls and audit trails
 * Implements role-based permissions and comprehensive security logging
 */
export class SecureSharingManager {
  private config: ShareConfig;
  private shareableLinks: Map<string, ShareableLink>;
  private permissions: Map<string, AccessPermission[]>; // snapshotId -> permissions
  private auditLog: AuditLogEntry[];
  private activeUsers: Map<string, { lastSeen: Date; permissions: AccessLevel[] }>;

  constructor(config?: Partial<ShareConfig>) {
    this.config = {
      defaultAccessLevel: 'view',
      defaultScope: 'private',
      maxLinkDuration: 30 * 24 * 60 * 60 * 1000, // 30 days
      requireAuthenticationByDefault: true,
      enableAuditLogging: true,
      allowPublicSharing: false,
      ...config
    };
    
    this.shareableLinks = new Map();
    this.permissions = new Map();
    this.auditLog = [];
    this.activeUsers = new Map();
  }

  /**
   * Creates a secure shareable link for a snapshot
   */
  async createShareableLink(
    snapshot: ComparisonSnapshot,
    createdBy: string,
    options: {
      accessLevel?: AccessLevel;
      scope?: ShareScope;
      expiresAt?: Date;
      allowedUsers?: string[];
      allowedRoles?: string[];
      requiresAuthentication?: boolean;
      title?: string;
      description?: string;
      tags?: string[];
    } = {}
  ): Promise<ShareableLink> {
    // Validate sharing permissions
    const validation = this.validateSharingRequest(snapshot, createdBy, options);
    if (!validation.isValid) {
      throw new Error(`Sharing validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate secure link
    const linkId = this.generateSecureLinkId();
    const url = this.generateShareableUrl(linkId, options.accessLevel || this.config.defaultAccessLevel);

    // Set expiration
    const expiresAt = options.expiresAt || new Date(Date.now() + this.config.maxLinkDuration);

    const shareableLink: ShareableLink = {
      id: linkId,
      snapshotId: snapshot.id,
      url,
      accessLevel: options.accessLevel || this.config.defaultAccessLevel,
      scope: options.scope || this.config.defaultScope,
      createdBy,
      createdAt: new Date(),
      expiresAt,
      isActive: true,
      accessCount: 0,
      allowedUsers: options.allowedUsers,
      allowedRoles: options.allowedRoles,
      requiresAuthentication: options.requiresAuthentication ?? this.config.requireAuthenticationByDefault,
      metadata: {
        title: options.title,
        description: options.description,
        tags: options.tags
      }
    };

    // Store link
    this.shareableLinks.set(linkId, shareableLink);

    // Log audit event
    this.logAuditEvent({
      userId: createdBy,
      action: 'share',
      resourceType: 'link',
      resourceId: linkId,
      details: {
        snapshotId: snapshot.id,
        accessLevel: shareableLink.accessLevel,
        scope: shareableLink.scope,
        metadata: { linkCreated: true }
      },
      severity: 'info'
    });

    return shareableLink;
  }

  /**
   * Validates access to a shareable link
   */
  async validateAccess(
    linkId: string,
    userId: string,
    userRoles: string[] = [],
    context: {
      userAgent?: string;
      ipAddress?: string;
    } = {}
  ): Promise<{
    hasAccess: boolean;
    accessLevel?: AccessLevel;
    snapshot?: ComparisonSnapshot;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get shareable link
    const link = this.shareableLinks.get(linkId);
    if (!link) {
      errors.push('Shareable link not found');
      return { hasAccess: false, errors, warnings };
    }

    // Check if link is active
    if (!link.isActive) {
      errors.push('Shareable link has been deactivated');
      return { hasAccess: false, errors, warnings };
    }

    // Check expiration
    if (link.expiresAt && new Date() > link.expiresAt) {
      errors.push('Shareable link has expired');
      return { hasAccess: false, errors, warnings };
    }

    // Check access count limits
    if (this.config.maxAccessCount && link.accessCount >= this.config.maxAccessCount) {
      errors.push('Shareable link has reached maximum access count');
      return { hasAccess: false, errors, warnings };
    }

    // Validate user permissions
    const hasPermission = this.checkUserPermissions(link, userId, userRoles);
    if (!hasPermission) {
      errors.push('User does not have permission to access this link');
      return { hasAccess: false, errors, warnings };
    }

    // Update access tracking
    this.updateAccessTracking(link, userId, context);

    // Log access event
    this.logAuditEvent({
      userId,
      action: 'view',
      resourceType: 'link',
      resourceId: linkId,
      details: {
        snapshotId: link.snapshotId,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        metadata: { accessGranted: true }
      },
      severity: 'info'
    });

    return {
      hasAccess: true,
      accessLevel: link.accessLevel,
      errors,
      warnings
    };
  }

  /**
   * Grants specific permissions to a user for a snapshot
   */
  async grantPermission(
    snapshotId: string,
    userId: string,
    accessLevel: AccessLevel,
    grantedBy: string,
    expiresAt?: Date
  ): Promise<AccessPermission> {
    // Validate granter has admin permissions
    if (!this.hasAdminAccess(snapshotId, grantedBy)) {
      throw new Error('Insufficient permissions to grant access');
    }

    const permission: AccessPermission = {
      userId,
      accessLevel,
      grantedBy,
      grantedAt: new Date(),
      expiresAt,
      isActive: true
    };

    // Store permission
    const existingPermissions = this.permissions.get(snapshotId) || [];
    
    // Remove any existing permissions for this user
    const filteredPermissions = existingPermissions.filter(p => p.userId !== userId);
    filteredPermissions.push(permission);
    
    this.permissions.set(snapshotId, filteredPermissions);

    // Log audit event
    this.logAuditEvent({
      userId: grantedBy,
      action: 'create',
      resourceType: 'permission',
      resourceId: `${snapshotId}:${userId}`,
      details: {
        targetUserId: userId,
        accessLevel,
        metadata: { permissionGranted: true }
      },
      severity: 'info'
    });

    return permission;
  }

  /**
   * Revokes permissions for a user
   */
  async revokePermission(
    snapshotId: string,
    userId: string,
    revokedBy: string
  ): Promise<boolean> {
    // Validate revoker has admin permissions
    if (!this.hasAdminAccess(snapshotId, revokedBy)) {
      throw new Error('Insufficient permissions to revoke access');
    }

    const permissions = this.permissions.get(snapshotId) || [];
    const updatedPermissions = permissions.filter(p => p.userId !== userId);
    
    const wasRevoked = permissions.length !== updatedPermissions.length;
    
    if (wasRevoked) {
      this.permissions.set(snapshotId, updatedPermissions);

      // Log audit event
      this.logAuditEvent({
        userId: revokedBy,
        action: 'revoke',
        resourceType: 'permission',
        resourceId: `${snapshotId}:${userId}`,
        details: {
          targetUserId: userId,
          metadata: { permissionRevoked: true }
        },
        severity: 'info'
      });
    }

    return wasRevoked;
  }

  /**
   * Deactivates a shareable link
   */
  async deactivateLink(linkId: string, deactivatedBy: string): Promise<boolean> {
    const link = this.shareableLinks.get(linkId);
    if (!link) {
      return false;
    }

    // Validate permissions
    if (link.createdBy !== deactivatedBy && !this.hasAdminAccess(link.snapshotId, deactivatedBy)) {
      throw new Error('Insufficient permissions to deactivate link');
    }

    link.isActive = false;

    // Log audit event
    this.logAuditEvent({
      userId: deactivatedBy,
      action: 'revoke',
      resourceType: 'link',
      resourceId: linkId,
      details: {
        snapshotId: link.snapshotId,
        metadata: { linkDeactivated: true }
      },
      severity: 'info'
    });

    return true;
  }

  /**
   * Gets all shareable links for a snapshot
   */
  getSnapshotLinks(snapshotId: string, requestedBy: string): ShareableLink[] {
    // Validate permissions
    if (!this.hasViewAccess(snapshotId, requestedBy)) {
      throw new Error('Insufficient permissions to view links');
    }

    return Array.from(this.shareableLinks.values())
      .filter(link => link.snapshotId === snapshotId);
  }

  /**
   * Gets audit log entries for a resource
   */
  getAuditLog(
    resourceId?: string,
    resourceType?: 'snapshot' | 'link' | 'permission',
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): AuditLogEntry[] {
    let filteredLog = [...this.auditLog];

    if (resourceId) {
      filteredLog = filteredLog.filter(entry => entry.resourceId === resourceId);
    }

    if (resourceType) {
      filteredLog = filteredLog.filter(entry => entry.resourceType === resourceType);
    }

    if (userId) {
      filteredLog = filteredLog.filter(entry => entry.userId === userId);
    }

    if (startDate) {
      filteredLog = filteredLog.filter(entry => entry.timestamp >= startDate);
    }

    if (endDate) {
      filteredLog = filteredLog.filter(entry => entry.timestamp <= endDate);
    }

    return filteredLog.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Gets sharing analytics for a snapshot
   */
  getSharingAnalytics(snapshotId: string, requestedBy: string): {
    totalLinks: number;
    activeLinks: number;
    totalAccesses: number;
    uniqueUsers: number;
    accessesByDay: Record<string, number>;
    topUsers: Array<{ userId: string; accessCount: number }>;
    securityEvents: number;
  } {
    // Validate permissions
    if (!this.hasAdminAccess(snapshotId, requestedBy)) {
      throw new Error('Insufficient permissions to view analytics');
    }

    const links = Array.from(this.shareableLinks.values())
      .filter(link => link.snapshotId === snapshotId);

    // Get all audit entries related to this snapshot (including link access)
    const linkIds = links.map(link => link.id);
    const auditEntries = this.auditLog.filter(entry => 
      entry.resourceId === snapshotId || 
      linkIds.includes(entry.resourceId) ||
      (entry.details.snapshotId === snapshotId)
    );
    
    const accessesByDay: Record<string, number> = {};
    const userAccesses: Record<string, number> = {};
    let securityEvents = 0;

    auditEntries.forEach(entry => {
      const day = entry.timestamp.toISOString().split('T')[0];
      accessesByDay[day] = (accessesByDay[day] || 0) + 1;

      if (entry.action === 'view') {
        userAccesses[entry.userId] = (userAccesses[entry.userId] || 0) + 1;
      }

      if (entry.severity === 'warning' || entry.severity === 'error') {
        securityEvents++;
      }
    });

    const topUsers = Object.entries(userAccesses)
      .map(([userId, count]) => ({ userId, accessCount: count }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      totalLinks: links.length,
      activeLinks: links.filter(link => link.isActive).length,
      totalAccesses: links.reduce((sum, link) => sum + link.accessCount, 0),
      uniqueUsers: Object.keys(userAccesses).length,
      accessesByDay,
      topUsers,
      securityEvents
    };
  }

  // Private helper methods

  /**
   * Validates sharing request
   */
  private validateSharingRequest(
    snapshot: ComparisonSnapshot,
    createdBy: string,
    options: any
  ): ShareValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let securityScore = 1.0;

    // Check if public sharing is allowed
    if (options.scope === 'public' && !this.config.allowPublicSharing) {
      errors.push('Public sharing is not allowed');
      securityScore -= 0.5;
    }

    // Validate access level
    if (options.accessLevel === 'admin' && options.scope === 'public') {
      errors.push('Admin access cannot be granted for public links');
      securityScore -= 0.3;
    }

    // Check expiration
    if (options.expiresAt && options.expiresAt <= new Date()) {
      errors.push('Expiration date must be in the future');
    }

    // Security warnings
    if (options.scope === 'public') {
      warnings.push('Public links can be accessed by anyone with the URL');
      securityScore -= 0.1;
    }

    if (!options.requiresAuthentication && options.accessLevel !== 'view') {
      warnings.push('Non-authenticated links with edit access pose security risks');
      securityScore -= 0.2;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      securityScore: Math.max(0, securityScore)
    };
  }

  /**
   * Checks user permissions for a link
   */
  private checkUserPermissions(
    link: ShareableLink,
    userId: string,
    userRoles: string[]
  ): boolean {
    // Public links
    if (link.scope === 'public') {
      return true;
    }

    // Check specific user allowlist
    if (link.allowedUsers && link.allowedUsers.includes(userId)) {
      return true;
    }

    // Check role-based access
    if (link.allowedRoles && userRoles.some(role => link.allowedRoles!.includes(role))) {
      return true;
    }

    // Check direct permissions
    const permissions = this.permissions.get(link.snapshotId) || [];
    const userPermission = permissions.find(p => 
      p.userId === userId && 
      p.isActive && 
      (!p.expiresAt || p.expiresAt > new Date())
    );

    return !!userPermission;
  }

  /**
   * Updates access tracking
   */
  private updateAccessTracking(
    link: ShareableLink,
    userId: string,
    context: { userAgent?: string; ipAddress?: string }
  ): void {
    link.accessCount++;
    link.lastAccessedAt = new Date();

    // Update active users
    this.activeUsers.set(userId, {
      lastSeen: new Date(),
      permissions: [link.accessLevel]
    });
  }

  /**
   * Checks if user has admin access
   */
  private hasAdminAccess(snapshotId: string, userId: string): boolean {
    // Allow system user to grant initial permissions
    if (userId === 'system') {
      return true;
    }
    
    const permissions = this.permissions.get(snapshotId) || [];
    return permissions.some(p => 
      p.userId === userId && 
      p.accessLevel === 'admin' && 
      p.isActive &&
      (!p.expiresAt || p.expiresAt > new Date())
    );
  }

  /**
   * Checks if user has view access
   */
  private hasViewAccess(snapshotId: string, userId: string): boolean {
    // Allow system user to view
    if (userId === 'system') {
      return true;
    }
    
    const permissions = this.permissions.get(snapshotId) || [];
    return permissions.some(p => 
      p.userId === userId && 
      p.isActive &&
      (!p.expiresAt || p.expiresAt > new Date())
    );
  }

  /**
   * Logs audit event
   */
  private logAuditEvent(event: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const auditEntry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      ...event
    };

    this.auditLog.push(auditEntry);

    // Keep audit log size manageable (keep last 10000 entries)
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }

  /**
   * Generates secure link ID
   */
  private generateSecureLinkId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const checksum = Math.random().toString(36).substring(2, 8);
    return `sl_${timestamp}_${random}_${checksum}`;
  }

  /**
   * Generates shareable URL
   */
  private generateShareableUrl(linkId: string, accessLevel: AccessLevel): string {
    // In a real implementation, this would use the actual domain
    const baseUrl = 'https://app.comparison-tool.com';
    return `${baseUrl}/shared/${linkId}?access=${accessLevel}`;
  }

  /**
   * Generates audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<ShareConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current configuration
   */
  getConfig(): ShareConfig {
    return { ...this.config };
  }

  /**
   * Exports audit log for compliance
   */
  exportAuditLog(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['id', 'timestamp', 'userId', 'action', 'resourceType', 'resourceId', 'severity'];
      const rows = this.auditLog.map(entry => [
        entry.id,
        entry.timestamp.toISOString(),
        entry.userId,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        entry.severity
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.auditLog, null, 2);
  }

  /**
   * Cleans up expired links and permissions
   */
  cleanupExpiredAccess(): {
    expiredLinks: number;
    expiredPermissions: number;
  } {
    const now = new Date();
    let expiredLinks = 0;
    let expiredPermissions = 0;

    // Cleanup expired links
    for (const [linkId, link] of this.shareableLinks.entries()) {
      if (link.expiresAt && link.expiresAt <= now) {
        link.isActive = false;
        expiredLinks++;
      }
    }

    // Cleanup expired permissions
    for (const [snapshotId, permissions] of this.permissions.entries()) {
      const activePermissions = permissions.filter(p => {
        if (p.expiresAt && p.expiresAt <= now) {
          p.isActive = false;
          expiredPermissions++;
          return false;
        }
        return true;
      });
      
      this.permissions.set(snapshotId, activePermissions);
    }

    return { expiredLinks, expiredPermissions };
  }
}