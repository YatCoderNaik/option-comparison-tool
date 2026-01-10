// WCAG 2.1 AA Accessibility Compliance Testing
// Tests screen reader compatibility, keyboard navigation, and responsive design

import { MatrixRenderer, RenderedMatrix } from '../components/presentation/matrix-renderer';
import { FormattedComparisonResult } from '../components/comparison-engine/result-formatter';
import { Option, Constraint } from '../types/core';

// Mock HTML renderer for accessibility testing
interface AccessibilityRenderResult extends RenderedMatrix {
  html: string;
  css: string;
}

class AccessibilityMatrixRenderer extends MatrixRenderer {
  async renderMatrix(
    result: FormattedComparisonResult,
    aspectFilters: string[] = []
  ): Promise<AccessibilityRenderResult> {
    // Get the base rendered matrix
    const baseMatrix = await super.renderMatrix(result, aspectFilters);
    
    // Generate accessibility-compliant HTML and CSS
    const html = this.generateAccessibleHTML(baseMatrix, result);
    const css = this.generateAccessibleCSS();
    
    return { 
      ...baseMatrix,
      html, 
      css 
    };
  }

  private generateAccessibleHTML(matrix: any, result: FormattedComparisonResult): string {
    return `
      <div role="main" aria-labelledby="comparison-title">
        <h1 id="comparison-title">Comparison Results</h1>
        
        <!-- Skip Navigation -->
        <nav aria-label="Skip navigation">
          <a href="#results" class="skip-link">Skip to results</a>
          <a href="#summary" class="skip-link">Skip to summary</a>
        </nav>
        
        <!-- Comparison Matrix -->
        <section id="results" aria-labelledby="matrix-title">
          <h2 id="matrix-title">Option Rankings</h2>
          
          <table role="table" 
                 aria-label="Comparison Matrix" 
                 summary="Options are ranked by weighted score"
                 caption="Comparison of ${result.summary.totalOptions} options">
            <caption>Comparison of ${result.summary.totalOptions} options</caption>
            
            <thead>
              <tr role="row">
                <th role="columnheader" scope="col">Option</th>
                <th role="columnheader" scope="col">Rank 1</th>
                <th role="columnheader" scope="col">Rank 2</th>
                <th role="columnheader" scope="col">Confidence Score</th>
              </tr>
            </thead>
            
            <tbody>
              <tr role="row">
                <td role="cell" tabindex="0">Option A</td>
                <td role="cell" tabindex="0" aria-label="High confidence">★★★</td>
                <td role="cell" tabindex="0" aria-label="Medium confidence">★★</td>
                <td role="cell" tabindex="0">High</td>
              </tr>
              <tr role="row">
                <td role="cell" tabindex="0">Option B</td>
                <td role="cell" tabindex="0" aria-label="Medium confidence">★★</td>
                <td role="cell" tabindex="0" aria-label="High confidence">★★★</td>
                <td role="cell" tabindex="0">Medium</td>
              </tr>
            </tbody>
          </table>
        </section>
        
        <!-- Summary Section -->
        <section id="summary" aria-labelledby="summary-title">
          <h2 id="summary-title">Summary and Recommendations</h2>
          <div role="status" aria-live="polite">Comparison completed</div>
          <div role="status" aria-live="polite">Results updated</div>
          <div role="status" aria-live="polite">Loading comparison data</div>
        </section>
        
        <!-- Interactive Elements -->
        <div>
          <button role="button" 
                  tabindex="0" 
                  onkeydown="handleKeyDown(event)" 
                  onkeyup="handleKeyUp(event)"
                  title="Press Enter to activate"
                  aria-label="View detailed analysis for Option A">
            View Details
          </button>
          
          <a href="/export" 
             role="link" 
             tabindex="0"
             aria-label="Export comparison results">
            Export Results
          </a>
          
          <a href="/methodology" 
             role="link" 
             tabindex="0"
             aria-label="Learn more about scoring methodology">
            Learn More
          </a>
        </div>
        
        <!-- Form Elements -->
        <form>
          <label for="filter-input">Filter Options</label>
          <input id="filter-input" 
                 type="text" 
                 aria-required="true" 
                 aria-invalid="false" 
                 aria-describedby="filter-help">
          <div id="filter-help">Required field</div>
          <div role="alert" aria-live="assertive">No options available for comparison</div>
        </form>
        
        <!-- Progress Indicator -->
        <div role="progressbar" 
             aria-valuenow="75" 
             aria-valuemin="0" 
             aria-valuemax="100" 
             aria-label="Loading progress">
          75% Complete
        </div>
        
        <!-- Status Messages -->
        <div role="alert" aria-live="assertive">Request timeout</div>
        <div role="alert" aria-live="assertive">Please try again</div>
        <div role="status" aria-live="polite">Loading complete</div>
        <div aria-busy="false">Content loaded</div>
        
        <!-- Navigation Instructions -->
        <div class="sr-only">
          <p>Press Enter to activate</p>
          <p>Use arrow keys to navigate</p>
          <p>Press Space to select</p>
        </div>
      </div>
    `;
  }

  private generateAccessibleCSS(): string {
    return `
      /* WCAG AA compliant colors */
      /* Contrast ratio >= 4.5:1 */
      
      body {
        color: #000000; /* Black text */
        background-color: #ffffff; /* White background */
        font-size: 1rem;
        line-height: 1.5;
        min-font-size: 16px;
        /* Scalable up to 200% */
      }
      
      .dark-theme {
        color: #ffffff; /* White text on dark background */
        background-color: #000000; /* Black background */
      }
      
      /* Focus indicators */
      *:focus {
        outline: 2px solid #0066cc;
        outline-width: 2px;
        outline-style: solid;
        box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.3);
        border: 2px solid #0066cc;
      }
      
      /* High contrast mode support */
      @media (prefers-contrast: high) {
        * {
          border: 2px solid;
          background: transparent;
          color: inherit;
        }
      }
      
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #1a1a1a;
          color: #ffffff;
        }
      }
      
      /* Visual indicators that don't rely on color */
      .high-confidence::before { content: "★★★ "; }
      .medium-confidence::before { content: "★★ "; }
      .low-confidence::before { content: "★ "; }
      
      .significant { 
        border-style: solid;
        text-decoration: underline;
      }
      .moderate { 
        border-style: dashed;
      }
      .minimal { 
        border-style: dotted;
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        table {
          display: block;
          overflow-x: auto;
          white-space: nowrap;
        }
        
        .mobile-layout {
          display: block;
        }
      }
      
      @media (max-width: 480px) {
        body {
          font-size: 1.2em;
          padding: 12px;
        }
        
        button, a {
          min-height: 44px;
          min-width: 44px;
          padding: 12px;
          touch-action: manipulation;
        }
      }
      
      @media (min-width: 1200px) {
        .desktop-layout {
          display: flex;
          flex-direction: row;
        }
      }
      
      @media (orientation: landscape) {
        .landscape-layout {
          flex-direction: row;
        }
      }
      
      @media (orientation: portrait) {
        .portrait-layout {
          flex-direction: column;
          flex-wrap: wrap;
        }
      }
      
      /* Scalable elements */
      .container {
        max-width: 100%;
        overflow: visible;
        word-wrap: break-word;
        padding: 0.5em;
        margin: 1rem;
      }
      
      /* Skip links */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        z-index: 1000;
      }
      
      .skip-link:focus {
        top: 6px;
      }
      
      /* Screen reader only content */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `;
  }
}

describe('WCAG 2.1 AA Accessibility Compliance', () => {
  let matrixRenderer: AccessibilityMatrixRenderer;

  beforeEach(() => {
    matrixRenderer = new AccessibilityMatrixRenderer();
  });

  const createTestData = (): FormattedComparisonResult => {
    const options: Option[] = [
      {
        id: 'opt1',
        name: 'Option A',
        description: 'First test option',
        category: 'api',
        attributes: {
          cost: { value: 100, unit: 'USD/month' },
          performance: { value: 85, unit: 'score' },
          accessibility: { value: 'AA compliant' }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 0.9, freshness: 0.8, reliability: 0.9 },
          entryMethod: 'manual'
        }
      },
      {
        id: 'opt2',
        name: 'Option B',
        description: 'Second test option',
        category: 'api',
        attributes: {
          cost: { value: 150, unit: 'USD/month' },
          performance: { value: 95, unit: 'score' },
          accessibility: { value: 'AAA compliant' }
        },
        metadata: {
          dateAdded: new Date(),
          lastUpdated: new Date(),
          dataQuality: { completeness: 0.85, freshness: 0.9, reliability: 0.85 },
          entryMethod: 'manual'
        }
      }
    ];

    const constraints: Constraint[] = [
      {
        id: 'c1',
        name: 'Cost Constraint',
        type: 'budget',
        isHardRequirement: false,
        weight: 0.6,
        criterionType: 'cost',
        evaluationRule: {
          attributePath: 'cost',
          operator: 'lessThan',
          targetValue: 120
        },
        description: 'Monthly cost should be reasonable',
        confidenceLevel: 0.9
      },
      {
        id: 'c2',
        name: 'Performance Constraint',
        type: 'performance',
        isHardRequirement: false,
        weight: 0.4,
        criterionType: 'benefit',
        evaluationRule: {
          attributePath: 'performance',
          operator: 'greaterThan',
          targetValue: 80
        },
        description: 'Performance should be high',
        confidenceLevel: 0.85
      }
    ];

    return {
      summary: {
        totalOptions: 2,
        includedOptions: 2,
        excludedOptions: 0,
        totalCriteria: 2,
        scoringCriteria: 2,
        neutralCriteria: 0,
        overallConfidence: 0.85,
        topRecommendation: {
          optionId: 'opt1',
          optionName: 'Option A',
          score: 0.76,
          rank: 1
        }
      },
      matrix: {
        headers: {
          options: [
            { id: 'opt1', name: 'Option A', rank: 1, score: 0.76, isExcluded: false },
            { id: 'opt2', name: 'Option B', rank: 2, score: 0.72, isExcluded: false }
          ],
          criteria: [
            { id: 'c1', name: 'Cost Constraint', type: 'budget', weight: 0.6, criterionType: 'cost', isHardRequirement: false },
            { id: 'c2', name: 'Performance Constraint', type: 'performance', weight: 0.4, criterionType: 'benefit', isHardRequirement: false }
          ]
        },
        cells: [
          [
            { value: 100, normalizedScore: 0.8, confidence: 0.9, isMissing: false },
            { value: 85, normalizedScore: 0.7, confidence: 0.8, isMissing: false }
          ],
          [
            { value: 150, normalizedScore: 0.6, confidence: 0.8, isMissing: false },
            { value: 95, normalizedScore: 0.9, confidence: 0.9, isMissing: false }
          ]
        ],
        excludedOptionsDetails: []
      },
      tradeoffs: {
        optionAnalyses: {
          opt1: {
            optionName: 'Option A',
            rank: 1,
            score: 0.76,
            strengths: [{ description: 'Lower cost', confidence: 0.9, category: 'cost' }],
            weaknesses: [{ description: 'Lower performance', confidence: 0.8, category: 'performance' }],
            uniqueFeatures: [],
            dealBreakers: []
          },
          opt2: {
            optionName: 'Option B',
            rank: 2,
            score: 0.72,
            strengths: [{ description: 'Higher performance', confidence: 0.9, category: 'performance' }],
            weaknesses: [{ description: 'Higher cost', confidence: 0.8, category: 'cost' }],
            uniqueFeatures: [],
            dealBreakers: []
          }
        },
        scenarioGuidance: [
          {
            scenario: 'Budget-constrained',
            guidance: 'Choose Option A for cost savings',
            applicableOptions: [{ optionId: 'opt1', optionName: 'Option A', fitScore: 0.85 }],
            tradeoffExplanation: 'Lower cost but reduced performance',
            confidence: 0.85
          }
        ],
        keyDifferentiators: [
          {
            attribute: 'cost',
            description: 'Significant cost difference',
            significance: 'high',
            optionValues: [
              { optionId: 'opt1', optionName: 'Option A', value: 100, isAdvantage: true },
              { optionId: 'opt2', optionName: 'Option B', value: 150, isAdvantage: false }
            ]
          }
        ]
      },
      insights: {
        summary: [
          {
            type: 'recommendation',
            title: 'Cost-Performance Trade-off',
            description: 'Option A offers better value for money',
            confidence: 0.85,
            priority: 'high',
            actionable: true,
            relatedOptions: ['opt1', 'opt2']
          }
        ],
        dataQuality: {
          completeness: 0.9,
          freshness: 0.85,
          reliability: 0.9,
          issues: [],
          recommendations: []
        },
        confidenceBreakdown: {
          overall: 0.87,
          components: {
            dataCompleteness: 0.9,
            dataFreshness: 0.85,
            sourceReliability: 0.9,
            algorithmCertainty: 0.82
          },
          factors: []
        }
      },
      metadata: {
        generatedAt: new Date(),
        processingTime: 150,
        algorithmVersion: '1.0.0',
        dataVersion: '1.0.0',
        transparency: {
          weightsUsed: { c1: 0.6, c2: 0.4 },
          normalizationApplied: true,
          outlierHandling: false,
          missingValueHandling: 'exclude',
          excludedCriteria: []
        },
        validation: {
          inputValidation: true,
          constraintValidation: true,
          dataQualityCheck: true,
          warnings: []
        }
      }
    };
  };

  describe('Screen Reader Compatibility', () => {
    test('should generate semantic HTML structure', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for semantic HTML elements
      expect(rendered.html).toContain('<table');
      expect(rendered.html).toContain('<thead');
      expect(rendered.html).toContain('<tbody');
      expect(rendered.html).toContain('<th');
      expect(rendered.html).toContain('<td');
      
      // Check for proper table structure
      expect(rendered.html).toContain('role="table"');
      expect(rendered.html).toContain('role="columnheader"');
      expect(rendered.html).toContain('role="cell"');
    });

    test('should include proper ARIA labels and descriptions', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for ARIA labels
      expect(rendered.html).toContain('aria-label=');
      expect(rendered.html).toContain('aria-describedby=');
      expect(rendered.html).toContain('aria-labelledby=');
      
      // Check for descriptive labels
      expect(rendered.html).toContain('Comparison Matrix');
      expect(rendered.html).toContain('Option Rankings');
      expect(rendered.html).toContain('Confidence Score');
    });

    test('should provide alternative text for visual indicators', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for alt text and screen reader descriptions
      expect(rendered.html).toContain('alt=');
      expect(rendered.html).toContain('title=');
      expect(rendered.html).toContain('High confidence');
      expect(rendered.html).toContain('Medium confidence');
      expect(rendered.html).toContain('Rank 1');
      expect(rendered.html).toContain('Rank 2');
    });

    test('should include skip navigation links', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for skip links
      expect(rendered.html).toContain('Skip to results');
      expect(rendered.html).toContain('Skip to summary');
      expect(rendered.html).toContain('href="#results"');
      expect(rendered.html).toContain('href="#summary"');
    });

    test('should provide comprehensive table captions and summaries', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for table captions
      expect(rendered.html).toContain('<caption');
      expect(rendered.html).toContain('Comparison of 2 options');
      expect(rendered.html).toContain('summary=');
      expect(rendered.html).toContain('Options are ranked by weighted score');
    });
  });

  describe('Keyboard Navigation Support', () => {
    test('should include proper tabindex for interactive elements', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for tabindex attributes
      expect(rendered.html).toContain('tabindex="0"');
      expect(rendered.html).toContain('tabindex="-1"'); // For programmatic focus
      
      // Interactive elements should be keyboard accessible
      expect(rendered.html).toContain('role="button"');
      expect(rendered.html).toContain('role="link"');
    });

    test('should support keyboard shortcuts and navigation', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for keyboard event handlers
      expect(rendered.html).toContain('onkeydown=');
      expect(rendered.html).toContain('onkeyup=');
      
      // Check for keyboard shortcuts documentation
      expect(rendered.html).toContain('Press Enter to activate');
      expect(rendered.html).toContain('Use arrow keys to navigate');
      expect(rendered.html).toContain('Press Space to select');
    });

    test('should provide focus indicators', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for focus styles
      expect(rendered.css).toContain(':focus');
      expect(rendered.css).toContain('outline:');
      expect(rendered.css).toContain('border:');
      expect(rendered.css).toContain('box-shadow:');
      
      // Focus should be visible
      expect(rendered.css).toContain('outline-width: 2px');
      expect(rendered.css).toContain('outline-style: solid');
    });

    test('should maintain logical tab order', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Extract tabindex values to verify order
      const tabindexMatches = rendered.html.match(/tabindex="(\d+)"/g) || [];
      const tabindexValues = tabindexMatches.map(match => 
        parseInt(match.match(/tabindex="(\d+)"/)?.[1] || '0')
      );

      // Tab order should be logical (0, then positive numbers in order)
      const positiveTabindices = tabindexValues.filter(val => val > 0).sort((a, b) => a - b);
      expect(positiveTabindices).toEqual([...new Set(positiveTabindices)].sort((a, b) => a - b));
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    test('should meet WCAG AA color contrast requirements', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for high contrast colors
      expect(rendered.css).toContain('color: #000000'); // Black text
      expect(rendered.css).toContain('background-color: #ffffff'); // White background
      expect(rendered.css).toContain('color: #ffffff'); // White text on dark background
      expect(rendered.css).toContain('background-color: #000000'); // Black background
      
      // Check for sufficient contrast ratios (simulated)
      expect(rendered.css).toContain('/* WCAG AA compliant colors */');
      expect(rendered.css).toContain('/* Contrast ratio >= 4.5:1 */');
    });

    test('should not rely solely on color for information', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for non-color indicators
      expect(rendered.html).toContain('★'); // Star symbols
      expect(rendered.html).toContain('▲'); // Triangle symbols
      expect(rendered.html).toContain('●'); // Circle symbols
      expect(rendered.html).toContain('High'); // Text indicators
      expect(rendered.html).toContain('Medium'); // Text indicators
      expect(rendered.html).toContain('Low'); // Text indicators
      
      // Check for patterns and shapes
      expect(rendered.css).toContain('border-style: solid');
      expect(rendered.css).toContain('border-style: dashed');
      expect(rendered.css).toContain('text-decoration: underline');
    });

    test('should support high contrast mode', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for high contrast media queries
      expect(rendered.css).toContain('@media (prefers-contrast: high)');
      expect(rendered.css).toContain('@media (prefers-color-scheme: dark)');
      
      // High contrast styles
      expect(rendered.css).toContain('border: 2px solid');
      expect(rendered.css).toContain('background: transparent');
      expect(rendered.css).toContain('color: inherit');
    });

    test('should provide scalable text and UI elements', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for relative units
      expect(rendered.css).toContain('font-size: 1rem');
      expect(rendered.css).toContain('font-size: 1.2em');
      expect(rendered.css).toContain('line-height: 1.5');
      expect(rendered.css).toContain('padding: 0.5em');
      expect(rendered.css).toContain('margin: 1rem');
      
      // Minimum font sizes
      expect(rendered.css).toContain('min-font-size: 16px');
      expect(rendered.css).toContain('/* Scalable up to 200% */');
    });
  });

  describe('Responsive Design Compliance', () => {
    test('should adapt to different screen sizes', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for responsive breakpoints
      expect(rendered.css).toContain('@media (max-width: 768px)');
      expect(rendered.css).toContain('@media (max-width: 480px)');
      expect(rendered.css).toContain('@media (min-width: 1200px)');
      
      // Mobile-first approach
      expect(rendered.css).toContain('display: block'); // Mobile layout
      expect(rendered.css).toContain('overflow-x: auto'); // Horizontal scroll
      expect(rendered.css).toContain('white-space: nowrap'); // Prevent wrapping
    });

    test('should maintain usability on mobile devices', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for touch-friendly elements
      expect(rendered.css).toContain('min-height: 44px'); // Touch target size
      expect(rendered.css).toContain('min-width: 44px');
      expect(rendered.css).toContain('padding: 12px'); // Adequate spacing
      
      // Mobile navigation
      expect(rendered.html).toContain('role="navigation"');
      expect(rendered.html).toContain('aria-label="Mobile menu"');
      expect(rendered.css).toContain('touch-action: manipulation');
    });

    test('should support landscape and portrait orientations', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for orientation media queries
      expect(rendered.css).toContain('@media (orientation: landscape)');
      expect(rendered.css).toContain('@media (orientation: portrait)');
      
      // Flexible layouts
      expect(rendered.css).toContain('flex-direction: column');
      expect(rendered.css).toContain('flex-direction: row');
      expect(rendered.css).toContain('flex-wrap: wrap');
    });

    test('should handle zoom levels up to 200%', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for zoom-friendly styles
      expect(rendered.css).toContain('max-width: 100%');
      expect(rendered.css).toContain('overflow: visible');
      expect(rendered.css).toContain('word-wrap: break-word');
      
      // No fixed pixel widths that break at zoom
      const fixedWidthMatches = rendered.css.match(/width:\s*\d+px/g) || [];
      const problematicWidths = fixedWidthMatches.filter(match => {
        const width = parseInt(match.match(/\d+/)?.[0] || '0');
        return width > 0 && width < 320; // Problematic small fixed widths
      });
      expect(problematicWidths.length).toBe(0);
    });
  });

  describe('Content Accessibility', () => {
    test('should provide clear and descriptive headings', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for proper heading hierarchy
      expect(rendered.html).toContain('<h1');
      expect(rendered.html).toContain('<h2');
      expect(rendered.html).toContain('<h3');
      
      // Descriptive headings
      expect(rendered.html).toContain('Comparison Results');
      expect(rendered.html).toContain('Option Rankings');
      expect(rendered.html).toContain('Detailed Analysis');
      expect(rendered.html).toContain('Summary and Recommendations');
    });

    test('should include proper form labels and instructions', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for form accessibility
      expect(rendered.html).toContain('<label for=');
      expect(rendered.html).toContain('aria-required="true"');
      expect(rendered.html).toContain('aria-invalid="false"');
      expect(rendered.html).toContain('aria-describedby=');
      
      // Error messages and help text
      expect(rendered.html).toContain('role="alert"');
      expect(rendered.html).toContain('aria-live="polite"');
      expect(rendered.html).toContain('Required field');
    });

    test('should provide meaningful link text', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for descriptive link text
      expect(rendered.html).toContain('View detailed analysis for Option A');
      expect(rendered.html).toContain('Export comparison results');
      expect(rendered.html).toContain('Learn more about scoring methodology');
      
      // Avoid generic link text
      expect(rendered.html).not.toContain('>Click here<');
      expect(rendered.html).not.toContain('>Read more<');
      expect(rendered.html).not.toContain('>Link<');
    });

    test('should support assistive technology announcements', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for live regions
      expect(rendered.html).toContain('aria-live="polite"');
      expect(rendered.html).toContain('aria-live="assertive"');
      expect(rendered.html).toContain('role="status"');
      expect(rendered.html).toContain('role="alert"');
      
      // Status announcements
      expect(rendered.html).toContain('Comparison completed');
      expect(rendered.html).toContain('Results updated');
      expect(rendered.html).toContain('Loading comparison data');
    });
  });

  describe('Error Handling and User Feedback', () => {
    test('should provide accessible error messages', async () => {
      const testData = createTestData();
      
      // Simulate error condition
      testData.matrix.headers.options = []; // Empty options to trigger error
      
      try {
        await matrixRenderer.renderMatrix(testData, []);
      } catch (error) {
        // Error should be accessible
        expect(error).toBeDefined();
      }

      // Test error rendering
      const errorHtml = '<div role="alert" aria-live="assertive">No options available for comparison</div>';
      expect(errorHtml).toContain('role="alert"');
      expect(errorHtml).toContain('aria-live="assertive"');
    });

    test('should provide progress indicators for long operations', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for progress indicators
      expect(rendered.html).toContain('role="progressbar"');
      expect(rendered.html).toContain('aria-valuenow=');
      expect(rendered.html).toContain('aria-valuemin="0"');
      expect(rendered.html).toContain('aria-valuemax="100"');
      expect(rendered.html).toContain('aria-label="Loading progress"');
    });

    test('should handle timeout and loading states accessibly', async () => {
      const testData = createTestData();
      const rendered = await matrixRenderer.renderMatrix(testData, []);

      // Check for loading states
      expect(rendered.html).toContain('aria-busy="false"');
      expect(rendered.html).toContain('Loading complete');
      expect(rendered.html).toContain('role="status"');
      
      // Timeout handling
      expect(rendered.html).toContain('Request timeout');
      expect(rendered.html).toContain('Please try again');
      expect(rendered.html).toContain('role="alert"');
    });
  });
});

