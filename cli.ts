#!/usr/bin/env ts-node

/**
 * Option Comparison Tool - Command Line Interface
 * 
 * Simple CLI for running quick comparisons
 */

import { OptionComparisonApp } from './src/app';
import { Option, Constraint } from './src/types/core';

// Simple CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

async function showHelp() {
  console.log(`
🚀 Option Comparison Tool CLI

Usage:
  npm run cli help              Show this help message
  npm run cli demo              Run the interactive demo
  npm run cli quick             Run a quick comparison example
  npm run cli health            Check system health

Examples:
  npm run cli demo              # Full interactive demo
  npm run cli quick             # Quick API comparison
  npm run cli health            # System status check
`);
}

async function quickComparison() {
  console.log('🚀 Quick API Comparison Example\n');
  
  const app = new OptionComparisonApp();
  await app.initialize();
  
  // Quick comparison: REST vs GraphQL APIs
  const options: Option[] = [
    {
      id: 'rest-api',
      name: 'REST API',
      description: 'Traditional REST-based API',
      category: 'api',
      attributes: {
        learning_curve: { value: 3, unit: 'difficulty' },
        performance: { value: 85, unit: 'score' },
        flexibility: { value: 70, unit: 'score' },
        tooling: { value: 95, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: { completeness: 0.9, freshness: 0.9, reliability: 0.9 },
        entryMethod: 'manual'
      }
    },
    {
      id: 'graphql-api',
      name: 'GraphQL API',
      description: 'Modern query language for APIs',
      category: 'api',
      attributes: {
        learning_curve: { value: 7, unit: 'difficulty' },
        performance: { value: 90, unit: 'score' },
        flexibility: { value: 95, unit: 'score' },
        tooling: { value: 80, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: { completeness: 0.95, freshness: 0.95, reliability: 0.95 },
        entryMethod: 'manual'
      }
    }
  ];
  
  const constraints: Constraint[] = [
    {
      id: 'ease-of-use',
      name: 'Easy to Learn',
      type: 'compatibility',
      isHardRequirement: false,
      weight: 0.4,
      criterionType: 'cost',
      evaluationRule: {
        attributePath: 'learning_curve',
        operator: 'lessThan',
        targetValue: 6
      },
      description: 'Should be easy for team to adopt',
      confidenceLevel: 0.8
    },
    {
      id: 'performance-req',
      name: 'Good Performance',
      type: 'performance',
      isHardRequirement: true,
      weight: 0.6,
      criterionType: 'benefit',
      evaluationRule: {
        attributePath: 'performance',
        operator: 'greaterThan',
        targetValue: 80
      },
      description: 'Must have good performance',
      confidenceLevel: 0.9
    }
  ];
  
  console.log('📊 Comparing REST vs GraphQL APIs...\n');
  
  const result = await app.compareOptions(options, constraints);
  
  console.log(`🏆 Recommendation: ${result.summary.topRecommendation.optionId.toUpperCase()}`);
  console.log(`📈 Confidence: ${(result.summary.topRecommendation.confidence * 100).toFixed(1)}%`);
  console.log(`📊 Options evaluated: ${result.summary.totalOptions}`);
  console.log(`✅ Options meeting requirements: ${result.summary.includedOptions}`);
  
  if (result.insights.summary.length > 0) {
    console.log('\n💡 Key insights:');
    result.insights.summary.slice(0, 2).forEach(insight => {
      console.log(`  • ${insight}`);
    });
  }
  
  await app.shutdown();
  console.log('\n✅ Quick comparison completed!');
}

async function healthCheck() {
  console.log('🏥 System Health Check\n');
  
  const app = new OptionComparisonApp();
  await app.initialize();
  
  try {
    const health = await app.getHealthStatus();
    
    console.log(`Status: ${health.status.toUpperCase()}`);
    console.log(`Version: ${health.version}`);
    console.log(`Uptime: ${Math.floor(health.metrics.uptime)} seconds`);
    console.log(`Active comparisons: ${health.metrics.activeComparisons}`);
    console.log(`Cache size: ${health.metrics.cacheSize}`);
    
    console.log('\nComponents:');
    Object.entries(health.components).forEach(([component, status]) => {
      const icon = status === 'healthy' ? '✅' : '❌';
      console.log(`  ${icon} ${component}: ${status}`);
    });
    
  } catch (error) {
    console.log(`❌ Health check failed: ${error}`);
  }
  
  await app.shutdown();
}

async function main() {
  try {
    switch (command) {
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        await showHelp();
        break;
        
      case 'demo':
        const { runDemo } = await import('./demo');
        await runDemo();
        break;
        
      case 'quick':
        await quickComparison();
        break;
        
      case 'health':
        await healthCheck();
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Run "npm run cli help" for available commands.');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}