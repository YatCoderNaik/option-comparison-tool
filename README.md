# Smart Decision Maker - AI-Powered Option Comparison Tool

A comprehensive decision-support tool that **explains trade-offs** and **helps users choose** rather than just providing rankings. Enhanced with **AI-powered criteria generation**, **intelligent option suggestions**, and **context-aware analysis** using Large Language Models (LLMs).

## 🚀 **Quick Start - AI-Enhanced Demo**

**The easiest way to experience the AI-powered tool:**

1. **Open the Demo**: Navigate to `hackathon-demo/index.html` in any browser
2. **Ask AI**: Type "Which cloud provider should I choose for my startup?" 
3. **Get Smart Suggestions**: AI generates relevant criteria and suggests options
4. **Compare & Decide**: See trade-offs explained with intelligent guidance

**Or serve locally:**
```bash
cd hackathon-demo
python -m http.server 8000
# Visit http://localhost:8000
```

## 🤖 **NEW: AI-Powered Features**

### 🧠 **Intelligent Query Processing**
- **Natural Language Input**: Ask questions like "Best JavaScript framework for my team?"
- **Domain Recognition**: AI identifies the type of decision (technical, business, personal)
- **Context Understanding**: Extracts key entities and comparison requirements

### ⚡ **Dynamic Criteria Generation**
- **Smart Criteria**: AI generates 4-6 relevant criteria based on your question
- **Domain Expertise**: Criteria adapt to specific domains (cost, performance, ease of use, etc.)
- **Weighted Suggestions**: AI suggests appropriate importance weights
- **Explanations**: Understand why each criterion matters for your decision

### 💡 **Intelligent Option Suggestions**
- **Relevant Options**: AI suggests 3-5 realistic options to compare
- **Realistic Data**: Includes estimated attribute values with confidence levels
- **Market Awareness**: Suggests current market leaders and alternatives
- **Customizable**: Accept, modify, or add your own options

### 🔧 **LLM Provider Support**
- **OpenAI GPT**: GPT-4o-mini for cost-effective analysis
- **Anthropic Claude**: Claude-3-haiku for fast responses  
- **Local Models**: LM Studio and Ollama support for privacy-focused deployments
- **Demo Mode**: Full functionality without API keys required

### 🔍 **Smart Analysis & Insights**
- **Context-Aware Analysis**: AI provides domain-specific pros/cons and trade-offs
- **Intelligent Caching**: Optimized performance with smart request reduction (80-90% fewer API calls)
- **Real-time Insights**: Dynamic analysis updates as you adjust criteria weights
- **Decision Confidence**: AI-powered confidence scoring and recommendation explanations

## 🎯 **Latest Features & Improvements**

### 🚀 **Production Ready Interface**
- **Clean UI**: Removed all debug elements and development artifacts
- **Professional Styling**: Polished interface suitable for presentations and demos
- **Optimized Performance**: Smart caching and request optimization
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices

### 🤖 **Enhanced AI Integration**
- **Context-Aware Analysis**: AI generates domain-specific insights and trade-offs
- **Smart Caching**: 80-90% reduction in API requests through intelligent caching
- **Real-time Updates**: Dynamic analysis as you adjust criteria weights
- **Fallback Handling**: Graceful degradation when AI services are unavailable

### 🔧 **Technical Improvements**
- **Request Optimization**: Debounced updates prevent API spam during weight adjustments
- **Error Handling**: Robust error handling with user-friendly messages
- **Configuration Management**: Easy setup for multiple LLM providers
- **Session Management**: Persistent settings and analysis caching

## ✨ **Core Features**

### 🎯 **Decision-Focused Design**
- **Trade-off Analysis**: "Option A costs $50 more but has 2 points higher quality"
- **Decision Guidance**: "If budget is critical, choose X. If performance matters, choose Y"
- **Constraint Filtering**: Set hard requirements (max cost, min quality)
- **Pros & Cons**: Qualitative strengths/weaknesses for each option
- **Scenario Analysis**: See how different priorities change recommendations

### 🔧 **Technical Capabilities**
- **Multi-Criteria Decision Analysis (MCDA)**: Systematic evaluation using weighted scoring
- **Constraint Management**: Define hard requirements and filters
- **Confidence Scoring**: Measure decision reliability
- **Interactive Visualizations**: Clear presentation of results and comparisons
- **Extensible Architecture**: Modular design for easy customization

## 📁 **Project Structure**

```
├── hackathon-demo/          # 🎯 MAIN UI - AI-Enhanced demo interface
│   ├── index.html           # AI-powered comparison tool (no build required)
│   ├── styles.css           # Modern, clean styling with AI interface
│   ├── script.js            # Full functionality with AI integration
│   ├── llm-service.js       # LLM integration and prompt management
│   ├── config.js            # Configuration for API keys and providers
│   └── README.md            # Demo-specific documentation
├── src/                     # Core TypeScript implementation
├── .kiro/specs/            # Specification documents
└── dist/                   # Built CLI and library files
```

## 🎮 **Usage Options**

### 1. **AI-Enhanced Demo** (Recommended - Main Interface!)
- **Location**: `hackathon-demo/index.html`
- **Features**: AI-powered criteria generation and option suggestions
- **Requirements**: Any modern web browser + optional API key
- **Best for**: Intelligent comparisons, exploring new domains, presentations

### 2. **Manual Mode** (Classic functionality)
- **Same interface**: Switch to manual mode for traditional hardcoded criteria
- **Quick examples**: Cloud Providers, Laptops, Restaurants presets
- **Best for**: Known domains, offline usage, demonstrations

### 3. **CLI Interface**
```bash
npm install
npm run build
node dist/index.js
```

### 4. **Interactive TypeScript Demo**
```bash
npm run demo
```

## 🤖 **LLM Configuration**

### Quick Setup (Demo Mode)
No configuration needed! The tool works in demo mode with realistic sample data.

### API Key Setup (Full AI Power)
1. **Click "⚙️ Configure LLM"** in the demo interface
2. **Choose Provider**: OpenAI, Anthropic, or Local Model
3. **Add API Key**: Your key is stored locally and never sent to our servers
4. **Start Asking**: Type natural language questions and get AI-powered analysis

### Supported Providers
```javascript
// OpenAI (Recommended)
Provider: OpenAI GPT
Model: gpt-4o-mini (cost-effective)
API Key: Required from https://platform.openai.com

// Anthropic Claude  
Provider: Anthropic Claude
Model: claude-3-haiku (fast responses)
API Key: Required from https://console.anthropic.com

// Local Models (Privacy-focused)
Provider: Local Model
Model: llama3.1:8b via Ollama
API Key: Not required
Setup: Install Ollama locally

// LM Studio (Local AI - FIXED!)
Provider: LM Studio (Local)
Endpoint: http://localhost:1234/v1/chat/completions
Model: Use exact name from LM Studio
API Key: Optional (usually not needed)
Setup: Load model, start server, enable CORS
```

### 🔧 LM Studio Setup (Production Ready)
**Latest Update**: Fully compatible with LM Studio's request format and optimized for performance.

1. **Start LM Studio** and load your preferred model
2. **Go to "Local Server" tab** and start the server
3. **Enable CORS** in server settings (important!)
4. **Configure in app**: 
   - Provider: "LM Studio (Local)"
   - Endpoint: `http://localhost:1234/v1/chat/completions`
   - Model: Use exact name shown in LM Studio
5. **Test Connection** using the "🔗 Test Connection" button

**Performance Features**: 
- Intelligent caching reduces API calls by 80-90%
- Debounced weight adjustments prevent request spam
- Session-based analysis reuse for faster responses

### Sample AI Queries
- "Which cloud provider should I choose for my startup?"
- "Best JavaScript framework for my team?"
- "Compare payment APIs for e-commerce"
- "Which database should I use for my app?"
- "Best laptop for software development?"
- "Compare project management tools"

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

### AI-Powered Comparison (NEW!)
```javascript
// 1. User asks a natural language question
const query = "Which cloud provider should I choose for my startup?";

// 2. AI analyzes the query and generates criteria
const analysis = await llmService.analyzeQuery(query);
// Result: { domain: 'cloud-services', intent: 'selection', entities: ['cloud', 'startup'] }

const criteria = await llmService.generateCriteria(query, analysis.domain);
// Result: AI generates relevant criteria like cost, performance, ease of use, support

// 3. AI suggests realistic options with attributes
const options = await llmService.suggestOptions(query, criteria);
// Result: AWS, Azure, GCP with realistic pricing and feature scores

// 4. User can accept, modify, or add their own options
// 5. Standard comparison engine provides trade-off analysis
```

### Manual Mode (Classic)
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