// backend/scripts/step2-integration-test.js
// COMPREHENSIVE INTEGRATION TEST for Step 2 Features

const axios = require('axios');
const { pool } = require('../config/database');

class Step2IntegrationTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.frontendUrl = 'http://localhost:3000';
    this.results = {
      backend_apis: {},
      frontend_pages: {},
      image_serving: {},
      search_functionality: {},
      filtering_system: {},
      ontology_integration: {}
    };
    this.totalTests = 0;
    this.passedTests = 0;
  }

  async runAllTests() {
    console.log('🧪 STEP 2 INTEGRATION TESTING');
    console.log('=' .repeat(50));
    console.log('Testing: Product Detail Page & Ingredients');
    console.log('Components: Backend + Frontend + Database + Ontology\n');

    try {
      await this.testBackendAPIs();
      await this.testImageServing();
      await this.testSearchFunctionality();
      await this.testFilteringSystem();
      await this.testOntologyIntegration();
      await this.testDatabaseIntegrity();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Integration test failed:', error);
    }
  }

  async testBackendAPIs() {
    console.log('🔗 Testing Backend APIs...');
    console.log('-'.repeat(30));

    const apiTests = [
      // Product APIs
      { name: 'Products List', endpoint: '/api/products', method: 'GET' },
      { name: 'Products Search', endpoint: '/api/products?search=cosrx', method: 'GET' },
      { name: 'Products Filter', endpoint: '/api/products?skin_type=oily&concerns=acne', method: 'GET' },
      { name: 'Product Detail', endpoint: '/api/products/1', method: 'GET' },
      
      // Ingredients APIs
      { name: 'Ingredients List', endpoint: '/api/ingredients', method: 'GET' },
      { name: 'Ingredients Search', endpoint: '/api/ingredients/search?q=niacinamide', method: 'GET' },
      
      // Helper APIs
      { name: 'Brands List', endpoint: '/api/brands', method: 'GET' },
      { name: 'Categories List', endpoint: '/api/categories', method: 'GET' },
      
      // Health checks
      { name: 'API Health', endpoint: '/api/health', method: 'GET' },
      { name: 'Ontology Test', endpoint: '/api/ontology/test', method: 'GET' }
    ];

    for (const test of apiTests) {
      await this.runAPITest(test);
    }

    console.log('');
  }

  async runAPITest(test) {
    this.totalTests++;
    
    try {
      const response = await axios({
        method: test.method,
        url: `${this.baseUrl}${test.endpoint}`,
        timeout: 10000
      });

      if (response.status === 200 && response.data.success !== false) {
        console.log(`   ✅ ${test.name}: OK`);
        this.passedTests++;
        this.results.backend_apis[test.name] = { status: 'pass', data: response.data };
      } else {
        console.log(`   ❌ ${test.name}: Invalid response`);
        this.results.backend_apis[test.name] = { status: 'fail', error: 'Invalid response' };
      }

    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      this.results.backend_apis[test.name] = { status: 'fail', error: error.message };
    }
  }

  async testImageServing() {
    console.log('🖼️ Testing Image Serving...');
    console.log('-'.repeat(30));

    const imageTests = [
      '/images/placeholder-product.jpg',
      '/images/placeholder-ingredient.jpg',
      '/images/brand-cosrx.svg',
      '/images/category-cleanser.svg'
    ];

    for (const imagePath of imageTests) {
      this.totalTests++;
      
      try {
        const response = await axios.get(`${this.baseUrl}${imagePath}`, { timeout: 5000 });
        
        if (response.status === 200) {
          console.log(`   ✅ ${imagePath}: OK`);
          this.passedTests++;
          this.results.image_serving[imagePath] = { status: 'pass' };
        } else {
          console.log(`   ❌ ${imagePath}: Status ${response.status}`);
          this.results.image_serving[imagePath] = { status: 'fail', error: `Status ${response.status}` };
        }

      } catch (error) {
        console.log(`   ❌ ${imagePath}: ${error.message}`);
        this.results.image_serving[imagePath] = { status: 'fail', error: error.message };
      }
    }

    console.log('');
  }

  async testSearchFunctionality() {
    console.log('🔍 Testing Search Functionality...');
    console.log('-'.repeat(30));

    const searchTests = [
      { query: 'cosrx', expectedMin: 5, type: 'brand' },
      { query: 'serum', expectedMin: 10, type: 'product' },
      { query: 'niacinamide', expectedMin: 3, type: 'ingredient' },
      { query: 'acne', expectedMin: 5, type: 'concern' }
    ];

    for (const test of searchTests) {
      await this.runSearchTest(test);
    }

    console.log('');
  }

  async runSearchTest(test) {
    this.totalTests++;

    try {
      // Test product search
      const productResponse = await axios.get(`${this.baseUrl}/api/products?search=${test.query}&limit=50`);
      
      // Test ingredient search
      const ingredientResponse = await axios.get(`${this.baseUrl}/api/ingredients/search?q=${test.query}&limit=20`);

      const productCount = productResponse.data.success ? productResponse.data.data.length : 0;
      const ingredientCount = ingredientResponse.data.success ? ingredientResponse.data.data.length : 0;
      const totalResults = productCount + ingredientCount;

      if (totalResults >= test.expectedMin) {
        console.log(`   ✅ Search "${test.query}": ${totalResults} results (${productCount} products + ${ingredientCount} ingredients)`);
        this.passedTests++;
        this.results.search_functionality[test.query] = { 
          status: 'pass', 
          results: totalResults,
          products: productCount,
          ingredients: ingredientCount
        };
      } else {
        console.log(`   ❌ Search "${test.query}": Only ${totalResults} results (expected min ${test.expectedMin})`);
        this.results.search_functionality[test.query] = { 
          status: 'fail', 
          error: `Insufficient results: ${totalResults} < ${test.expectedMin}`
        };
      }

    } catch (error) {
      console.log(`   ❌ Search "${test.query}": ${error.message}`);
      this.results.search_functionality[test.query] = { status: 'fail', error: error.message };
    }
  }

  async testFilteringSystem() {
    console.log('🎛️ Testing Advanced Filtering...');
    console.log('-'.repeat(30));

    const filterTests = [
      { 
        name: 'Skin Type Filter', 
        params: 'skin_type=oily',
        expectedMin: 5
      },
      { 
        name: 'Concern Filter', 
        params: 'concerns=acne',
        expectedMin: 3
      },
      { 
        name: 'Multiple Filters', 
        params: 'skin_type=oily&concerns=acne&alcohol_free=true',
        expectedMin: 1
      },
      { 
        name: 'Brand Filter', 
        params: 'brand=cosrx',
        expectedMin: 3
      },
      { 
        name: 'Category Filter', 
        params: 'category=serum',
        expectedMin: 5
      }
    ];

    for (const test of filterTests) {
      await this.runFilterTest(test);
    }

    console.log('');
  }

  async runFilterTest(test) {
    this.totalTests++;

    try {
      const response = await axios.get(`${this.baseUrl}/api/products?${test.params}&limit=50`);
      
      if (response.data.success) {
        const resultCount = response.data.data.length;
        
        if (resultCount >= test.expectedMin) {
          console.log(`   ✅ ${test.name}: ${resultCount} results`);
          this.passedTests++;
          this.results.filtering_system[test.name] = { status: 'pass', results: resultCount };
        } else {
          console.log(`   ❌ ${test.name}: Only ${resultCount} results (expected min ${test.expectedMin})`);
          this.results.filtering_system[test.name] = { 
            status: 'fail', 
            error: `Insufficient results: ${resultCount} < ${test.expectedMin}`
          };
        }
      } else {
        throw new Error(response.data.message || 'API returned success: false');
      }

    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      this.results.filtering_system[test.name] = { status: 'fail', error: error.message };
    }
  }

  async testOntologyIntegration() {
    console.log('🧠 Testing Ontology Integration...');
    console.log('-'.repeat(30));

    const ontologyTests = [
      { name: 'Ontology Connection', endpoint: '/api/ontology/test' },
      { name: 'Ingredient Analysis', endpoint: '/api/ingredients?limit=10' },
      { name: 'Semantic Search', endpoint: '/api/ingredients/search?q=vitamin' }
    ];

    for (const test of ontologyTests) {
      this.totalTests++;
      
      try {
        const response = await axios.get(`${this.baseUrl}${test.endpoint}`, { timeout: 15000 });
        
        if (response.data.success) {
          console.log(`   ✅ ${test.name}: OK`);
          this.passedTests++;
          this.results.ontology_integration[test.name] = { status: 'pass' };
        } else {
          console.log(`   ⚠️ ${test.name}: Limited functionality`);
          this.results.ontology_integration[test.name] = { status: 'warning', message: 'Limited functionality' };
        }

      } catch (error) {
        console.log(`   ⚠️ ${test.name}: ${error.message}`);
        this.results.ontology_integration[test.name] = { status: 'warning', error: error.message };
      }
    }

    console.log('');
  }

  async testDatabaseIntegrity() {
    console.log('💾 Testing Database Integrity...');
    console.log('-'.repeat(30));

    try {
      // Test basic table existence and data
      const tables = ['products', 'brands', 'ingredients'];
      
      for (const table of tables) {
        this.totalTests++;
        
        try {
          const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
          const count = parseInt(result.rows[0].count);
          
          if (count > 0) {
            console.log(`   ✅ Table ${table}: ${count} records`);
            this.passedTests++;
          } else {
            console.log(`   ❌ Table ${table}: No records found`);
          }
        } catch (error) {
          console.log(`   ❌ Table ${table}: ${error.message}`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Database test failed: ${error.message}`);
    }

    console.log('');
  }

  generateReport() {
    console.log('📊 STEP 2 INTEGRATION TEST REPORT');
    console.log('=' .repeat(50));
    
    const passRate = ((this.passedTests / this.totalTests) * 100).toFixed(1);
    
    console.log(`📈 Overall Results: ${this.passedTests}/${this.totalTests} tests passed (${passRate}%)`);
    console.log('');

    // Component status
    const components = {
      'Backend APIs': this.getComponentStatus(this.results.backend_apis),
      'Image Serving': this.getComponentStatus(this.results.image_serving),
      'Search System': this.getComponentStatus(this.results.search_functionality),
      'Filter System': this.getComponentStatus(this.results.filtering_system),
      'Ontology Integration': this.getComponentStatus(this.results.ontology_integration)
    };

    console.log('🔧 Component Status:');
    Object.entries(components).forEach(([component, status]) => {
      const icon = status === 'pass' ? '✅' : status === 'warning' ? '⚠️' : '❌';
      console.log(`   ${icon} ${component}: ${status.toUpperCase()}`);
    });

    console.log('');

    // Recommendations
    console.log('💡 Recommendations:');
    if (passRate >= 90) {
      console.log('   🎉 EXCELLENT! Step 2 integration is ready for production');
      console.log('   ✅ All major features working correctly');
      console.log('   🚀 Ready to proceed to Step 3: Advanced Search & Filtering');
    } else if (passRate >= 75) {
      console.log('   👍 GOOD! Most features working, minor issues to address');
      console.log('   🔧 Fix failing tests before proceeding to Step 3');
    } else if (passRate >= 50) {
      console.log('   ⚠️ NEEDS WORK! Several major issues to resolve');
      console.log('   🛠️ Focus on fixing core APIs and search functionality');
    } else {
      console.log('   ❌ CRITICAL ISSUES! Major components not working');
      console.log('   🚨 Review backend setup and database configuration');
    }

    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Fix any failing tests shown above');
    console.log('   2. Test frontend integration manually');
    console.log('   3. Verify user flows: search → filter → product detail');
    console.log('   4. Check ontology data completeness');
    console.log('   5. Proceed to Step 3 when all critical tests pass');
    console.log('');
  }

  getComponentStatus(results) {
    const statuses = Object.values(results).map(r => r.status);
    const failCount = statuses.filter(s => s === 'fail').length;
    const warnCount = statuses.filter(s => s === 'warning').length;
    const passCount = statuses.filter(s => s === 'pass').length;

    if (failCount > 0) return 'fail';
    if (warnCount > 0) return 'warning';
    if (passCount > 0) return 'pass';
    return 'unknown';
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new Step2IntegrationTest();
  tester.runAllTests().catch(console.error);
}

module.exports = Step2IntegrationTest;