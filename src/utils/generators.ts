// Test data generators for property-based testing
import fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import {
  Option,
  Constraint,
  AttributeValue,
  OptionCategory,
  ConstraintType,
  CriterionType,
  EvaluationOperator,
  EntryMethod,
  QualityScore,
  OptionMetadata,
  EvaluationRule
} from '../types';

// Basic generators
export const arbitraryId = (): fc.Arbitrary<string> => 
  fc.string({ minLength: 1, maxLength: 50 }).map(() => uuidv4());

export const arbitraryWeight = (): fc.Arbitrary<number> =>
  fc.float({ min: 0, max: 1 });

export const arbitraryConfidence = (): fc.Arbitrary<number> =>
  fc.float({ min: 0, max: 1 });

export const arbitraryOptionCategory = (): fc.Arbitrary<OptionCategory> =>
  fc.constantFrom('api', 'cloud-service', 'framework', 'tool', 'custom');

export const arbitraryConstraintType = (): fc.Arbitrary<ConstraintType> =>
  fc.constantFrom('budget', 'performance', 'compatibility', 'feature', 'custom');

export const arbitraryCriterionType = (): fc.Arbitrary<CriterionType> =>
  fc.constantFrom('benefit', 'cost', 'neutral');

export const arbitraryEvaluationOperator = (): fc.Arbitrary<EvaluationOperator> =>
  fc.constantFrom('lessThan', 'greaterThan', 'equals', 'contains', 'range');

export const arbitraryEntryMethod = (): fc.Arbitrary<EntryMethod> =>
  fc.constantFrom('manual', 'template', 'api');

// Complex generators
export const arbitraryAttributeValue = (): fc.Arbitrary<AttributeValue> =>
  fc.record({
    value: fc.oneof(
      fc.string({ minLength: 1, maxLength: 100 }),
      fc.float({ min: 0, max: 10000 }),
      fc.boolean()
    ),
    unit: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
    confidence: fc.option(arbitraryConfidence()),
    source: fc.option(fc.webUrl()),
    lastUpdated: fc.option(fc.date())
  });

export const arbitraryQualityScore = (): fc.Arbitrary<QualityScore> =>
  fc.record({
    completeness: arbitraryConfidence(),
    freshness: arbitraryConfidence(),
    reliability: arbitraryConfidence()
  });

export const arbitraryOptionMetadata = (): fc.Arbitrary<OptionMetadata> =>
  fc.record({
    dateAdded: fc.date(),
    lastUpdated: fc.date(),
    dataQuality: arbitraryQualityScore(),
    entryMethod: arbitraryEntryMethod()
  });

export const arbitraryEvaluationRule = (): fc.Arbitrary<EvaluationRule> =>
  fc.record({
    attributePath: fc.string({ minLength: 1, maxLength: 50 }),
    operator: arbitraryEvaluationOperator(),
    targetValue: fc.oneof(
      fc.string({ minLength: 1, maxLength: 100 }),
      fc.float({ min: 0, max: 1000 }),
      fc.tuple(fc.float({ min: 0, max: 500 }), fc.float({ min: 500, max: 1000 }))
    ),
    unit: fc.option(fc.string({ minLength: 1, maxLength: 20 }))
  });

export const arbitraryOption = (): fc.Arbitrary<Option> =>
  fc.record({
    id: arbitraryId(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 1, maxLength: 500 }),
    category: arbitraryOptionCategory(),
    attributes: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 30 }),
      arbitraryAttributeValue(),
      { minKeys: 1, maxKeys: 10 }
    ),
    metadata: arbitraryOptionMetadata()
  });

export const arbitraryConstraint = (): fc.Arbitrary<Constraint> =>
  fc.record({
    id: arbitraryId(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    type: arbitraryConstraintType(),
    isHardRequirement: fc.boolean(),
    weight: arbitraryWeight(),
    criterionType: arbitraryCriterionType(),
    evaluationRule: arbitraryEvaluationRule(),
    description: fc.string({ minLength: 1, maxLength: 500 }),
    confidenceLevel: arbitraryConfidence()
  });

// Generators for specific test scenarios
export const arbitraryValidOptions = (count: number): fc.Arbitrary<Option[]> =>
  fc.array(arbitraryOption(), { minLength: count, maxLength: count });

export const arbitraryValidConstraints = (count: number): fc.Arbitrary<Constraint[]> =>
  fc.array(arbitraryConstraint(), { minLength: count, maxLength: count });

// Generator for normalized weights (sum = 1)
export const arbitraryNormalizedWeights = (keys: string[]): fc.Arbitrary<Record<string, number>> => {
  if (keys.length === 0) return fc.constant({});
  if (keys.length === 1) return fc.constant({ [keys[0]]: 1.0 });
  
  return fc.array(fc.float({ min: 0.1, max: 1 }), { minLength: keys.length, maxLength: keys.length })
    .map(weights => {
      const sum = weights.reduce((a, b) => a + b, 0);
      const normalized = weights.map(w => w / sum);
      return keys.reduce((acc, key, index) => {
        acc[key] = normalized[index];
        return acc;
      }, {} as Record<string, number>);
    });
};

// Helper functions for creating test data
export const generateTestOptions = (count: number): Option[] => {
  const options: Option[] = [];
  
  for (let i = 0; i < count; i++) {
    options.push({
      id: `test-option-${i}`,
      name: `Test Option ${i}`,
      description: `Description for test option ${i}`,
      category: 'api',
      attributes: {
        cost: { value: Math.random() * 200 + 50, unit: 'USD' },
        performance: { value: Math.random() * 40 + 60, unit: 'score' },
        reliability: { value: Math.random() * 20 + 80, unit: 'percentage' },
        features: { value: Math.random() * 30 + 70, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: {
          completeness: Math.random() * 0.3 + 0.7,
          freshness: Math.random() * 0.3 + 0.7,
          reliability: Math.random() * 0.3 + 0.7
        },
        entryMethod: 'manual'
      }
    });
  }
  
  return options;
};

export const generateTestConstraints = (count: number): Constraint[] => {
  const constraints: Constraint[] = [];
  const constraintTypes: ConstraintType[] = ['budget', 'performance', 'compatibility', 'feature'];
  const criterionTypes: CriterionType[] = ['cost', 'benefit', 'neutral'];
  const operators: EvaluationOperator[] = ['lessThan', 'greaterThan', 'equals'];
  
  for (let i = 0; i < count; i++) {
    const type = constraintTypes[i % constraintTypes.length];
    const criterionType = type === 'budget' ? 'cost' : 'benefit';
    
    constraints.push({
      id: `test-constraint-${i}`,
      name: `Test Constraint ${i}`,
      type,
      isHardRequirement: Math.random() < 0.3, // 30% chance of being hard
      weight: Math.random() * 0.8 + 0.1, // 0.1 to 0.9
      criterionType,
      evaluationRule: {
        attributePath: ['cost', 'performance', 'reliability', 'features'][i % 4],
        operator: operators[i % operators.length],
        targetValue: Math.random() * 100 + 50
      },
      description: `Description for test constraint ${i}`,
      confidenceLevel: Math.random() * 0.3 + 0.7
    });
  }
  
  return constraints;
};