import { 
  ComparisonSnapshot, 
  OptionSnapshot, 
  Option, 
  Constraint, 
  ComparisonResult 
} from '../../types/core';
import { FormattedComparisonResult } from '../comparison-engine/result-formatter';

export interface SnapshotConfig {
  includeRawData: boolean;
  includeAnalysisMetadata: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface SnapshotValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  integrityScore: number; // 0-1
}

export interface SnapshotMetrics {
  totalSize: number;
  compressionRatio?: number;
  creationTime: number; // milliseconds
  optionCount: number;
  constraintCount: number;
  dataPoints: number;
}

/**
 * Manages immutable comparison snapshots with data integrity verification
 * Provides historical fidelity preservation for past comparisons
 */
export class SnapshotManager {
  private config: SnapshotConfig;
  private snapshots: Map<string, ComparisonSnapshot>;

  constructor(config?: Partial<SnapshotConfig>) {
    this.config = {
      includeRawData: true,
      includeAnalysisMetadata: true,
      compressionEnabled: false,
      encryptionEnabled: false,
      ...config
    };
    this.snapshots = new Map();
  }

  /**
   * Creates an immutable snapshot of a comparison result
   */
  async createSnapshot(
    name: string,
    createdBy: string,
    options: Option[],
    constraints: Constraint[],
    results: ComparisonResult,
    formattedResults?: FormattedComparisonResult
  ): Promise<ComparisonSnapshot> {
    const startTime = Date.now();
    
    // Create frozen option snapshots to preserve data at point in time
    const optionSnapshots = this.createOptionSnapshots(options);
    
    // Create frozen constraints copy
    const frozenConstraints = this.deepFreeze(this.deepClone(constraints));
    
    // Create frozen results copy
    const frozenResults = this.deepFreeze(this.deepClone(results));
    
    // Generate data integrity hash
    const dataIntegrityHash = this.calculateDataIntegrityHash({
      options: optionSnapshots,
      constraints: frozenConstraints,
      results: frozenResults
    });

    // Create snapshot with immutable data
    const snapshot: ComparisonSnapshot = this.deepFreeze({
      id: this.generateSnapshotId(),
      name,
      createdAt: new Date(),
      createdBy,
      optionSnapshots,
      constraints: frozenConstraints,
      results: frozenResults,
      metadata: {
        version: '1.0.0',
        algorithmVersion: results.confidence ? '1.0.0' : 'unknown',
        dataIntegrityHash,
        metrics: {
          totalSize: this.calculateSnapshotSize(optionSnapshots, frozenConstraints, frozenResults),
          creationTime: Date.now() - startTime,
          optionCount: options.length,
          constraintCount: constraints.length,
          dataPoints: options.length * constraints.length
        },
        formattedResults: this.config.includeAnalysisMetadata ? formattedResults : undefined
      }
    });

    // Store snapshot
    this.snapshots.set(snapshot.id, snapshot);

    return snapshot;
  }

  /**
   * Retrieves a snapshot by ID
   */
  getSnapshot(id: string): ComparisonSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Lists all available snapshots
   */
  listSnapshots(): ComparisonSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Validates snapshot integrity
   */
  validateSnapshot(snapshot: ComparisonSnapshot): SnapshotValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let integrityScore = 1.0;

    try {
      // Verify immutability
      if (!this.verifyImmutability(snapshot)) {
        errors.push('Snapshot data has been modified');
        integrityScore -= 0.5;
      }

      // Verify data integrity hash
      const expectedHash = this.calculateDataIntegrityHash({
        options: snapshot.optionSnapshots,
        constraints: snapshot.constraints,
        results: snapshot.results
      });

      if (expectedHash !== snapshot.metadata.dataIntegrityHash) {
        errors.push('Data integrity hash mismatch');
        integrityScore -= 0.3;
      }

      // Verify option snapshots
      const optionValidation = this.validateOptionSnapshots(snapshot.optionSnapshots);
      if (!optionValidation.isValid) {
        errors.push(...optionValidation.errors);
        warnings.push(...optionValidation.warnings);
        integrityScore -= 0.1;
      }

      // Verify constraints
      if (!this.validateConstraints(snapshot.constraints)) {
        errors.push('Invalid constraint data detected');
        integrityScore -= 0.1;
      }

      // Check for data consistency
      const consistencyIssues = this.checkDataConsistency(snapshot);
      if (consistencyIssues.length > 0) {
        warnings.push(...consistencyIssues);
        integrityScore -= 0.05 * consistencyIssues.length;
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      integrityScore = 0;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      integrityScore: Math.max(0, integrityScore)
    };
  }

  /**
   * Compares two snapshots for differences
   */
  compareSnapshots(
    snapshot1: ComparisonSnapshot, 
    snapshot2: ComparisonSnapshot
  ): {
    optionChanges: Array<{
      optionId: string;
      changeType: 'added' | 'removed' | 'modified';
      details?: string;
    }>;
    constraintChanges: Array<{
      constraintId: string;
      changeType: 'added' | 'removed' | 'modified';
      details?: string;
    }>;
    resultChanges: {
      rankingChanged: boolean;
      confidenceChanged: boolean;
      details: string[];
    };
  } {
    const optionChanges = this.compareOptions(snapshot1.optionSnapshots, snapshot2.optionSnapshots);
    const constraintChanges = this.compareConstraints(snapshot1.constraints, snapshot2.constraints);
    const resultChanges = this.compareResults(snapshot1.results, snapshot2.results);

    return {
      optionChanges,
      constraintChanges,
      resultChanges
    };
  }

  /**
   * Exports snapshot to portable format
   */
  exportSnapshot(snapshot: ComparisonSnapshot): {
    data: string;
    checksum: string;
    format: 'json';
  } {
    const exportData = {
      snapshot,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exporterVersion: '1.0.0',
        format: 'json'
      }
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    const checksum = this.calculateChecksum(jsonData);

    return {
      data: jsonData,
      checksum,
      format: 'json'
    };
  }

  /**
   * Imports snapshot from portable format
   */
  importSnapshot(data: string, expectedChecksum: string): ComparisonSnapshot {
    // Verify checksum
    const actualChecksum = this.calculateChecksum(data);
    if (actualChecksum !== expectedChecksum) {
      throw new Error('Snapshot import failed: checksum mismatch');
    }

    try {
      const importData = JSON.parse(data);
      const snapshot = importData.snapshot as ComparisonSnapshot;

      // Re-freeze to ensure immutability before validation
      const frozenSnapshot = this.deepFreeze(this.deepClone(snapshot));
      
      // Validate imported snapshot after freezing
      const validation = this.validateSnapshot(frozenSnapshot);
      if (!validation.isValid) {
        throw new Error(`Invalid snapshot: ${validation.errors.join(', ')}`);
      }

      // Store imported snapshot
      this.snapshots.set(frozenSnapshot.id, frozenSnapshot);

      return frozenSnapshot;
    } catch (error) {
      throw new Error(`Snapshot import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a snapshot
   */
  deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }

  /**
   * Gets snapshot metrics
   */
  getSnapshotMetrics(snapshot: ComparisonSnapshot): SnapshotMetrics {
    return {
      totalSize: snapshot.metadata.metrics?.totalSize || this.calculateSnapshotSize(
        snapshot.optionSnapshots,
        snapshot.constraints,
        snapshot.results
      ),
      creationTime: snapshot.metadata.metrics?.creationTime || 0,
      optionCount: snapshot.optionSnapshots.length,
      constraintCount: snapshot.constraints.length,
      dataPoints: snapshot.optionSnapshots.length * snapshot.constraints.length
    };
  }

  // Private helper methods

  /**
   * Creates immutable option snapshots
   */
  private createOptionSnapshots(options: Option[]): OptionSnapshot[] {
    return options.map(option => this.deepFreeze({
      originalOptionId: option.id,
      snapshotData: this.deepClone(option),
      dataVersion: new Date()
    }));
  }

  /**
   * Deep clones an object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Deep freezes an object to make it immutable
   */
  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Freeze the object itself
    Object.freeze(obj);

    // Recursively freeze all properties
    Object.getOwnPropertyNames(obj).forEach(prop => {
      const value = (obj as any)[prop];
      if (value !== null && typeof value === 'object') {
        this.deepFreeze(value);
      }
    });

    return obj;
  }

  /**
   * Verifies that an object is truly immutable
   */
  private verifyImmutability(obj: any): boolean {
    try {
      if (typeof obj !== 'object' || obj === null) {
        return true;
      }

      // Check if object is frozen
      if (!Object.isFrozen(obj)) {
        return false;
      }

      // Recursively check all properties
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (typeof value === 'object' && value !== null) {
            if (!this.verifyImmutability(value)) {
              return false;
            }
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculates data integrity hash
   */
  private calculateDataIntegrityHash(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return this.calculateChecksum(dataString);
  }

  /**
   * Calculates checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Generates unique snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Calculates approximate snapshot size
   */
  private calculateSnapshotSize(
    optionSnapshots: OptionSnapshot[],
    constraints: Constraint[],
    results: ComparisonResult
  ): number {
    const dataString = JSON.stringify({ optionSnapshots, constraints, results });
    return Buffer.byteLength(dataString, 'utf8');
  }

  /**
   * Validates option snapshots
   */
  private validateOptionSnapshots(snapshots: OptionSnapshot[]): SnapshotValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    snapshots.forEach((snapshot, index) => {
      if (!snapshot.originalOptionId) {
        errors.push(`Option snapshot ${index} missing originalOptionId`);
      }
      if (!snapshot.snapshotData) {
        errors.push(`Option snapshot ${index} missing snapshotData`);
      }
      if (!snapshot.dataVersion) {
        warnings.push(`Option snapshot ${index} missing dataVersion`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      integrityScore: errors.length === 0 ? 1.0 : 0.5
    };
  }

  /**
   * Validates constraints
   */
  private validateConstraints(constraints: Constraint[]): boolean {
    return constraints.every(constraint => 
      constraint.id && 
      constraint.name && 
      typeof constraint.weight === 'number' &&
      constraint.weight >= 0 &&
      constraint.weight <= 1
    );
  }

  /**
   * Checks data consistency
   */
  private checkDataConsistency(snapshot: ComparisonSnapshot): string[] {
    const issues: string[] = [];

    // Check if option count matches between snapshots and results
    const optionCount = snapshot.optionSnapshots.length;
    const matrixOptionCount = snapshot.results.matrix?.options?.length || 0;
    
    if (optionCount !== matrixOptionCount) {
      issues.push(`Option count mismatch: snapshots(${optionCount}) vs matrix(${matrixOptionCount})`);
    }

    // Check constraint count consistency
    const constraintCount = snapshot.constraints.length;
    const matrixCriteriaCount = snapshot.results.matrix?.criteria?.length || 0;
    
    if (constraintCount !== matrixCriteriaCount) {
      issues.push(`Constraint count mismatch: constraints(${constraintCount}) vs criteria(${matrixCriteriaCount})`);
    }

    return issues;
  }

  /**
   * Compares options between snapshots
   */
  private compareOptions(
    options1: OptionSnapshot[],
    options2: OptionSnapshot[]
  ): Array<{ optionId: string; changeType: 'added' | 'removed' | 'modified'; details?: string }> {
    const changes: Array<{ optionId: string; changeType: 'added' | 'removed' | 'modified'; details?: string }> = [];
    
    const ids1 = new Set(options1.map(o => o.originalOptionId));
    const ids2 = new Set(options2.map(o => o.originalOptionId));

    // Find added options
    ids2.forEach(id => {
      if (!ids1.has(id)) {
        changes.push({ optionId: id, changeType: 'added' });
      }
    });

    // Find removed options
    ids1.forEach(id => {
      if (!ids2.has(id)) {
        changes.push({ optionId: id, changeType: 'removed' });
      }
    });

    // Find modified options
    options1.forEach(opt1 => {
      const opt2 = options2.find(o => o.originalOptionId === opt1.originalOptionId);
      if (opt2) {
        const hash1 = this.calculateChecksum(JSON.stringify(opt1.snapshotData));
        const hash2 = this.calculateChecksum(JSON.stringify(opt2.snapshotData));
        if (hash1 !== hash2) {
          changes.push({ 
            optionId: opt1.originalOptionId, 
            changeType: 'modified',
            details: 'Option data changed'
          });
        }
      }
    });

    return changes;
  }

  /**
   * Compares constraints between snapshots
   */
  private compareConstraints(
    constraints1: Constraint[],
    constraints2: Constraint[]
  ): Array<{ constraintId: string; changeType: 'added' | 'removed' | 'modified'; details?: string }> {
    const changes: Array<{ constraintId: string; changeType: 'added' | 'removed' | 'modified'; details?: string }> = [];
    
    const ids1 = new Set(constraints1.map(c => c.id));
    const ids2 = new Set(constraints2.map(c => c.id));

    // Find added constraints
    ids2.forEach(id => {
      if (!ids1.has(id)) {
        changes.push({ constraintId: id, changeType: 'added' });
      }
    });

    // Find removed constraints
    ids1.forEach(id => {
      if (!ids2.has(id)) {
        changes.push({ constraintId: id, changeType: 'removed' });
      }
    });

    // Find modified constraints
    constraints1.forEach(c1 => {
      const c2 = constraints2.find(c => c.id === c1.id);
      if (c2) {
        if (c1.weight !== c2.weight || c1.name !== c2.name) {
          changes.push({ 
            constraintId: c1.id, 
            changeType: 'modified',
            details: 'Constraint properties changed'
          });
        }
      }
    });

    return changes;
  }

  /**
   * Compares results between snapshots
   */
  private compareResults(
    results1: ComparisonResult,
    results2: ComparisonResult
  ): { rankingChanged: boolean; confidenceChanged: boolean; details: string[] } {
    const details: string[] = [];
    
    // Compare rankings
    const rankings1 = results1.matrix?.rankings || [];
    const rankings2 = results2.matrix?.rankings || [];
    
    let rankingChanged = false;
    if (rankings1.length !== rankings2.length) {
      rankingChanged = true;
      details.push('Number of ranked options changed');
    } else {
      for (let i = 0; i < rankings1.length; i++) {
        if (rankings1[i].optionId !== rankings2[i].optionId || 
            rankings1[i].rank !== rankings2[i].rank) {
          rankingChanged = true;
          details.push('Option rankings changed');
          break;
        }
      }
    }

    // Compare confidence
    const confidence1 = results1.confidence?.overall || 0;
    const confidence2 = results2.confidence?.overall || 0;
    const confidenceChanged = Math.abs(confidence1 - confidence2) > 0.01;
    
    if (confidenceChanged) {
      details.push(`Overall confidence changed from ${confidence1.toFixed(3)} to ${confidence2.toFixed(3)}`);
    }

    return {
      rankingChanged,
      confidenceChanged,
      details
    };
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<SnapshotConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current configuration
   */
  getConfig(): SnapshotConfig {
    return { ...this.config };
  }
}