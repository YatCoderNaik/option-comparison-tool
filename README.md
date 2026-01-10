# Option Comparison Tool

A comprehensive decision-support tool that compares multiple options (APIs, cloud services, tech stacks, etc.) and presents structured trade-off analyses to help users make informed choices.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Build the Project
```bash
npm run build
```

### Run the Interactive Demo
```bash
npm run demo
```

### Use the CLI
```bash
# Show help
npm run cli help

# Quick comparison example
npm run cli quick

# System health check
npm run cli health

# Run full demo
npm run cli demo
```

### Create Custom Comparisons
```bash
# Run the customizable example
npm run example

# Edit example.ts to create your own comparisons
```

### Run Tests
```bash
npm test
```

## 📊 Demo Scenarios

The interactive demo showcases five real-world scenarios:

### 1. 💳 Payment API Selection
Compare Stripe, PayPal, and Square APIs based on:
- Transaction fees
- Integration complexity
- Reliability and uptime
- Developer experience

### 2. ☁️ Cloud Service Selection  
Evaluate AWS, Azure, and Google Cloud Platform considering:
- Monthly costs
- Service portfolio
- Compliance certifications
- Learning curve

### 3. 💻 Tech Stack Selection
Choose between React, Vue.js, and Angular frameworks based on:
- Learning curve for team
- Performance characteristics
- Job market availability
- Bundle size and maintenance

### 4. 📤 Export & Sharing Features
Demonstrates the tool's ability to:
- Export results in JSON, CSV, and PDF formats
- Create shareable snapshots
- Maintain data privacy controls

### 5. 🏥 System Health Monitoring
Shows monitoring capabilities including:
- Component health status
- Performance metrics
- System uptime tracking

## 🏗️ Architecture

The tool follows a modular architecture with these core components:

- **Option Management**: Input validation and option storage
- **Constraint Management**: Business rules and requirement validation  
- **Scoring Engine**: Multi-criteria decision analysis (MCDA)
- **Comparison Engine**: Core comparison logic and orchestration
- **Confidence Metrics**: Data quality and algorithm certainty assessment
- **Tradeoff Analysis**: Pros/cons identification and scenario guidance
- **Presentation Layer**: Matrix rendering and result formatting
- **Export Manager**: Multi-format export capabilities
- **Sharing System**: Secure snapshot creation and sharing
- **REST API**: HTTP endpoints for integration
- **Security Layer**: Authentication, authorization, and audit logging

## 🎯 Key Features

### Decision Support
- **Multi-criteria Analysis**: Weighted scoring across multiple dimensions
- **Constraint Validation**: Hard requirements vs. soft preferences
- **Tradeoff Identification**: Clear pros/cons for each option
- **Scenario Guidance**: Recommendations for different use cases
- **Confidence Scoring**: Data quality and algorithm certainty metrics

### Data Management
- **Flexible Input**: Structured option attributes and metadata
- **Quality Assessment**: Completeness, freshness, and reliability tracking
- **Validation**: Input validation and consistency checking
- **Caching**: Performance optimization for repeated comparisons

### Export & Sharing
- **Multiple Formats**: JSON, CSV, PDF export options
- **Shareable Snapshots**: Secure sharing with access controls
- **Audit Trail**: Complete comparison history and transparency
- **Collaboration**: Team decision-making support

### Enterprise Features
- **REST API**: Full HTTP API for system integration
- **Security**: Authentication, RBAC, and audit logging
- **Monitoring**: Health checks and performance metrics
- **Scalability**: Concurrent comparison support with rate limiting

## 🔧 Configuration

The application supports extensive configuration options:

```typescript
const config = {
  security: {
    enableAuthentication: true,
    enableRBAC: true,
    enableAuditLogging: true,
    enableRateLimiting: true
  },
  performance: {
    maxConcurrentComparisons: 100,
    comparisonTimeoutMs: 30000,
    maxOptionsPerComparison: 1000,
    maxConstraintsPerComparison: 50,
    enableCaching: true
  },
  export: {
    enabledFormats: ['json', 'csv', 'pdf'],
    maxExportSize: 10485760, // 10MB
    enableWatermarks: true
  },
  sharing: {
    enablePublicSharing: true,
    enablePrivateSharing: true,
    maxSharesPerUser: 50,
    shareExpirationDays: 30
  }
};
```

## 📚 Usage Examples

### Basic Comparison
```typescript
import { OptionComparisonApp } from './src/app';

const app = new OptionComparisonApp();
await app.initialize();

const options = [
  {
    id: 'option1',
    name: 'First Option',
    description: 'Description of first option',
    category: 'api',
    attributes: {
      cost: { value: 100, unit: 'USD' },
      performance: { value: 85, unit: 'score' }
    },
    metadata: {
      dateAdded: new Date(),
      lastUpdated: new Date(),
      dataQuality: { completeness: 0.9, freshness: 0.9, reliability: 0.9 },
      entryMethod: 'manual'
    }
  }
  // ... more options
];

const constraints = [
  {
    id: 'budget',
    name: 'Budget Constraint',
    type: 'budget',
    isHardRequirement: true,
    weight: 0.4,
    criterionType: 'cost',
    evaluationRule: {
      attributePath: 'cost',
      operator: 'lessThan',
      targetValue: 150
    },
    description: 'Must be under budget',
    confidenceLevel: 0.95
  }
  // ... more constraints
];

const result = await app.compareOptions(options, constraints);
console.log('Top recommendation:', result.summary.topRecommendation);
```

### Export Results
```typescript
// Export as JSON
const jsonExport = await app.exportResults(result, 'json');

// Create shareable snapshot
const snapshotId = await app.createSnapshot(result, 'user123', 'private');
```

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: Individual component testing
- **Integration Tests**: Cross-component interaction testing  
- **Property-Based Tests**: Automated test case generation with fast-check
- **End-to-End Tests**: Complete system workflow validation
- **Performance Tests**: Load testing and benchmarking
- **Security Tests**: Authentication and authorization validation

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
npm test -- --testPathPattern="e2e.test.ts"
npm test -- --testPathPattern="api/"
```

## 📈 Performance

The system is designed for high performance:

- **Concurrent Processing**: Multiple comparisons in parallel
- **Intelligent Caching**: Result caching with configurable expiration
- **Timeout Management**: Configurable comparison timeouts
- **Resource Limits**: Configurable limits on options and constraints
- **Memory Management**: Automatic cache cleanup and garbage collection

## 🔒 Security

Enterprise-grade security features:

- **Authentication**: JWT-based user authentication
- **Authorization**: Role-based access control (RBAC)
- **Audit Logging**: Complete action audit trail
- **Rate Limiting**: API rate limiting and abuse prevention
- **Data Privacy**: Secure sharing with access controls
- **Input Validation**: Comprehensive input sanitization

## 🚀 Production Deployment

The tool is production-ready with:

- **Health Monitoring**: Built-in health checks and metrics
- **Error Handling**: Graceful error handling and recovery
- **Logging**: Structured logging for monitoring and debugging
- **Configuration**: Environment-based configuration management
- **Scalability**: Horizontal scaling support
- **API Documentation**: Complete REST API documentation

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📞 Support

For questions, issues, or feature requests, please open an issue on the repository.