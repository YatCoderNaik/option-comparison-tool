/**
 * Option Comparison Tool - Custom Example
 * 
 * Modify this file to create your own comparisons
 */

import { OptionComparisonApp } from './src/app';
import { Option, Constraint } from './src/types/core';

async function customComparison() {
  console.log('🚀 Custom Option Comparison\n');
  
  // Initialize the application
  const app = new OptionComparisonApp();
  await app.initialize();
  
  // Define your options here
  const options: Option[] = [
    {
      id: 'option-1',
      name: 'First Option',
      description: 'Description of your first option',
      category: 'api', // 'api' | 'cloud-service' | 'framework' | 'tool' | 'custom'
      attributes: {
        cost: { value: 100, unit: 'USD' },
        performance: { value: 85, unit: 'score' },
        ease_of_use: { value: 90, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: { completeness: 0.9, freshness: 0.9, reliability: 0.9 },
        entryMethod: 'manual'
      }
    },
    {
      id: 'option-2',
      name: 'Second Option',
      description: 'Description of your second option',
      category: 'api',
      attributes: {
        cost: { value: 150, unit: 'USD' },
        performance: { value: 95, unit: 'score' },
        ease_of_use: { value: 75, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: { completeness: 0.95, freshness: 0.95, reliability: 0.95 },
        entryMethod: 'manual'
      }
    }
    // Add more options as needed...
  ];
  
  // Define your constraints here
  const constraints: Constraint[] = [
    {
      id: 'budget-constraint',
      name: 'Budget Limit',
      type: 'budget', // 'budget' | 'performance' | 'compatibility' | 'feature' | 'custom'
      isHardRequirement: true, // true = must meet, false = preference
      weight: 0.4, // 0-1 scale, higher = more important
      criterionType: 'cost', // 'benefit' | 'cost' | 'neutral'
      evaluationRule: {
        attributePath: 'cost',
        operator: 'lessThan', // 'lessThan' | 'greaterThan' | 'equals' | 'contains' | 'range'
        targetValue: 200
      },
      description: 'Must be within budget',
      confidenceLevel: 0.95
    },
    {
      id: 'performance-preference',
      name: 'Performance Preference',
      type: 'performance',
      isHardRequirement: false,
      weight: 0.6,
      criterionType: 'benefit',
      evaluationRule: {
        attributePath: 'performance',
        operator: 'greaterThan',
        targetValue: 80
      },
      description: 'Prefer higher performance',
      confidenceLevel: 0.8
    }
    // Add more constraints as needed...
  ];
  
  try {
    console.log('📊 Running comparison...\n');
    
    // Run the comparison
    const result = await app.compareOptions(options, constraints, 'custom-user');
    
    // Display results
    console.log('🏆 Results:');
    console.log(`  Top recommendation: ${result.summary.topRecommendation.optionId}`);
    console.log(`  Confidence score: ${(result.summary.topRecommendation.confidence * 100).toFixed(1)}%`);
    console.log(`  Options evaluated: ${result.summary.totalOptions}`);
    console.log(`  Options meeting requirements: ${result.summary.includedOptions}`);
    console.log(`  Options excluded: ${result.summary.excludedOptions}`);
    
    // Show insights if available
    if (result.insights.summary.length > 0) {
      console.log('\n💡 Key insights:');
      result.insights.summary.slice(0, 3).forEach(insight => {
        console.log(`  • ${insight}`);
      });
    }
    
    // Show data quality
    console.log('\n📊 Data Quality:');
    const dq = result.insights.dataQuality;
    console.log(`  Overall score: ${(dq.overallScore * 100).toFixed(1)}%`);
    console.log(`  Completeness: ${(dq.completeness * 100).toFixed(1)}%`);
    console.log(`  Freshness: ${(dq.freshness * 100).toFixed(1)}%`);
    
    // Optional: Export results
    console.log('\n📤 Exporting results...');
    const jsonExport = await app.exportResults(result, 'json');
    console.log(`✅ JSON export: ${jsonExport.length} bytes`);
    
    // Optional: Create snapshot
    const snapshotId = await app.createSnapshot(result, 'custom-user', 'private');
    console.log(`✅ Snapshot created: ${snapshotId}`);
    
  } catch (error) {
    console.error('❌ Error during comparison:', error);
  } finally {
    await app.shutdown();
  }
  
  console.log('\n✅ Custom comparison completed!');
}

// Run the comparison
if (require.main === module) {
  customComparison().catch(error => {
    console.error('Failed to run comparison:', error);
    process.exit(1);
  });
}

export { customComparison };