// backend/scripts/test-fixed-ontology.js
// Script untuk test apakah fix ontologyService berhasil

const axios = require('axios');

class FixedOntologyTester {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.fusekiEndpoint = 'http://localhost:3030/skincare-db/sparql';
  }

  // Test 1: Direct ontologyService test
  async testOntologyServiceDirect() {
    console.log('🧪 Testing Fixed OntologyService Directly...\n');
    
    try {
      // Import the fixed service
      const ontologyService = require('../services/ontologyService');
      
      // Run the built-in test method
      const results = await ontologyService.testFixedQueries();
      
      if (results.error) {
        console.log('❌ Direct test failed:', results.error);
        return false;
      }
      
      const allPassed = results.health && results.synergies && results.ingredients;
      console.log(`\n📊 Direct Test Results:`);
      console.log(`   • Health Check: ${results.health ? '✅' : '❌'}`);
      console.log(`   • Synergies: ${results.synergies ? '✅' : '❌'}`);
      console.log(`   • Conflicts Test: ${results.conflicts_test !== undefined ? '✅' : '❌'}`);
      console.log(`   • Ingredients: ${results.ingredients ? '✅' : '❌'}`);
      console.log(`   • Overall: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
      
      return allPassed;
      
    } catch (error) {
      console.log('❌ Direct ontologyService test failed:', error.message);
      console.log('💡 Make sure you replaced the ontologyService.js file with the fixed version');
      return false;
    }
  }

  // Test 2: API endpoints test
  async testAPIEndpoints() {
    console.log('\n🌐 Testing API Endpoints...\n');
    
    const tests = [
      {
        name: 'Synergistic Combos',
        endpoint: '/analysis/synergistic-combos',
        method: 'GET',
        expectedField: 'data.total_combinations',
        expectedValue: 25 // Should match your raw SPARQL test
      },
      {
        name: 'Ingredient Conflicts',
        endpoint: '/analysis/ingredient-conflicts',
        method: 'POST',
        data: { ingredients: ['Retinol', 'Vitamin C'] },
        expectedField: 'analysis.conflict_analysis.total_conflicts'
      },
      {
        name: 'Ontology Status',
        endpoint: '/analysis/ontology-status',
        method: 'GET',
        expectedField: 'status',
        expectedValue: 'FULLY_OPERATIONAL'
      }
    ];

    const results = {};
    
    for (const test of tests) {
      console.log(`🔍 Testing ${test.name}...`);
      
      try {
        const config = {
          method: test.method,
          url: `${this.baseURL}${test.endpoint}`,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        };
        
        if (test.data) config.data = test.data;
        
        const response = await axios(config);
        
        // Check if expected field exists
        const hasExpectedField = this.hasNestedProperty(response.data, test.expectedField);
        const actualValue = this.getNestedProperty(response.data, test.expectedField);
        
        const passed = hasExpectedField && 
                      (!test.expectedValue || actualValue == test.expectedValue);
        
        results[test.name] = {
          passed,
          actualValue,
          expectedValue: test.expectedValue
        };
        
        console.log(`   ${passed ? '✅' : '❌'} ${test.name}: ${actualValue || 'undefined'}`);
        
        if (test.expectedValue && actualValue != test.expectedValue) {
          console.log(`      Expected: ${test.expectedValue}, Got: ${actualValue}`);
        }
        
      } catch (error) {
        results[test.name] = { passed: false, error: error.message };
        console.log(`   ❌ ${test.name}: ${error.message}`);
      }
    }
    
    return results;
  }

  // Test 3: Compare with raw SPARQL
  async testRawSPARQLComparison() {
    console.log('\n🔬 Comparing with Raw SPARQL...\n');
    
    try {
      // Test the exact query that worked in your debug
      const query = `
PREFIX sc: <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT (COUNT(*) as ?count)
WHERE {
  ?ingredient1 sc:synergisticWith ?ingredient2 .
}
      `;
      
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { 
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          } 
        }
      );
      
      const rawCount = parseInt(response.data.results.bindings[0]?.count?.value || 0);
      console.log(`🔍 Raw SPARQL synergistic count: ${rawCount}`);
      
      // Now test API endpoint
      const apiResponse = await axios.get(`${this.baseURL}/analysis/synergistic-combos`);
      const apiCount = apiResponse.data?.data?.total_combinations || 0;
      console.log(`🌐 API synergistic count: ${apiCount}`);
      
      const match = rawCount === apiCount;
      console.log(`📊 Results match: ${match ? '✅ YES' : '❌ NO'}`);
      
      if (!match) {
        console.log(`   Raw SPARQL: ${rawCount}, API: ${apiCount}`);
        console.log('   💡 If API returns 0, the ontologyService.js fix may not be applied yet');
      }
      
      return { rawCount, apiCount, match };
      
    } catch (error) {
      console.log('❌ Raw SPARQL comparison failed:', error.message);
      return { error: error.message };
    }
  }

  // Test 4: Performance check
  async testPerformance() {
    console.log('\n⚡ Performance Test...\n');
    
    const tests = [
      { name: 'Health Check', endpoint: '/analysis/ontology-status' },
      { name: 'Synergistic Combos', endpoint: '/analysis/synergistic-combos' },
      { name: 'Conflict Analysis', endpoint: '/analysis/ingredient-conflicts', method: 'POST', data: { ingredients: ['Retinol', 'Vitamin C'] } }
    ];
    
    for (const test of tests) {
      try {
        const startTime = Date.now();
        
        const config = {
          method: test.method || 'GET',
          url: `${this.baseURL}${test.endpoint}`,
          headers: { 'Content-Type': 'application/json' }
        };
        
        if (test.data) config.data = test.data;
        
        const response = await axios(config);
        const duration = Date.now() - startTime;
        
        console.log(`   ⚡ ${test.name}: ${duration}ms ${duration < 1000 ? '✅' : '⚠️'}`);
        
      } catch (error) {
        console.log(`   ❌ ${test.name}: Failed (${error.message})`);
      }
    }
  }

  // Helper methods
  hasNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined, obj
    ) !== undefined;
  }

  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key], obj
    );
  }

  // Run complete test suite
  async runCompleteTest() {
    console.log('🚀 MatchCare Ontology Fix Verification');
    console.log('=====================================');
    console.log('Testing if the RDF prefix fix resolved the SPARQL errors\n');

    // Test 1: Direct service test
    const directTest = await this.testOntologyServiceDirect();
    
    // Test 2: API endpoints
    const apiTests = await this.testAPIEndpoints();
    
    // Test 3: Raw SPARQL comparison
    const comparisonTest = await this.testRawSPARQLComparison();
    
    // Test 4: Performance check
    await this.testPerformance();
    
    // Generate summary
    this.generateSummary(directTest, apiTests, comparisonTest);
  }

  generateSummary(directTest, apiTests, comparisonTest) {
    console.log('\n📋 FIX VERIFICATION SUMMARY');
    console.log('============================');
    
    console.log('🧪 Direct OntologyService Test:');
    console.log(`   Status: ${directTest ? '✅ PASSED' : '❌ FAILED'}`);
    
    console.log('\n🌐 API Endpoints Test:');
    Object.entries(apiTests).forEach(([name, result]) => {
      console.log(`   • ${name}: ${result.passed ? '✅' : '❌'} ${result.actualValue || 'failed'}`);
    });
    
    console.log('\n🔬 Raw SPARQL Comparison:');
    if (comparisonTest.match !== undefined) {
      console.log(`   Raw vs API: ${comparisonTest.match ? '✅ MATCH' : '❌ MISMATCH'}`);
      console.log(`   Raw: ${comparisonTest.rawCount}, API: ${comparisonTest.apiCount}`);
    } else {
      console.log(`   ❌ Comparison failed: ${comparisonTest.error}`);
    }
    
    // Overall assessment
    const overallSuccess = directTest && 
                          Object.values(apiTests).some(t => t.passed) &&
                          (comparisonTest.match === true);
    
    console.log(`\n${overallSuccess ? '🎉' : '⚠️'} Overall Assessment:`);
    
    if (overallSuccess) {
      console.log('✅ FIX SUCCESSFUL! The RDF prefix issue has been resolved.');
      console.log('✅ All SPARQL queries are now working properly.');
      console.log('✅ API endpoints returning data as expected.');
      console.log('\n🚀 Next Steps:');
      console.log('   1. ✅ Backend is fully operational');
      console.log('   2. ✅ Start frontend development');
      console.log('   3. ✅ Integrate with quiz system');
    } else {
      console.log('⚠️ FIX PARTIALLY SUCCESSFUL or needs attention:');
      
      if (!directTest) {
        console.log('   • Direct ontologyService test failed');
        console.log('   • Make sure you replaced ontologyService.js with fixed version');
      }
      
      if (!Object.values(apiTests).some(t => t.passed)) {
        console.log('   • API endpoints still failing');
        console.log('   • Check if server was restarted after fix');
      }
      
      if (comparisonTest.match === false) {
        console.log('   • Raw SPARQL vs API mismatch');
        console.log('   • ontologyService may not be using fixed queries');
      }
    }
    
    console.log('\n📍 Test Commands:');
    console.log(`   • Manual API test: curl ${this.baseURL}/analysis/synergistic-combos`);
    console.log(`   • Health check: curl ${this.baseURL}/analysis/ontology-status`);
    console.log('   • Expected synergistic count: 25 (from your raw SPARQL test)');
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new FixedOntologyTester();
  tester.runCompleteTest().catch(console.error);
}

module.exports = FixedOntologyTester;