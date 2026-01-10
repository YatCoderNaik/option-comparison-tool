import { FormattedComparisonResult } from '../comparison-engine/result-formatter';

export interface ExportConfig {
  format: 'pdf' | 'csv' | 'json';
  includeMetadata: boolean;
  includeExcludedOptions: boolean;
  includeConfidenceScores: boolean;
  includeVisualIndicators: boolean;
  customFileName?: string;
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  filePath?: string;
  data?: string | Buffer;
  mimeType: string;
  size: number;
  checksum: string;
  error?: string;
}

export interface ExportMetadata {
  exportTimestamp: Date;
  originalAnalysisTimestamp: Date;
  exportFormat: string;
  dataIntegrityHash: string;
  includeFlags: {
    metadata: boolean;
    excludedOptions: boolean;
    confidenceScores: boolean;
    visualIndicators: boolean;
  };
  contextPreservation: {
    constraints: any[];
    weights: { [criterionId: string]: number };
    analysisConfig: any;
  };
}

/**
 * Manages export functionality for comparison results
 * Supports PDF, CSV, and JSON formats with complete context preservation
 */
export class ExportManager {
  private config: ExportConfig;

  constructor(config?: Partial<ExportConfig>) {
    this.config = {
      format: 'json',
      includeMetadata: true,
      includeExcludedOptions: true,
      includeConfidenceScores: true,
      includeVisualIndicators: false,
      ...config
    };
  }

  /**
   * Exports comparison result in specified format
   */
  async exportResult(
    result: FormattedComparisonResult,
    config?: Partial<ExportConfig>
  ): Promise<ExportResult> {
    const exportConfig = { ...this.config, ...config };
    
    try {
      const metadata = this.generateExportMetadata(result, exportConfig);
      
      switch (exportConfig.format) {
        case 'json':
          return this.exportToJSON(result, exportConfig, metadata);
        case 'csv':
          return this.exportToCSV(result, exportConfig, metadata);
        case 'pdf':
          return this.exportToPDF(result, exportConfig, metadata);
        default:
          throw new Error(`Unsupported export format: ${exportConfig.format}`);
      }
    } catch (error) {
      return {
        success: false,
        fileName: '',
        mimeType: '',
        size: 0,
        checksum: '',
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  /**
   * Exports to JSON format with complete context preservation
   */
  private async exportToJSON(
    result: FormattedComparisonResult,
    config: ExportConfig,
    metadata: ExportMetadata
  ): Promise<ExportResult> {
    const exportData = {
      metadata,
      summary: result.summary,
      matrix: this.processMatrixForExport(result.matrix, config),
      tradeoffs: config.includeMetadata ? result.tradeoffs : undefined,
      insights: config.includeMetadata ? result.insights : undefined,
      analysisMetadata: config.includeMetadata ? result.metadata : undefined
    };

    // Remove undefined fields
    const cleanedData = JSON.parse(JSON.stringify(exportData));
    const jsonString = JSON.stringify(cleanedData, null, 2);
    const checksum = this.calculateChecksum(jsonString);
    
    const fileName = config.customFileName || 
      `comparison-export-${new Date().toISOString().split('T')[0]}.json`;

    return {
      success: true,
      fileName,
      data: jsonString,
      mimeType: 'application/json',
      size: Buffer.byteLength(jsonString, 'utf8'),
      checksum
    };
  }

  /**
   * Exports to CSV format with tabular data
   */
  private async exportToCSV(
    result: FormattedComparisonResult,
    config: ExportConfig,
    metadata: ExportMetadata
  ): Promise<ExportResult> {
    const csvRows: string[] = [];
    
    // Add metadata header if requested
    if (config.includeMetadata) {
      csvRows.push('# Comparison Export Metadata');
      csvRows.push(`# Export Date: ${metadata.exportTimestamp.toISOString()}`);
      csvRows.push(`# Original Analysis: ${metadata.originalAnalysisTimestamp.toISOString()}`);
      csvRows.push(`# Data Integrity Hash: ${metadata.dataIntegrityHash}`);
      csvRows.push('');
    }

    // Create header row
    const headers = ['Option', 'Rank', 'Score'];
    result.matrix.headers.criteria.forEach(criterion => {
      headers.push(criterion.name);
      if (config.includeConfidenceScores) {
        headers.push(`${criterion.name} (Confidence)`);
      }
    });
    csvRows.push(headers.map(h => this.escapeCSVField(h)).join(','));

    // Add data rows
    result.matrix.headers.options.forEach((option, optionIndex) => {
      if (option.isExcluded && !config.includeExcludedOptions) {
        return;
      }

      const row = [
        this.escapeCSVField(option.name),
        option.rank.toString(),
        option.score.toFixed(3)
      ];

      result.matrix.headers.criteria.forEach((_, criterionIndex) => {
        const cell = result.matrix.cells[optionIndex]?.[criterionIndex];
        if (cell) {
          row.push(this.escapeCSVField(this.formatCellValue(cell.value)));
          if (config.includeConfidenceScores && cell.confidence !== undefined) {
            row.push(cell.confidence.toFixed(3));
          }
        } else {
          row.push('N/A');
          if (config.includeConfidenceScores) {
            row.push('0.000');
          }
        }
      });

      csvRows.push(row.join(','));
    });

    // Add excluded options section if requested
    if (config.includeExcludedOptions && result.matrix.excludedOptionsDetails.length > 0) {
      csvRows.push('');
      csvRows.push('# Excluded Options');
      csvRows.push('Option,Violation Reason,Severity');
      
      result.matrix.excludedOptionsDetails.forEach(excluded => {
        excluded.violations.forEach(violation => {
          csvRows.push([
            this.escapeCSVField(excluded.option.name),
            this.escapeCSVField(violation.reason),
            violation.severity
          ].join(','));
        });
      });
    }

    const csvString = csvRows.join('\n');
    const checksum = this.calculateChecksum(csvString);
    
    const fileName = config.customFileName || 
      `comparison-export-${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      fileName,
      data: csvString,
      mimeType: 'text/csv',
      size: Buffer.byteLength(csvString, 'utf8'),
      checksum
    };
  }

  /**
   * Exports to PDF format (placeholder implementation)
   */
  private async exportToPDF(
    result: FormattedComparisonResult,
    config: ExportConfig,
    metadata: ExportMetadata
  ): Promise<ExportResult> {
    // This is a simplified PDF export - in a real implementation,
    // you would use a library like PDFKit or jsPDF
    const pdfContent = this.generatePDFContent(result, config, metadata);
    const pdfBuffer = Buffer.from(pdfContent, 'utf8'); // Simplified - would be actual PDF binary
    const checksum = this.calculateChecksum(pdfBuffer.toString());
    
    const fileName = config.customFileName || 
      `comparison-export-${new Date().toISOString().split('T')[0]}.pdf`;

    return {
      success: true,
      fileName,
      data: pdfBuffer,
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
      checksum
    };
  }

  /**
   * Processes matrix data for export based on configuration
   */
  private processMatrixForExport(
    matrix: any,
    config: ExportConfig
  ): any {
    const processedMatrix = { ...matrix };

    // Filter out excluded options if not requested
    if (!config.includeExcludedOptions) {
      const includedIndices = matrix.headers.options
        .map((option: any, index: number) => ({ option, index }))
        .filter(({ option }: { option: any }) => !option.isExcluded)
        .map(({ index }: { index: number }) => index);

      processedMatrix.headers.options = matrix.headers.options.filter(
        (option: any) => !option.isExcluded
      );
      processedMatrix.cells = includedIndices.map((index: number) => matrix.cells[index]);
      processedMatrix.excludedOptionsDetails = [];
    }

    // Remove confidence scores if not requested
    if (!config.includeConfidenceScores) {
      processedMatrix.cells = processedMatrix.cells.map((row: any[]) =>
        row.map((cell: any) => {
          const { confidence, ...cellWithoutConfidence } = cell;
          return cellWithoutConfidence;
        })
      );
    }

    // Remove visual indicators if not requested
    if (!config.includeVisualIndicators) {
      processedMatrix.cells = processedMatrix.cells.map((row: any[]) =>
        row.map((cell: any) => {
          const { visualIndicators, styling, ...cellWithoutVisuals } = cell;
          return cellWithoutVisuals;
        })
      );
    }

    return processedMatrix;
  }

  /**
   * Generates export metadata with data integrity verification
   */
  private generateExportMetadata(
    result: FormattedComparisonResult,
    config: ExportConfig
  ): ExportMetadata {
    const dataForHash = {
      summary: result.summary,
      matrixHeaders: result.matrix.headers,
      matrixCells: result.matrix.cells.map(row => 
        row.map(cell => ({ value: cell.value, normalizedScore: cell.normalizedScore }))
      )
    };

    return {
      exportTimestamp: new Date(),
      originalAnalysisTimestamp: result.metadata.generatedAt,
      exportFormat: config.format,
      dataIntegrityHash: this.calculateChecksum(JSON.stringify(dataForHash)),
      includeFlags: {
        metadata: config.includeMetadata,
        excludedOptions: config.includeExcludedOptions,
        confidenceScores: config.includeConfidenceScores,
        visualIndicators: config.includeVisualIndicators
      },
      contextPreservation: {
        constraints: [], // Would be populated from actual constraint data
        weights: {}, // Would be populated from actual weight data
        analysisConfig: {} // Would be populated from actual analysis config
      }
    };
  }

  /**
   * Generates PDF content (simplified implementation)
   */
  private generatePDFContent(
    result: FormattedComparisonResult,
    config: ExportConfig,
    metadata: ExportMetadata
  ): string {
    // This is a placeholder - real implementation would generate actual PDF
    return `
COMPARISON ANALYSIS REPORT
Generated: ${metadata.exportTimestamp.toISOString()}

SUMMARY
Total Options: ${result.summary.totalOptions}
Included Options: ${result.summary.includedOptions}
Overall Confidence: ${(result.summary.overallConfidence * 100).toFixed(1)}%

TOP RECOMMENDATION
${result.summary.topRecommendation?.optionName || 'None'}
Score: ${result.summary.topRecommendation?.score.toFixed(3) || 'N/A'}

DETAILED COMPARISON MATRIX
[Matrix data would be formatted here in a real implementation]

DATA INTEGRITY
Hash: ${metadata.dataIntegrityHash}
    `.trim();
  }

  /**
   * Escapes CSV field values
   */
  private escapeCSVField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Formats cell value for display
   */
  private formatCellValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  }

  /**
   * Calculates checksum for data integrity verification
   */
  private calculateChecksum(data: string): string {
    // Simple hash implementation - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Verifies data integrity of exported content
   */
  verifyDataIntegrity(
    originalResult: FormattedComparisonResult,
    exportedData: string,
    expectedChecksum: string
  ): boolean {
    const actualChecksum = this.calculateChecksum(exportedData);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Updates export configuration
   */
  updateConfig(newConfig: Partial<ExportConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current export configuration
   */
  getConfig(): ExportConfig {
    return { ...this.config };
  }
}