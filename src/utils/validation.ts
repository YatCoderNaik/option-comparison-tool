// Basic validation utilities
import { ValidationResult } from '../types';

export function createValidationResult(
  isValid: boolean,
  errors: string[] = [],
  warnings: string[] = []
): ValidationResult {
  return { isValid, errors, warnings };
}

export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.trim() === id;
}

export function isValidWeight(weight: number): boolean {
  return typeof weight === 'number' && weight >= 0 && weight <= 1 && !isNaN(weight);
}

export function isValidConfidence(confidence: number): boolean {
  return typeof confidence === 'number' && confidence >= 0 && confidence <= 1 && !isNaN(confidence);
}

export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}