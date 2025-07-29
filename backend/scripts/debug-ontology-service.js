// backend/scripts/debug-ontology-service.js
const ontologyService = require('../services/ontologyService');

async function debugOntologyService() {
  console.log('🔍 DEBUG: Testing OntologyService directly...\n');
  
  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...');
  try {
    const health = await ontologyService.healthCheck();
    console.log('✅ Health check result:', health);
    console.log(`   Status: ${health.status}`);
    console.log(`   Triple Count: ${health.tripleCount}`);
    console.log(`   Endpoint: ${health.endpoint}`);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  // Test 2: All Synergistic Combos
  console.log('\n2️⃣ Testing getAllSynergisticCombos...');
  try {
    const result = await ontologyService.getAllSynergisticCombos();
    console.log('✅ Synergistic combos result:');
    console.log(`   Count: ${result.count}`);
    console.log(`   Performance: ${result.performance}`);
    console.log(`   Query Time: ${result.queryTime}ms`);
    
    if (result.data && result.data.length > 0) {
      console.log('   Sample results:');
      result.data.slice(0, 3).forEach((combo, i) => {
        console.log(`      ${i + 1}. ${combo.name1} + ${combo.name2}`);
      });
    } else {
      console.log('   ❌ No data returned');
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  } catch (error) {
    console.log('❌ getAllSynergisticCombos failed:', error.message);
    console.log('   Stack:', error.stack);
  }
  
  // Test 3: Ingredient Conflicts
  console.log('\n3️⃣ Testing getIngredientConflicts...');
  try {
    const testIngredients = ['Retinol', 'Vitamin C'];
    const result = await ontologyService.getIngredientConflicts(testIngredients);
    console.log('✅ Ingredient conflicts result:');
    console.log(`   Count: ${result.count}`);
    console.log(`   Data length: ${result.data?.length || 0}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.log('❌ getIngredientConflicts failed:', error.message);
  }
  
  // Test 4: Raw SPARQL test (same as working quick_sparql_test)
  console.log('\n4️⃣ Testing Raw SPARQL (should match quick_sparql_test)...');
  try {
    const axios = require('axios');
    const query = `
PREFIX sc: <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT (COUNT(*) as ?count)
WHERE {
  ?ingredient1 sc:synergisticWith ?ingredient2 .
}
    `;
    
    const response = await axios.post('http://localhost:3030/skincare-db/sparql', 
      new URLSearchParams({ query }), 
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        } 
      }
    );
    
    const count = response.data.results.bindings[0]?.count?.value || 0;
    console.log(`✅ Raw SPARQL synergistic count: ${count}`);
    console.log('   This should match quick_sparql_test result (25)');
    
    if (count == 0) {
      console.log('❌ Raw SPARQL also returns 0 - data loading issue!');
    } else {
      console.log('✅ Raw SPARQL working - issue in ontologyService queries');
    }
    
  } catch (error) {
    console.log('❌ Raw SPARQL test failed:', error.message);
  }
  
  console.log('\n🎯 DIAGNOSIS COMPLETE');
  console.log('Compare results with quick_sparql_test.js to find the issue!');
}

debugOntologyService().catch(console.error);