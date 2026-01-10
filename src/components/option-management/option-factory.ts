// Factory for creating valid Option instances
import { v4 as uuidv4 } from 'uuid';
import {
  Option,
  OptionCategory,
  AttributeValue,
  OptionMetadata,
  EntryMethod,
  QualityScore
} from '../../types';

export interface CreateOptionParams {
  name: string;
  description: string;
  category: OptionCategory;
  attributes: Record<string, Omit<AttributeValue, 'lastUpdated'>>;
  entryMethod?: EntryMethod;
}

export class OptionFactory {
  static create(params: CreateOptionParams): Option {
    const now = new Date();
    
    // Process attributes to add timestamps
    const processedAttributes: Record<string, AttributeValue> = {};
    for (const [key, attr] of Object.entries(params.attributes)) {
      processedAttributes[key] = {
        ...attr,
        lastUpdated: now,
        confidence: attr.confidence ?? 0.8 // Default confidence if not provided
      };
    }

    // Calculate initial data quality
    const dataQuality = this.calculateInitialDataQuality(processedAttributes);

    const metadata: OptionMetadata = {
      dateAdded: now,
      lastUpdated: now,
      dataQuality,
      entryMethod: params.entryMethod ?? 'manual'
    };

    return {
      id: uuidv4(),
      name: params.name.trim(),
      description: params.description.trim(),
      category: params.category,
      attributes: processedAttributes,
      metadata
    };
  }

  static createTemplate(category: OptionCategory): Partial<CreateOptionParams> {
    const templates: Record<OptionCategory, Partial<CreateOptionParams>> = {
      'api': {
        category: 'api',
        attributes: {
          'pricing.freeRequests': { value: 0, unit: 'requests/month' },
          'pricing.paidTier': { value: 0, unit: 'USD/month' },
          'performance.latency': { value: 0, unit: 'ms' },
          'features.authentication': { value: false },
          'features.rateLimit': { value: 0, unit: 'requests/second' },
          'support.documentation': { value: 'good' },
          'reliability.uptime': { value: 99.9, unit: '%' }
        }
      },
      'cloud-service': {
        category: 'cloud-service',
        attributes: {
          'pricing.compute': { value: 0, unit: 'USD/hour' },
          'pricing.storage': { value: 0, unit: 'USD/GB/month' },
          'pricing.bandwidth': { value: 0, unit: 'USD/GB' },
          'performance.cpu': { value: 0, unit: 'vCPUs' },
          'performance.memory': { value: 0, unit: 'GB' },
          'features.autoScaling': { value: false },
          'features.loadBalancer': { value: false },
          'compliance.soc2': { value: false },
          'compliance.gdpr': { value: false }
        }
      },
      'framework': {
        category: 'framework',
        attributes: {
          'performance.bundleSize': { value: 0, unit: 'KB' },
          'performance.renderTime': { value: 0, unit: 'ms' },
          'features.typescript': { value: false },
          'features.ssr': { value: false },
          'community.githubStars': { value: 0, unit: 'stars' },
          'community.npmDownloads': { value: 0, unit: 'downloads/week' },
          'maintenance.lastRelease': { value: new Date().toISOString() },
          'learning.difficulty': { value: 'medium' }
        }
      },
      'tool': {
        category: 'tool',
        attributes: {
          'pricing.license': { value: 'free' },
          'pricing.cost': { value: 0, unit: 'USD/month' },
          'features.platforms': { value: 'cross-platform' },
          'features.integrations': { value: 0, unit: 'count' },
          'usability.learningCurve': { value: 'medium' },
          'support.community': { value: 'active' },
          'support.documentation': { value: 'good' }
        }
      },
      'custom': {
        category: 'custom',
        attributes: {
          'customAttribute1': { value: '' },
          'customAttribute2': { value: 0 }
        }
      }
    };

    return templates[category];
  }

  private static calculateInitialDataQuality(attributes: Record<string, AttributeValue>): QualityScore {
    const attributeCount = Object.keys(attributes).length;
    const attributesWithSource = Object.values(attributes).filter(attr => attr.source).length;
    const attributesWithConfidence = Object.values(attributes).filter(attr => attr.confidence !== undefined).length;
    
    // Completeness: based on having values for all attributes
    const completeness = attributeCount > 0 ? 1.0 : 0.0;
    
    // Freshness: new data is fresh
    const freshness = 1.0;
    
    // Reliability: based on having sources and confidence scores
    const sourceRatio = attributeCount > 0 ? attributesWithSource / attributeCount : 0;
    const confidenceRatio = attributeCount > 0 ? attributesWithConfidence / attributeCount : 0;
    const reliability = (sourceRatio + confidenceRatio) / 2;

    return {
      completeness,
      freshness,
      reliability: Math.max(0.5, reliability) // Minimum 50% reliability for new data
    };
  }
}