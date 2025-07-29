// backend/scripts/test-missing-endpoints.js
// Test dan identifikasi missing API endpoints yang dibutuhkan

const axios = require('axios');

class MissingEndpointsTest {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.missingEndpoints = [];
    this.workingEndpoints = [];
  }

  async runFullTest() {
    console.log('🌐 MatchCare Missing Endpoints Test');
    console.log('===================================\n');

    // Test semua endpoint yang dibutuhkan
    await this.testCoreEndpoints();
    await this.testProductEndpoints();
    await this.testIngredientEndpoints();
    await this.testAdvancedEndpoints();
    
    this.generateImplementationPlan();
  }

  async testEndpoint(endpoint, method = 'GET', data = null, description = '') {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      };
      
      if (data) config.data = data;
      
      const response = await axios(config);
      
      this.workingEndpoints.push({
        endpoint,
        method,
        status: response.status,
        description,
        working: true
      });
      
      console.log(`✅ ${method} ${endpoint} - ${description}`);
      return { success: true, data: response.data };
      
    } catch (error) {
      const status = error.response?.status || 'NO_RESPONSE';
      
      this.missingEndpoints.push({
        endpoint,
        method,
        status,
        description,
        error: error.message,
        working: false,
        priority: this.determinePriority(endpoint)
      });
      
      console.log(`❌ ${method} ${endpoint} - ${description} (${status})`);
      return { success: false, error: error.message };
    }
  }

  determinePriority(endpoint) {
    if (endpoint.includes('/products') || endpoint.includes('/ingredients')) return 'HIGH';
    if (endpoint.includes('/quiz') || endpoint.includes('/recommendations')) return 'MEDIUM';
    return 'LOW';
  }

  async testCoreEndpoints() {
    console.log('1️⃣ Testing Core Endpoints...\n');
    
    await this.testEndpoint('/', 'GET', null, 'API Documentation');
    await this.testEndpoint('/health', 'GET', null, 'Health Check');
    await this.testEndpoint('/api/health', 'GET', null, 'API Health Check');
  }

  async testProductEndpoints() {
    console.log('\n2️⃣ Testing Product Endpoints...\n');
    
    // Core product endpoints
    await this.testEndpoint('/api/products', 'GET', null, 'Product Listing (CRITICAL)');
    await this.testEndpoint('/api/products?limit=5', 'GET', null, 'Product Listing with Pagination');
    await this.testEndpoint('/api/products?category=moisturizer', 'GET', null, 'Product Filtering by Category');
    await this.testEndpoint('/api/products?brand=cerave', 'GET', null, 'Product Filtering by Brand');
    await this.testEndpoint('/api/products?skinType=oily', 'GET', null, 'Product Filtering by Skin Type');
    await this.testEndpoint('/api/products/search?q=moisturizer', 'GET', null, 'Product Search');
    await this.testEndpoint('/api/products/1', 'GET', null, 'Product Detail (CRITICAL)');
    
    // Advanced product endpoints
    await this.testEndpoint('/api/products/recommendations', 'POST', {
      skinType: 'oily',
      concerns: ['acne', 'oiliness'],
      avoidedIngredients: ['fragrance']
    }, 'Product Recommendations based on Profile');
    
    await this.testEndpoint('/api/products/categories', 'GET', null, 'Available Product Categories');
    await this.testEndpoint('/api/products/brands', 'GET', null, 'Available Brands');
  }

  async testIngredientEndpoints() {
    console.log('\n3️⃣ Testing Ingredient Endpoints...\n');
    
    // Core ingredient endpoints
    await this.testEndpoint('/api/ingredients', 'GET', null, 'Ingredient Listing (CRITICAL)');
    await this.testEndpoint('/api/ingredients?limit=10', 'GET', null, 'Ingredient Pagination');
    await this.testEndpoint('/api/ingredients/search?q=retinol', 'GET', null, 'Ingredient Search');
    await this.testEndpoint('/api/ingredients/retinol', 'GET', null, 'Ingredient Detail');
    await this.testEndpoint('/api/ingredients/key-ingredients', 'GET', null, 'Key Ingredients List');
    
    // Advanced ingredient endpoints
    await this.testEndpoint('/api/ingredients/compatibility-check', 'POST', {
      ingredients: ['retinol', 'vitamin-c', 'niacinamide']
    }, 'Ingredient Compatibility Check (CRITICAL)');
    
    await this.testEndpoint('/api/ingredients/synergies', 'POST', {
      ingredients: ['niacinamide', 'hyaluronic-acid']
    }, 'Ingredient Synergies');
    
    await this.testEndpoint('/api/ingredients/conflicts', 'POST', {
      ingredients: ['retinol', 'vitamin-c']
    }, 'Ingredient Conflicts');
    
    await this.testEndpoint('/api/ingredients/benefits', 'GET', null, 'Available Ingredient Benefits');
    await this.testEndpoint('/api/ingredients/functions', 'GET', null, 'Available Ingredient Functions');
  }

  async testAdvancedEndpoints() {
    console.log('\n4️⃣ Testing Advanced Endpoints...\n');
    
    // User profile endpoints
    await this.testEndpoint('/api/user/profile', 'GET', null, 'Get User Profile');
    await this.testEndpoint('/api/user/profile', 'POST', {
      skinType: 'combination',
      concerns: ['acne', 'dryness'],
      sensitivities: ['fragrance']
    }, 'Save User Profile');
    
    // Favorites endpoints
    await this.testEndpoint('/api/user/favorites', 'GET', null, 'Get User Favorites');
    await this.testEndpoint('/api/user/favorites', 'POST', {
      productId: 1,
      type: 'product'
    }, 'Add to Favorites');
    
    // Advanced recommendation endpoints
    await this.testEndpoint('/api/recommendations/similar-products/1', 'GET', null, 'Similar Products');
    await this.testEndpoint('/api/recommendations/routine', 'POST', {
      skinType: 'oily',
      timeOfDay: 'morning',
      concerns: ['acne']
    }, 'Skincare Routine Recommendations');
    
    // Analytics endpoints
    await this.testEndpoint('/api/analytics/popular-products', 'GET', null, 'Popular Products');
    await this.testEndpoint('/api/analytics/trending-ingredients', 'GET', null, 'Trending Ingredients');
    
    // Utility endpoints
    await this.testEndpoint('/api/utility/skin-type-quiz', 'GET', null, 'Skin Type Quiz Questions');
    await this.testEndpoint('/api/utility/ingredient-glossary', 'GET', null, 'Ingredient Glossary');
  }

  generateImplementationPlan() {
    console.log('\n📋 IMPLEMENTATION PLAN');
    console.log('======================\n');
    
    // Group by priority
    const highPriority = this.missingEndpoints.filter(ep => ep.priority === 'HIGH');
    const mediumPriority = this.missingEndpoints.filter(ep => ep.priority === 'MEDIUM');
    const lowPriority = this.missingEndpoints.filter(ep => ep.priority === 'LOW');
    
    console.log(`📊 Summary: ${this.workingEndpoints.length} working, ${this.missingEndpoints.length} missing`);
    
    if (highPriority.length > 0) {
      console.log('\n🚨 HIGH PRIORITY (Implement First):');
      highPriority.forEach(ep => {
        console.log(`   ❌ ${ep.method} ${ep.endpoint} - ${ep.description}`);
      });
      
      console.log('\n💡 HIGH PRIORITY IMPLEMENTATION STEPS:');
      console.log('   1. Create /api/products endpoints (product listing, detail, search)');
      console.log('   2. Create /api/ingredients endpoints (listing, detail, search)');
      console.log('   3. Implement compatibility-check for ingredient analysis');
      console.log('   4. Add product filtering by category, brand, skin type');
    }
    
    if (mediumPriority.length > 0) {
      console.log('\n⚠️ MEDIUM PRIORITY (Week 2-3):');
      mediumPriority.forEach(ep => {
        console.log(`   ❌ ${ep.method} ${ep.endpoint} - ${ep.description}`);
      });
    }
    
    if (lowPriority.length > 0) {
      console.log('\n📝 LOW PRIORITY (Week 4+):');
      lowPriority.slice(0, 5).forEach(ep => {
        console.log(`   ❌ ${ep.method} ${ep.endpoint} - ${ep.description}`);
      });
      if (lowPriority.length > 5) {
        console.log(`   ... and ${lowPriority.length - 5} more`);
      }
    }
    
    console.log('\n🎯 IMMEDIATE ACTION PLAN:');
    console.log('========================');
    console.log('1. ✅ Database completeness (run test-database-completeness.js)');
    console.log('2. 🚀 Implement missing HIGH priority endpoints');
    console.log('3. 📊 Import CSV data if missing');
    console.log('4. 🔗 Create product-ingredient mappings');
    console.log('5. 🧪 Test all endpoints again');
    
    // Generate sample endpoint implementations
    this.generateSampleCode();
  }

  generateSampleCode() {
    console.log('\n💻 SAMPLE IMPLEMENTATION CODE:');
    console.log('==============================\n');
    
    console.log('Add to server.js:');
    console.log('```javascript');
    console.log('// Products API');
    console.log('app.get(\'/api/products\', async (req, res) => {');
    console.log('  try {');
    console.log('    const { limit = 20, offset = 0, category, brand, skinType } = req.query;');
    console.log('    let query = \'SELECT * FROM products WHERE 1=1\';');
    console.log('    const params = [];');
    console.log('    ');
    console.log('    if (category) {');
    console.log('      query += \' AND main_category ILIKE $\' + (params.length + 1);');
    console.log('      params.push(`%${category}%`);');
    console.log('    }');
    console.log('    ');
    console.log('    query += \' ORDER BY name LIMIT $\' + (params.length + 1) + \' OFFSET $\' + (params.length + 2);');
    console.log('    params.push(limit, offset);');
    console.log('    ');
    console.log('    const result = await pool.query(query, params);');
    console.log('    const countResult = await pool.query(\'SELECT COUNT(*) FROM products\');');
    console.log('    ');
    console.log('    res.json({');
    console.log('      success: true,');
    console.log('      data: result.rows,');
    console.log('      pagination: {');
    console.log('        total: parseInt(countResult.rows[0].count),');
    console.log('        limit: parseInt(limit),');
    console.log('        offset: parseInt(offset)');
    console.log('      }');
    console.log('    });');
    console.log('  } catch (error) {');
    console.log('    res.status(500).json({ success: false, error: error.message });');
    console.log('  }');
    console.log('});');
    console.log('```');
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new MissingEndpointsTest();
  tester.runFullTest().catch(console.error);
}

module.exports = MissingEndpointsTest;