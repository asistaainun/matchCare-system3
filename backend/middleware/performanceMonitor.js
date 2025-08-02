// backend/middleware/performanceMonitor.js
// 🎓 ACADEMIC PERFORMANCE MONITORING FOR THESIS

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      ontology_operations: [],
      database_queries: [],
      api_responses: [],
      error_rates: {},
      daily_stats: {}
    };
    
    this.thresholds = {
      ontology_slow: 2000, // ms
      database_slow: 1000, // ms
      api_slow: 3000 // ms
    };
  }

  // 🧠 Monitor SPARQL/Ontology Operations
  async monitorOntologyOperation(operationName, operation) {
    const startTime = Date.now();
    
    try {
      console.log(`🧠 Starting ontology operation: ${operationName}`);
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // Record successful operation
      this.recordOntologyMetric(operationName, duration, 'success');
      
      // Log performance
      const status = duration > this.thresholds.ontology_slow ? '🐌 SLOW' : '⚡ FAST';
      console.log(`🧠 Ontology ${operationName}: ${duration}ms ${status}`);
      
      // Academic analysis
      if (duration > this.thresholds.ontology_slow) {
        console.log(`📊 Academic Note: ${operationName} exceeded performance threshold (${duration}ms > ${this.thresholds.ontology_slow}ms)`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordOntologyMetric(operationName, duration, 'error');
      
      console.error(`❌ Ontology ${operationName} failed after ${duration}ms:`, error.message);
      throw error;
    }
  }

  // 🗄️ Monitor Database Operations
  async monitorDatabaseOperation(queryType, operation) {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.recordDatabaseMetric(queryType, duration, 'success');
      
      if (duration > this.thresholds.database_slow) {
        console.log(`🗄️ Slow DB Query [${queryType}]: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordDatabaseMetric(queryType, duration, 'error');
      throw error;
    }
  }

  // 📊 API Response Time Middleware
  apiPerformanceMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Override res.json to capture response time
      const originalJson = res.json;
      res.json = (data) => {
        const duration = Date.now() - startTime;
        
        // Record API metric
        this.recordAPIMetric(req, duration, res.statusCode);
        
        // Log for academic analysis
        this.logAPIPerformance(req, duration, res.statusCode);
        
        return originalJson.call(res, data);
      };
      
      next();
    };
  }

  // 📝 Record Ontology Metrics
  recordOntologyMetric(operation, duration, status) {
    const metric = {
      operation,
      duration,
      status,
      timestamp: new Date().toISOString(),
      date: new Date().toDateString()
    };
    
    this.metrics.ontology_operations.push(metric);
    
    // Keep only last 1000 operations
    if (this.metrics.ontology_operations.length > 1000) {
      this.metrics.ontology_operations.shift();
    }
  }

  // 📝 Record Database Metrics
  recordDatabaseMetric(queryType, duration, status) {
    const metric = {
      queryType,
      duration,
      status,
      timestamp: new Date().toISOString()
    };
    
    this.metrics.database_queries.push(metric);
    
    if (this.metrics.database_queries.length > 1000) {
      this.metrics.database_queries.shift();
    }
  }

  // 📝 Record API Metrics
  recordAPIMetric(req, duration, statusCode) {
    const metric = {
      method: req.method,
      path: req.path,
      duration,
      statusCode,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      isOntologyEndpoint: this.isOntologyEndpoint(req.path)
    };
    
    this.metrics.api_responses.push(metric);
    
    if (this.metrics.api_responses.length > 1000) {
      this.metrics.api_responses.shift();
    }
  }

  // 🔍 Log API Performance for Academic Analysis
  logAPIPerformance(req, duration, statusCode) {
    const isOntology = this.isOntologyEndpoint(req.path);
    const isSlow = duration > this.thresholds.api_slow;
    
    let logLevel = '📈';
    if (statusCode >= 400) logLevel = '❌';
    else if (isSlow) logLevel = '🐌';
    else if (isOntology) logLevel = '🧠';
    
    console.log(`${logLevel} API: ${req.method} ${req.path} - ${duration}ms (${statusCode})`);
    
    // Academic insights
    if (isOntology && isSlow) {
      console.log(`📊 Academic Alert: Ontology endpoint performance degraded (${duration}ms)`);
    }
  }

  // 🎯 Check if endpoint uses ontology
  isOntologyEndpoint(path) {
    const ontologyPaths = [
      '/api/ontology/',
      '/api/products/recommendations',
      '/api/ingredients/compatibility',
      '/api/ingredients/synergies',
      '/api/ingredients/conflicts',
      '/api/recommendations/'
    ];
    
    return ontologyPaths.some(p => path.includes(p));
  }

  // 📊 Generate Academic Performance Report
  getAcademicReport() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Filter recent metrics
    const recentOntology = this.metrics.ontology_operations.filter(
      m => new Date(m.timestamp) > last24h
    );
    const recentAPI = this.metrics.api_responses.filter(
      m => new Date(m.timestamp) > last24h
    );
    
    // Calculate statistics
    const ontologyStats = this.calculateOntologyStats(recentOntology);
    const apiStats = this.calculateAPIStats(recentAPI);
    
    return {
      report_generated: now.toISOString(),
      period: 'Last 24 hours',
      
      ontology_performance: {
        total_operations: recentOntology.length,
        average_response_time: ontologyStats.avgDuration,
        success_rate: ontologyStats.successRate,
        slow_operations: ontologyStats.slowOps,
        most_used_operations: ontologyStats.topOperations
      },
      
      api_performance: {
        total_requests: recentAPI.length,
        average_response_time: apiStats.avgDuration,
        success_rate: apiStats.successRate,
        ontology_requests: apiStats.ontologyRequests,
        slow_requests: apiStats.slowRequests,
        error_breakdown: apiStats.errorBreakdown
      },
      
      academic_insights: this.generateAcademicInsights(ontologyStats, apiStats),
      
      recommendations: this.generatePerformanceRecommendations(ontologyStats, apiStats)
    };
  }

  // 📈 Calculate Ontology Statistics
  calculateOntologyStats(operations) {
    if (operations.length === 0) return { avgDuration: 0, successRate: 100, slowOps: 0, topOperations: [] };
    
    const successful = operations.filter(op => op.status === 'success');
    const durations = operations.map(op => op.duration);
    const slowOps = operations.filter(op => op.duration > this.thresholds.ontology_slow);
    
    // Count operations by type
    const operationCounts = {};
    operations.forEach(op => {
      operationCounts[op.operation] = (operationCounts[op.operation] || 0) + 1;
    });
    
    return {
      avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      successRate: Math.round((successful.length / operations.length) * 100),
      slowOps: slowOps.length,
      topOperations: Object.entries(operationCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([op, count]) => ({ operation: op, count }))
    };
  }

  // 📈 Calculate API Statistics
  calculateAPIStats(requests) {
    if (requests.length === 0) return { avgDuration: 0, successRate: 100, ontologyRequests: 0, slowRequests: 0, errorBreakdown: {} };
    
    const successful = requests.filter(req => req.statusCode < 400);
    const durations = requests.map(req => req.duration);
    const ontologyRequests = requests.filter(req => req.isOntologyEndpoint);
    const slowRequests = requests.filter(req => req.duration > this.thresholds.api_slow);
    
    // Error breakdown
    const errorBreakdown = {};
    requests.filter(req => req.statusCode >= 400).forEach(req => {
      const code = req.statusCode;
      errorBreakdown[code] = (errorBreakdown[code] || 0) + 1;
    });
    
    return {
      avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      successRate: Math.round((successful.length / requests.length) * 100),
      ontologyRequests: ontologyRequests.length,
      slowRequests: slowRequests.length,
      errorBreakdown
    };
  }

  // 🎓 Generate Academic Insights
  generateAcademicInsights(ontologyStats, apiStats) {
    const insights = [];
    
    if (ontologyStats.avgDuration > this.thresholds.ontology_slow) {
      insights.push('Ontology operations are performing slower than optimal - consider SPARQL query optimization');
    }
    
    if (ontologyStats.successRate < 95) {
      insights.push('Ontology success rate below 95% - investigate knowledge graph connectivity');
    }
    
    if (apiStats.successRate < 90) {
      insights.push('API success rate below 90% - review error handling and input validation');
    }
    
    if (ontologyStats.slowOps > 0) {
      insights.push(`${ontologyStats.slowOps} slow ontology operations detected - potential thesis discussion point`);
    }
    
    if (insights.length === 0) {
      insights.push('System performing optimally - excellent for thesis demonstration');
    }
    
    return insights;
  }

  // 💡 Generate Performance Recommendations
  generatePerformanceRecommendations(ontologyStats, apiStats) {
    const recommendations = [];
    
    if (ontologyStats.avgDuration > 1500) {
      recommendations.push('Consider caching frequently used SPARQL query results');
      recommendations.push('Optimize ontology structure for faster reasoning');
    }
    
    if (apiStats.ontologyRequests > apiStats.avgDuration * 0.8) {
      recommendations.push('Implement request rate limiting for ontology endpoints');
    }
    
    if (ontologyStats.topOperations.length > 0) {
      const topOp = ontologyStats.topOperations[0];
      recommendations.push(`Focus optimization on "${topOp.operation}" - most frequently used operation`);
    }
    
    return recommendations;
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();
module.exports = performanceMonitor;