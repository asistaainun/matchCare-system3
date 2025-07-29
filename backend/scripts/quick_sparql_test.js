// backend/scripts/test-matchcare-integration.js
const axios = require('axios');

// Test both SPARQL directly and the Express API
class MatchCareIntegrationTest {
  constructor() {
    this.fusekiEndpoint = 'http://localhost:3030/skincare-db/sparql';
    this.apiEndpoint = 'http://localhost:5000/api';
    this.prefixes = `
PREFIX sc: <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    `;
  }

  async querySPARQL(query) {
    try {
      const response = await axios.post(this.fusekiEndpoint, 
        `query=${encodeURIComponent(this.prefixes + query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/sparql-results+json'
          }
        }
      );
      return response.data.results.bindings;
    } catch (error) {
      throw new Error(`SPARQL query failed: ${error.message}`);
    }
  }

  async testAPI(endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${this.apiEndpoint}${endpoint}`,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (data) config.data = data;
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      throw new Error(`API test failed: ${error.message}`);
    }
  }

  // Test 1: Basic SPARQL connectivity and data verification
  async testSPARQLBasics() {
    console.log('🔍 Testing SPARQL Basics...');
    
    // Count ingredients
    const ingredientQuery = `
SELECT (COUNT(DISTINCT ?ingredient) as ?count)
WHERE {
  ?ingredient rdf:type sc:Ingredient .
}
    `;
    
    const ingredientResult = await this.querySPARQL(ingredientQuery);
    const ingredientCount = ingredientResult[0]?.count?.value || 0;
    
    // Count products
    const productQuery = `
SELECT (COUNT(DISTINCT ?product) as ?count)
WHERE {
  ?product rdf:type sc:Product .
}
    `;
    
    const productResult = await this.querySPARQL(productQuery);
    const productCount = productResult[0]?.count?.value || 0;
    
    console.log(`   ✅ Found ${ingredientCount} ingredients`);
    console.log(`   ✅ Found ${productCount} products`);
    
    return { ingredientCount: parseInt(ingredientCount), productCount: parseInt(productCount) };
  }

  // Test 2: Skin type recommendations
  async testSkinTypeRecommendations() {
    console.log('\n🎯 Testing Skin Type Recommendations...');
    
    const skinTypes = ['Oily', 'Dry', 'Normal', 'Combination'];
    const results = {};
    
    for (const skinType of skinTypes) {
      const query = `
SELECT (COUNT(DISTINCT ?ingredient) as ?count)
WHERE {
  ?ingredient rdf:type sc:Ingredient .
  ?ingredient sc:recommendedFor sc:${skinType} .
}
      `;
      
      const result = await this.querySPARQL(query);
      const count = parseInt(result[0]?.count?.value || 0);
      results[skinType] = count;
      console.log(`   ✅ ${skinType} skin: ${count} recommended ingredients`);
    }
    
    return results;
  }

  // Test 3: Ingredient relationships (incompatibilities and synergies)
  async testIngredientRelationships() {
    console.log('\n⚠️  Testing Ingredient Relationships...');
    
    // Test incompatibilities
    const incompatibleQuery = `
SELECT (COUNT(*) as ?count)
WHERE {
  ?ingredient1 sc:incompatibleWith ?ingredient2 .
}
    `;
    
    const incompatibleResult = await this.querySPARQL(incompatibleQuery);
    const incompatibleCount = parseInt(incompatibleResult[0]?.count?.value || 0);
    
    // Test synergies
    const synergisticQuery = `
SELECT (COUNT(*) as ?count)
WHERE {
  ?ingredient1 sc:synergisticWith ?ingredient2 .
}
    `;
    
    const synergisticResult = await this.querySPARQL(synergisticQuery);
    const synergisticCount = parseInt(synergisticResult[0]?.count?.value || 0);
    
    console.log(`   ✅ Found ${incompatibleCount} incompatible ingredient pairs`);
    console.log(`   ✅ Found ${synergisticCount} synergistic ingredient pairs`);
    
    return { incompatible: incompatibleCount, synergistic: synergisticCount };
  }

  // Test 4: Concern-based ingredient mapping
  async testConcernMapping() {
    console.log('\n🎯 Testing Concern-Based Mapping...');
    
    const concerns = ['Acne', 'Dryness', 'Wrinkles', 'Redness', 'DarkSpots'];
    const results = {};
    
    for (const concern of concerns) {
      const query = `
SELECT (COUNT(DISTINCT ?ingredient) as ?count)
WHERE {
  ?ingredient rdf:type sc:Ingredient .
  ?ingredient sc:treatsConcern sc:${concern} .
}
      `;
      
      try {
        const result = await this.querySPARQL(query);
        const count = parseInt(result[0]?.count?.value || 0);
        results[concern] = count;
        console.log(`   ✅ ${concern}: ${count} treating ingredients`);
      } catch (error) {
        results[concern] = 0;
        console.log(`   ⚠️  ${concern}: No data found`);
      }
    }
    
    return results;
  }

  // Test 5: Express API endpoints
  async testExpressAPIEndpoints() {
    console.log('\n🌐 Testing Express API Endpoints...');
    
    try {
      // Test health endpoint
      const health = await this.testAPI('/health');
      console.log('   ✅ Health endpoint working');
      
      // Test products endpoint
      const products = await this.testAPI('/products?limit=5');
      console.log(`   ✅ Products endpoint: ${products.data?.length || 0} products returned`);
      
      // Test ingredients endpoint
      const ingredients = await this.testAPI('/ingredients?limit=5');
      console.log(`   ✅ Ingredients endpoint: ${ingredients.data?.length || 0} ingredients returned`);
      
      return { health: true, products: true, ingredients: true };
      
    } catch (error) {
      console.log(`   ❌ API test failed: ${error.message}`);
      console.log('   💡 Make sure your Express server is running on port 5000');
      return { health: false, products: false, ingredients: false };
    }
  }

  // Test 6: SPARQL-based recommendations (if implemented)
  async testRecommendationAPI() {
    console.log('\n🎯 Testing Recommendation API...');
    
    try {
      const testProfile = {
        skinType: 'oily',
        skinConcerns: ['acne', 'oiliness'],
        avoidedIngredients: [],
        sensitivities: ['fragrance']
      };
      
      const recommendations = await this.testAPI('/recommendations', 'POST', testProfile);
      
      if (recommendations.success) {
        console.log('   ✅ Recommendation API working');
        console.log(`   ✅ Generated ${recommendations.data?.totalRecommendations || 0} recommendations`);
        console.log(`   ✅ Ingredient recommendations: ${recommendations.data?.recommendedIngredients?.length || 0}`);
        console.log(`   ✅ Product recommendations: ${recommendations.data?.recommendedProducts?.length || 0}`);
        return true;
      } else {
        console.log('   ⚠️  Recommendation API returned error');
        return false;
      }
      
    } catch (error) {
      console.log('   ⚠️  Recommendation API not yet implemented or server not running');
      console.log('   💡 This is expected if you haven\'t integrated the SPARQL service yet');
      return false;
    }
  }

  // Test 7: Compatibility check API
  async testCompatibilityAPI() {
    console.log('\n🔬 Testing Compatibility Check...');
    
    try {
      const testIngredients = ['Retinol', 'Vitamin C', 'Salicylic Acid'];
      
      const compatibility = await this.testAPI('/compatibility-check', 'POST', { 
        ingredients: testIngredients 
      });
      
      if (compatibility.success) {
        console.log('   ✅ Compatibility API working');
        console.log(`   ✅ Safety check: ${compatibility.data?.safe ? 'Safe' : 'Has warnings'}`);
        console.log(`   ✅ Warnings: ${compatibility.data?.warnings?.length || 0}`);
        console.log(`   ✅ Synergies: ${compatibility.data?.benefits?.length || 0}`);
        return true;
      }
      
    } catch (error) {
      console.log('   ⚠️  Compatibility API not yet implemented');
      return false;
    }
  }

  // Run comprehensive test suite
  async runFullTestSuite() {
    console.log('🚀 MatchCare Integration Test Suite');
    console.log('=' .repeat(60));
    console.log('Testing your ontology-based skincare recommendation system\n');
    
    const results = {};
    
    try {
      // Test 1: SPARQL basics
      results.sparqlBasics = await this.testSPARQLBasics();
      
      // Test 2: Skin type recommendations
      results.skinTypeRecommendations = await this.testSkinTypeRecommendations();
      
      // Test 3: Ingredient relationships
      results.relationships = await this.testIngredientRelationships();
      
      // Test 4: Concern mapping
      results.concernMapping = await this.testConcernMapping();
      
      // Test 5: Express API
      results.expressAPI = await this.testExpressAPIEndpoints();
      
      // Test 6: Recommendation API
      results.recommendationAPI = await this.testRecommendationAPI();
      
      // Test 7: Compatibility API
      results.compatibilityAPI = await this.testCompatibilityAPI();
      
      // Generate summary report
      this.generateSummaryReport(results);
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      throw error;
    }
  }

  generateSummaryReport(results) {
    console.log('\n📋 TEST SUMMARY REPORT');
    console.log('=' .repeat(60));
    
    // Data verification
    console.log('📊 Data Verification:');
    console.log(`   • Ingredients in ontology: ${results.sparqlBasics?.ingredientCount || 0}`);
    console.log(`   • Products in ontology: ${results.sparqlBasics?.productCount || 0}`);
    console.log(`   • Incompatible pairs: ${results.relationships?.incompatible || 0}`);
    console.log(`   • Synergistic pairs: ${results.relationships?.synergistic || 0}`);
    
    // Recommendation readiness
    console.log('\n🎯 Recommendation System Readiness:');
    const skinTypeTotal = Object.values(results.skinTypeRecommendations || {}).reduce((a, b) => a + b, 0);
    console.log(`   • Skin type recommendations: ${skinTypeTotal} total mappings`);
    
    const concernTotal = Object.values(results.concernMapping || {}).reduce((a, b) => a + b, 0);
    console.log(`   • Concern-based mappings: ${concernTotal} total mappings`);
    
    // API status
    console.log('\n🌐 API Integration Status:');
    console.log(`   • Basic APIs: ${results.expressAPI?.health ? '✅' : '❌'} Working`);
    console.log(`   • Recommendation API: ${results.recommendationAPI ? '✅' : '⚠️'} ${results.recommendationAPI ? 'Working' : 'Not implemented'}`);
    console.log(`   • Compatibility API: ${results.compatibilityAPI ? '✅' : '⚠️'} ${results.compatibilityAPI ? 'Working' : 'Not implemented'}`);
    
    // Next steps
    console.log('\n🚀 Next Steps:');
    if (!results.recommendationAPI) {
      console.log('   1. ✅ Implement SPARQL service integration (use provided code)');
      console.log('   2. ✅ Add recommendation routes to Express server');
    }
    if (!results.compatibilityAPI) {
      console.log('   3. ✅ Add compatibility check endpoints');
    }
    console.log('   4. ✅ Build frontend skin quiz integration');
    console.log('   5. ✅ Implement product filtering based on recommendations');
    console.log('   6. ✅ Add user profile persistence');
    
    // Success indicator
    const overallSuccess = results.sparqlBasics?.ingredientCount > 0 && 
                          results.sparqlBasics?.productCount > 0 &&
                          results.expressAPI?.health;
    
    console.log(`\n${overallSuccess ? '🎉' : '⚠️'} Overall Status: ${overallSuccess ? 'READY FOR DEVELOPMENT' : 'NEEDS ATTENTION'}`);
    
    if (overallSuccess) {
      console.log('✨ Your MatchCare ontology is properly loaded and ready for skincare recommendations!');
    } else {
      console.log('🔧 Please address the issues above before proceeding.');
    }
  }
}

// Run the test suite
if (require.main === module) {
  const tester = new MatchCareIntegrationTest();
  tester.runFullTestSuite().catch(console.error);
}

module.exports = MatchCareIntegrationTest;