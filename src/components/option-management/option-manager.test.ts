// Tests for OptionManager with error handling and failure recovery
import { OptionManager } from './option-manager';
import { OptionFactory } from './option-factory';
import { OptionValidator } from './option-validator';
import { InMemoryOptionRepository } from './option-repository';
import { Option, OptionRepository } from '../../types';

describe('OptionManager', () => {
  let manager: OptionManager;
  let repository: InMemoryOptionRepository;
  let validator: OptionValidator;

  beforeEach(() => {
    repository = new InMemoryOptionRepository();
    validator = new OptionValidator();
    manager = new OptionManager(repository, validator);
  });

  describe('addOption', () => {
    test('should add valid option successfully', async () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(option);
      
      const retrieved = await manager.getOption(option.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('Test API');
    });

    test('should reject invalid option', async () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });
      
      // Make it invalid
      option.name = '';

      await expect(manager.addOption(option)).rejects.toThrow('Cannot add invalid option');
    });

    test('should reject duplicate option ID', async () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(option);
      
      // Try to add same option again
      await expect(manager.addOption(option)).rejects.toThrow('already exists');
    });

    test('should handle repository errors gracefully', async () => {
      const mockRepo = {
        save: jest.fn().mockRejectedValue(new Error('Storage failure')),
        findById: jest.fn().mockResolvedValue(null),
        findAll: jest.fn(),
        delete: jest.fn(),
        update: jest.fn()
      } as jest.Mocked<OptionRepository>;

      const managerWithMockRepo = new OptionManager(mockRepo, validator);
      
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await expect(managerWithMockRepo.addOption(option)).rejects.toThrow('Storage failure');
    });
  });

  describe('removeOption', () => {
    test('should remove existing option successfully', async () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(option);
      expect(await manager.optionExists(option.id)).toBe(true);
      
      await manager.removeOption(option.id);
      expect(await manager.optionExists(option.id)).toBe(false);
    });

    test('should reject invalid option ID', async () => {
      await expect(manager.removeOption('')).rejects.toThrow('must be a non-empty string');
      await expect(manager.removeOption('   ')).rejects.toThrow('must be a non-empty string');
    });

    test('should reject removal of non-existent option', async () => {
      await expect(manager.removeOption('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('getOptions', () => {
    test('should return empty array when no options exist', async () => {
      const options = await manager.getOptions();
      expect(options).toEqual([]);
    });

    test('should return all added options', async () => {
      const option1 = OptionFactory.create({
        name: 'API 1',
        description: 'First API',
        category: 'api',
        attributes: { 'test': { value: 'test1' } }
      });

      const option2 = OptionFactory.create({
        name: 'API 2',
        description: 'Second API',
        category: 'api',
        attributes: { 'test': { value: 'test2' } }
      });

      await manager.addOption(option1);
      await manager.addOption(option2);

      const options = await manager.getOptions();
      expect(options).toHaveLength(2);
      expect(options.map(o => o.name)).toContain('API 1');
      expect(options.map(o => o.name)).toContain('API 2');
    });
  });

  describe('getOption', () => {
    test('should return null for non-existent option', async () => {
      const option = await manager.getOption('non-existent');
      expect(option).toBeNull();
    });

    test('should return existing option', async () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(option);
      
      const retrieved = await manager.getOption(option.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('Test API');
    });

    test('should reject invalid option ID', async () => {
      await expect(manager.getOption('')).rejects.toThrow('must be a non-empty string');
    });
  });

  describe('updateOption', () => {
    test('should update existing option successfully', async () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(option);
      
      // Update the option
      option.name = 'Updated API';
      await manager.updateOption(option);
      
      const retrieved = await manager.getOption(option.id);
      expect(retrieved!.name).toBe('Updated API');
    });

    test('should reject invalid updated option', async () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(option);
      
      // Make it invalid
      option.name = '';
      
      await expect(manager.updateOption(option)).rejects.toThrow('Cannot update to invalid option');
    });
  });

  describe('validateOption', () => {
    test('should validate option correctly', () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      const result = manager.validateOption(option);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle validation errors gracefully', () => {
      const invalidOption = { invalid: 'option' } as any;
      
      const result = manager.validateOption(invalidOption);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getValidOptions', () => {
    test('should return only valid options', async () => {
      const validOption = OptionFactory.create({
        name: 'Valid API',
        description: 'A valid API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(validOption);
      
      // Add an invalid option directly to repository (bypassing validation)
      const invalidOption = { ...validOption, id: 'invalid-id', name: '' };
      await repository.save(invalidOption as Option);

      const validOptions = await manager.getValidOptions();
      expect(validOptions).toHaveLength(1);
      expect(validOptions[0].name).toBe('Valid API');
    });
  });

  describe('getInvalidOptions', () => {
    test('should return invalid options with validation results', async () => {
      const validOption = OptionFactory.create({
        name: 'Valid API',
        description: 'A valid API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(validOption);
      
      // Add an invalid option directly to repository
      const invalidOption = { ...validOption, id: 'invalid-id', name: '' };
      await repository.save(invalidOption as Option);

      const invalidOptions = await manager.getInvalidOptions();
      expect(invalidOptions).toHaveLength(1);
      expect(invalidOptions[0].option.id).toBe('invalid-id');
      expect(invalidOptions[0].validation.isValid).toBe(false);
    });
  });

  describe('getOptionsByCategory', () => {
    test('should return options filtered by category', async () => {
      const apiOption = OptionFactory.create({
        name: 'API Option',
        description: 'An API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      const toolOption = OptionFactory.create({
        name: 'Tool Option',
        description: 'A tool',
        category: 'tool',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(apiOption);
      await manager.addOption(toolOption);

      const apiOptions = await manager.getOptionsByCategory('api');
      expect(apiOptions).toHaveLength(1);
      expect(apiOptions[0].name).toBe('API Option');

      const toolOptions = await manager.getOptionsByCategory('tool');
      expect(toolOptions).toHaveLength(1);
      expect(toolOptions[0].name).toBe('Tool Option');
    });
  });

  describe('searchOptions', () => {
    test('should search options by name, description, and category', async () => {
      const option1 = OptionFactory.create({
        name: 'Payment API',
        description: 'Handles payments',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      const option2 = OptionFactory.create({
        name: 'User Service',
        description: 'Manages user accounts',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(option1);
      await manager.addOption(option2);

      // Search by name
      let results = await manager.searchOptions('Payment');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Payment API');

      // Search by description
      results = await manager.searchOptions('user');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('User Service');

      // Search by category
      results = await manager.searchOptions('api');
      expect(results).toHaveLength(2);
    });

    test('should return empty array for invalid query', async () => {
      const results = await manager.searchOptions('');
      expect(results).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('should return correct statistics', async () => {
      const apiOption = OptionFactory.create({
        name: 'API Option',
        description: 'An API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      const toolOption = OptionFactory.create({
        name: 'Tool Option',
        description: 'A tool',
        category: 'tool',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(apiOption);
      await manager.addOption(toolOption);

      const stats = await manager.getStats();
      expect(stats.total).toBe(2);
      expect(stats.valid).toBe(2);
      expect(stats.invalid).toBe(0);
      expect(stats.byCategory.api).toBe(1);
      expect(stats.byCategory.tool).toBe(1);
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status for valid state', async () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(option);

      const health = await manager.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });

    test('should report issues for invalid options', async () => {
      const validOption = OptionFactory.create({
        name: 'Valid API',
        description: 'A valid API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(validOption);
      
      // Add invalid option directly
      const invalidOption = { ...validOption, id: 'invalid-id', name: '' };
      await repository.save(invalidOption as Option);

      const health = await manager.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('1 invalid options found');
    });
  });

  describe('optionExists', () => {
    test('should return true for existing option', async () => {
      const option = OptionFactory.create({
        name: 'Test API',
        description: 'A test API',
        category: 'api',
        attributes: { 'test': { value: 'test' } }
      });

      await manager.addOption(option);
      
      const exists = await manager.optionExists(option.id);
      expect(exists).toBe(true);
    });

    test('should return false for non-existent option', async () => {
      const exists = await manager.optionExists('non-existent');
      expect(exists).toBe(false);
    });

    test('should return false on error', async () => {
      const mockRepo = {
        findById: jest.fn().mockRejectedValue(new Error('Storage error')),
        save: jest.fn(),
        findAll: jest.fn(),
        delete: jest.fn(),
        update: jest.fn()
      } as jest.Mocked<OptionRepository>;

      const managerWithMockRepo = new OptionManager(mockRepo, validator);
      
      const exists = await managerWithMockRepo.optionExists('any-id');
      expect(exists).toBe(false);
    });
  });
});