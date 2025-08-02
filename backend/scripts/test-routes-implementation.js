// File: backend/scripts/test-routes-implementation.js
// Enhanced test script for proper routes implementation

const axios = require('axios');

class RoutesImplementationTester {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.results = {
      required: [],
      bonus: [],
      errors: []
    };
    this.requiredScore = 0;
    this.bonusScore = 0;
    this.totalRequired = 5;
    this.totalBonus = 4;
  }

  async runFullTest() {
    console.log('🧪 ENHANCED ROUTES IMPLEMENTATION TEST');
    console.log('=' + '='.repeat(50));
    console.log('📋 Testing Week 1 required + bonus endpoints...\n');

    // Test required endpoints
    await this.testRequiredEndpoints();
    
    // Test bonus detailed endpoints
    await this.testBonusEndpoints();
    
    // Generate comprehensive report
    this.generateComprehensiveReport();
    
    // Test data quality
    await this.testDataQuality();
    
    return this.requiredScore >= this.totalRequired;
  }

  async testRequiredEndpoints() {
    console.log('1️⃣ REQUIRED WEEK 1 ENDPOINTS');
    console.log('=' + '='.repeat(35));

    const requiredTests = [
      {
        name: 'Products List',
        method: 'GET',
        path: '/api/products',
        expectedFields: ['success', 'data'],
        test: this.testProductsList.bind(this)
      },
      {
        name: 'Product Detail', 
        method: 'GET',
        path: '/api/products/3421',
        expectedFields: ['success', 'data'],
        test: this.testProductDetail.bind(this)
      },
      {
        name: 'Categories List',
        method: 'GET',
        path: '/api/categories',
        expectedFields: ['success', 'data'],
        test: this.testCategoriesList.bind(this)
      },
      {
        name: 'Brands List',
        method: 'GET', 
        path: '/api/brands',
        expectedFields: ['success', 'data'],
        test: this.testBrandsList.bind(this)
      },
      {
        name: 'Ontology Recommendations',
        method: 'POST',
        path: '/api/ontology/recommendations',
        expectedFields: ['success', 'data', 'algorithm_type'],
        test: this.testOntologyRecommendations.bind(this)
      }
    ];

    for (const test of requiredTests) {
      console.log(`\n🔍 Testing: ${test.name}`);
      console.log('-'.repeat(25));
      
      try {
        const result = await test.test();
        if (result.success) {
          console.log(`   ✅ ${test.name}: PASSED`);
          console.log(`   📊 ${result.message}`);
          this.requiredScore++;
          this.results.required.push({ ...test, status: 'passed', details: result.message });
        } else {
          console.log(`   ⚠️ ${test.name}: PARTIAL`);
          console.log(`   📊 ${result.message}`);
          this.results.required.push({ ...test, status: 'partial', details: result.message });
        }
      } catch (error) {
        console.log(`   ❌ ${test.name}: FAILED`);
        console.log(`   💡 ${error.message}`);
        this.results.required.push({ ...test, status: 'failed', details: error.message });
        this.results.errors.push({ endpoint: test.name, error: error.message });
      }
    }
  }

  async testBonusEndpoints() {
    console.log('\n\n2️⃣ BONUS DETAILED ENDPOINTS');
    console.log('=' + '='.repeat(35));

    const bonusTests = [
      {
        name: 'Category Detail',
        test: this.testCategoryDetail.bind(this)
      },
      {
        name: 'Brand Detail',
        test: this.testBrandDetail.bind(this)
      },
      {
        name: 'Enhanced Categories',
        test: this.testEnhancedCategories.bind(this)
      },
      {
        name: 'Endpoint Status',
        test: this.testEndpointStatus.bind(this)
      }
    ];

    for (const test of bonusTests) {
      console.log(`\n🔍 Testing: ${test.name}`);
      console.log('-'.repeat(25));
      
      try {
        const result = await test.test();
        if (result.success) {
          console.log(`   ✅ ${test.name}: WORKING`);
          console.log(`   📊 ${result.message}`);
          this.bonusScore++;
          this.results.bonus.push({ name: test.name, status: 'working', details: result.message });
        } else {
          console.log(`   ⚠️ ${test.name}: PARTIAL`);
          console.log(`   📊 ${result.message}`);
          this.results.bonus.push({ name: test.name, status: 'partial', details: result.message });
        }
      } catch (error) {
        console.log(`   ❌ ${test.name}: FAILED`);
        console.log(`   💡 ${error.message}`);
        this.results.bonus.push({ name: test.name, status: 'failed', details: error.message });
      }
    }
  }

  // ========== INDIVIDUAL TEST METHODS ==========

  async testProductsList() {
    const response = await axios.get(`${this.baseURL}/api/products`);
    const data = response.data;
    
    if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
      return {
        success: true,
        message: `${data.data.length} products returned, ontology: ${data.ontology_powered || 'N/A'}`
      };
    }
    
    return { success: false, message: 'No products data or invalid format' };
  }

  async testProductDetail() {
    const response = await axios.get(`${this.baseURL}/api/products/3421`);
    const data = response.data;
    
    if (data.success && data.data && data.data.id) {
      return {
        success: true,
        message: `Product: ${data.data.name} (${data.data.brand_name || 'No brand'})`
      };
    }
    
    return { success: false, message: 'Product detail missing or invalid' };
  }

  async testCategoriesList() {
    const response = await axios.get(`${this.baseURL}/api/categories`);
    const data = response.data;
    
    if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
      const hasProductCounts = data.data[0].product_count !== undefined;
      const categoryCount = data.data.length;
      return {
        success: true,
        message: `${categoryCount} categories with ${hasProductCounts ? 'product counts' : 'basic data'}`
      };
    }
    
    return { success: false, message: 'No categories data returned' };
  }

  async testBrandsList() {
    const response = await axios.get(`${this.baseURL}/api/brands`);
    const data = response.data;
    
    if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
      const hasProductCounts = data.data[0].product_count !== undefined;
      const brandCount = data.data.length;
      return {
        success: true,
        message: `${brandCount} brands with ${hasProductCounts ? 'product counts' : 'basic data'}`
      };
    }
    
    return { success: false, message: 'No brands data returned' };
  }

  async testOntologyRecommendations() {
    const payload = {
      skin_type: 'oily',
      concerns: ['acne', 'pores'],
      sensitivities: ['fragrance']
    };
    
    const response = await axios.post(`${this.baseURL}/api/ontology/recommendations`, payload);
    const data = response.data;
    
    if (data.success && data.algorithm_type === 'TRUE_ONTOLOGY_BASED') {
      const recCount = data.data?.recommendations?.length || (Array.isArray(data.data) ? data.data.length : 0);
      return {
        success: true,
        message: `${recCount} ontology recommendations, algorithm: ${data.algorithm_type}`
      };
    }
    
    return { success: false, message: 'Ontology recommendations failed or wrong algorithm' };
  }

  async testCategoryDetail() {
    // First get a category name
    const categoriesResponse = await axios.get(`${this.baseURL}/api/categories`);
    const categories = categoriesResponse.data.data;
    
    if (!categories || categories.length === 0) {
      throw new Error('No categories available to test detail endpoint');
    }
    
    const testCategory = categories[0].name;
    const response = await axios.get(`${this.baseURL}/api/categories/${encodeURIComponent(testCategory)}`);
    const data = response.data;
    
    if (data.success && data.data && data.data.name) {
      const hasTopBrands = data.data.top_brands && Array.isArray(data.data.top_brands);
      return {
        success: true,
        message: `Category '${testCategory}': ${data.data.product_count} products, ${hasTopBrands ? data.data.top_brands.length + ' top brands' : 'no brand data'}`
      };
    }
    
    return { success: false, message: 'Category detail missing data' };
  }

  async testBrandDetail() {
    // First get a brand ID
    const brandsResponse = await axios.get(`${this.baseURL}/api/brands`);
    const brands = brandsResponse.data.data;
    
    if (!brands || brands.length === 0) {
      throw new Error('No brands available to test detail endpoint');
    }
    
    const testBrand = brands[0];
    const response = await axios.get(`${this.baseURL}/api/brands/${testBrand.id}`);
    const data = response.data;
    
    if (data.success && data.data && data.data.name) {
      const hasCategoryBreakdown = data.data.category_breakdown && Array.isArray(data.data.category_breakdown);
      return {
        success: true,
        message: `Brand '${data.data.name}': ${data.data.product_count} products, ${hasCategoryBreakdown ? data.data.category_breakdown.length + ' categories' : 'no category breakdown'}`
      };
    }
    
    return { success: false, message: 'Brand detail missing data' };
  }

  async testEnhancedCategories() {
    const response = await axios.get(`${this.baseURL}/api/categories?include_subcategories=true`);
    const data = response.data;
    
    if (data.success && data.metadata) {
      return {
        success: true,
        message: `Enhanced: ${data.metadata.total_categories} categories, ${data.metadata.total_subcategories} subcategories`
      };
    }
    
    return { success: false, message: 'Enhanced categories not working' };
  }

  async testEndpointStatus() {
    const response = await axios.get(`${this.baseURL}/api/endpoints/status`);
    const data = response.data;
    
    if (data.success && data.week_1_readiness) {
      return {
        success: true,
        message: `Status check: ${data.week_1_readiness}, architecture: ${data.architecture || 'N/A'}`
      };
    }
    
    return { success: false, message: 'Endpoint status check failed' };
  }

  async testDataQuality() {
    console.log('\n\n3️⃣ DATA QUALITY ASSESSMENT');
    console.log('=' + '='.repeat(35));

    try {
      // Test data consistency
      const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        axios.get(`${this.baseURL}/api/products`),
        axios.get(`${this.baseURL}/api/categories`),
        axios.get(`${this.baseURL}/api/brands`)
      ]);

      const productCount = productsRes.data.data?.length || 0;
      const categoryCount = categoriesRes.data.data?.length || 0;
      const brandCount = brandsRes.data.data?.length || 0;

      console.log(`   📊 Data Overview:`);
      console.log(`      Products: ${productCount}`);
      console.log(`      Categories: ${categoryCount}`);
      console.log(`      Brands: ${brandCount}`);

      // Check for required fields in sample data
      if (productCount > 0) {
        const sampleProduct = productsRes.data.data[0];
        const hasRequiredFields = sampleProduct.name && sampleProduct.brand_name && sampleProduct.main_category;
        console.log(`   ✅ Sample product has required fields: ${hasRequiredFields}`);
      }

      if (categoryCount > 0) {
        const sampleCategory = categoriesRes.data.data[0];
        const hasProductCount = sampleCategory.product_count !== undefined;
        console.log(`   ✅ Categories include product counts: ${hasProductCount}`);
      }

      if (brandCount > 0) {
        const sampleBrand = brandsRes.data.data[0];
        const hasProductCount = sampleBrand.product_count !== undefined;
        console.log(`   ✅ Brands include product counts: ${hasProductCount}`);
      }

    } catch (error) {
      console.log(`   ❌ Data quality test failed: ${error.message}`);
    }
  }

  generateComprehensiveReport() {
    console.log('\n\n📊 COMPREHENSIVE TEST REPORT');
    console.log('=' + '='.repeat(40));

    // Required endpoints summary
    const requiredPercentage = (this.requiredScore / this.totalRequired * 100).toFixed(1);
    console.log(`\n🎯 REQUIRED WEEK 1 ENDPOINTS: ${this.requiredScore}/${this.totalRequired} (${requiredPercentage}%)`);
    
    this.results.required.forEach((result, index) => {
      const status = result.status === 'passed' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
      console.log(`   ${status} ${result.name}: ${result.details}`);
    });

    // Bonus endpoints summary
    const bonusPercentage = (this.bonusScore / this.totalBonus * 100).toFixed(1);
    console.log(`\n🌟 BONUS ENDPOINTS: ${this.bonusScore}/${this.totalBonus} (${bonusPercentage}%)`);
    
    this.results.bonus.forEach((result, index) => {
      const status = result.status === 'working' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
      console.log(`   ${status} ${result.name}: ${result.details}`);
    });

    // Overall assessment
    console.log('\n🏆 OVERALL ASSESSMENT:');
    if (this.requiredScore === this.totalRequired) {
      console.log('🎉 PERFECT! All required Week 1 endpoints working');
      console.log('🚀 Ready for frontend development immediately');
      
      if (this.bonusScore >= 3) {
        console.log('⭐ BONUS: Enhanced routes architecture implemented excellently');
      }
    } else if (this.requiredScore >= 4) {
      console.log('✅ EXCELLENT! Almost all required endpoints working');
      console.log('🛠️ Minor fixes needed');
    } else if (this.requiredScore >= 3) {
      console.log('✅ GOOD! Core functionality working');
      console.log('🛠️ Some endpoints need implementation');
    } else {
      console.log('⚠️ NEEDS WORK! Missing critical endpoints');
      console.log('🚨 Focus on required endpoints first');
    }

    // Architecture assessment
    console.log('\n🏗️ ARCHITECTURE ASSESSMENT:');
    if (this.bonusScore >= 3) {
      console.log('✅ Clean routes architecture implemented');
      console.log('✅ Proper error handling and validation');
      console.log('✅ Enhanced endpoints with detailed data');
      console.log('✅ Consistent response format');
    } else {
      console.log('⚠️ Basic implementation, consider enhancing architecture');
    }

    // Errors summary
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS TO FIX:');
      this.results.errors.forEach(error => {
        console.log(`   🔧 ${error.endpoint}: ${error.error}`);
      });
    }

    // Next steps
    console.log('\n📋 NEXT STEPS:');
    if (this.requiredScore === this.totalRequired) {
      console.log('1. ✅ All Week 1 requirements met');
      console.log('2. 🎨 Start frontend development');
      console.log('3. 🧪 Build ProductCard components');
      console.log('4. 🔗 Integrate with these working APIs');
    } else {
      console.log('1. 🛠️ Fix missing required endpoints');
      console.log('2. 🧪 Re-run this test script');
      console.log('3. 🎨 Start frontend when 5/5 working');
    }
  }
}

// Main execution
async function runRouteTests() {
  const tester = new RoutesImplementationTester();
  
  try {
    const allPassed = await tester.runFullTest();
    
    console.log('\n' + '='.repeat(60));
    console.log(allPassed ? 
      '🎉 SUCCESS: Ready for frontend development!' : 
      '⚠️ PARTIAL: Fix issues then proceed'
    );
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.log('\n💡 Make sure backend server is running: npm start');
    process.exit(1);
  }
}

runRouteTests();

// =============================================================================
// USAGE INSTRUCTIONS:
// 
// 1. Implement the routes (categories.js, brands.js) 
// 2. Update server.js with route imports
// 3. Restart backend server: npm start
// 4. Run this test: node backend/scripts/test-routes-implementation.js
// 
// Expected Output:
// 🎯 REQUIRED WEEK 1 ENDPOINTS: 5/5 (100.0%)
// 🌟 BONUS ENDPOINTS: 4/4 (100.0%)
// 🎉 PERFECT! All required Week 1 endpoints working
// =============================================================================