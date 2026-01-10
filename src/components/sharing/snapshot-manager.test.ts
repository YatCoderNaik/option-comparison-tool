import { SnapshotManager } from './snapshot-manager';
import { Option, Constraint, ComparisonResult, ComparisonSnapshot } from '../../types/core';

describe('SnapshotManager', () => {
  let snapshotManager: SnapshotManager;
  let mockOptions: Option[];
  let mockConstraints: Constraint[];
  let mockResults: ComparisonResult;

  beforeEach(() => {
    snapshotManager = new SnapshotManager();

    mockOptions = [
      {
        id: 'opt1',
        name: 'Option 1',
        description: 'First option',
        category: 'api',
        attributes: {
          cost: { value: 100, confidence: 0.9 },
          performance: { value: 85, confidence: 0.8 }
        },
        metadata: {
          dateAdded: new Date('2024-01-01'),
          lastUpdated: new Date('2024-01-01'),
          dataQuality: { completeness: 0.9, freshness: 0.8, reliability: 0.85 },
          entryMethod: 'manual'
        }
      },
      {
        id: 'opt2',
        name: 'Option 2',
        description: 'Second option',
        category: 'api',
        attributes: {
          cost: { value: 150, confidence: 0.85 },
          performance: { value: 90, confidence: 0.9 }
        },
        metadata: {
          dateAdded: new Date('2024-01-02'),
          lastUpdated: new Date('2024-01-02'),
          dataQuality: { completeness: 0.85, freshness: 0.9, reliability: 0.8 },
          entryMethod: 'manual'
        }
      }
    ];

    mockConstraints = [
      {
        id: 'cost',
        name: 'Cost',
        type: 'budget',
        isHardRequirement: true,
        weight: 0.6,
        criterionType: 'cost',
        evaluationRule: {
          attributePath: 'cost',
          operator: 'lessThan',
          targetValue: 200
        },
        description: 'Budget constraint',
        confidenceLevel: 0.9
      },
      {
        id: 'performance',
        name: 'Performance',
        type: 'performance',
        isHardRequirement: false,
        weight: 0.4,
        criterionType: 'benefit',
        evaluationRule: {
          attributePath: 'performance',
          operator: 'greaterThan',
          targetValue: 80
        },
        description: 'Performance requirement',
        confidenceLevel: 0.8
      }
    ];

    mockResults = {
      matrix: {
        options: mockOptions,
        excludedOptions: [],
        criteria: mockConstraints,
        scores: [[0.8, 0.7], [0.6, 0.9]],
        normalizedScores: [[0.8, 0.7], [0.6, 0.9]],
        weightedScores: [0.75, 0.72],
        rankings: [
          { optionId: 'opt1', rank: 1, score: 0.75, normalizedScore: 0.75 },
          { optionId: 'opt2', rank: 2, score: 0.72, normalizedScore: 0.72 }
        ],
        constraintViolations: []
      },
      tradeoffs: {
        optionAnalyses: {},
        keyDifferentiators: [],
        scenarioGuidance: []
      },
      insights: [],
      confidence: {
        overall: 0.85,
        dataCompleteness: 0.9,
        dataFreshness: 0.85,
        sourceReliability: 0.8,
        algorithmCertainty: 0.85
      }
    };
  });

  describe('Snapshot Creation', () => {
    it('should create immutable snapshot with all required data', async () => {
      const snapshot = await snapshotManager.createSnapshot(
        'Test Comparison',
        'test-user',
        mockOptions,
        mockConstraints,
        mockResults
      );

      expect(snapshot.id).toBeDefined();
      expect(snapshot.name).toBe('Test Comparison');
      expect(snapshot.createdBy).toBe('test-user');
      expect(snapshot.createdAt).toBeInstanceOf(Date);
      expect(snapshot.optionSnapshots).toHaveLength(2);
      expect(snapshot.constraints).toHaveLength(2);
      expect(snapshot.results).toBeDefined();
      expect(snapshot.metadata.dataIntegrityHash).toBeDefined();
      expect(snapshot.metadata.version).toBe('1.0.0');
    });

    it('should create frozen (immutable) snapshot data', async () => {
      const snapshot = await snapshotManager.createSnapshot(
        'Test Comparison',
        'test-user',
        mockOptions,
        mockConstraints,
        mockResults
      );

      // Verify snapshot is frozen
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.optionSnapshots)).toBe(true);
      expect(Object.isFrozen(snapshot.constraints)).toBe(true);
      expect(Object.isFrozen(snapshot.results)).toBe(true);

      // Verify nested objects are also frozen
      expect(Object.isFrozen(snapshot.optionSnapshots[0])).toBe(true);
      expect(Object.isFrozen(snapshot.optionSnapshots[0].snapshotData)).toBe(true);
      expect(Object.isFrozen(snapshot.constraints[0])).toBe(true);
    });

    it('should preserve original data without modification', async () => {
      const originalOption = { ...mockOptions[0] };
      
      const snapshot = await snapshotManager.createSnapshot(
        'Test Comparison',
        'test-user',
        mockOptions,
        mockConstraints,
        mockResults
      );

      // Verify original data is unchanged
      expect(mockOptions[0]).toEqual(originalOption);
      
      // Verify snapshot contains deep copy
      expect(snapshot.optionSnapshots[0].snapshotData).toEqual(originalOption);
      expect(snapshot.optionSnapshots[0].snapshotData).not.toBe(mockOptions[0]);
    });

    it('should generate unique snapshot IDs', async () => {
      const snapshot1 = await snapshotManager.createSnapshot(
        'Test 1', 'user', mockOptions, mockConstraints, mockResults
      );
      const snapshot2 = await snapshotManager.createSnapshot(
        'Test 2', 'user', mockOptions, mockConstraints, mockResults
      );

      expect(snapshot1.id).not.toBe(snapshot2.id);
    });

    it('should include metrics in snapshot metadata', async () => {
      const snapshot = await snapshotManager.createSnapshot(
        'Test Comparison',
        'test-user',
        mockOptions,
        mockConstraints,
        mockResults
      );

      expect(snapshot.metadata.metrics).toBeDefined();
      expect(snapshot.metadata.metrics!.optionCount).toBe(2);
      expect(snapshot.metadata.metrics!.constraintCount).toBe(2);
      expect(snapshot.metadata.metrics!.dataPoints).toBe(4);
      expect(snapshot.metadata.metrics!.totalSize).toBeGreaterThan(0);
      expect(snapshot.metadata.metrics!.creationTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Snapshot Retrieval and Management', () => {
    let testSnapshot: ComparisonSnapshot;

    beforeEach(async () => {
      testSnapshot = await snapshotManager.createSnapshot(
        'Test Comparison',
        'test-user',
        mockOptions,
        mockConstraints,
        mockResults
      );
    });

    it('should retrieve snapshot by ID', () => {
      const retrieved = snapshotManager.getSnapshot(testSnapshot.id);
      expect(retrieved).toBe(testSnapshot);
    });

    it('should return undefined for non-existent snapshot', () => {
      const retrieved = snapshotManager.getSnapshot('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should list all snapshots', async () => {
      const snapshot2 = await snapshotManager.createSnapshot(
        'Test 2', 'user', mockOptions, mockConstraints, mockResults
      );

      const snapshots = snapshotManager.listSnapshots();
      expect(snapshots).toHaveLength(2);
      expect(snapshots).toContain(testSnapshot);
      expect(snapshots).toContain(snapshot2);
    });

    it('should delete snapshots', () => {
      const deleted = snapshotManager.deleteSnapshot(testSnapshot.id);
      expect(deleted).toBe(true);

      const retrieved = snapshotManager.getSnapshot(testSnapshot.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return false when deleting non-existent snapshot', () => {
      const deleted = snapshotManager.deleteSnapshot('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('Snapshot Validation', () => {
    let testSnapshot: ComparisonSnapshot;

    beforeEach(async () => {
      testSnapshot = await snapshotManager.createSnapshot(
        'Test Comparison',
        'test-user',
        mockOptions,
        mockConstraints,
        mockResults
      );
    });

    it('should validate valid snapshot', () => {
      const validation = snapshotManager.validateSnapshot(testSnapshot);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.integrityScore).toBe(1.0);
    });

    it('should detect immutability violations', () => {
      // Create a mutable copy to simulate tampering
      const tamperedSnapshot = JSON.parse(JSON.stringify(testSnapshot));
      
      const validation = snapshotManager.validateSnapshot(tamperedSnapshot);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Snapshot data has been modified');
      expect(validation.integrityScore).toBeLessThan(1.0);
    });

    it('should detect data integrity hash mismatches', () => {
      // Create a copy with modified hash
      const tamperedSnapshot = {
        ...testSnapshot,
        metadata: {
          ...testSnapshot.metadata,
          dataIntegrityHash: 'invalid-hash'
        }
      };

      const validation = snapshotManager.validateSnapshot(tamperedSnapshot);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Data integrity hash mismatch');
    });

    it('should validate option snapshots', () => {
      // Create snapshot with invalid option data by casting to bypass TypeScript
      const invalidSnapshot = {
        ...testSnapshot,
        optionSnapshots: [
          { originalOptionId: '', snapshotData: null as any, dataVersion: new Date() }
        ]
      } as ComparisonSnapshot;

      const validation = snapshotManager.validateSnapshot(invalidSnapshot);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('missing originalOptionId'))).toBe(true);
    });

    it('should check data consistency', () => {
      // Create snapshot with inconsistent data
      const inconsistentSnapshot = {
        ...testSnapshot,
        optionSnapshots: [testSnapshot.optionSnapshots[0]], // Only one option
        results: {
          ...testSnapshot.results,
          matrix: {
            ...testSnapshot.results.matrix,
            options: mockOptions // But results show two options
          }
        }
      };

      const validation = snapshotManager.validateSnapshot(inconsistentSnapshot);
      
      expect(validation.warnings.some(w => w.includes('Option count mismatch'))).toBe(true);
    });
  });

  describe('Snapshot Comparison', () => {
    let snapshot1: ComparisonSnapshot;
    let snapshot2: ComparisonSnapshot;

    beforeEach(async () => {
      snapshot1 = await snapshotManager.createSnapshot(
        'Test 1', 'user', mockOptions, mockConstraints, mockResults
      );

      // Create modified data for second snapshot
      const modifiedOptions = [
        ...mockOptions,
        {
          id: 'opt3',
          name: 'Option 3',
          description: 'Third option',
          category: 'api' as const,
          attributes: { cost: { value: 120, confidence: 0.8 } },
          metadata: {
            dateAdded: new Date(),
            lastUpdated: new Date(),
            dataQuality: { completeness: 0.8, freshness: 0.9, reliability: 0.7 },
            entryMethod: 'manual' as const
          }
        }
      ];

      snapshot2 = await snapshotManager.createSnapshot(
        'Test 2', 'user', modifiedOptions, mockConstraints, mockResults
      );
    });

    it('should detect added options', () => {
      const comparison = snapshotManager.compareSnapshots(snapshot1, snapshot2);
      
      expect(comparison.optionChanges).toHaveLength(1);
      expect(comparison.optionChanges[0].optionId).toBe('opt3');
      expect(comparison.optionChanges[0].changeType).toBe('added');
    });

    it('should detect removed options', () => {
      const comparison = snapshotManager.compareSnapshots(snapshot2, snapshot1);
      
      expect(comparison.optionChanges).toHaveLength(1);
      expect(comparison.optionChanges[0].optionId).toBe('opt3');
      expect(comparison.optionChanges[0].changeType).toBe('removed');
    });

    it('should detect modified options', async () => {
      const modifiedOptions = [...mockOptions];
      modifiedOptions[0] = {
        ...modifiedOptions[0],
        attributes: {
          ...modifiedOptions[0].attributes,
          cost: { value: 200, confidence: 0.9 } // Changed cost
        }
      };

      const modifiedSnapshot = await snapshotManager.createSnapshot(
        'Modified', 'user', modifiedOptions, mockConstraints, mockResults
      );

      const comparison = snapshotManager.compareSnapshots(snapshot1, modifiedSnapshot);
      
      expect(comparison.optionChanges).toHaveLength(1);
      expect(comparison.optionChanges[0].optionId).toBe('opt1');
      expect(comparison.optionChanges[0].changeType).toBe('modified');
    });

    it('should detect constraint changes', async () => {
      const modifiedConstraints = [
        ...mockConstraints,
        {
          id: 'new-constraint',
          name: 'New Constraint',
          type: 'feature' as const,
          isHardRequirement: false,
          weight: 0.2,
          criterionType: 'benefit' as const,
          evaluationRule: {
            attributePath: 'feature',
            operator: 'equals' as const,
            targetValue: 'required'
          },
          description: 'New constraint',
          confidenceLevel: 0.8
        }
      ];

      const modifiedSnapshot = await snapshotManager.createSnapshot(
        'Modified', 'user', mockOptions, modifiedConstraints, mockResults
      );

      const comparison = snapshotManager.compareSnapshots(snapshot1, modifiedSnapshot);
      
      expect(comparison.constraintChanges).toHaveLength(1);
      expect(comparison.constraintChanges[0].constraintId).toBe('new-constraint');
      expect(comparison.constraintChanges[0].changeType).toBe('added');
    });

    it('should detect result changes', async () => {
      const modifiedResults = {
        ...mockResults,
        matrix: {
          ...mockResults.matrix,
          rankings: [
            { optionId: 'opt2', rank: 1, score: 0.8, normalizedScore: 0.8 }, // Swapped rankings
            { optionId: 'opt1', rank: 2, score: 0.7, normalizedScore: 0.7 }
          ]
        }
      };

      const modifiedSnapshot = await snapshotManager.createSnapshot(
        'Modified', 'user', mockOptions, mockConstraints, modifiedResults
      );

      const comparison = snapshotManager.compareSnapshots(snapshot1, modifiedSnapshot);
      
      expect(comparison.resultChanges.rankingChanged).toBe(true);
      expect(comparison.resultChanges.details).toContain('Option rankings changed');
    });
  });

  describe('Snapshot Export/Import', () => {
    let testSnapshot: ComparisonSnapshot;

    beforeEach(async () => {
      testSnapshot = await snapshotManager.createSnapshot(
        'Test Comparison',
        'test-user',
        mockOptions,
        mockConstraints,
        mockResults
      );
    });

    it('should export snapshot to portable format', () => {
      const exported = snapshotManager.exportSnapshot(testSnapshot);
      
      expect(exported.format).toBe('json');
      expect(exported.data).toBeDefined();
      expect(exported.checksum).toBeDefined();
      
      const parsedData = JSON.parse(exported.data);
      expect(parsedData.snapshot).toBeDefined();
      expect(parsedData.exportMetadata).toBeDefined();
    });

    it('should import snapshot from portable format', () => {
      const exported = snapshotManager.exportSnapshot(testSnapshot);
      
      // Clear snapshots and import
      snapshotManager.deleteSnapshot(testSnapshot.id);
      const imported = snapshotManager.importSnapshot(exported.data, exported.checksum);
      
      expect(imported.id).toBe(testSnapshot.id);
      expect(imported.name).toBe(testSnapshot.name);
      expect(imported.optionSnapshots).toHaveLength(testSnapshot.optionSnapshots.length);
    });

    it('should reject import with invalid checksum', () => {
      const exported = snapshotManager.exportSnapshot(testSnapshot);
      
      expect(() => {
        snapshotManager.importSnapshot(exported.data, 'invalid-checksum');
      }).toThrow('checksum mismatch');
    });

    it('should reject import with invalid data', () => {
      expect(() => {
        snapshotManager.importSnapshot('invalid-json', 'checksum');
      }).toThrow('Snapshot import failed');
    });
  });

  describe('Snapshot Metrics', () => {
    let testSnapshot: ComparisonSnapshot;

    beforeEach(async () => {
      testSnapshot = await snapshotManager.createSnapshot(
        'Test Comparison',
        'test-user',
        mockOptions,
        mockConstraints,
        mockResults
      );
    });

    it('should calculate snapshot metrics', () => {
      const metrics = snapshotManager.getSnapshotMetrics(testSnapshot);
      
      expect(metrics.optionCount).toBe(2);
      expect(metrics.constraintCount).toBe(2);
      expect(metrics.dataPoints).toBe(4);
      expect(metrics.totalSize).toBeGreaterThan(0);
      expect(metrics.creationTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Management', () => {
    it('should use custom configuration', () => {
      const customManager = new SnapshotManager({
        includeRawData: false,
        compressionEnabled: true
      });

      const config = customManager.getConfig();
      expect(config.includeRawData).toBe(false);
      expect(config.compressionEnabled).toBe(true);
      expect(config.includeAnalysisMetadata).toBe(true); // Default value
    });

    it('should update configuration', () => {
      snapshotManager.updateConfig({
        encryptionEnabled: true,
        compressionEnabled: true
      });

      const config = snapshotManager.getConfig();
      expect(config.encryptionEnabled).toBe(true);
      expect(config.compressionEnabled).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty options array', async () => {
      const snapshot = await snapshotManager.createSnapshot(
        'Empty Test',
        'user',
        [],
        mockConstraints,
        mockResults
      );

      expect(snapshot.optionSnapshots).toHaveLength(0);
      expect(snapshot.metadata.metrics!.optionCount).toBe(0);
    });

    it('should handle empty constraints array', async () => {
      const snapshot = await snapshotManager.createSnapshot(
        'Empty Constraints',
        'user',
        mockOptions,
        [],
        mockResults
      );

      expect(snapshot.constraints).toHaveLength(0);
      expect(snapshot.metadata.metrics!.constraintCount).toBe(0);
    });

    it('should handle validation errors gracefully', () => {
      const invalidSnapshot = {
        id: 'test',
        name: 'Test',
        createdAt: new Date(),
        createdBy: 'user',
        optionSnapshots: [],
        constraints: [],
        results: mockResults,
        metadata: {
          version: '1.0.0',
          algorithmVersion: '1.0.0',
          dataIntegrityHash: 'invalid'
        }
      } as ComparisonSnapshot;

      const validation = snapshotManager.validateSnapshot(invalidSnapshot);
      expect(validation.isValid).toBe(false);
      expect(validation.integrityScore).toBeGreaterThanOrEqual(0);
    });
  });
});