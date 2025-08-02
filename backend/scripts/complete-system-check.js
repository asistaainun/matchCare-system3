// complete-system-check.js
// Copy this file to your backend/scripts/ directory and run: node complete-system-check.js

const axios = require('axios');
const { execSync } = require('child_process');
const { Pool } = require('pg');
require('dotenv').config();

class SystemValidator {
  constructor() {
    this.results = {
      fuseki: false,
      backend: false,
      database: false,
      ontology: false,
      apis: false,
      errorHandling: false
    };
  }

  async runCompleteValidation() {
    console.log('🔍 MatchCare Complete System Validation');
    console.log('=====================================\n');

    // 1. Check Fuseki
    await this.checkFuseki();
    
    // 2. Check Database
    await this.checkDatabase();
    
    // 3. Check Backend APIs
    await this.checkBackendAPIs();
    
    // 4. Check Ontology Integration
    await this.checkOntology();
    
    // 5. Check Error Handling
    await this.checkErrorHandling();
    
    // 6. Final Report
    this.generateReport();
  }

  async checkFuseki() {
    console.log('1️⃣ FUSEKI SERVER CHECK');
    console.log('─'.repeat(25));
    
    try {
      // Basic connectivity
      await axios.get('http://localhost:3030/', { timeout: 5000 });
      console.log('   ✅ Fuseki server responding');
      
      // Dataset check
      const datasets = await axios.get('http://localhost:3030/$/datasets', { timeout: 5000 });
      const hasSkincareDB = JSON.stringify(datasets.data).includes('skincare-db');
      
      if (hasSkincareDB) {
        console.log('   ✅ skincare-db dataset exists');
        
        // Triple count check
        const query = 'SELECT (COUNT(*) as ?count) WHERE { ?s ?p ?o }';
        const sparqlResponse = await axios.post('http://localhost:3030/skincare-db/sparql', 
          new URLSearchParams({ query }), 
          { 
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000
          }
        );
        
        const tripleCount = sparqlResponse.data.results.bindings[0]?.count?.value || 0;
        console.log(`   📊 Ontology triples: ${tripleCount}`);
        
        if (tripleCount > 100) {
          console.log('   ✅ Sufficient ontology data loaded');
          this.results.fuseki = true;
        } else {
          console.log('   ⚠️ Limited ontology data - consider loading more');
        }
      } else {
        console.log('   ❌ skincare-db dataset not found');
        console.log('   💡 Create dataset: curl -X POST "http://localhost:3030/$/datasets" -d "dbName=skincare-db&dbType=mem"');
      }
      
    } catch (error) {
      console.log('   ❌ Fuseki server not accessible');
      console.log('   💡 Start Fuseki: cd ontology/apache-jena-fuseki-5.4.0 && ./fuseki-server --update --mem /skincare-db');
    }
    
    console.log('');
  }

  async checkDatabase() {
    console.log('2️⃣ DATABASE CHECK');
    console.log('─'.repeat(18));
    
    try {
      const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'matchcare_fresh_db',
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
      });
      
      await pool.query('SELECT NOW()');
      console.log('   ✅ Database connection successful');
      
      // Check tables and data
      const tableChecks = [
        { name: 'products', expectedMin: 100 },
        { name: 'ingredients', expectedMin: 50 },
        { name: 'brands', expectedMin: 5 }
      ];
      
      let allTablesOK = true;
      
      for (const table of tableChecks) {
        try {
          const result = await pool.query(`SELECT COUNT(*) FROM ${table.name}`);
          const count = parseInt(result.rows[0].count);
          
          if (count >= table.expectedMin) {
            console.log(`   ✅ ${table.name}: ${count} records`);
          } else {
            console.log(`   ⚠️ ${table.name}: ${count} records (expected: ${table.expectedMin}+)`);
            allTablesOK = false;
          }
        } catch (error) {
          console.log(`   ❌ ${table.name}: table missing or inaccessible`);
          allTablesOK = false;
        }
      }
      
      if (allTablesOK) {
        this.results.database = true;
        console.log('   ✅ All database tables properly populated');
      } else {
        console.log('   💡 Run data import: node scripts/import-csv-data.js');
      }
      
      await pool.end();
      
    } catch (error) {
      console.log('   ❌ Database connection failed');
      console.log(`   💡 Error: ${error.message}`);
      console.log('   💡 Check database credentials in .env file');
    }
    
    console.log('');
  }

  async checkBackendAPIs() {
    console.log('3️⃣ BACKEND API CHECK');
    console.log('─'.repeat(20));
    
    const endpoints = [
      { path: '/health', method: 'GET', name: 'Health Check' },
      { path: '/api/products?limit=3', method: 'GET', name: 'Product Listing' },
      { path: '/', method: 'GET', name: 'API Documentation' }
    ];
    
    let allAPIsWorking = true;
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios({
          method: endpoint.method,
          url: `http://localhost:5000${endpoint.path}`,
          timeout: 5000
        });
        
        if (response.status === 200 && response.data) {
          console.log(`   ✅ ${endpoint.name}`);
        } else {
          console.log(`   ⚠️ ${endpoint.name}: unexpected response`);
          allAPIsWorking = false;
        }
        
      } catch (error) {
        console.log(`   ❌ ${endpoint.name}: ${error.message}`);
        allAPIsWorking = false;
      }
    }
    
    // Test POST endpoint
    try {
      const postResponse = await axios.post('http://localhost:5000/api/ontology/recommendations', {
        skin_type: 'oily',
        concerns: ['acne'],
        sensitivities: []
      }, { timeout: 10000 });
      
      if (postResponse.data && postResponse.data.recommendations) {
        console.log(`   ✅ Recommendation Engine (${postResponse.data.recommendations.length} results)`);
      } else {
        console.log('   ⚠️ Recommendation Engine: no recommendations returned');
        allAPIsWorking = false;
      }
      
    } catch (error) {
      console.log(`   ❌ Recommendation Engine: ${error.message}`);
      allAPIsWorking = false;
    }
    
    if (allAPIsWorking) {
      this.results.backend = true;
    } else {
      console.log('   💡 Make sure backend server is running: npm start');
    }
    
    console.log('');
  }

  async checkOntology() {
    console.log('4️⃣ ONTOLOGY INTEGRATION CHECK');
    console.log('─'.repeat(29));
    
    try {
      const statusResponse = await axios.get('http://localhost:5000/api/analysis/ontology-status');
      
      if (statusResponse.data.success) {
        const status = statusResponse.data.status;
        const system = statusResponse.data.system;
        
        console.log(`   📊 Overall Status: ${status}`);
        console.log(`   🔗 Fuseki Connection: ${system?.connection?.status || 'unknown'}`);
        console.log(`   📈 Total Triples: ${system?.data_availability?.total_triples || 0}`);
        
        if (status === 'FULLY_OPERATIONAL') {
          console.log('   ✅ Ontology system fully operational');
          this.results.ontology = true;
        } else {
          console.log('   ⚠️ Ontology system partially operational');
        }
      } else {
        console.log('   ❌ Ontology status endpoint failed');
      }
      
      // Test synergistic combinations
      try {
        const synergyResponse = await axios.get('http://localhost:5000/api/analysis/synergistic-combos');
        const combos = synergyResponse.data?.data?.total_combinations || 0;
        console.log(`   🧬 Synergistic Combinations: ${combos}`);
        
        if (combos > 10) {
          console.log('   ✅ Ontology reasoning working');
        }
      } catch (error) {
        console.log('   ⚠️ Synergistic combinations test failed');
      }
      
    } catch (error) {
      console.log('   ❌ Ontology integration check failed');
      console.log(`   💡 Error: ${error.message}`);
    }
    
    console.log('');
  }

  async checkErrorHandling() {
    console.log('5️⃣ ERROR HANDLING CHECK');
    console.log('─'.repeat(23));
    
    const errorTests = [
      {
        name: 'Invalid JSON',
        test: () => axios.post('http://localhost:5000/api/ontology/recommendations', 
          'invalid json', 
          { headers: { 'Content-Type': 'application/json' } }
        )
      },
      {
        name: 'Missing Required Fields',
        test: () => axios.post('http://localhost:5000/api/ontology/recommendations', {})
      },
      {
        name: 'Non-existent Endpoint',
        test: () => axios.get('http://localhost:5000/api/non-existent')
      }
    ];
    
    let errorHandlingOK = true;
    
    for (const errorTest of errorTests) {
      try {
        await errorTest.test();
        console.log(`   ⚠️ ${errorTest.name}: should have failed but didn't`);
        errorHandlingOK = false;
      } catch (error) {
        if (error.response && error.response.data && error.response.data.success === false) {
          console.log(`   ✅ ${errorTest.name}: proper error response`);
        } else {
          console.log(`   ❌ ${errorTest.name}: improper error handling`);
          errorHandlingOK = false;
        }
      }
    }
    
    this.results.errorHandling = errorHandlingOK;
    console.log('');
  }

  generateReport() {
    console.log('📋 VALIDATION SUMMARY');
    console.log('═'.repeat(21));
    
    const components = [
      { name: 'Fuseki Server', key: 'fuseki' },
      { name: 'Database', key: 'database' },
      { name: 'Backend APIs', key: 'backend' },
      { name: 'Ontology Integration', key: 'ontology' },
      { name: 'Error Handling', key: 'errorHandling' }
    ];
    
    components.forEach(component => {
      const status = this.results[component.key] ? '✅' : '❌';
      console.log(`   ${status} ${component.name}`);
    });
    
    const allPassed = Object.values(this.results).every(result => result);
    
    console.log('\n🎯 OVERALL RESULT:');
    if (allPassed) {
      console.log('🎉 ALL SYSTEMS OPERATIONAL - READY FOR FRONTEND DEVELOPMENT! 🚀');
      console.log('\n📝 NEXT STEPS:');
      console.log('   1. Start frontend development');
      console.log('   2. Begin with basic component structure');
      console.log('   3. Integrate with working APIs');
    } else {
      console.log('⚠️ SOME ISSUES FOUND - FIX BEFORE PROCEEDING');
      console.log('\n🔧 PRIORITY FIXES NEEDED:');
      
      if (!this.results.fuseki) {
        console.log('   🚨 HIGH: Start Fuseki server and load ontology data');
      }
      if (!this.results.database) {
        console.log('   🚨 HIGH: Import CSV data to database');
      }
      if (!this.results.backend) {
        console.log('   🚨 CRITICAL: Fix backend API issues');
      }
      if (!this.results.ontology) {
        console.log('   ⚠️ MEDIUM: Improve ontology integration');
      }
      if (!this.results.errorHandling) {
        console.log('   ⚠️ LOW: Enhance error handling');
      }
    }
    
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('   📖 Refer to validation guide for detailed solutions');
    console.log('   🔄 Re-run this script after fixes: node complete-system-check.js');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SystemValidator();
  validator.runCompleteValidation().catch(console.error);
}

module.exports = SystemValidator;