// File: backend/scripts/test-required-endpoints.js
// Test all REQUIRED endpoints for Week 1

const axios = require('axios');

const REQUIRED_ENDPOINTS = [
  {
    name: 'Product Listing',
    method: 'GET',
    url: '/api/products',
    critical: true,
    testPayload: null
  },
  {
    name: 'Product Detail',
    method: 'GET', 
    url: '/api/products/3421', // Using ID from previous curl result
    critical: true,
    testPayload: null
  },
  {
    name: 'Categories List',
    method: 'GET',
    url: '/api/categories',
    critical: true,
    testPayload: null
  },
  {
    name: 'Brands List', 
    method: 'GET',
    url: '/api/brands',
    critical: true,
    testPayload: null
  },
  {
    name: 'Ontology Recommendations',
    method: 'POST',
    url: '/api/ontology/recommendations',
    critical: true,
    testPayload: {
      skin_type: 'oily',
      concerns: ['acne', 'pores'],
      sensitivities: []
    }
  }
];

class RequiredEndpointTester {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.results = [];
    this.workingCount = 0;
    this.totalRequired = REQUIRED_ENDPOINTS.length;
  }

  async testAllEndpoints() {
    console.log('🧪 TESTING REQUIRED WEEK 1 ENDPOINTS');
    console.log('=' + '='.repeat(45));
    console.log(`📋 Testing ${this.totalRequired} critical endpoints...\n`);

    for (let i = 0; i < REQUIRED_ENDPOINTS.length; i++) {
      const endpoint = REQUIRED_ENDPOINTS[i];
      console.log(`${i + 1}️⃣ TESTING: ${endpoint.name}`);
      console.log('-'.repeat(30));
      
      await this.testEndpoint(endpoint);
      console.log('');
    }

    this.generateReport();
    this.generateImplementationPlan();
  }

  async testEndpoint(endpoint) {
    try {
      const url = `${this.baseURL}${endpoint.url}`;
      let response;

      console.log(`   🔗 ${endpoint.method} ${endpoint.url}`);

      if (endpoint.method === 'GET') {
        response = await axios.get(url, { timeout: 10000 });
      } else if (endpoint.method === 'POST') {
        response = await axios.post(url, endpoint.testPayload, { timeout: 15000 });
      }

      // Analyze response
      const success = response.status === 200;
      const hasData = this.analyzeResponseData(response.data, endpoint);

      if (success && hasData) {
        console.log(`   ✅ Status: ${response.status} - SUCCESS`);
        this.logResponseDetails(response.data, endpoint);
        this.workingCount++;
        
        this.results.push({
          endpoint: endpoint.name,
          status: 'working',
          details: this.getResponseSummary(response.data, endpoint)
        });
      } else {
        console.log(`   ⚠️ Status: ${response.status} - Response but no data`);
        this.results.push({
          endpoint: endpoint.name,
          status: 'partial',
          details: 'Endpoint exists but returns no data'
        });
      }

    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      
      if (error.response?.status === 404) {
        console.log(`   💡 Solution: Endpoint not implemented yet`);
      } else if (error.response?.status >= 500) {
        console.log(`   💡 Solution: Check server implementation`);
      } else {
        console.log(`   💡 Solution: Check backend server is running`);
      }

      this.results.push({
        endpoint: endpoint.name,
        status: 'missing',
        details: error.response?.status ? `HTTP ${error.response.status}` : 'Connection failed'
      });
    }
  }

  analyzeResponseData(data, endpoint) {
    if (!data) return false;

    switch (endpoint.url) {
      case '/api/products':
        return data.success && data.data && Array.isArray(data.data) && data.data.length > 0;
      
      case '/api/products/3421':
        return data.success && data.data && data.data.id;
      
      case '/api/categories':
        return data.success && (data.data || data.categories) && 
               Array.isArray(data.data || data.categories);
      
      case '/api/brands':
        return data.success && (data.data || data.brands) && 
               Array.isArray(data.data || data.brands);
      
      case '/api/ontology/recommendations':
        return data.success && data.data && 
               (data.data.recommendations || Array.isArray(data.data));
      
      default:
        return data.success || data.status === 'ok';
    }
  }

  logResponseDetails(data, endpoint) {
    switch (endpoint.url) {
      case '/api/products':
        console.log(`   📦 Products returned: ${data.data?.length || 0}`);
        if (data.data?.[0]) {
          console.log(`   📋 Sample: ${data.data[0].name} (${data.data[0].brand_name})`);
        }
        break;
      
      case '/api/products/3421':
        if (data.data) {
          console.log(`   📋 Product: ${data.data.name}`);
          console.log(`   🏷️ Brand: ${data.data.brand_name || 'N/A'}`);
          console.log(`   📂 Category: ${data.data.main_category || 'N/A'}`);
        }
        break;
      
      case '/api/categories':
        const categories = data.data || data.categories;
        console.log(`   📂 Categories found: ${categories?.length || 0}`);
        if (categories?.[0]) {
          console.log(`   📋 Sample: ${categories[0].name || categories[0]}`);
        }
        break;
      
      case '/api/brands':
        const brands = data.data || data.brands;
        console.log(`   🏷️ Brands found: ${brands?.length || 0}`);
        if (brands?.[0]) {
          console.log(`   📋 Sample: ${brands[0].name || brands[0]}`);
        }
        break;
      
      case '/api/ontology/recommendations':
        const recommendations = data.data?.recommendations || data.data;
        const recCount = Array.isArray(recommendations) ? recommendations.length : 0;
        console.log(`   🧠 Recommendations: ${recCount}`);
        console.log(`   🎓 Algorithm: ${data.algorithm_type || 'N/A'}`);
        if (recommendations?.[0]) {
          console.log(`   📋 Sample: ${recommendations[0].name || 'N/A'}`);
        }
        break;
    }
  }

  getResponseSummary(data, endpoint) {
    switch (endpoint.url) {
      case '/api/products':
        return `${data.data?.length || 0} products`;
      case '/api/products/3421':
        return data.data?.name || 'Product details';
      case '/api/categories':
        return `${(data.data || data.categories)?.length || 0} categories`;
      case '/api/brands':
        return `${(data.data || data.brands)?.length || 0} brands`;
      case '/api/ontology/recommendations':
        const recs = data.data?.recommendations || data.data;
        return `${Array.isArray(recs) ? recs.length : 0} recommendations`;
      default:
        return 'Working';
    }
  }

  generateReport() {
    console.log('📊 WEEK 1 READINESS REPORT');
    console.log('=' + '='.repeat(35));
    
    const percentage = (this.workingCount / this.totalRequired * 100).toFixed(1);
    console.log(`🎯 SCORE: ${this.workingCount}/${this.totalRequired} (${percentage}%)\n`);

    this.results.forEach((result, index) => {
      const status = result.status === 'working' ? '✅' : 
                    result.status === 'partial' ? '⚠️' : '❌';
      console.log(`${status} ${result.endpoint}: ${result.details}`);
    });

    console.log('\n🏆 ASSESSMENT:');
    if (this.workingCount === this.totalRequired) {
      console.log('🎉 PERFECT! All required endpoints working');
      console.log('🚀 Ready for frontend development immediately');
    } else if (this.workingCount >= 3) {
      console.log('✅ GOOD! Core functionality working');
      console.log('🛠️ Few endpoints need implementation');
    } else {
      console.log('⚠️ NEEDS WORK! Missing critical endpoints');
      console.log('🚨 Focus on implementing missing APIs first');
    }
  }

  generateImplementationPlan() {
    console.log('\n🛠️ IMPLEMENTATION PLAN');
    console.log('=' + '='.repeat(30));

    const missingEndpoints = this.results.filter(r => r.status === 'missing');
    const partialEndpoints = this.results.filter(r => r.status === 'partial');

    if (missingEndpoints.length === 0 && partialEndpoints.length === 0) {
      console.log('🎉 NO IMPLEMENTATION NEEDED!');
      console.log('✅ All required endpoints are working perfectly');
      console.log('\n🚀 IMMEDIATE NEXT STEPS:');
      console.log('1. Start frontend development');
      console.log('2. Implement ProductCard components');
      console.log('3. Build product listing page');
      console.log('4. Add routing and navigation');
      
    } else {
      console.log('📋 MISSING ENDPOINTS TO IMPLEMENT:');
      
      missingEndpoints.forEach((endpoint, index) => {
        console.log(`\n${index + 1}. ${endpoint.endpoint}`);
        this.suggestImplementation(endpoint.endpoint);
      });

      if (partialEndpoints.length > 0) {
        console.log('\n⚠️ PARTIAL ENDPOINTS TO FIX:');
        partialEndpoints.forEach(endpoint => {
          console.log(`- ${endpoint.endpoint}: ${endpoint.details}`);
        });
      }
    }

    console.log('\n💡 QUICK IMPLEMENTATION GUIDE:');
    console.log('🔗 Add missing routes to backend/server.js');
    console.log('📊 Use existing database models');
    console.log('✅ Follow pattern of working endpoints');
    console.log('🧪 Test each endpoint as you build');
  }

  suggestImplementation(endpointName) {
    const implementations = {
      'Product Detail': `
   app.get('/api/products/:id', async (req, res) => {
     const product = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
     res.json({ success: true, data: product.rows[0] });
   });`,
      
      'Categories List': `
   app.get('/api/categories', async (req, res) => {
     const categories = await pool.query('SELECT DISTINCT main_category as name FROM products WHERE main_category IS NOT NULL');
     res.json({ success: true, data: categories.rows });
   });`,
      
      'Brands List': `
   app.get('/api/brands', async (req, res) => {
     const brands = await pool.query('SELECT DISTINCT b.name FROM brands b JOIN products p ON b.id = p.brand_id');
     res.json({ success: true, data: brands.rows });
   });`
    };

    if (implementations[endpointName]) {
      console.log('   💻 Implementation:');
      console.log(implementations[endpointName]);
    }
  }
}

// Run the test
async function runTest() {
  const tester = new RequiredEndpointTester();
  await tester.testAllEndpoints();
  
  process.exit(tester.workingCount >= 3 ? 0 : 1);
}

runTest().catch(console.error);