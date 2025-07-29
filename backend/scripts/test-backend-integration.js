// backend/scripts/test-backend-integration.js
const axios = require('axios');

class BackendIntegrationTest {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.testResults = {};
  }

  async testEndpoint(endpoint, method = 'GET', data = null, expectedFields = []) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      };
      
      if (data) config.data = data;
      
      const response = await axios(config);
      
      // Validate expected fields
      const missingFields = expectedFields.filter(field => 
        !this.hasNestedProperty(response.data, field)
      );
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        missingFields,
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'NETWORK_ERROR',
        data: error.response?.data || null
      };
    }
  }

  hasNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined, obj
    ) !== undefined;
  }

  async runAllTests() {
    console.log('🚀 MatchCare Backend Integration Test');
    console.log('=====================================');
    console.log(`Testing API at: ${this.baseURL}\n`);

    // Test 1: Health Check
    console.log('1️⃣ Testing Health Endpoint...');
    const healthTest = await this.testEndpoint('/health', 'GET', null, ['success', 'message']);
    
    if (healthTest.success) {
      console.log('   ✅ Health endpoint working');
      console.log(`   📊 Response: ${healthTest.data.message}`);
    } else {
      console.log('   ❌ Health endpoint failed');
      console.log(`   Error: ${healthTest.error}`);
      console.log('   💡 Make sure your Express server is running on port 5000');
      return;
    }

    // Test 2: Ontology Status
    console.log('\n2️⃣ Testing Ontology Status...');
    const statusTest = await this.testEndpoint('/analysis/ontology-status', 'GET', null, 
      ['success', 'status', 'system.connection.status']
    );
    
    if (statusTest.success) {
      const system = statusTest.data.system;
      console.log('   ✅ Ontology status endpoint working');
      console.log(`   📊 Overall Status: ${statusTest.data.status}`);
      console.log(`   🔗 Fuseki Connection: ${system?.connection?.status || 'unknown'}`);
      console.log(`   📈 Total Triples: ${system?.data_availability?.total_triples || 0}`);
      
      if (statusTest.data.status !== 'FULLY_OPERATIONAL') {
        console.log('   ⚠️ System not fully operational - check Fuseki setup');
      }
    } else {
      console.log('   ❌ Ontology status failed');
      console.log(`   Error: ${statusTest.error}`);
    }

    // Test 3: Synergistic Combinations (The 83-result query)
    console.log('\n3️⃣ Testing Synergistic Combinations...');
    const synergyTest = await this.testEndpoint('/analysis/synergistic-combos', 'GET', null,
      ['success', 'data.total_combinations', 'data.combinations']
    );
    
    if (synergyTest.success) {
      const count = synergyTest.data?.data?.total_combinations || 0;
      console.log('   ✅ Synergistic combinations endpoint working');
      console.log(`   📊 Total Combinations: ${count}`);
      console.log(`   🎯 Expected: 83, Got: ${count} ${count === 83 ? '(Perfect!)' : '(Check data)'}`);
      console.log(`   ⚡ Performance: ${synergyTest.data?.data?.performance || 'N/A'}`);
      
      // Show sample combinations
      const combinations = synergyTest.data?.data?.combinations || [];
      if (combinations.length > 0) {
        console.log('   📋 Sample Combinations:');
        combinations.slice(0, 3).forEach((combo, i) => {
          console.log(`      ${i + 1}. ${combo.name1} + ${combo.name2}`);
          console.log(`         Benefits: ${combo.benefit1} + ${combo.benefit2}`);
        });
      }
      
      this.testResults.synergies = { count, expected: 83 };
    } else {
      console.log('   ❌ Synergistic combinations failed');
      console.log(`   Error: ${synergyTest.error}`);
    }

    // Test 4: Ingredient Conflict Analysis
    console.log('\n4️⃣ Testing Ingredient Conflict Analysis...');
    const testIngredients = ['Retinol', 'Vitamin C', 'Salicylic Acid'];
    const conflictTest = await this.testEndpoint('/analysis/ingredient-conflicts', 'POST', 
      { ingredients: testIngredients },
      ['success', 'analysis.conflict_analysis', 'analysis.synergy_analysis']
    );
    
    if (conflictTest.success) {
      const analysis = conflictTest.data.analysis;
      console.log('   ✅ Ingredient conflict analysis working');
      console.log(`   🧪 Analyzed: ${testIngredients.join(', ')}`);
      console.log(`   ⚠️ Conflicts Found: ${analysis?.conflict_analysis?.total_conflicts || 0}`);
      console.log(`   ✨ Synergies Found: ${analysis?.synergy_analysis?.total_synergies || 0}`);
      console.log(`   🛡️ Safety Status: ${analysis?.conflict_analysis?.safety_status || 'unknown'}`);
      console.log(`   📊 Safety Score: ${analysis?.safety_score || 'N/A'}/100`);
      
      this.testResults.conflicts = analysis?.conflict_analysis?.total_conflicts || 0;
    } else {
      console.log('   ❌ Ingredient conflict analysis failed');
      console.log(`   Error: ${conflictTest.error}`);
    }

    // Test 5: Skin Type Recommendations
    console.log('\n5️⃣ Testing Skin Type Recommendations...');
    const skinRecommendationTest = await this.testEndpoint('/analysis/skin-recommendations', 'POST',
      { 
        skinType: 'Oily', 
        concerns: ['Acne', 'Pores'], 
        avoidedIngredients: []
      },
      ['success', 'data.recommendation_summary', 'data.recommendations']
    );
    
    if (skinRecommendationTest.success) {
      const recommendations = skinRecommendationTest.data.data;
      console.log('   ✅ Skin recommendations working');
      console.log(`   🎯 Skin Type: ${recommendations?.user_profile?.skinType || 'unknown'}`);
      console.log(`   📊 Total Recommendations: ${recommendations?.recommendation_summary?.total_ingredients || 0}`);
      console.log(`   🔍 Personalization Level: ${recommendations?.recommendation_summary?.personalization_level || 1}`);
      
      // Show sample recommendations
      const ingredients = recommendations?.recommendations?.priority_ingredients || [];
      if (ingredients.length > 0) {
        console.log('   📋 Priority Ingredients:');
        ingredients.slice(0, 3).forEach((ing, i) => {
          console.log(`      ${i + 1}. ${ing.name}`);
          if (ing.benefit) console.log(`         Benefit: ${ing.benefit}`);
        });
      }
      
      this.testResults.recommendations = recommendations?.recommendation_summary?.total_ingredients || 0;
    } else {
      console.log('   ❌ Skin recommendations failed');
      console.log(`   Error: ${skinRecommendationTest.error}`);
    }

    // Test 6: Ingredients Database
    console.log('\n6️⃣ Testing Ingredients Database...');
    const ingredientsTest = await this.testEndpoint('/analysis/ingredients?limit=10', 'GET', null,
      ['success', 'data.ingredients', 'data.total_available']
    );
    
    if (ingredientsTest.success) {
      const data = ingredientsTest.data.data;
      console.log('   ✅ Ingredients database working');
      console.log(`   📊 Total Available: ${data?.total_available || 0}`);
      console.log(`   📋 Returned: ${data?.returned_count || 0}`);
      
      this.testResults.totalIngredients = data?.total_available || 0;
    } else {
      console.log('   ❌ Ingredients database failed');
      console.log(`   Error: ${ingredientsTest.error}`);
    }

    // Generate Summary Report
    this.generateSummaryReport();
  }

  generateSummaryReport() {
    console.log('\n📋 INTEGRATION TEST SUMMARY');
    console.log('============================');
    
    console.log('📊 Data Verification:');
    console.log(`   • Synergistic Combinations: ${this.testResults.synergies?.count || 0}/83 expected`);
    console.log(`   • Total Ingredients: ${this.testResults.totalIngredients || 0}`);
    console.log(`   • Conflict Detection: ${this.testResults.conflicts !== undefined ? '✅ Working' : '❌ Failed'}`);
    console.log(`   • Recommendations: ${this.testResults.recommendations || 0} generated`);
    
    console.log('\n🎯 System Readiness:');
    const synergyReady = (this.testResults.synergies?.count || 0) >= 70; // At least 70 out of 83
    const ingredientsReady = (this.testResults.totalIngredients || 0) >= 10;
    const conflictsReady = this.testResults.conflicts !== undefined;
    const recommendationsReady = (this.testResults.recommendations || 0) > 0;
    
    console.log(`   • Synergy Analysis: ${synergyReady ? '✅' : '⚠️'} ${synergyReady ? 'Ready' : 'Needs attention'}`);
    console.log(`   • Ingredient Database: ${ingredientsReady ? '✅' : '⚠️'} ${ingredientsReady ? 'Ready' : 'Needs data'}`);
    console.log(`   • Conflict Detection: ${conflictsReady ? '✅' : '⚠️'} ${conflictsReady ? 'Ready' : 'Not working'}`);
    console.log(`   • Recommendations: ${recommendationsReady ? '✅' : '⚠️'} ${recommendationsReady ? 'Ready' : 'Not working'}`);
    
    const overallReady = synergyReady && ingredientsReady && conflictsReady && recommendationsReady;
    
    console.log(`\n${overallReady ? '🎉' : '⚠️'} Overall Status: ${overallReady ? 'READY FOR FRONTEND DEVELOPMENT' : 'BACKEND ISSUES NEED FIXING'}`);
    
    if (overallReady) {
      console.log('\n🚀 Next Steps:');
      console.log('   1. ✅ Backend is fully functional');
      console.log('   2. ✅ Start frontend component development');
      console.log('   3. ✅ Build ingredient analysis UI');
      console.log('   4. ✅ Implement skin quiz integration');
    } else {
      console.log('\n🔧 Issues to Fix:');
      if (!synergyReady) console.log('   • Check Fuseki data loading');
      if (!ingredientsReady) console.log('   • Verify ingredient ontology');
      if (!conflictsReady) console.log('   • Debug conflict analysis queries');
      if (!recommendationsReady) console.log('   • Check skin type recommendation logic');
    }
    
    console.log('\n📍 Test Endpoints:');
    console.log(`   • Health: GET ${this.baseURL}/health`);
    console.log(`   • Synergies: GET ${this.baseURL}/analysis/synergistic-combos`);
    console.log(`   • Conflicts: POST ${this.baseURL}/analysis/ingredient-conflicts`);
    console.log(`   • Recommendations: POST ${this.baseURL}/analysis/skin-recommendations`);
    console.log(`   • Status: GET ${this.baseURL}/analysis/ontology-status`);
  }
}

// Run the test
if (require.main === module) {
  const tester = new BackendIntegrationTest();
  tester.runAllTests().catch(console.error);
}

module.exports = BackendIntegrationTest;