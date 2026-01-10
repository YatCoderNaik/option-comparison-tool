// Test setup for property-based testing with fast-check
import fc from 'fast-check';

// Configure fast-check for consistent property testing
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations per property test as specified
  seed: 42, // Fixed seed for reproducible tests
  verbose: true,
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidOption(): R;
      toBeValidConstraint(): R;
      toHaveValidConfidenceMetrics(): R;
    }
  }
}

// Custom Jest matchers for domain-specific validation
expect.extend({
  toBeValidOption(received: any) {
    const pass = received && 
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      typeof received.description === 'string' &&
      typeof received.category === 'string' &&
      typeof received.attributes === 'object' &&
      typeof received.metadata === 'object';
    
    return {
      message: () => `expected ${received} to be a valid Option`,
      pass,
    };
  },
  
  toBeValidConstraint(received: any) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      typeof received.type === 'string' &&
      typeof received.isHardRequirement === 'boolean' &&
      typeof received.weight === 'number' &&
      received.weight >= 0 && received.weight <= 1;
    
    return {
      message: () => `expected ${received} to be a valid Constraint`,
      pass,
    };
  },
  
  toHaveValidConfidenceMetrics(received: any) {
    const pass = received &&
      typeof received.overall === 'number' &&
      typeof received.dataCompleteness === 'number' &&
      typeof received.dataFreshness === 'number' &&
      typeof received.sourceReliability === 'number' &&
      typeof received.algorithmCertainty === 'number' &&
      received.overall >= 0 && received.overall <= 1;
    
    return {
      message: () => `expected ${received} to have valid confidence metrics`,
      pass,
    };
  },
});