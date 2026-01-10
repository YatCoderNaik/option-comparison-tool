// Option manager with comprehensive CRUD operations and error handling
import {
  Option,
  ValidationResult,
  OptionManager as IOptionManager,
  OptionRepository,
  OptionValidator as IOptionValidator
} from '../../types';
import { OptionValidator } from './option-validator';
import { InMemoryOptionRepository } from './option-repository';

export class OptionManager implements IOptionManager {
  private repository: OptionRepository;
  private validator: IOptionValidator;

  constructor(
    repository?: OptionRepository,
    validator?: IOptionValidator
  ) {
    this.repository = repository || new InMemoryOptionRepository();
    this.validator = validator || new OptionValidator();
  }

  async addOption(option: Option): Promise<void> {
    try {
      // Validate the option first
      const validationResult = this.validator.validate(option);
      
      if (!validationResult.isValid) {
        const errorMessage = `Cannot add invalid option: ${validationResult.errors.join(', ')}`;
        throw new Error(errorMessage);
      }

      // Check if option already exists
      const existing = await this.repository.findById(option.id);
      if (existing) {
        throw new Error(`Option with ID ${option.id} already exists. Use update() to modify existing options.`);
      }

      // Save the option
      await this.repository.save(option);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw validation and business logic errors
      }
      throw new Error(`Failed to add option: ${error}`);
    }
  }

  async removeOption(id: string): Promise<void> {
    try {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new Error('Option ID must be a non-empty string');
      }

      // Check if option exists before attempting deletion
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new Error(`Option with ID ${id} not found`);
      }

      // Delete the option
      await this.repository.delete(id);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw validation and business logic errors
      }
      throw new Error(`Failed to remove option: ${error}`);
    }
  }

  validateOption(option: Option): ValidationResult {
    try {
      return this.validator.validate(option);
    } catch (error) {
      // If validation itself fails, return a validation result indicating the failure
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  async getOptions(): Promise<Option[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      throw new Error(`Failed to retrieve options: ${error instanceof Error ? error.message : error}`);
    }
  }

  async getOption(id: string): Promise<Option | null> {
    try {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new Error('Option ID must be a non-empty string');
      }

      return await this.repository.findById(id);
      
    } catch (error) {
      throw new Error(`Failed to retrieve option ${id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  async updateOption(option: Option): Promise<void> {
    try {
      // Validate the updated option
      const validationResult = this.validator.validate(option);
      
      if (!validationResult.isValid) {
        const errorMessage = `Cannot update to invalid option: ${validationResult.errors.join(', ')}`;
        throw new Error(errorMessage);
      }

      // Update the option
      await this.repository.update(option);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw validation and business logic errors
      }
      throw new Error(`Failed to update option: ${error}`);
    }
  }

  async optionExists(id: string): Promise<boolean> {
    try {
      const option = await this.getOption(id);
      return option !== null;
    } catch (error) {
      // If there's an error checking existence, assume it doesn't exist
      return false;
    }
  }

  async getValidOptions(): Promise<Option[]> {
    try {
      const allOptions = await this.getOptions();
      const validOptions: Option[] = [];
      
      for (const option of allOptions) {
        const validation = this.validateOption(option);
        if (validation.isValid) {
          validOptions.push(option);
        }
      }
      
      return validOptions;
      
    } catch (error) {
      throw new Error(`Failed to retrieve valid options: ${error instanceof Error ? error.message : error}`);
    }
  }

  async getInvalidOptions(): Promise<{ option: Option; validation: ValidationResult }[]> {
    try {
      const allOptions = await this.getOptions();
      const invalidOptions: { option: Option; validation: ValidationResult }[] = [];
      
      for (const option of allOptions) {
        const validation = this.validateOption(option);
        if (!validation.isValid) {
          invalidOptions.push({ option, validation });
        }
      }
      
      return invalidOptions;
      
    } catch (error) {
      throw new Error(`Failed to retrieve invalid options: ${error instanceof Error ? error.message : error}`);
    }
  }

  async getOptionsByCategory(category: string): Promise<Option[]> {
    try {
      const allOptions = await this.getOptions();
      return allOptions.filter(option => option.category === category);
    } catch (error) {
      throw new Error(`Failed to retrieve options by category: ${error instanceof Error ? error.message : error}`);
    }
  }

  async searchOptions(query: string): Promise<Option[]> {
    try {
      if (!query || typeof query !== 'string') {
        return [];
      }

      const allOptions = await this.getOptions();
      const lowerQuery = query.toLowerCase();
      
      return allOptions.filter(option => 
        option.name.toLowerCase().includes(lowerQuery) ||
        option.description.toLowerCase().includes(lowerQuery) ||
        option.category.toLowerCase().includes(lowerQuery) ||
        Object.keys(option.attributes).some(key => 
          key.toLowerCase().includes(lowerQuery)
        )
      );
      
    } catch (error) {
      throw new Error(`Failed to search options: ${error instanceof Error ? error.message : error}`);
    }
  }

  async getStats(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    byCategory: Record<string, number>;
  }> {
    try {
      const allOptions = await this.getOptions();
      const validOptions = await this.getValidOptions();
      
      const byCategory: Record<string, number> = {};
      for (const option of allOptions) {
        byCategory[option.category] = (byCategory[option.category] || 0) + 1;
      }
      
      return {
        total: allOptions.length,
        valid: validOptions.length,
        invalid: allOptions.length - validOptions.length,
        byCategory
      };
      
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error instanceof Error ? error.message : error}`);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check if we can retrieve options
      const options = await this.getOptions();
      
      // Check for invalid options
      const invalidOptions = await this.getInvalidOptions();
      if (invalidOptions.length > 0) {
        issues.push(`${invalidOptions.length} invalid options found`);
      }
      
      // Check repository health if available
      if ('healthCheck' in this.repository && typeof this.repository.healthCheck === 'function') {
        const repoHealth = await (this.repository as any).healthCheck();
        if (!repoHealth.healthy) {
          issues.push(...repoHealth.issues.map((issue: string) => `Repository: ${issue}`));
        }
      }
      
      return {
        healthy: issues.length === 0,
        issues
      };
      
    } catch (error) {
      issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        healthy: false,
        issues
      };
    }
  }
}