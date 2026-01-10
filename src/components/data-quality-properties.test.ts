/**
 * Property Test 17: Data Quality Management
 * Validates Requirements 6.2, 6.5 - Data quality assessment and graceful handling
 */

import fc from 'fast-check';
import { OptionComparisonApp } from '../app';
import { Option, Constraint } from '../types/core';
import { generateTestConstraints } from '../utils/generators';

describe('Property 17: Data Quality Management', () => {
  let app: OptionComparisonApp;

  beforeEach(() => {
    app = new OptionComparisonApp({
      performance: {
        maxConcurrentComparisons: 10,
        comparisonTimeoutMs: 10000,
        maxOptionsPerComparison: 50,
        maxConstraintsPerComparison: 20,
        enableCaching: false,
        cacheExpirationMs: 60000
      }
    });
  });

  afterEach(async () => {
    await app.shutdown();
  });

  // Arbitrary for data quality scenarios
  const dataQualityArbitrary = fc.record({
    completeness: fc.float({ min: 0, max: 1 }),
    freshness: fc.float({ min: 0, max: 1 }),
    reliability: fc.float({ min: 0, max: 1 }),
    missingAttributes: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { maxLength: 5 }),
    outdatedDays: fc.integer({ min: 0, max: 365 }),
    sourceReliability: fc.constantFrom('high', 'medium', 'low', 'unknown')
  });

  const createOptionWithQuality = (
    id: string,
    name: string,
    quality: any,
    baseAttributes: Record<string, any> = {}
  ): Option => {
    // Create attributes based on completeness
    const allPossibleAttributes = ['cost', 'performance', 'reliability', 'features', 'security'];
    const includedAttributes: Record<string, any> = { ...baseAttributes };
    
    const numToInclude = Math.floor(allPossibleAttributes.length * quality.completeness);
    const attributesToInclude = allPossibleAttributes.slice(0, numToInclude);
    
    attributesToInclude.forEach(attr => {
      if (!includedAttributes[attr]) {
        includedAttributes[attr] = {
          value: Math.random() * 100,
          unit: 'score'
        };
      }
    });

    // Remove attributes marked as missing
    quality.missingAttributes.forEach((attr: string) => {
      delete includedAttributes[attr];
    });

    // Calculate actual completeness
    const actualCompleteness = Object.keys(includedAttributes).length / allPossibleAttributes.length;

    // Set freshness based on outdated days
    const lastUpdated = new Date();
    lastUpdated.setDate(lastUpdated.getDate() - quality.outdatedDays);
    const actualFreshness = Math.max(0, 1 - (quality.outdatedDays / 365));

    // Set reliability based on source
    let actualReliability = quality.reliability;
    switch (quality.sourceReliability) {
      case 'high': actualReliability = Math.max(0.8, actualReliability); break;
      case 'medium': actualReliability = Math.min(0.8, Math.max(0.5, actualReliability)); break;
      case 'low': actualReliability = Math.min(0.5, actualReliability); break;
      case 'unknown': actualReliability = 0.3; break;
    }

    return {
      id,
      name,
      description: `Option with ${quality.sourceReliability} quality data`,
      category: 'api',
      attributes: includedAttributes,
      metadata: {
        dateAdded: new Date(),
        lastUpdated,
        dataQuality: {
          completeness: actualCompleteness,
          freshness: actualFreshness,
          reliability: actualReliability
        },
        entryMethod: quality.sourceReliability === 'high' ? 'api_import' : 'manual'
      }
    };
  };

  test('Property 17.1: Data quality metrics are accurately calculated', () => {
    fc.assert(fc.property(
      fc.array(dataQualityArbitrary, { minLength: 2, maxLength: 10 }),
      async (qualitySpecs) => {
        const options = qualitySpecs.map((spec, index) => 
          createOptionWithQuality(`opt-${index}`, `Option ${index}`, spec)
        );
        
        const constraints = generateTestConstraints(3);
        
        const result = await app.compareOptions(options, constraints);
        
        // Data quality should be assessed
        expect(result.insights.dataQuality).toBeDefined();
        expect(result.insights.dataQuality.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.insights.dataQuality.overallScore).toBeLessThanOrEqual(1);
        
        // Individual quality components should be tracked
        expect(result.insights.dataQuality.completeness).toBeDefined();
        expect(result.insights.dataQuality.freshness).toBeDefined();
        expect(result.insights.dataQuality.reliability).toBeDefined();
        
        // Quality should reflect the input data characteristics
        const avgCompleteness = options.reduce((sum, opt) => 
          sum + opt.metadata.dataQuality.completeness, 0) / options.length;
        const avgFreshness = options.reduce((sum, opt) => 
          sum + opt.metadata.dataQuality.freshness, 0) / options.length;
        const avgReliability = options.reduce((sum, opt) => 
          sum + opt.metadata.dataQuality.reliability, 0) / options.length;
        
        // Calculated quality should be reasonably close to input averages
        expect(Math.abs(result.insights.dataQuality.completeness - avgCompleteness)).toBeLessThan(0.2);
        expect(Math.abs(result.insights.dataQuality.freshness - avgFreshness)).toBeLessThan(0.2);
        expect(Math.abs(result.insights.dataQuality.reliability - avgReliability)).toBeLessThan(0.2);
        
        return true;
      }
    ), { numRuns: 30 });
  });

  test('Property 17.2: Missing data is handled gracefully', () => {
    fc.assert(fc.property(
      fc.record({
        completeOptions: fc.array(dataQualityArbitrary.filter(q => q.completeness > 0.8), { minLength: 1, maxLength: 3 }),
        incompleteOptions: fc.array(dataQualityArbitrary.filter(q => q.completeness < 0.5), { minLength: 1, maxLength: 3 })
      }),
      async (optionGroups) => {
        const completeOptions = optionGroups.completeOptions.map((spec, index) => 
          createOptionWithQuality(`complete-${index}`, `Complete Option ${index}`, spec)
        );
        
        const incompleteOptions = optionGroups.incompleteOptions.map((spec, index) => 
          createOptionWithQuality(`incomplete-${index}`, `Incomplete Option ${index}`, spec)
        );
        
        const allOptions = [...completeOptions, ...incompleteOptions];
        const constraints = generateTestConstraints(4);
        
        const result = await app.compareOptions(allOptions, constraints);
        
        // Comparison should complete despite missing data
        expect(result).toBeDefined();
        expect(result.summary.totalOptions).toBe(allOptions.length);
        
        // Data quality issues should be identified
        expect(result.insights.dataQuality.issues).toBeDefined();
        expect(result.insights.dataQuality.issues.length).toBeGreaterThan(0);
        
        // Should provide recommendations for improvement
        expect(result.insights.dataQuality.recommendations).toBeDefined();
        expect(result.insights.dataQuality.recommendations.length).toBeGreaterThan(0);
        
        // Confidence should reflect data quality issues
        if (incompleteOptions.length > completeOptions.length) {
          expect(result.summary.overallConfidence).toBeLessThan(0.8);
        }
        
        // Missing data should be noted in transparency
        expect(result.metadata.transparency.dataQualityNotes).toBeDefined();
        
        return true;
      }
    ), { numRuns: 25 });
  });

  test('Property 17.3: Outdated information is flagged appropriately', () => {
    fc.assert(fc.property(
      fc.record({
        freshData: fc.array(dataQualityArbitrary.map(q => ({ ...q, outdatedDays: fc.sample(fc.integer({ min: 0, max: 30 }), 1)[0] })), { minLength: 1, maxLength: 3 }),
        staleData: fc.array(dataQualityArbitrary.map(q => ({ ...q, outdatedDays: fc.sample(fc.integer({ min: 180, max: 365 }), 1)[0] })), { minLength: 1, maxLength: 3 })
      }),
      async (dataGroups) => {
        const freshOptions = dataGroups.freshData.map((spec, index) => 
          createOptionWithQuality(`fresh-${index}`, `Fresh Option ${index}`, spec)
        );
        
        const staleOptions = dataGroups.staleData.map((spec, index) => 
          createOptionWithQuality(`stale-${index}`, `Stale Option ${index}`, spec)
        );
        
        const allOptions = [...freshOptions, ...staleOptions];
        const constraints = generateTestConstraints(3);
        
        const result = await app.compareOptions(allOptions, constraints);
        
        // Stale data should be flagged
        const staleDataIssues = result.insights.dataQuality.issues.filter(issue => 
          issue.toLowerCase().includes('outdated') || 
          issue.toLowerCase().includes('stale') ||
          issue.toLowerCase().includes('old')
        );
        
        if (staleOptions.length > 0) {
          expect(staleDataIssues.length).toBeGreaterThan(0);
        }
        
        // Freshness score should reflect the data age
        const avgFreshness = allOptions.reduce((sum, opt) => 
          sum + opt.metadata.dataQuality.freshness, 0) / allOptions.length;
        
        expect(Math.abs(result.insights.dataQuality.freshness - avgFreshness)).toBeLessThan(0.3);
        
        // Recommendations should suggest data updates
        if (staleOptions.length > 0) {
          const updateRecommendations = result.insights.dataQuality.recommendations.filter(rec => 
            rec.toLowerCase().includes('update') || 
            rec.toLowerCase().includes('refresh') ||
            rec.toLowerCase().includes('recent')
          );
          expect(updateRecommendations.length).toBeGreaterThan(0);
        }
        
        return true;
      }
    ), { numRuns: 25 });
  });

  test('Property 17.4: Source reliability affects confidence calculations', () => {
    fc.assert(fc.property(
      fc.record({
        highReliabilityOptions: fc.array(dataQualityArbitrary.map(q => ({ ...q, sourceReliability: 'high' })), { minLength: 1, maxLength: 3 }),
        lowReliabilityOptions: fc.array(dataQualityArbitrary.map(q => ({ ...q, sourceReliability: 'low' })), { minLength: 1, maxLength: 3 })
      }),
      async (reliabilityGroups) => {
        // Test high reliability scenario
        const highReliabilityOptions = reliabilityGroups.highReliabilityOptions.map((spec, index) => 
          createOptionWithQuality(`high-rel-${index}`, `High Reliability Option ${index}`, spec)
        );
        
        const constraints = generateTestConstraints(3);
        const highRelResult = await app.compareOptions(highReliabilityOptions, constraints);
        
        // Test low reliability scenario
        const lowReliabilityOptions = reliabilityGroups.lowReliabilityOptions.map((spec, index) => 
          createOptionWithQuality(`low-rel-${index}`, `Low Reliability Option ${index}`, spec)
        );
        
        const lowRelResult = await app.compareOptions(lowReliabilityOptions, constraints);
        
        // High reliability data should result in higher confidence
        expect(highRelResult.summary.overallConfidence).toBeGreaterThan(lowRelResult.summary.overallConfidence);
        
        // Reliability scores should reflect source quality
        expect(highRelResult.insights.dataQuality.reliability).toBeGreaterThan(0.7);
        expect(lowRelResult.insights.dataQuality.reliability).toBeLessThan(0.6);
        
        // Low reliability should generate warnings
        expect(lowRelResult.insights.dataQuality.issues.length).toBeGreaterThan(0);
        
        return true;
      }
    ), { numRuns: 20 });
  });

  test('Property 17.5: Data quality recommendations are actionable', () => {
    fc.assert(fc.property(
      fc.array(dataQualityArbitrary, { minLength: 3, maxLength: 8 }),
      async (qualitySpecs) => {
        const options = qualitySpecs.map((spec, index) => 
          createOptionWithQuality(`opt-${index}`, `Option ${index}`, spec)
        );
        
        const constraints = generateTestConstraints(4);
        const result = await app.compareOptions(options, constraints);
        
        // Should provide specific, actionable recommendations
        expect(result.insights.dataQuality.recommendations).toBeDefined();
        
        result.insights.dataQuality.recommendations.forEach(recommendation => {
          // Recommendations should be specific strings
          expect(typeof recommendation).toBe('string');
          expect(recommendation.length).toBeGreaterThan(10);
          
          // Should contain actionable language
          const actionableWords = ['update', 'add', 'verify', 'check', 'improve', 'collect', 'validate'];
          const hasActionableWord = actionableWords.some(word => 
            recommendation.toLowerCase().includes(word)
          );
          expect(hasActionableWord).toBe(true);
        });
        
        // Number of recommendations should correlate with data quality issues
        const overallQuality = result.insights.dataQuality.overallScore;
        if (overallQuality < 0.5) {
          expect(result.insights.dataQuality.recommendations.length).toBeGreaterThan(2);
        } else if (overallQuality < 0.8) {
          expect(result.insights.dataQuality.recommendations.length).toBeGreaterThan(0);
        }
        
        return true;
      }
    ), { numRuns: 25 });
  });

  test('Property 17.6: Graceful degradation with severely incomplete data', () => {
    fc.assert(fc.property(
      fc.record({
        severelyIncompleteOptions: fc.array(
          dataQualityArbitrary.map(q => ({ 
            ...q, 
            completeness: fc.sample(fc.float({ min: 0, max: 0.3 }), 1)[0],
            missingAttributes: ['cost', 'performance', 'reliability'] // Most attributes missing
          })), 
          { minLength: 2, maxLength: 5 }
        )
      }),
      async (dataGroup) => {
        const options = dataGroup.severelyIncompleteOptions.map((spec, index) => 
          createOptionWithQuality(`incomplete-${index}`, `Severely Incomplete Option ${index}`, spec, {
            // Ensure at least one attribute exists
            category: { value: 'api', unit: 'text' }
          })
        );
        
        const constraints = generateTestConstraints(2); // Fewer constraints for incomplete data
        
        try {
          const result = await app.compareOptions(options, constraints);
          
          // Should complete despite severe data issues
          expect(result).toBeDefined();
          
          // Should have very low confidence
          expect(result.summary.overallConfidence).toBeLessThan(0.5);
          
          // Should identify severe data quality issues
          expect(result.insights.dataQuality.issues.length).toBeGreaterThan(2);
          expect(result.insights.dataQuality.overallScore).toBeLessThan(0.4);
          
          // Should provide extensive recommendations
          expect(result.insights.dataQuality.recommendations.length).toBeGreaterThan(3);
          
          // Should note limitations in transparency
          expect(result.metadata.transparency.limitations).toBeDefined();
          expect(result.metadata.transparency.limitations.length).toBeGreaterThan(0);
          
        } catch (error) {
          // If comparison fails due to insufficient data, error should be informative
          expect(error).toBeDefined();
          expect(error.message).toContain('data');
        }
        
        return true;
      }
    ), { numRuns: 20 });
  });
});