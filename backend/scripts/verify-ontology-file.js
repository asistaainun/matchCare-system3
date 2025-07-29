// backend/scripts/verify-ontology-file.js
// Verify apakah ontologyService.js file sudah benar

const fs = require('fs');
const path = require('path');

function verifyOntologyFile() {
  console.log('🔍 Verifying ontologyService.js Content\n');
  
  const servicePath = path.resolve(__dirname, '../services/ontologyService.js');
  
  try {
    const content = fs.readFileSync(servicePath, 'utf8');
    
    // Check for fixed version indicators
    const checks = {
      'Has commonPrefixes property': content.includes('this.commonPrefixes'),
      'Has RDF prefix definition': content.includes('PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>'),
      'Uses commonPrefixes in queries': content.includes('${this.commonPrefixes}'),
      'Has testFixedQueries method': content.includes('testFixedQueries'),
      'Has proper constructor': content.includes('constructor()'),
      'Has healthCheck method': content.includes('async healthCheck()'),
      'Has getAllSynergisticCombos method': content.includes('async getAllSynergisticCombos()'),
      'No syntax errors (basic check)': !content.includes('undefiend') && !content.includes('functin')
    };
    
    console.log('📋 File Content Verification:');
    let allPassed = true;
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed}`);
      if (!passed) allPassed = false;
    });
    
    console.log(`\n📊 Overall: ${allPassed ? '✅ FILE LOOKS CORRECT' : '❌ FILE HAS ISSUES'}`);
    
    if (!allPassed) {
      console.log('\n💡 SOLUTION: Replace ontologyService.js with fixed version');
      console.log('   1. Backup current: mv ontologyService.js ontologyService.js.broken');
      console.log('   2. Copy fixed version from Claude artifact');
      console.log('   3. Paste into ontologyService.js');
      return false;
    }
    
    // Check file size (fixed version should be larger)
    const stats = fs.statSync(servicePath);
    const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
    console.log(`\n📏 File size: ${sizeKB} KB`);
    
    if (sizeKB < 5) {
      console.log('⚠️ File seems too small - might be incomplete');
      return false;
    }
    
    console.log('✅ File verification passed - content looks correct');
    return true;
    
  } catch (error) {
    console.log(`❌ Cannot read ontologyService.js: ${error.message}`);
    return false;
  }
}

// Test basic Node.js import
function testBasicImport() {
  console.log('\n🧪 Testing Basic Import...');
  
  try {
    // Clear cache
    const servicePath = path.resolve(__dirname, '../services/ontologyService.js');
    delete require.cache[servicePath];
    
    // Import
    const ontologyService = require('../services/ontologyService');
    
    console.log('✅ Import successful');
    console.log(`   Type: ${typeof ontologyService}`);
    console.log(`   Has healthCheck: ${typeof ontologyService.healthCheck === 'function'}`);
    console.log(`   Has getAllSynergisticCombos: ${typeof ontologyService.getAllSynergisticCombos === 'function'}`);
    console.log(`   Has commonPrefixes: ${ontologyService.commonPrefixes !== undefined}`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ Import failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    return false;
  }
}

// Test Fuseki connection independently  
async function testFusekiConnection() {
  console.log('\n🌐 Testing Fuseki Connection...');
  
  try {
    const axios = require('axios');
    
    // Test 1: Fuseki server root
    try {
      const response = await axios.get('http://localhost:3030/', { timeout: 5000 });
      console.log('✅ Fuseki server responding');
    } catch (error) {
      console.log('❌ Fuseki server not responding');
      console.log('   💡 Start Fuseki: cd ontology/apache-jena-fuseki-5.4.0 && ./fuseki-server');
      return false;
    }
    
    // Test 2: Dataset endpoint
    try {
      const response = await axios.get('http://localhost:3030/skincare-db', { timeout: 5000 });
      console.log('✅ skincare-db dataset accessible');
    } catch (error) {
      console.log('❌ skincare-db dataset not found');
      console.log('   💡 Check dataset name or reload data');
      return false;
    }
    
    // Test 3: SPARQL endpoint basic query
    try {
      const query = 'SELECT (COUNT(*) as ?count) WHERE { ?s ?p ?o }';
      const response = await axios.post('http://localhost:3030/skincare-db/sparql', 
        new URLSearchParams({ query }), 
        { 
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000
        }
      );
      
      const count = response.data.results.bindings[0]?.count?.value || 0;
      console.log(`✅ SPARQL endpoint working: ${count} triples`);
      
      if (count == 0) {
        console.log('⚠️ No triples found - data might not be loaded');
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.log('❌ SPARQL endpoint failed');
      console.log(`   Error: ${error.message}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Connection test failed: ${error.message}`);
    return false;
  }
}

async function runFullVerification() {
  console.log('🔧 MatchCare File & Connection Verification');
  console.log('===========================================\n');
  
  // Step 1: Verify file content
  const fileOK = verifyOntologyFile();
  
  // Step 2: Test basic import
  const importOK = testBasicImport();
  
  // Step 3: Test Fuseki connection
  const fusekiOK = await testFusekiConnection();
  
  console.log('\n📋 VERIFICATION SUMMARY');
  console.log('=======================');
  console.log(`   File Content: ${fileOK ? '✅' : '❌'}`);
  console.log(`   Import Test: ${importOK ? '✅' : '❌'}`);
  console.log(`   Fuseki Connection: ${fusekiOK ? '✅' : '❌'}`);
  
  const allOK = fileOK && importOK && fusekiOK;
  console.log(`   Overall: ${allOK ? '✅ ALL GOOD' : '❌ ISSUES FOUND'}`);
  
  if (!allOK) {
    console.log('\n🔧 PRIORITIZED FIXES:');
    if (!fusekiOK) {
      console.log('   1. 🚨 START FUSEKI SERVER FIRST');
      console.log('      cd ontology/apache-jena-fuseki-5.4.0');
      console.log('      ./fuseki-server --update --loc=databases/skincare-db /skincare-db');
    }
    if (!fileOK) {
      console.log('   2. 📝 REPLACE ontologyService.js with fixed version');
    }
    if (!importOK) {
      console.log('   3. 🔍 CHECK syntax errors in ontologyService.js');
    }
  } else {
    console.log('\n🎉 Everything looks good! Try running the API test again.');
  }
}

if (require.main === module) {
  runFullVerification().catch(console.error);
}

module.exports = { verifyOntologyFile, testBasicImport, testFusekiConnection };