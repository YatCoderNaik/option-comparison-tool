// Basic test to verify setup
import { VERSION, ALGORITHM_VERSION } from '../index';

describe('Core Setup', () => {
  test('should have correct version information', () => {
    expect(VERSION).toBe('1.0.0');
    expect(ALGORITHM_VERSION).toBe('1.0.0-WSM');
  });

  test('should have working test environment', () => {
    expect(true).toBe(true);
  });
});