// In-memory option repository with error handling and failure recovery
import { Option, OptionRepository as IOptionRepository } from '../../types';

export class InMemoryOptionRepository implements IOptionRepository {
  private options = new Map<string, Option>();
  private backupOptions = new Map<string, Option>();
  private lastBackupTime = new Date();
  private readonly BACKUP_INTERVAL_MS = 60000; // 1 minute

  async save(option: Option): Promise<void> {
    try {
      // Create backup before modification
      this.createBackupIfNeeded();
      
      // Deep clone to prevent external mutations
      const clonedOption = this.deepClone(option);
      
      // Store the option
      this.options.set(option.id, clonedOption);
      
      // Update backup
      this.backupOptions.set(option.id, this.deepClone(clonedOption));
      
    } catch (error) {
      throw new Error(`Failed to save option ${option.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<Option | null> {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Option ID must be a non-empty string');
      }

      const option = this.options.get(id);
      
      if (!option) {
        return null;
      }

      // Return deep clone to prevent external mutations
      return this.deepClone(option);
      
    } catch (error) {
      // Try to recover from backup if main storage fails
      try {
        const backupOption = this.backupOptions.get(id);
        if (backupOption) {
          // Restore from backup
          this.options.set(id, this.deepClone(backupOption));
          return this.deepClone(backupOption);
        }
      } catch (backupError) {
        // If backup also fails, throw original error
      }
      
      throw new Error(`Failed to retrieve option ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(): Promise<Option[]> {
    try {
      const allOptions = Array.from(this.options.values());
      
      // Return deep clones to prevent external mutations
      return allOptions.map(option => this.deepClone(option));
      
    } catch (error) {
      // Try to recover from backup
      try {
        const backupOptions = Array.from(this.backupOptions.values());
        
        // Restore all from backup
        this.options.clear();
        for (const option of backupOptions) {
          this.options.set(option.id, this.deepClone(option));
        }
        
        return backupOptions.map(option => this.deepClone(option));
        
      } catch (backupError) {
        throw new Error(`Failed to retrieve options: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Option ID must be a non-empty string');
      }

      // Create backup before deletion
      this.createBackupIfNeeded();
      
      const existed = this.options.has(id);
      
      if (!existed) {
        throw new Error(`Option with ID ${id} not found`);
      }

      // Remove from main storage
      this.options.delete(id);
      
      // Keep in backup for potential recovery
      // (Don't remove from backup immediately)
      
    } catch (error) {
      throw new Error(`Failed to delete option ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(option: Option): Promise<void> {
    try {
      if (!option || !option.id) {
        throw new Error('Option and option ID are required for update');
      }

      // Check if option exists
      const existing = this.options.get(option.id);
      if (!existing) {
        throw new Error(`Option with ID ${option.id} not found`);
      }

      // Create backup before modification
      this.createBackupIfNeeded();
      
      // Update the option
      const clonedOption = this.deepClone(option);
      this.options.set(option.id, clonedOption);
      
      // Update backup
      this.backupOptions.set(option.id, this.deepClone(clonedOption));
      
    } catch (error) {
      throw new Error(`Failed to update option ${option.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility methods for backup and recovery
  async createBackup(): Promise<void> {
    try {
      this.backupOptions.clear();
      
      for (const [id, option] of this.options.entries()) {
        this.backupOptions.set(id, this.deepClone(option));
      }
      
      this.lastBackupTime = new Date();
      
    } catch (error) {
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async restoreFromBackup(): Promise<void> {
    try {
      this.options.clear();
      
      for (const [id, option] of this.backupOptions.entries()) {
        this.options.set(id, this.deepClone(option));
      }
      
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Statistics and health methods
  getStats(): { totalOptions: number; backupAge: number; hasBackup: boolean } {
    return {
      totalOptions: this.options.size,
      backupAge: Date.now() - this.lastBackupTime.getTime(),
      hasBackup: this.backupOptions.size > 0
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check if we can read from storage
      const count = this.options.size;
      
      // Check backup age
      const backupAge = Date.now() - this.lastBackupTime.getTime();
      if (backupAge > this.BACKUP_INTERVAL_MS * 2) {
        issues.push('Backup is outdated');
      }
      
      // Check for data consistency
      if (this.options.size === 0 && this.backupOptions.size > 0) {
        issues.push('Main storage is empty but backup exists - possible data loss');
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

  private createBackupIfNeeded(): void {
    const timeSinceBackup = Date.now() - this.lastBackupTime.getTime();
    
    if (timeSinceBackup > this.BACKUP_INTERVAL_MS) {
      try {
        this.createBackup();
      } catch (error) {
        // Log error but don't fail the operation
        console.warn('Failed to create automatic backup:', error);
      }
    }
  }

  private deepClone(obj: Option): Option {
    try {
      // Simple deep clone using JSON serialization
      // In production, consider using a more robust cloning library
      const serialized = JSON.stringify(obj);
      const cloned = JSON.parse(serialized);
      
      // Restore Date objects
      if (cloned.metadata) {
        if (cloned.metadata.dateAdded) {
          cloned.metadata.dateAdded = new Date(cloned.metadata.dateAdded);
        }
        if (cloned.metadata.lastUpdated) {
          cloned.metadata.lastUpdated = new Date(cloned.metadata.lastUpdated);
        }
      }
      
      if (cloned.attributes) {
        for (const attr of Object.values(cloned.attributes) as any[]) {
          if (attr.lastUpdated) {
            attr.lastUpdated = new Date(attr.lastUpdated);
          }
        }
      }
      
      return cloned;
      
    } catch (error) {
      throw new Error(`Failed to clone option: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}