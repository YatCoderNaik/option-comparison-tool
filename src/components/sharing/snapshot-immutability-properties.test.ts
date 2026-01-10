import * as fc from 'fast-check';
import { SnapshotManager } from './snapshot-manager';
import { Option, Constraint, ComparisonResult } from '../../types/core';

/**
 * Property-based tests for snapshot immutability
 * Validates Requirements 7.4: Comparison state preservation
 */
describe('Snapshot Immutability Properties', () => {
  let snapshotManager: SnapshotManager;

  beforeEach(() => {
    snapshotManager = new SnapshotManager();
  });

  /**
   * Property: Snapshot Immutability
   * Verifies snapshots cannot be modified after creation
   * Test that data integrity hashes remain stable
   * Validate that attempts to modify snapshots fail gracefully
   */
  describe('Property: Snapshot Immutability', () => {
    // Create very simple, fixed-structure arbitraries
    const createValidOption = (id: string): Option => ({
      id,
      name: `Option ${id}`,
      description: 'Test option',
      category: 'api' as const,
      attributes: {
        cost: {
          value: 100,
          confidence: Math.fround(0.8)
        },
        performance: {
          value: 50,
          confidence: Math.fround(0.7)
        }
      },
      metadata: {
        dateAdded: new Date('2023-01-01'),
        lastUpdated: new Date('2023-01-01'),
        dataQuality: {
          completeness: Math.fround(0.9),
          freshness: Math.fround(0.8),
          reliability: Math.fround(0.7)
        },
        entryMethod: 'manual' as const
      }
    });

    const createValidConstraint = (id: string): Constraint => ({
      id,
      name: `Constraint ${id}`,
      type: 'budget' as const,
      isHardRequirement: false,
      weight: Math.fround(0.5),
      criterionType: 'benefit' as const,
      evaluationRule: {
        attributePath: 'cost',
        operator: 'lessThan' as const,
        targetValue: 200
      },
      description: 'Test constraint',
      confidenceLevel: Math.fround(0.8)
    });

    const createValidResult = (optionCount: number, constraintCount: number): ComparisonResult => {
      const options = Array.from({ length: optionCount }, (_, i) => createValidOption(`opt${i}`));
      const constraints = Array.from({ length: constraintCount }, (_, i) => createValidConstraint(`con${i}`));
      
      return {
        matrix: {
          options,
          excludedOptions: [],
          criteria: constraints,
          scores: Array.from({ length: optionCount }, () => 
            Array.from({ length: constraintCount }, () => Math.fround(0.5))
          ),
          normalizedScores: Array.from({ length: optionCount }, () => 
            Array.from({ length: constraintCount }, () => Math.fround(0.5))
          ),
          weightedScores: Array.from({ length: optionCount }, () => Math.fround(0.5)),
          rankings: options.map((opt, i) => ({
            optionId: opt.id,
            rank: i + 1,
            score: Math.fround(0.5),
            normalizedScore: Math.fround(0.5)
          })),
          constraintViolations: []
        },
        tradeoffs: {
          optionAnalyses: {},
          keyDifferentiators: [],
          scenarioGuidance: []
        },
        insights: [],
        confidence: {
          overall: Math.fround(0.8),
          dataCompleteness: Math.fround(0.9),
          dataFreshness: Math.fround(0.7),
          sourceReliability: Math.fround(0.8),
          algorithmCertainty: Math.fround(0.6)
        }
      };
    };

    it('should create immutable snapshots that cannot be modified', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 2 }),
          fc.integer({ min: 1, max: 2 }),
          async (name, createdBy, optionCount, constraintCount) => {
            const options = Array.from({ length: optionCount }, (_, i) => createValidOption(`opt${i}`));
            const constraints = Array.from({ length: constraintCount }, (_, i) => createValidConstraint(`con${i}`));
            const results = createValidResult(optionCount, constraintCount);

            // Create snapshot
            const snapshot = await snapshotManager.createSnapshot(
              name,
              createdBy,
              options,
              constraints,
              results
            );

            // Verify snapshot is frozen at all levels
            expect(Object.isFrozen(snapshot)).toBe(true);
            expect(Object.isFrozen(snapshot.optionSnapshots)).toBe(true);
            expect(Object.isFrozen(snapshot.constraints)).toBe(true);
            expect(Object.isFrozen(snapshot.results)).toBe(true);

            // Verify nested objects are frozen
            if (snapshot.optionSnapshots.length > 0) {
              expect(Object.isFrozen(snapshot.optionSnapshots[0])).toBe(true);
              expect(Object.isFrozen(snapshot.optionSnapshots[0].snapshotData)).toBe(true);
            }

            if (snapshot.constraints.length > 0) {
              expect(Object.isFrozen(snapshot.constraints[0])).toBe(true);
            }

            // Attempt to modify snapshot should fail silently
            const originalName = snapshot.name;
            try {
              (snapshot as any).name = 'Modified Name';
            } catch (error) {
              // Expected in strict mode
            }

            // Verify modifications didn't take effect
            expect(snapshot.name).toBe(originalName);
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should maintain data integrity hash stability', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 2 }),
          fc.integer({ min: 1, max: 2 }),
          async (name, createdBy, optionCount, constraintCount) => {
            const options = Array.from({ length: optionCount }, (_, i) => createValidOption(`opt${i}`));
            const constraints = Array.from({ length: constraintCount }, (_, i) => createValidConstraint(`con${i}`));
            const results = createValidResult(optionCount, constraintCount);

            // Create snapshot
            const snapshot = await snapshotManager.createSnapshot(
              name,
              createdBy,
              options,
              constraints,
              results
            );

            const originalHash = snapshot.metadata.dataIntegrityHash;

            // Validate snapshot multiple times
            const validation1 = snapshotManager.validateSnapshot(snapshot);
            const validation2 = snapshotManager.validateSnapshot(snapshot);

            // Hash should remain stable across validations
            expect(validation1.isValid).toBe(true);
            expect(validation2.isValid).toBe(true);
            expect(snapshot.metadata.dataIntegrityHash).toBe(originalHash);
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should detect any attempts to modify snapshot data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 2 }),
          fc.integer({ min: 1, max: 2 }),
          async (name, createdBy, optionCount, constraintCount) => {
            const options = Array.from({ length: optionCount }, (_, i) => createValidOption(`opt${i}`));
            const constraints = Array.from({ length: constraintCount }, (_, i) => createValidConstraint(`con${i}`));
            const results = createValidResult(optionCount, constraintCount);

            // Create snapshot
            const snapshot = await snapshotManager.createSnapshot(
              name,
              createdBy,
              options,
              constraints,
              results
            );

            // Create a mutable copy to simulate tampering
            const tamperedSnapshot = JSON.parse(JSON.stringify(snapshot));
            
            // Modify the copy
            tamperedSnapshot.name = 'Tampered Name';
            
            // Validation should detect the tampering
            const validation = snapshotManager.validateSnapshot(tamperedSnapshot);
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(e => e.includes('modified'))).toBe(true);
            expect(validation.integrityScore).toBeLessThan(1.0);
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should preserve immutability through export/import cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 2 }),
          fc.integer({ min: 1, max: 2 }),
          async (name, createdBy, optionCount, constraintCount) => {
            const options = Array.from({ length: optionCount }, (_, i) => createValidOption(`opt${i}`));
            const constraints = Array.from({ length: constraintCount }, (_, i) => createValidConstraint(`con${i}`));
            const results = createValidResult(optionCount, constraintCount);

            // Create original snapshot
            const originalSnapshot = await snapshotManager.createSnapshot(
              name,
              createdBy,
              options,
              constraints,
              results
            );

            // Export snapshot
            const exported = snapshotManager.exportSnapshot(originalSnapshot);

            // Clear snapshots and import
            snapshotManager.deleteSnapshot(originalSnapshot.id);
            const importedSnapshot = snapshotManager.importSnapshot(exported.data, exported.checksum);

            // Verify imported snapshot is also immutable
            expect(Object.isFrozen(importedSnapshot)).toBe(true);
            expect(Object.isFrozen(importedSnapshot.optionSnapshots)).toBe(true);
            expect(Object.isFrozen(importedSnapshot.constraints)).toBe(true);

            // Verify data integrity is preserved
            const validation = snapshotManager.validateSnapshot(importedSnapshot);
            expect(validation.isValid).toBe(true);
            expect(validation.integrityScore).toBe(1.0);

            // Verify content matches
            expect(importedSnapshot.name).toBe(originalSnapshot.name);
            expect(importedSnapshot.createdBy).toBe(originalSnapshot.createdBy);
          }
        ),
        { numRuns: 2 }
      );
    });

    it('should maintain immutability under concurrent access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 2 }),
          fc.integer({ min: 1, max: 2 }),
          async (name, createdBy, optionCount, constraintCount) => {
            const options = Array.from({ length: optionCount }, (_, i) => createValidOption(`opt${i}`));
            const constraints = Array.from({ length: constraintCount }, (_, i) => createValidConstraint(`con${i}`));
            const results = createValidResult(optionCount, constraintCount);

            // Create snapshot
            const snapshot = await snapshotManager.createSnapshot(
              name,
              createdBy,
              options,
              constraints,
              results
            );

            // Simulate concurrent access attempts
            const concurrentOperations = [
              () => snapshotManager.validateSnapshot(snapshot),
              () => snapshotManager.getSnapshotMetrics(snapshot),
              () => snapshotManager.exportSnapshot(snapshot),
              () => {
                try {
                  (snapshot as any).name = 'Concurrent Modification';
                } catch (error) {
                  // Expected in strict mode
                }
                return { isValid: true, errors: [], warnings: [], integrityScore: 1.0 };
              }
            ];

            // Execute operations concurrently
            await Promise.all(
              concurrentOperations.map(op => Promise.resolve(op()))
            );

            // Verify all operations completed and snapshot remains valid
            const finalValidation = snapshotManager.validateSnapshot(snapshot);
            expect(finalValidation.isValid).toBe(true);
            expect(finalValidation.integrityScore).toBe(1.0);

            // Verify snapshot data hasn't changed
            expect(snapshot.name).toBe(name);
            expect(snapshot.createdBy).toBe(createdBy);
          }
        ),
        { numRuns: 2 }
      );
    });
  });
});