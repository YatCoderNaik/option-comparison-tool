// Option validation with comprehensive error handling
import {
  Option,
  ValidationResult,
  OptionValidator as IOptionValidator,
  AttributeValue,
  OptionMetadata,
  OptionCategory
} from '../../types';
import { createValidationResult, isValidId, isValidConfidence, isValidDate } from '../../utils/validation';

export class OptionValidator implements IOptionValidator {
  private readonly VALID_CATEGORIES: OptionCategory[] = ['api', 'cloud-service', 'framework', 'tool', 'custom'];
  private readonly MAX_NAME_LENGTH = 100;
  private readonly MAX_DESCRIPTION_LENGTH = 500;
  private readonly MAX_ATTRIBUTES = 50;
  private readonly MIN_ATTRIBUTES = 1;

  validate(option: Option): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic structure
    if (!option) {
      return createValidationResult(false, ['Option is null or undefined']);
    }

    // Validate ID
    if (!isValidId(option.id)) {
      errors.push('Option ID must be a non-empty string without leading/trailing whitespace');
    }

    // Validate name
    if (!option.name || typeof option.name !== 'string') {
      errors.push('Option name is required and must be a string');
    } else if (option.name.trim() !== option.name) {
      errors.push('Option name cannot have leading or trailing whitespace');
    } else if (option.name.length > this.MAX_NAME_LENGTH) {
      errors.push(`Option name cannot exceed ${this.MAX_NAME_LENGTH} characters`);
    }

    // Validate description
    if (!option.description || typeof option.description !== 'string') {
      errors.push('Option description is required and must be a string');
    } else if (option.description.length > this.MAX_DESCRIPTION_LENGTH) {
      errors.push(`Option description cannot exceed ${this.MAX_DESCRIPTION_LENGTH} characters`);
    }

    // Validate category
    if (!option.category || !this.VALID_CATEGORIES.includes(option.category)) {
      errors.push(`Option category must be one of: ${this.VALID_CATEGORIES.join(', ')}`);
    }

    // Validate attributes
    const attributeValidation = this.validateAttributes(option.attributes);
    errors.push(...attributeValidation.errors);
    warnings.push(...attributeValidation.warnings);

    // Validate metadata
    const metadataValidation = this.validateMetadata(option.metadata);
    errors.push(...metadataValidation.errors);
    warnings.push(...metadataValidation.warnings);

    return createValidationResult(errors.length === 0, errors, warnings);
  }

  validateAttributes(attributes: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!attributes || typeof attributes !== 'object') {
      return createValidationResult(false, ['Attributes must be an object']);
    }

    const attributeKeys = Object.keys(attributes);
    
    // Check attribute count
    if (attributeKeys.length < this.MIN_ATTRIBUTES) {
      errors.push(`Option must have at least ${this.MIN_ATTRIBUTES} attribute`);
    }
    
    if (attributeKeys.length > this.MAX_ATTRIBUTES) {
      errors.push(`Option cannot have more than ${this.MAX_ATTRIBUTES} attributes`);
    }

    // Validate each attribute
    for (const [key, value] of Object.entries(attributes)) {
      if (!key || typeof key !== 'string' || key.trim() !== key) {
        errors.push(`Attribute key "${key}" must be a non-empty string without leading/trailing whitespace`);
        continue;
      }

      const attrValidation = this.validateAttributeValue(value, key);
      errors.push(...attrValidation.errors);
      warnings.push(...attrValidation.warnings);
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  }

  validateMetadata(metadata: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metadata || typeof metadata !== 'object') {
      return createValidationResult(false, ['Metadata must be an object']);
    }

    const meta = metadata as OptionMetadata;

    // Validate dates
    if (!meta.dateAdded || !isValidDate(meta.dateAdded)) {
      errors.push('Metadata must include a valid dateAdded');
    }

    if (!meta.lastUpdated || !isValidDate(meta.lastUpdated)) {
      errors.push('Metadata must include a valid lastUpdated');
    }

    // Check date logic
    if (meta.dateAdded && meta.lastUpdated && meta.dateAdded > meta.lastUpdated) {
      errors.push('dateAdded cannot be after lastUpdated');
    }

    // Validate data quality
    if (!meta.dataQuality) {
      errors.push('Metadata must include dataQuality scores');
    } else {
      const { completeness, freshness, reliability } = meta.dataQuality;
      
      if (!isValidConfidence(completeness)) {
        errors.push('dataQuality.completeness must be a number between 0 and 1');
      }
      
      if (!isValidConfidence(freshness)) {
        errors.push('dataQuality.freshness must be a number between 0 and 1');
      }
      
      if (!isValidConfidence(reliability)) {
        errors.push('dataQuality.reliability must be a number between 0 and 1');
      }

      // Warnings for low quality scores
      if (completeness < 0.5) {
        warnings.push('Data completeness is below 50%');
      }
      
      if (freshness < 0.3) {
        warnings.push('Data freshness is low (below 30%)');
      }
      
      if (reliability < 0.7) {
        warnings.push('Data reliability is below 70%');
      }
    }

    // Validate entry method
    const validEntryMethods = ['manual', 'template', 'api'];
    if (!meta.entryMethod || !validEntryMethods.includes(meta.entryMethod)) {
      errors.push(`entryMethod must be one of: ${validEntryMethods.join(', ')}`);
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  }

  private validateAttributeValue(value: any, attributeName: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!value || typeof value !== 'object') {
      return createValidationResult(false, [`Attribute "${attributeName}" must be an AttributeValue object`]);
    }

    const attr = value as AttributeValue;

    // Validate value field
    if (attr.value === null || attr.value === undefined) {
      errors.push(`Attribute "${attributeName}" must have a value`);
    } else {
      const valueType = typeof attr.value;
      if (valueType !== 'string' && valueType !== 'number' && valueType !== 'boolean') {
        errors.push(`Attribute "${attributeName}" value must be string, number, or boolean`);
      }
      
      // Type-specific validation
      if (valueType === 'string' && (attr.value as string).length === 0) {
        errors.push(`Attribute "${attributeName}" string value cannot be empty`);
      }
      
      if (valueType === 'number' && (isNaN(attr.value as number) || !isFinite(attr.value as number))) {
        errors.push(`Attribute "${attributeName}" number value must be finite`);
      }
    }

    // Validate optional fields
    if (attr.confidence !== undefined && !isValidConfidence(attr.confidence)) {
      errors.push(`Attribute "${attributeName}" confidence must be between 0 and 1`);
    }

    if (attr.lastUpdated !== undefined && !isValidDate(attr.lastUpdated)) {
      errors.push(`Attribute "${attributeName}" lastUpdated must be a valid date`);
    }

    if (attr.source !== undefined && (typeof attr.source !== 'string' || attr.source.length === 0)) {
      errors.push(`Attribute "${attributeName}" source must be a non-empty string`);
    }

    if (attr.unit !== undefined && (typeof attr.unit !== 'string' || attr.unit.length === 0)) {
      errors.push(`Attribute "${attributeName}" unit must be a non-empty string`);
    }

    // Warnings for missing optional but recommended fields
    if (attr.confidence === undefined) {
      warnings.push(`Attribute "${attributeName}" missing confidence score`);
    }

    if (attr.source === undefined) {
      warnings.push(`Attribute "${attributeName}" missing source information`);
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  }
}