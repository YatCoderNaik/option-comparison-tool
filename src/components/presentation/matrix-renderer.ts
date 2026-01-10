import { FormattedComparisonResult, FormattedDecisionMatrix } from '../comparison-engine/result-formatter';

export interface MatrixRenderConfig {
  maxSyncDataPoints: number; // Default: 50
  chunkSize: number; // Default: 25
  pageSize: number; // Default: 50
  showConfidenceIndicators: boolean;
  showVisualDifferences: boolean;
  enableAspectFiltering: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface RenderingStrategy {
  type: 'sync' | 'chunked' | 'paginated';
  totalDataPoints: number;
  estimatedRenderTime: number;
  memoryFootprint: 'low' | 'medium' | 'high';
}

export interface MatrixCell {
  value: any;
  displayValue: string;
  normalizedScore?: number;
  confidence?: number;
  isMissing: boolean;
  violatesConstraint?: boolean;
  violationReason?: string;
  visualIndicators: {
    confidenceLevel: 'high' | 'medium' | 'low';
    differenceLevel: 'significant' | 'moderate' | 'minimal';
    isOptimal: boolean;
    isSuboptimal: boolean;
  };
  styling: {
    backgroundColor?: string;
    textColor?: string;
    borderStyle?: string;
    opacity?: number;
  };
}

export interface RenderedMatrix {
  headers: {
    options: Array<{
      id: string;
      name: string;
      rank: number;
      score: number;
      isExcluded: boolean;
      confidenceIndicator: 'high' | 'medium' | 'low';
      visualStyle: {
        backgroundColor?: string;
        textColor?: string;
        borderColor?: string;
      };
    }>;
    criteria: Array<{
      id: string;
      name: string;
      type: string;
      weight: number;
      criterionType: 'benefit' | 'cost' | 'neutral';
      isHardRequirement: boolean;
      isFiltered: boolean;
      sortDirection?: 'asc' | 'desc';
    }>;
  };
  cells: MatrixCell[][];
  excludedOptions: Array<{
    option: any;
    violations: Array<{
      constraintName: string;
      reason: string;
      severity: 'critical' | 'warning';
    }>;
    canBeIncluded: boolean;
    toggleAction?: () => void;
  }>;
  renderingMetadata: {
    strategy: RenderingStrategy;
    totalCells: number;
    renderedCells: number;
    isComplete: boolean;
    nextChunkAvailable: boolean;
    progressPercentage: number;
  };
  aspectFilters: {
    available: string[];
    active: string[];
    suggestions: string[];
  };
}

export interface ProgressiveRenderState {
  currentChunk: number;
  totalChunks: number;
  renderedRows: number;
  totalRows: number;
  isLoading: boolean;
  error?: string;
}

export class MatrixRenderer {
  private config: MatrixRenderConfig;
  private renderState: ProgressiveRenderState;

  constructor(config?: Partial<MatrixRenderConfig>) {
    this.config = {
      maxSyncDataPoints: 50,
      chunkSize: 25,
      pageSize: 50,
      showConfidenceIndicators: true,
      showVisualDifferences: true,
      enableAspectFiltering: true,
      theme: 'auto',
      ...config
    };

    this.renderState = {
      currentChunk: 0,
      totalChunks: 0,
      renderedRows: 0,
      totalRows: 0,
      isLoading: false
    };
  }

  /**
   * Main rendering method that determines strategy and renders matrix
   */
  async renderMatrix(
    result: FormattedComparisonResult,
    aspectFilters: string[] = []
  ): Promise<RenderedMatrix> {
    const strategy = this.determineRenderingStrategy(result.matrix);
    
    switch (strategy.type) {
      case 'sync':
        return this.renderSynchronous(result, aspectFilters);
      case 'chunked':
        return this.renderChunked(result, aspectFilters);
      case 'paginated':
        return this.renderPaginated(result, aspectFilters, 1);
      default:
        throw new Error(`Unknown rendering strategy: ${strategy.type}`);
    }
  }

  /**
   * Determines the appropriate rendering strategy based on data size
   */
  private determineRenderingStrategy(matrix: FormattedDecisionMatrix): RenderingStrategy {
    const totalDataPoints = matrix.headers.options.length * matrix.headers.criteria.length;
    
    if (totalDataPoints <= this.config.maxSyncDataPoints) {
      return {
        type: 'sync',
        totalDataPoints,
        estimatedRenderTime: totalDataPoints * 0.1, // 0.1ms per data point
        memoryFootprint: 'low'
      };
    } else if (totalDataPoints <= 200) {
      return {
        type: 'chunked',
        totalDataPoints,
        estimatedRenderTime: totalDataPoints * 0.2,
        memoryFootprint: 'medium'
      };
    } else {
      return {
        type: 'paginated',
        totalDataPoints,
        estimatedRenderTime: totalDataPoints * 0.3,
        memoryFootprint: 'high'
      };
    }
  }

  /**
   * Synchronous rendering for small datasets
   */
  private async renderSynchronous(
    result: FormattedComparisonResult,
    aspectFilters: string[]
  ): Promise<RenderedMatrix> {
    const filteredMatrix = this.applyAspectFilters(result.matrix, aspectFilters);
    const strategy = this.determineRenderingStrategy(filteredMatrix);

    // Render all cells at once
    const renderedCells = this.renderCells(filteredMatrix, result.insights);
    const renderedHeaders = this.renderHeaders(filteredMatrix);
    const renderedExcluded = this.renderExcludedOptions(filteredMatrix);

    return {
      headers: renderedHeaders,
      cells: renderedCells,
      excludedOptions: renderedExcluded,
      renderingMetadata: {
        strategy,
        totalCells: renderedCells.flat().length,
        renderedCells: renderedCells.flat().length,
        isComplete: true,
        nextChunkAvailable: false,
        progressPercentage: 100
      },
      aspectFilters: this.generateAspectFilters(result.matrix, aspectFilters)
    };
  }

  /**
   * Chunked rendering for medium datasets
   */
  private async renderChunked(
    result: FormattedComparisonResult,
    aspectFilters: string[]
  ): Promise<RenderedMatrix> {
    const filteredMatrix = this.applyAspectFilters(result.matrix, aspectFilters);
    const strategy = this.determineRenderingStrategy(filteredMatrix);

    // Calculate chunks
    const totalRows = filteredMatrix.headers.options.length;
    const totalChunks = Math.ceil(totalRows / this.config.chunkSize);
    
    this.renderState = {
      currentChunk: 0,
      totalChunks,
      renderedRows: 0,
      totalRows,
      isLoading: true
    };

    // Render first chunk
    const firstChunkRows = Math.min(this.config.chunkSize, totalRows);
    const partialCells = this.renderCellsChunk(filteredMatrix, result.insights, 0, firstChunkRows);
    
    this.renderState.renderedRows = firstChunkRows;
    this.renderState.currentChunk = 1;
    this.renderState.isLoading = false;

    return {
      headers: this.renderHeaders(filteredMatrix),
      cells: partialCells,
      excludedOptions: this.renderExcludedOptions(filteredMatrix),
      renderingMetadata: {
        strategy,
        totalCells: totalRows * filteredMatrix.headers.criteria.length,
        renderedCells: partialCells.flat().length,
        isComplete: firstChunkRows >= totalRows,
        nextChunkAvailable: firstChunkRows < totalRows,
        progressPercentage: (firstChunkRows / totalRows) * 100
      },
      aspectFilters: this.generateAspectFilters(result.matrix, aspectFilters)
    };
  }

  /**
   * Paginated rendering for large datasets
   */
  private async renderPaginated(
    result: FormattedComparisonResult,
    aspectFilters: string[],
    page: number = 1
  ): Promise<RenderedMatrix> {
    const filteredMatrix = this.applyAspectFilters(result.matrix, aspectFilters);
    const strategy = this.determineRenderingStrategy(filteredMatrix);

    const totalRows = filteredMatrix.headers.options.length;
    const startRow = (page - 1) * this.config.pageSize;
    const endRow = Math.min(startRow + this.config.pageSize, totalRows);

    // Render only the requested page
    const pageCells = this.renderCellsChunk(filteredMatrix, result.insights, startRow, endRow);

    return {
      headers: this.renderHeaders(filteredMatrix),
      cells: pageCells,
      excludedOptions: this.renderExcludedOptions(filteredMatrix),
      renderingMetadata: {
        strategy,
        totalCells: totalRows * filteredMatrix.headers.criteria.length,
        renderedCells: pageCells.flat().length,
        isComplete: endRow >= totalRows,
        nextChunkAvailable: endRow < totalRows,
        progressPercentage: (endRow / totalRows) * 100
      },
      aspectFilters: this.generateAspectFilters(result.matrix, aspectFilters)
    };
  }

  /**
   * Renders the next chunk for chunked rendering
   */
  async renderNextChunk(
    result: FormattedComparisonResult,
    aspectFilters: string[] = []
  ): Promise<{ cells: MatrixCell[][]; isComplete: boolean; progressPercentage: number }> {
    if (this.renderState.isLoading || this.renderState.renderedRows >= this.renderState.totalRows) {
      return { cells: [], isComplete: true, progressPercentage: 100 };
    }

    const filteredMatrix = this.applyAspectFilters(result.matrix, aspectFilters);
    
    const startRow = this.renderState.renderedRows;
    const endRow = Math.min(startRow + this.config.chunkSize, this.renderState.totalRows);
    
    this.renderState.isLoading = true;
    
    // Simulate async rendering delay for large chunks
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const chunkCells = this.renderCellsChunk(filteredMatrix, result.insights, startRow, endRow);
    
    this.renderState.renderedRows = endRow;
    this.renderState.currentChunk++;
    this.renderState.isLoading = false;
    
    const isComplete = endRow >= this.renderState.totalRows;
    const progressPercentage = (endRow / this.renderState.totalRows) * 100;

    return { cells: chunkCells, isComplete, progressPercentage };
  }

  /**
   * Applies aspect filtering to focus on specific criteria
   */
  private applyAspectFilters(
    matrix: FormattedDecisionMatrix,
    aspectFilters: string[]
  ): FormattedDecisionMatrix {
    if (!this.config.enableAspectFiltering || aspectFilters.length === 0) {
      return matrix;
    }

    // Filter criteria based on aspect filters
    const filteredCriteria = matrix.headers.criteria.filter(criterion => {
      return aspectFilters.some(filter => 
        criterion.name.toLowerCase().includes(filter.toLowerCase()) ||
        criterion.type.toLowerCase().includes(filter.toLowerCase()) ||
        criterion.criterionType.toLowerCase().includes(filter.toLowerCase())
      );
    });

    // Get indices of filtered criteria
    const filteredIndices = filteredCriteria.map(criterion => 
      matrix.headers.criteria.findIndex(c => c.id === criterion.id)
    );

    // Filter cell data to match filtered criteria
    const filteredCells = matrix.cells.map(row => 
      filteredIndices.map(index => row[index]).filter(cell => cell !== undefined)
    );

    return {
      ...matrix,
      headers: {
        ...matrix.headers,
        criteria: filteredCriteria.map(criterion => ({ ...criterion, isFiltered: true }))
      },
      cells: filteredCells
    };
  }

  /**
   * Renders matrix headers with visual indicators
   */
  private renderHeaders(matrix: FormattedDecisionMatrix) {
    const optionHeaders = matrix.headers.options.map(option => ({
      ...option,
      confidenceIndicator: this.getConfidenceIndicator(option.score),
      visualStyle: this.getOptionHeaderStyle(option)
    }));

    const criteriaHeaders = matrix.headers.criteria.map(criterion => ({
      ...criterion,
      isFiltered: false // Remove isFiltered property access since it doesn't exist
    }));

    return { options: optionHeaders, criteria: criteriaHeaders };
  }

  /**
   * Renders matrix cells with visual indicators and confidence levels
   */
  private renderCells(
    matrix: FormattedDecisionMatrix,
    insights: any
  ): MatrixCell[][] {
    return this.renderCellsChunk(matrix, insights, 0, matrix.headers.options.length);
  }

  /**
   * Renders a chunk of matrix cells
   */
  private renderCellsChunk(
    matrix: FormattedDecisionMatrix,
    insights: any,
    startRow: number,
    endRow: number
  ): MatrixCell[][] {
    const renderedCells: MatrixCell[][] = [];

    for (let optionIndex = startRow; optionIndex < endRow; optionIndex++) {
      const optionCells: MatrixCell[] = [];
      
      for (let criterionIndex = 0; criterionIndex < matrix.headers.criteria.length; criterionIndex++) {
        const cellData = matrix.cells[optionIndex]?.[criterionIndex];
        
        if (cellData) {
          const renderedCell = this.renderCell(
            cellData,
            optionIndex,
            criterionIndex,
            matrix,
            insights
          );
          optionCells.push(renderedCell);
        }
      }
      
      renderedCells.push(optionCells);
    }

    return renderedCells;
  }

  /**
   * Renders an individual cell with visual indicators
   */
  private renderCell(
    cellData: any,
    optionIndex: number,
    criterionIndex: number,
    matrix: FormattedDecisionMatrix,
    insights: any
  ): MatrixCell {
    const criterion = matrix.headers.criteria[criterionIndex];
    const option = matrix.headers.options[optionIndex];

    // Calculate visual indicators
    const visualIndicators = this.calculateVisualIndicators(
      cellData,
      optionIndex,
      criterionIndex,
      matrix
    );

    // Apply styling based on indicators and theme
    const styling = this.calculateCellStyling(visualIndicators, cellData, criterion);

    return {
      value: cellData.value,
      displayValue: this.formatDisplayValue(cellData.value, criterion),
      normalizedScore: cellData.normalizedScore,
      confidence: cellData.confidence,
      isMissing: cellData.isMissing,
      violatesConstraint: cellData.violatesConstraint,
      violationReason: cellData.violationReason,
      visualIndicators,
      styling
    };
  }

  /**
   * Calculates visual indicators for a cell
   */
  private calculateVisualIndicators(
    cellData: any,
    optionIndex: number,
    criterionIndex: number,
    matrix: FormattedDecisionMatrix
  ) {
    const confidence = cellData.confidence || 0;
    const normalizedScore = cellData.normalizedScore || 0;
    
    // Calculate confidence level
    const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low';
    
    // Calculate difference level by comparing with other options
    const otherScores = matrix.cells
      .map(row => row[criterionIndex]?.normalizedScore || 0)
      .filter((_, index) => index !== optionIndex);
    
    const avgOtherScores = otherScores.length > 0 
      ? otherScores.reduce((sum, score) => sum + score, 0) / otherScores.length 
      : 0;
    
    const scoreDifference = Math.abs(normalizedScore - avgOtherScores);
    const differenceLevel = scoreDifference >= 0.3 ? 'significant' : 
                           scoreDifference >= 0.15 ? 'moderate' : 'minimal';

    // Determine if this is optimal/suboptimal
    const maxScore = Math.max(...matrix.cells.map(row => row[criterionIndex]?.normalizedScore || 0));
    const minScore = Math.min(...matrix.cells.map(row => row[criterionIndex]?.normalizedScore || 0));
    
    const isOptimal = normalizedScore === maxScore && maxScore > minScore;
    const isSuboptimal = normalizedScore === minScore && maxScore > minScore;

    return {
      confidenceLevel: confidenceLevel as 'low' | 'medium' | 'high',
      differenceLevel: differenceLevel as 'significant' | 'moderate' | 'minimal',
      isOptimal,
      isSuboptimal
    };
  }

  /**
   * Calculates cell styling based on visual indicators
   */
  private calculateCellStyling(
    indicators: any,
    cellData: any,
    criterion: any
  ) {
    const styling: any = {};

    if (!this.config.showVisualDifferences && !this.config.showConfidenceIndicators) {
      return styling;
    }

    // Confidence-based styling
    if (this.config.showConfidenceIndicators) {
      switch (indicators.confidenceLevel) {
        case 'high':
          styling.opacity = 1.0;
          break;
        case 'medium':
          styling.opacity = 0.8;
          break;
        case 'low':
          styling.opacity = 0.6;
          break;
      }
    }

    // Difference-based styling
    if (this.config.showVisualDifferences) {
      if (indicators.isOptimal) {
        styling.backgroundColor = this.getThemeColor('optimal');
        styling.textColor = this.getThemeColor('optimalText');
      } else if (indicators.isSuboptimal) {
        styling.backgroundColor = this.getThemeColor('suboptimal');
        styling.textColor = this.getThemeColor('suboptimalText');
      }

      if (indicators.differenceLevel === 'significant') {
        styling.borderStyle = 'solid 2px';
      }
    }

    // Missing data styling
    if (cellData.isMissing) {
      styling.backgroundColor = this.getThemeColor('missing');
      styling.textColor = this.getThemeColor('missingText');
    }

    // Constraint violation styling
    if (cellData.violatesConstraint) {
      styling.backgroundColor = this.getThemeColor('violation');
      styling.textColor = this.getThemeColor('violationText');
      styling.borderStyle = 'solid 2px red';
    }

    return styling;
  }

  /**
   * Renders excluded options with toggle functionality
   */
  private renderExcludedOptions(matrix: FormattedDecisionMatrix) {
    return matrix.excludedOptionsDetails.map(excluded => ({
      option: excluded.option,
      violations: excluded.violations,
      canBeIncluded: excluded.canBeIncluded,
      toggleAction: () => {
        // This would be implemented by the consuming application
        console.log(`Toggle inclusion for option: ${excluded.option.id}`);
      }
    }));
  }

  /**
   * Generates aspect filter suggestions and state
   */
  private generateAspectFilters(matrix: FormattedDecisionMatrix, activeFilters: string[]) {
    const available = [
      ...new Set([
        ...matrix.headers.criteria.map(c => c.type),
        ...matrix.headers.criteria.map(c => c.criterionType),
        'high-weight',
        'hard-requirements',
        'missing-data'
      ])
    ];

    const suggestions = available.filter(filter => 
      !activeFilters.includes(filter) && 
      matrix.headers.criteria.some(c => 
        c.type === filter || c.criterionType === filter
      )
    );

    return {
      available,
      active: activeFilters,
      suggestions: suggestions.slice(0, 5) // Limit suggestions
    };
  }

  // Helper methods
  private getConfidenceIndicator(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  private getOptionHeaderStyle(option: any) {
    const style: any = {};
    
    if (option.isExcluded) {
      style.backgroundColor = this.getThemeColor('excluded');
      style.textColor = this.getThemeColor('excludedText');
    } else if (option.rank === 1) {
      style.backgroundColor = this.getThemeColor('topRank');
      style.textColor = this.getThemeColor('topRankText');
    }

    return style;
  }

  private formatDisplayValue(value: any, criterion: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    if (typeof value === 'number') {
      return criterion.criterionType === 'cost' 
        ? `$${value.toLocaleString()}` 
        : value.toLocaleString();
    }

    return String(value);
  }

  private getThemeColor(colorKey: string): string {
    const colors = {
      light: {
        optimal: '#e8f5e8',
        optimalText: '#2d5a2d',
        suboptimal: '#ffe8e8',
        suboptimalText: '#5a2d2d',
        missing: '#f5f5f5',
        missingText: '#666666',
        violation: '#ffebee',
        violationText: '#c62828',
        excluded: '#f0f0f0',
        excludedText: '#757575',
        topRank: '#e3f2fd',
        topRankText: '#1565c0'
      },
      dark: {
        optimal: '#2d5a2d',
        optimalText: '#e8f5e8',
        suboptimal: '#5a2d2d',
        suboptimalText: '#ffe8e8',
        missing: '#424242',
        missingText: '#bdbdbd',
        violation: '#c62828',
        violationText: '#ffebee',
        excluded: '#616161',
        excludedText: '#e0e0e0',
        topRank: '#1565c0',
        topRankText: '#e3f2fd'
      }
    };

    const theme = this.config.theme === 'auto' ? 'light' : this.config.theme;
    const themeColors = colors[theme as keyof typeof colors] || colors.light;
    return (themeColors as any)[colorKey] || (colors.light as any)[colorKey] || '#ffffff';
  }

  /**
   * Updates rendering configuration
   */
  updateConfig(newConfig: Partial<MatrixRenderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current rendering state
   */
  getRenderState(): ProgressiveRenderState {
    return { ...this.renderState };
  }

  /**
   * Resets rendering state
   */
  resetRenderState(): void {
    this.renderState = {
      currentChunk: 0,
      totalChunks: 0,
      renderedRows: 0,
      totalRows: 0,
      isLoading: false
    };
  }
}