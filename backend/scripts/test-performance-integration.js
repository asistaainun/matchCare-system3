// backend/scripts/test-performance-integration.js
// Comprehensive performance and integration testing

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

class PerformanceIntegrationTest {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.testResults = {
      performance: [],
      integration: [],
      errors: [],
      recommendations: []
    };
  }

  async runFullTest() {
    console.log('⚡ MatchCare Performance & Integration Test');
    console.log('==========================================\n');

    try {
      // Test 1: API Response Time Performance
      await this.testAPIPerformance();
      
      // Test 2: Database Query Performance
      await this.testDatabasePerformance();
      
      // Test 3: SPARQL Query Performance
      await this.testSPARQLPerformance();
      
      // Test 4: End-to-End Integration Flows
      await this.testIntegrationFlows();
      
      // Test 5: Load Testing (Basic)
      await this.testBasicLoad();
      
      // Test 6: Error Handling
      await this.testErrorHandling();
      
      // Generate performance report
      this.generatePerformanceReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    } finally {
      await pool.end();
    }
  }

  async measureResponseTime(testName, asyncFunction) {
    const startTime = Date.now();
    try {
      const result = await asyncFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.performance.push({
        test: testName,
        duration,
        status: 'success',
        result
      });
      
      const status = duration < 1000 ? '🟢' : duration < 3000 ? '🟡' : '🔴';
      console.log(`   ${status} ${testName}: ${duration}ms`);
      
      return { success: true, duration, result };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.performance.push({
        test: testName,
        duration,
        status: 'error',
        error: error.message
      });
      
      console.log(`   🔴 ${testName}: FAILED (${duration}ms) - ${error.message}`);
      return { success: false, duration, error };
    }
  }

  async testAPIPerformance() {
    console.log('1️⃣ API Performance Testing...\n');
    
    const apiTests = [
      {
        name: 'Health Check',
        test: () => axios.get(`${this.baseURL}/health`)
      },
      {
        name: 'Ontology Status',
        test: () => axios.get(`${this.baseURL}/api/analysis/ontology-status`)
      },
      {
        name: 'Synergistic Combos',
        test: () => axios.get(`${this.baseURL}/api/analysis/synergistic-combos`)
      },
      {
        name: 'Quiz Start',
        test: () => axios.post(`${this.baseURL}/api/quiz/start`)
      },
      {
        name: 'Quiz Reference Data',
        test: () => axios.get(`${this.baseURL}/api/quiz/reference-data`)
      }
    ];

    for (const apiTest of apiTests) {
      await this.measureResponseTime(apiTest.name, apiTest.test);
    }
  }

  async testDatabasePerformance() {
    console.log('\n2️⃣ Database Performance Testing...\n');
    
    const dbTests = [
      {
        name: 'Simple Count Query',
        test: () => pool.query('SELECT COUNT(*) FROM products')
      },
      {
        name: 'Product Search Query',
        test: () => pool.query(`
          SELECT * FROM products 
          WHERE name ILIKE '%moisturizer%' 
          LIMIT 10
        `)
      },
      {
        name: 'Complex Join Query',
        test: () => pool.query(`
          SELECT p.name, p.brand, COUNT(pi.ingredient_id) as ingredient_count
          FROM products p
          LEFT JOIN product_ingredients pi ON p.id = pi.product_id
          GROUP BY p.id, p.name, p.brand
          LIMIT 10
        `)
      },
      {
        name: 'Quiz Results Query',
        test: () => pool.query(`
          SELECT qr.*, st.name as skin_type_name
          FROM quiz_results qr
          JOIN skin_types st ON qr.skin_type_id = st.id
          ORDER BY qr.completed_at DESC
          LIMIT 5
        `)
      }
    ];

    for (const dbTest of dbTests) {
      await this.measureResponseTime(dbTest.name, dbTest.test);
    }
  }

  async testSPARQLPerformance() {
    console.log('\n3️⃣ SPARQL Performance Testing...\n');
    
    const sparqlTests = [
      {
        name: 'Basic Triple Count',
        test: async () => {
          const query = 'SELECT (COUNT(*) as ?count) WHERE { ?s ?p ?o }';
          return axios.post('http://localhost:3030/skincare-db/sparql', 
            new URLSearchParams({ query }), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
        }
      },
      {
        name: 'Ingredient Synergies Query',
        test: async () => {
          const query = `
            PREFIX sc: <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            
            SELECT (COUNT(*) as ?count)
            WHERE {
              ?ingredient1 sc:synergisticWith ?ingredient2 .
            }
          `;
          return axios.post('http://localhost:3030/skincare-db/sparql', 
            new URLSearchParams({ query }), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
        }
      },
      {
        name: 'Complex Ontology Query',
        test: async () => {
          const query = `
            PREFIX sc: <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            
            SELECT ?ing1 ?name1 ?ing2 ?name2
            WHERE {
              ?ing1 rdf:type sc:Ingredient ;
                    sc:IngredientName ?name1 ;
                    sc:synergisticWith ?ing2 .
              ?ing2 sc:IngredientName ?name2 .
            }
            LIMIT 10
          `;
          return axios.post('http://localhost:3030/skincare-db/sparql', 
            new URLSearchParams({ query }), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
        }
      }
    ];

    for (const sparqlTest of sparqlTests) {
      await this.measureResponseTime(sparqlTest.name, sparqlTest.test);
    }
  }

  async testIntegrationFlows() {
    console.log('\n4️⃣ End-to-End Integration Testing...\n');
    
    try {
      // Flow 1: Complete Quiz Flow
      console.log('   🔄 Testing Complete Quiz Flow...');
      
      const startQuiz = await axios.post(`${this.baseURL}/api/quiz/start`);
      const sessionId = startQuiz.data.data.session_id;
      console.log(`      ✅ Quiz started: ${sessionId}`);
      
      const referenceData = await axios.get(`${this.baseURL}/api/quiz/reference-data`);
      console.log(`      ✅ Reference data: ${referenceData.data.data.skin_types.length} skin types`);
      
      const submitQuiz = await axios.post(`${this.baseURL}/api/quiz/submit`, {
        session_id: sessionId,
        skin_type: 'oily',
        concerns: ['acne', 'oiliness'],
        sensitivities: ['fragrance']
      });
      console.log(`      ✅ Quiz submitted: ${submitQuiz.data.data.quiz_id}`);
      
      const recommendations = await axios.get(`${this.baseURL}/api/recommendations/${sessionId}`);
      console.log(`      ✅ Recommendations: ${recommendations.data.data.recommendations.length} products`);
      
      this.testResults.integration.push({
        flow: 'Complete Quiz Flow',
        status: 'success',
        steps: 4
      });
      
    } catch (error) {
      console.log(`      ❌ Quiz flow failed: ${error.message}`);
      this.testResults.integration.push({
        flow: 'Complete Quiz Flow',
        status: 'error',
        error: error.message
      });
    }

    try {
      // Flow 2: Ontology Analysis Flow
      console.log('   🔄 Testing Ontology Analysis Flow...');
      
      const ontologyStatus = await axios.get(`${this.baseURL}/api/analysis/ontology-status`);
      console.log(`      ✅ Ontology status: ${ontologyStatus.data.status}`);
      
      const synergisticCombos = await axios.get(`${this.baseURL}/api/analysis/synergistic-combos`);
      console.log(`      ✅ Synergistic combos: ${synergisticCombos.data.data.total_combinations}`);
      
      const ingredientConflicts = await axios.post(`${this.baseURL}/api/analysis/ingredient-conflicts`, {
        ingredients: ['Retinol', 'Vitamin C']
      });
      console.log(`      ✅ Conflict analysis: ${ingredientConflicts.data.analysis.conflict_analysis.total_conflicts} conflicts`);
      
      this.testResults.integration.push({
        flow: 'Ontology Analysis Flow',
        status: 'success',
        steps: 3
      });
      
    } catch (error) {
      console.log(`      ❌ Ontology flow failed: ${error.message}`);
      this.testResults.integration.push({
        flow: 'Ontology Analysis Flow',
        status: 'error',
        error: error.message
      });
    }
  }

  async testBasicLoad() {
    console.log('\n5️⃣ Basic Load Testing...\n');
    
    const loadTests = [
      {
        name: 'Concurrent Health Checks (10x)',
        requests: 10,
        endpoint: '/health'
      },
      {
        name: 'Concurrent Quiz Starts (5x)',
        requests: 5,
        endpoint: '/api/quiz/start',
        method: 'POST'
      },
      {
        name: 'Concurrent Ontology Status (3x)',
        requests: 3,
        endpoint: '/api/analysis/ontology-status'
      }
    ];

    for (const loadTest of loadTests) {
      const startTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < loadTest.requests; i++) {
        const config = {
          method: loadTest.method || 'GET',
          url: `${this.baseURL}${loadTest.endpoint}`,
          headers: { 'Content-Type': 'application/json' }
        };
        
        promises.push(axios(config));
      }
      
      try {
        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;
        const avgDuration = duration / loadTest.requests;
        
        const status = avgDuration < 1000 ? '🟢' : avgDuration < 2000 ? '🟡' : '🔴';
        console.log(`   ${status} ${loadTest.name}: ${duration}ms total (${avgDuration.toFixed(0)}ms avg)`);
        
        this.testResults.performance.push({
          test: loadTest.name,
          duration,
          avgDuration,
          status: 'success'
        });
        
      } catch (error) {
        console.log(`   🔴 ${loadTest.name}: FAILED - ${error.message}`);
        this.testResults.performance.push({
          test: loadTest.name,
          status: 'error',
          error: error.message
        });
      }
    }
  }

  async testErrorHandling() {
    console.log('\n6️⃣ Error Handling Testing...\n');
    
    const errorTests = [
      {
        name: 'Invalid Quiz Session ID',
        test: () => axios.get(`${this.baseURL}/api/recommendations/invalid-session-id`)
      },
      {
        name: 'Invalid Quiz Submit Data',
        test: () => axios.post(`${this.baseURL}/api/quiz/submit`, {
          session_id: 'invalid',
          skin_type: 'invalid_type'
        })
      },
      {
        name: 'Invalid Ingredient Analysis',
        test: () => axios.post(`${this.baseURL}/api/analysis/ingredient-conflicts`, {
          ingredients: []
        })
      },
      {
        name: 'Non-existent Endpoint',
        test: () => axios.get(`${this.baseURL}/api/non-existent-endpoint`)
      }
    ];

    for (const errorTest of errorTests) {
      try {
        await errorTest.test();
        console.log(`   ⚠️ ${errorTest.name}: Expected error but got success`);
      } catch (error) {
        const status = error.response?.status;
        const expectedErrors = [400, 404, 422, 500];
        
        if (expectedErrors.includes(status)) {
          console.log(`   ✅ ${errorTest.name}: Proper error handling (${status})`);
          this.testResults.errors.push({
            test: errorTest.name,
            status: 'proper_error',
            httpStatus: status
          });
        } else {
          console.log(`   ❌ ${errorTest.name}: Unexpected error (${status})`);
          this.testResults.errors.push({
            test: errorTest.name,
            status: 'unexpected_error',
            httpStatus: status,
            error: error.message
          });
        }
      }
    }
  }

  generatePerformanceReport() {
    console.log('\n📊 PERFORMANCE REPORT');
    console.log('=====================\n');
    
    // Performance summary
    const performanceTests = this.testResults.performance.filter(t => t.status === 'success');
    const avgResponseTime = performanceTests.reduce((sum, test) => sum + test.duration, 0) / performanceTests.length;
    
    console.log(`📈 Performance Summary:`);
    console.log(`   • Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   • Tests Passed: ${performanceTests.length}/${this.testResults.performance.length}`);
    
    // Slow queries identification
    const slowQueries = performanceTests.filter(t => t.duration > 2000);
    if (slowQueries.length > 0) {
      console.log(`\n⚠️ Slow Queries (>2s):`);
      slowQueries.forEach(query => {
        console.log(`   • ${query.test}: ${query.duration}ms`);
      });
    }
    
    // Integration summary
    const integrationPassed = this.testResults.integration.filter(t => t.status === 'success').length;
    console.log(`\n🔗 Integration Summary:`);
    console.log(`   • Integration Flows: ${integrationPassed}/${this.testResults.integration.length} passed`);
    
    // Error handling summary
    const properErrors = this.testResults.errors.filter(e => e.status === 'proper_error').length;
    console.log(`\n🛡️ Error Handling Summary:`);
    console.log(`   • Proper Error Responses: ${properErrors}/${this.testResults.errors.length}`);
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    
    if (avgResponseTime > 1500) {
      console.log(`   • ⚠️ Consider response time optimization (current: ${avgResponseTime.toFixed(0)}ms)`);
    } else {
      console.log(`   • ✅ Response times are acceptable`);
    }
    
    if (integrationPassed < this.testResults.integration.length) {
      console.log(`   • ❌ Fix failing integration flows before frontend development`);
    } else {
      console.log(`   • ✅ All integration flows working - ready for frontend`);
    }
    
    if (slowQueries.length > 0) {
      console.log(`   • ⚠️ Optimize slow queries with indexing or query improvements`);
    }
    
    if (properErrors < this.testResults.errors.length) {
      console.log(`   • ⚠️ Improve error handling for better user experience`);
    }
    
    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`   1. Address any failing integration flows`);
    console.log(`   2. Optimize slow queries if any`);
    console.log(`   3. Implement missing high-priority endpoints`);
    console.log(`   4. Add comprehensive error handling`);
    console.log(`   5. Start frontend development with confidence`);
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new PerformanceIntegrationTest();
  tester.runFullTest().catch(console.error);
}

module.exports = PerformanceIntegrationTest;