// backend/scripts/force-reload-test.js
// Test untuk force reload module dan debug import issues

const path = require('path');

async function forceReloadTest() {
  console.log('🔄 Force Module Reload Test\n');
  
  // Clear require cache
  const ontologyServicePath = path.resolve(__dirname, '../services/ontologyService.js');
  console.log('📍 OntologyService path:', ontologyServicePath);
  
  // Delete from cache if exists
  if (require.cache[ontologyServicePath]) {
    console.log('🗑️ Clearing existing cache...');
    delete require.cache[ontologyServicePath];
  }
  
  // Fresh import
  console.log('📥 Fresh import...');
  const ontologyService = require('../services/ontologyService');
  
  // Test the fresh import
  console.log('🧪 Testing fresh ontologyService...');
  
  try {
    // Test 1: Health check
    const health = await ontologyService.healthCheck();
    console.log(`✅ Health: ${health.status}, Triples: ${health.tripleCount}`);
    
    // Test 2: Get synergistic combos
    const synergies = await ontologyService.getAllSynergisticCombos();
    console.log(`✅ Synergies: ${synergies.count} found`);
    
    if (synergies.count > 0) {
      console.log('\n🎉 SUCCESS! Fresh module import working');
      console.log('💡 Issue was likely cached module - restart server should fix API');
    } else {
      console.log('\n❌ Fresh import still returns 0');
      console.log('💡 Check if ontologyService.js file was actually replaced');
    }
    
  } catch (error) {
    console.log('❌ Fresh import test failed:', error.message);
  }
}

// Also test if API routes can access the service
async function testRouteImport() {
  console.log('\n🔍 Testing Route Import...');
  
  try {
    // Try to simulate what the routes do
    const analysisRoutePath = path.resolve(__dirname, '../routes/analysis.js');
    
    if (require.cache[analysisRoutePath]) {
      console.log('🗑️ Clearing analysis route cache...');
      delete require.cache[analysisRoutePath];
    }
    
    // Check if routes can import ontologyService
    const fs = require('fs');
    const routeContent = fs.readFileSync(analysisRoutePath, 'utf8');
    
    if (routeContent.includes("require('../services/ontologyService')")) {
      console.log('✅ Route correctly imports ontologyService');
    } else {
      console.log('❌ Route import path may be wrong');
    }
    
  } catch (error) {
    console.log('⚠️ Route import test failed:', error.message);
  }
}

// Manual API simulation
async function simulateAPICall() {
  console.log('\n🎭 Simulating API Call...');
  
  try {
    // Simulate what /api/analysis/synergistic-combos does
    const ontologyService = require('../services/ontologyService');
    
    console.log('📞 Calling ontologyService.getAllSynergisticCombos()...');
    const result = await ontologyService.getAllSynergisticCombos();
    
    // Format like the API route does
    const apiResponse = {
      success: true,
      data: {
        total_combinations: result.count,
        combinations: result.data,
        performance: result.performance,
        query_time_ms: result.queryTime
      },
      ontology_powered: true,
      expected_count: 25,
      status: result.count > 0 ? 'WORKING' : 'NO_DATA'
    };
    
    console.log('✅ Simulated API Response:');
    console.log(`   Total Combinations: ${apiResponse.data.total_combinations}`);
    console.log(`   Status: ${apiResponse.status}`);
    console.log(`   Performance: ${apiResponse.data.performance}`);
    
    if (apiResponse.data.total_combinations > 0) {
      console.log('\n🎉 API simulation working! Server restart should fix the actual API');
    } else {
      console.log('\n❌ API simulation also returns 0 - deeper issue');
    }
    
  } catch (error) {
    console.log('❌ API simulation failed:', error.message);
  }
}

async function runFullDiagnosis() {
  console.log('🔧 MatchCare Module Reload Diagnosis');
  console.log('====================================\n');
  
  await forceReloadTest();
  await testRouteImport();
  await simulateAPICall();
  
  console.log('\n📋 DIAGNOSIS COMPLETE');
  console.log('====================');
  console.log('If simulation shows >0 results but API returns 0:');
  console.log('   1. ✅ Stop your Express server (Ctrl+C)');
  console.log('   2. ✅ Start server again: node backend/server.js');
  console.log('   3. ✅ Test: curl http://localhost:5000/api/analysis/synergistic-combos');
  console.log('\nIf still returns 0 after restart:');
  console.log('   1. 🔍 Check server startup logs for errors');
  console.log('   2. 🔍 Verify ontologyService.js was actually replaced');
  console.log('   3. 🔍 Check if routes/analysis.js exists and imports correctly');
}

if (require.main === module) {
  runFullDiagnosis().catch(console.error);
}

module.exports = { forceReloadTest, testRouteImport, simulateAPICall };