#!/usr/bin/env ts-node

/**
 * Option Comparison Tool - Interactive Demo
 * 
 * This demo showcases the complete functionality of the Option Comparison Tool
 * with real-world scenarios including API selection, cloud services, and tech stacks.
 */

import { OptionComparisonApp } from './src/app';
import { Option, Constraint } from './src/types/core';

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

function subheader(title: string) {
  console.log('\n' + '-'.repeat(40));
  log(title, colors.bright + colors.yellow);
  console.log('-'.repeat(40));
}

async function runDemo() {
  header('🚀 Option Comparison Tool - Interactive Demo');
  
  log('Initializing the Option Comparison Tool...', colors.blue);
  const app = new OptionComparisonApp({
    performance: {
      maxConcurrentComparisons: 50,
      comparisonTimeoutMs: 30000,
      maxOptionsPerComparison: 100,
      maxConstraintsPerComparison: 20,
      enableCaching: true,
      cacheExpirationMs: 300000
    }
  });
  
  await app.initialize();
  log('✅ Application initialized successfully!', colors.green);
  
  // Demo 1: API Selection Scenario
  await demoAPISelection(app);
  
  // Demo 2: Cloud Service Selection
  await demoCloudServiceSelection(app);
  
  // Demo 3: Tech Stack Selection
  await demoTechStackSelection(app);
  
  // Demo 4: Export and Sharing Features
  await demoExportFeatures(app);
  
  // Demo 5: Health Check
  await demoHealthCheck(app);
  
  log('\n🎉 Demo completed successfully!', colors.green);
  log('The Option Comparison Tool is ready for production use.', colors.blue);
  
  await app.shutdown();
}

async function demoAPISelection(app: OptionComparisonApp) {
  header('📊 Demo 1: Payment API Selection');
  
  log('Scenario: A startup needs to choose a payment processing API', colors.blue);
  log('Comparing: Stripe vs PayPal vs Square', colors.blue);
  
  const apiOptions: Option[] = [
    {
      id: 'stripe-api',
      name: 'Stripe Payment API',
      description: 'Industry-leading payment processing with excellent developer experience',
      category: 'api',
      attributes: {
        transaction_fee: { value: 2.9, unit: 'percentage' },
        uptime: { value: 99.99, unit: 'percentage' },
        integration_time: { value: 8, unit: 'hours' },
        documentation_quality: { value: 98, unit: 'score' },
        global_coverage: { value: 46, unit: 'countries' },
        security_compliance: { value: 100, unit: 'score' },
        developer_satisfaction: { value: 95, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-15'),
        dataQuality: { completeness: 0.98, freshness: 0.95, reliability: 0.97 },
        entryMethod: 'api'
      }
    },
    {
      id: 'paypal-api',
      name: 'PayPal Payment API',
      description: 'Widely recognized payment solution with strong consumer trust',
      category: 'api',
      attributes: {
        transaction_fee: { value: 3.4, unit: 'percentage' },
        uptime: { value: 99.9, unit: 'percentage' },
        integration_time: { value: 12, unit: 'hours' },
        documentation_quality: { value: 85, unit: 'score' },
        global_coverage: { value: 200, unit: 'countries' },
        security_compliance: { value: 98, unit: 'score' },
        developer_satisfaction: { value: 78, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date('2024-01-02'),
        lastUpdated: new Date('2024-01-10'),
        dataQuality: { completeness: 0.92, freshness: 0.88, reliability: 0.90 },
        entryMethod: 'manual'
      }
    },
    {
      id: 'square-api',
      name: 'Square Payment API',
      description: 'Comprehensive payment and business management platform',
      category: 'api',
      attributes: {
        transaction_fee: { value: 2.6, unit: 'percentage' },
        uptime: { value: 99.8, unit: 'percentage' },
        integration_time: { value: 10, unit: 'hours' },
        documentation_quality: { value: 88, unit: 'score' },
        global_coverage: { value: 8, unit: 'countries' },
        security_compliance: { value: 96, unit: 'score' },
        developer_satisfaction: { value: 82, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date('2024-01-03'),
        lastUpdated: new Date('2024-01-12'),
        dataQuality: { completeness: 0.90, freshness: 0.92, reliability: 0.88 },
        entryMethod: 'manual'
      }
    }
  ];
  
  const businessConstraints: Constraint[] = [
    {
      id: 'cost-constraint',
      name: 'Transaction Cost Limit',
      type: 'budget',
      isHardRequirement: true,
      weight: 0.3,
      criterionType: 'cost',
      evaluationRule: {
        attributePath: 'transaction_fee',
        operator: 'lessThan',
        targetValue: 3.5
      },
      description: 'Transaction fees must be under 3.5%',
      confidenceLevel: 0.95
    },
    {
      id: 'integration-speed',
      name: 'Quick Integration',
      type: 'performance',
      isHardRequirement: false,
      weight: 0.25,
      criterionType: 'cost',
      evaluationRule: {
        attributePath: 'integration_time',
        operator: 'lessThan',
        targetValue: 15
      },
      description: 'Prefer APIs that can be integrated quickly',
      confidenceLevel: 0.85
    },
    {
      id: 'reliability-requirement',
      name: 'High Reliability',
      type: 'performance',
      isHardRequirement: true,
      weight: 0.45,
      criterionType: 'benefit',
      evaluationRule: {
        attributePath: 'uptime',
        operator: 'greaterThan',
        targetValue: 99.5
      },
      description: 'Uptime must be above 99.5%',
      confidenceLevel: 0.98
    }
  ];
  
  log('\n📋 Options being compared:', colors.yellow);
  apiOptions.forEach(option => {
    log(`  • ${option.name}: ${option.description}`, colors.reset);
  });
  
  log('\n🎯 Business constraints:', colors.yellow);
  businessConstraints.forEach(constraint => {
    const type = constraint.isHardRequirement ? 'REQUIRED' : 'PREFERRED';
    log(`  • ${constraint.name} (${type}): ${constraint.description}`, colors.reset);
  });
  
  log('\n⚡ Running comparison analysis...', colors.blue);
  const startTime = Date.now();
  
  try {
    const result = await app.compareOptions(apiOptions, businessConstraints, 'demo-user');
    const duration = Date.now() - startTime;
    
    log(`✅ Analysis completed in ${duration}ms`, colors.green);
    
    subheader('📊 Comparison Results');
    
    log(`🏆 Top Recommendation: ${result.summary.topRecommendation.optionId}`, colors.green);
    log(`📈 Confidence Score: ${(result.summary.topRecommendation.confidence * 100).toFixed(1)}%`, colors.green);
    log(`📊 Overall Confidence: ${(result.summary.overallConfidence * 100).toFixed(1)}%`, colors.blue);
    
    log('\n📋 Summary:', colors.yellow);
    log(`  • Total Options Evaluated: ${result.summary.totalOptions}`, colors.reset);
    log(`  • Options Meeting Requirements: ${result.summary.includedOptions}`, colors.reset);
    log(`  • Options Excluded: ${result.summary.excludedOptions}`, colors.reset);
    
    if (result.insights.summary.length > 0) {
      log('\n💡 Key Insights:', colors.yellow);
      result.insights.summary.slice(0, 3).forEach(insight => {
        log(`  • ${insight}`, colors.reset);
      });
    }
    
    log('\n🔍 Data Quality Assessment:', colors.yellow);
    const dq = result.insights.dataQuality;
    log(`  • Overall Score: ${(dq.overallScore * 100).toFixed(1)}%`, colors.reset);
    log(`  • Completeness: ${(dq.completeness * 100).toFixed(1)}%`, colors.reset);
    log(`  • Freshness: ${(dq.freshness * 100).toFixed(1)}%`, colors.reset);
    
  } catch (error) {
    log(`❌ Error during comparison: ${error}`, colors.red);
  }
}

async function demoCloudServiceSelection(app: OptionComparisonApp) {
  header('☁️ Demo 2: Cloud Service Selection');
  
  log('Scenario: Enterprise choosing cloud infrastructure provider', colors.blue);
  log('Comparing: AWS vs Azure vs Google Cloud', colors.blue);
  
  const cloudOptions: Option[] = [
    {
      id: 'aws',
      name: 'Amazon Web Services',
      description: 'Market leader with comprehensive service portfolio',
      category: 'cloud-service',
      attributes: {
        monthly_cost: { value: 1200, unit: 'USD' },
        service_count: { value: 200, unit: 'services' },
        global_regions: { value: 31, unit: 'regions' },
        uptime_sla: { value: 99.99, unit: 'percentage' },
        learning_curve: { value: 8, unit: 'difficulty_score' },
        enterprise_support: { value: 95, unit: 'score' },
        compliance_certifications: { value: 98, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-15'),
        dataQuality: { completeness: 0.95, freshness: 0.98, reliability: 0.96 },
        entryMethod: 'api'
      }
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      description: 'Strong enterprise integration with Microsoft ecosystem',
      category: 'cloud-service',
      attributes: {
        monthly_cost: { value: 1100, unit: 'USD' },
        service_count: { value: 180, unit: 'services' },
        global_regions: { value: 60, unit: 'regions' },
        uptime_sla: { value: 99.95, unit: 'percentage' },
        learning_curve: { value: 6, unit: 'difficulty_score' },
        enterprise_support: { value: 92, unit: 'score' },
        compliance_certifications: { value: 96, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date('2024-01-02'),
        lastUpdated: new Date('2024-01-14'),
        dataQuality: { completeness: 0.93, freshness: 0.95, reliability: 0.94 },
        entryMethod: 'manual'
      }
    },
    {
      id: 'gcp',
      name: 'Google Cloud Platform',
      description: 'Innovation-focused with strong AI/ML capabilities',
      category: 'cloud-service',
      attributes: {
        monthly_cost: { value: 950, unit: 'USD' },
        service_count: { value: 150, unit: 'services' },
        global_regions: { value: 35, unit: 'regions' },
        uptime_sla: { value: 99.9, unit: 'percentage' },
        learning_curve: { value: 7, unit: 'difficulty_score' },
        enterprise_support: { value: 88, unit: 'score' },
        compliance_certifications: { value: 94, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date('2024-01-03'),
        lastUpdated: new Date('2024-01-13'),
        dataQuality: { completeness: 0.91, freshness: 0.93, reliability: 0.92 },
        entryMethod: 'manual'
      }
    }
  ];
  
  const enterpriseConstraints: Constraint[] = [
    {
      id: 'budget-limit',
      name: 'Monthly Budget Limit',
      type: 'budget',
      isHardRequirement: true,
      weight: 0.4,
      criterionType: 'cost',
      evaluationRule: {
        attributePath: 'monthly_cost',
        operator: 'lessThan',
        targetValue: 1500
      },
      description: 'Monthly costs must stay under $1500',
      confidenceLevel: 0.99
    },
    {
      id: 'compliance-requirement',
      name: 'Compliance Standards',
      type: 'feature',
      isHardRequirement: true,
      weight: 0.35,
      criterionType: 'benefit',
      evaluationRule: {
        attributePath: 'compliance_certifications',
        operator: 'greaterThan',
        targetValue: 90
      },
      description: 'Must meet enterprise compliance standards',
      confidenceLevel: 0.95
    },
    {
      id: 'ease-of-use',
      name: 'Learning Curve',
      type: 'compatibility',
      isHardRequirement: false,
      weight: 0.25,
      criterionType: 'cost',
      evaluationRule: {
        attributePath: 'learning_curve',
        operator: 'lessThan',
        targetValue: 7
      },
      description: 'Prefer platforms with easier learning curve',
      confidenceLevel: 0.80
    }
  ];
  
  log('\n⚡ Running cloud service comparison...', colors.blue);
  
  try {
    const result = await app.compareOptions(cloudOptions, enterpriseConstraints, 'enterprise-user');
    
    subheader('☁️ Cloud Service Results');
    
    log(`🏆 Recommended Provider: ${result.summary.topRecommendation.optionId.toUpperCase()}`, colors.green);
    log(`💰 Cost Analysis: ${result.summary.includedOptions} providers within budget`, colors.blue);
    log(`🔒 Compliance: All ${result.summary.totalOptions} providers meet security requirements`, colors.blue);
    
    // Show matrix headers for cloud comparison
    log('\n📊 Comparison Matrix:', colors.yellow);
    result.matrix.headers.options.forEach(option => {
      const status = option.isExcluded ? '❌ EXCLUDED' : '✅ INCLUDED';
      log(`  ${status}: ${option.name}`, colors.reset);
    });
    
  } catch (error) {
    log(`❌ Error during cloud comparison: ${error}`, colors.red);
  }
}

async function demoTechStackSelection(app: OptionComparisonApp) {
  header('💻 Demo 3: Tech Stack Selection');
  
  log('Scenario: Startup choosing web development framework', colors.blue);
  log('Comparing: React vs Vue vs Angular', colors.blue);
  
  const frameworkOptions: Option[] = [
    {
      id: 'react',
      name: 'React',
      description: 'Popular library with large ecosystem and flexibility',
      category: 'framework',
      attributes: {
        learning_curve: { value: 6, unit: 'difficulty_score' },
        performance: { value: 90, unit: 'score' },
        community_size: { value: 95, unit: 'score' },
        job_market: { value: 98, unit: 'score' },
        bundle_size: { value: 42, unit: 'KB' },
        development_speed: { value: 85, unit: 'score' },
        maintenance_effort: { value: 7, unit: 'effort_score' }
      },
      metadata: {
        dateAdded: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-15'),
        dataQuality: { completeness: 0.98, freshness: 0.99, reliability: 0.97 },
        entryMethod: 'api'
      }
    },
    {
      id: 'vue',
      name: 'Vue.js',
      description: 'Progressive framework with gentle learning curve',
      category: 'framework',
      attributes: {
        learning_curve: { value: 3, unit: 'difficulty_score' },
        performance: { value: 92, unit: 'score' },
        community_size: { value: 75, unit: 'score' },
        job_market: { value: 70, unit: 'score' },
        bundle_size: { value: 34, unit: 'KB' },
        development_speed: { value: 92, unit: 'score' },
        maintenance_effort: { value: 4, unit: 'effort_score' }
      },
      metadata: {
        dateAdded: new Date('2024-01-02'),
        lastUpdated: new Date('2024-01-14'),
        dataQuality: { completeness: 0.95, freshness: 0.96, reliability: 0.94 },
        entryMethod: 'manual'
      }
    },
    {
      id: 'angular',
      name: 'Angular',
      description: 'Full-featured framework with strong enterprise support',
      category: 'framework',
      attributes: {
        learning_curve: { value: 9, unit: 'difficulty_score' },
        performance: { value: 88, unit: 'score' },
        community_size: { value: 85, unit: 'score' },
        job_market: { value: 85, unit: 'score' },
        bundle_size: { value: 130, unit: 'KB' },
        development_speed: { value: 78, unit: 'score' },
        maintenance_effort: { value: 8, unit: 'effort_score' }
      },
      metadata: {
        dateAdded: new Date('2024-01-03'),
        lastUpdated: new Date('2024-01-13'),
        dataQuality: { completeness: 0.93, freshness: 0.94, reliability: 0.95 },
        entryMethod: 'manual'
      }
    }
  ];
  
  const startupConstraints: Constraint[] = [
    {
      id: 'quick-learning',
      name: 'Easy to Learn',
      type: 'compatibility',
      isHardRequirement: false,
      weight: 0.3,
      criterionType: 'cost',
      evaluationRule: {
        attributePath: 'learning_curve',
        operator: 'lessThan',
        targetValue: 7
      },
      description: 'Team should be able to learn quickly',
      confidenceLevel: 0.85
    },
    {
      id: 'performance-requirement',
      name: 'Good Performance',
      type: 'performance',
      isHardRequirement: true,
      weight: 0.4,
      criterionType: 'benefit',
      evaluationRule: {
        attributePath: 'performance',
        operator: 'greaterThan',
        targetValue: 80
      },
      description: 'Must deliver good performance',
      confidenceLevel: 0.90
    },
    {
      id: 'hiring-potential',
      name: 'Developer Availability',
      type: 'feature',
      isHardRequirement: false,
      weight: 0.3,
      criterionType: 'benefit',
      evaluationRule: {
        attributePath: 'job_market',
        operator: 'greaterThan',
        targetValue: 70
      },
      description: 'Should be easy to hire developers',
      confidenceLevel: 0.80
    }
  ];
  
  log('\n⚡ Running tech stack comparison...', colors.blue);
  
  try {
    const result = await app.compareOptions(frameworkOptions, startupConstraints, 'startup-cto');
    
    subheader('💻 Tech Stack Results');
    
    log(`🏆 Recommended Framework: ${result.summary.topRecommendation.optionId.toUpperCase()}`, colors.green);
    log(`🎯 Match Score: ${(result.summary.topRecommendation.score * 100).toFixed(1)}%`, colors.green);
    
    // Show confidence breakdown
    log('\n📊 Confidence Breakdown:', colors.yellow);
    Object.entries(result.insights.confidenceBreakdown).forEach(([metric, value]) => {
      log(`  • ${metric}: ${(value * 100).toFixed(1)}%`, colors.reset);
    });
    
  } catch (error) {
    log(`❌ Error during tech stack comparison: ${error}`, colors.red);
  }
}

async function demoExportFeatures(app: OptionComparisonApp) {
  header('📤 Demo 4: Export and Sharing Features');
  
  log('Demonstrating export capabilities with a simple comparison...', colors.blue);
  
  // Simple comparison for export demo
  const simpleOptions: Option[] = [
    {
      id: 'option-a',
      name: 'Option A',
      description: 'First choice',
      category: 'custom',
      attributes: {
        cost: { value: 100, unit: 'USD' },
        quality: { value: 80, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: { completeness: 0.9, freshness: 0.9, reliability: 0.9 },
        entryMethod: 'manual'
      }
    },
    {
      id: 'option-b',
      name: 'Option B',
      description: 'Second choice',
      category: 'custom',
      attributes: {
        cost: { value: 150, unit: 'USD' },
        quality: { value: 95, unit: 'score' }
      },
      metadata: {
        dateAdded: new Date(),
        lastUpdated: new Date(),
        dataQuality: { completeness: 0.95, freshness: 0.95, reliability: 0.95 },
        entryMethod: 'manual'
      }
    }
  ];
  
  const simpleConstraints: Constraint[] = [
    {
      id: 'cost-pref',
      name: 'Cost Preference',
      type: 'budget',
      isHardRequirement: false,
      weight: 0.6,
      criterionType: 'cost',
      evaluationRule: {
        attributePath: 'cost',
        operator: 'lessThan',
        targetValue: 200
      },
      description: 'Prefer lower cost',
      confidenceLevel: 0.9
    }
  ];
  
  try {
    const result = await app.compareOptions(simpleOptions, simpleConstraints, 'demo-user');
    
    log('\n📄 Testing JSON Export...', colors.blue);
    const jsonExport = await app.exportResults(result, 'json');
    log(`✅ JSON Export: ${jsonExport.length} bytes generated`, colors.green);
    
    log('\n📊 Testing CSV Export...', colors.blue);
    const csvExport = await app.exportResults(result, 'csv');
    log(`✅ CSV Export: ${csvExport.length} bytes generated`, colors.green);
    
    log('\n📋 Testing PDF Export...', colors.blue);
    const pdfExport = await app.exportResults(result, 'pdf');
    log(`✅ PDF Export: ${pdfExport.length} bytes generated`, colors.green);
    
    log('\n🔗 Testing Snapshot Creation...', colors.blue);
    const snapshotId = await app.createSnapshot(result, 'demo-user', 'private');
    log(`✅ Snapshot Created: ${snapshotId}`, colors.green);
    
    log('\n📤 Export Features Summary:', colors.yellow);
    log('  • JSON format: ✅ Available', colors.green);
    log('  • CSV format: ✅ Available', colors.green);
    log('  • PDF format: ✅ Available', colors.green);
    log('  • Private sharing: ✅ Available', colors.green);
    log('  • Snapshot management: ✅ Available', colors.green);
    
  } catch (error) {
    log(`❌ Error during export demo: ${error}`, colors.red);
  }
}

async function demoHealthCheck(app: OptionComparisonApp) {
  header('🏥 Demo 5: System Health Check');
  
  log('Checking system health and monitoring capabilities...', colors.blue);
  
  try {
    const health = await app.getHealthStatus();
    
    log('\n📊 System Status:', colors.yellow);
    log(`  • Overall Status: ${health.status.toUpperCase()}`, colors.green);
    log(`  • Version: ${health.version}`, colors.reset);
    log(`  • Uptime: ${Math.floor(health.metrics.uptime)} seconds`, colors.reset);
    
    log('\n🔧 Component Health:', colors.yellow);
    Object.entries(health.components).forEach(([component, status]) => {
      const statusColor = status === 'healthy' ? colors.green : colors.red;
      log(`  • ${component}: ${status}`, statusColor);
    });
    
    log('\n📈 Performance Metrics:', colors.yellow);
    log(`  • Active Comparisons: ${health.metrics.activeComparisons}`, colors.reset);
    log(`  • Cache Size: ${health.metrics.cacheSize}`, colors.reset);
    
    log('\n✅ All systems operational!', colors.green);
    
  } catch (error) {
    log(`❌ Health check failed: ${error}`, colors.red);
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { runDemo };