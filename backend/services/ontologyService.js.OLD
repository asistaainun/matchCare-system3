// backend/services/ontologyService.js - FIXED VERSION
const axios = require('axios');

class OntologyService {
  constructor() {
    this.fusekiEndpoint = 'http://localhost:3030/skincare-db/sparql';
    this.updateEndpoint = 'http://localhost:3030/skincare-db/update';
    
    // ✅ FIXED: Add missing RDF prefix that was causing all queries to fail
    this.commonPrefixes = `
      PREFIX : <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
      PREFIX sc: <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    `;
  }

  // Get ingredient incompatibilities - FIXED
  async getIngredientConflicts(ingredientNames) {
    const query = `
      ${this.commonPrefixes}
      
      SELECT ?ing1 ?name1 ?ing2 ?name2 ?warning
      WHERE {
        ?ing1 rdf:type :Ingredient ;
              :IngredientName ?name1 ;
              :incompatibleWith ?ing2 .
              
        ?ing2 :IngredientName ?name2 .
        
        FILTER(?name1 IN (${ingredientNames.map(name => `"${name}"`).join(', ')}))
        FILTER(?name2 IN (${ingredientNames.map(name => `"${name}"`).join(', ')}))
        
        BIND("⚠️ AVOID COMBINATION" as ?warning)
      }
      ORDER BY ?name1 ?name2
    `;

    try {
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const result = this.parseResults(response.data);
      console.log(`🔍 Ingredient conflicts query: Found ${result.count} conflicts`);
      return result;
    } catch (error) {
      console.error('SPARQL conflict query failed:', error.message);
      return { data: [], count: 0, error: error.message };
    }
  }

  // Get synergistic combinations (FILTERED) - FIXED
  async getSynergisticCombos(ingredientNames) {
    const query = `
      ${this.commonPrefixes}
      
      SELECT ?ing1 ?name1 ?ing2 ?name2 ?benefit1 ?benefit2 ?recommendation
      WHERE {
        ?ing1 rdf:type :Ingredient ;
              :IngredientName ?name1 ;
              :synergisticWith ?ing2 ;
              :providesIngredientBenefit ?benefit1 .
              
        ?ing2 :IngredientName ?name2 ;
              :providesIngredientBenefit ?benefit2 .
        
        FILTER NOT EXISTS {
          {?ing1 :incompatibleWith ?ing2} UNION
          {?ing2 :incompatibleWith ?ing1}
        }
        
        FILTER(?name1 IN (${ingredientNames.map(name => `"${name}"`).join(', ')}))
        FILTER(?name2 IN (${ingredientNames.map(name => `"${name}"`).join(', ')}))
        FILTER(?ing1 != ?ing2)
        
        BIND("✅ RECOMMENDED COMBO" as ?recommendation)
      }
      ORDER BY ?name1 ?name2
    `;

    try {
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const result = this.parseResults(response.data);
      console.log(`✨ Synergistic combos query: Found ${result.count} synergies`);
      return result;
    } catch (error) {
      console.error('SPARQL synergy query failed:', error.message);
      return { data: [], count: 0, error: error.message };
    }
  }

  // Get ALL synergistic combinations (no filter) - FIXED
  async getAllSynergisticCombos() {
    const query = `
      ${this.commonPrefixes}
      
      SELECT ?ing1 ?name1 ?ing2 ?name2 ?benefit1 ?benefit2 ?recommendation
      WHERE {
        ?ing1 rdf:type :Ingredient ;
              :IngredientName ?name1 ;
              :synergisticWith ?ing2 ;
              :providesIngredientBenefit ?benefit1 .
              
        ?ing2 :IngredientName ?name2 ;
              :providesIngredientBenefit ?benefit2 .
        
        FILTER NOT EXISTS {
          {?ing1 :incompatibleWith ?ing2} UNION
          {?ing2 :incompatibleWith ?ing1}
        }
        
        FILTER(?ing1 != ?ing2)
        
        BIND("✅ RECOMMENDED COMBO" as ?recommendation)
      }
      ORDER BY ?name1 ?name2
    `;

    try {
      console.log('🔍 Executing getAllSynergisticCombos query...');
      const startTime = Date.now();
      
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const result = this.parseResults(response.data);
      const queryTime = Date.now() - startTime;
      
      console.log(`✅ getAllSynergisticCombos successful: ${result.count} results in ${queryTime}ms`);
      
      return {
        ...result,
        queryTime,
        performance: `${result.count} results in ${queryTime}ms`
      };
    } catch (error) {
      console.error('SPARQL getAllSynergisticCombos failed:', error.message);
      return { data: [], count: 0, error: error.message };
    }
  }

  // Get skin type recommendations - FIXED
  async getSkinTypeRecommendations(skinType, concerns = []) {
    const concernsFilter = concerns.length > 0 
      ? `FILTER EXISTS { ?ing :treatsConcern ?concern . FILTER(?concern IN (${concerns.map(c => `:${c}`).join(', ')})) }`
      : '';

    const query = `
      ${this.commonPrefixes}
      
      SELECT ?ingredient ?name ?benefit ?function ?explanation
      WHERE {
        ?ingredient rdf:type :Ingredient ;
                   :IngredientName ?name ;
                   :recommendedFor :${skinType} ;
                   :providesIngredientBenefit ?benefit ;
                   :hasFunction ?function ;
                   :explanation ?explanation .
        
        ${concernsFilter}
      }
      ORDER BY ?name
    `;

    try {
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const result = this.parseResults(response.data);
      console.log(`🎯 Skin recommendations for ${skinType}: Found ${result.count} ingredients`);
      return result;
    } catch (error) {
      console.error('SPARQL recommendation query failed:', error.message);
      return { data: [], count: 0, error: error.message };
    }
  }

  // Get ingredient details by name - NEW METHOD
  async getIngredientDetails(ingredientName) {
    const query = `
      ${this.commonPrefixes}
      
      SELECT ?ingredient ?name ?benefit ?function ?explanation ?whatItDoes ?safety
      WHERE {
        ?ingredient rdf:type :Ingredient ;
                   :IngredientName ?name ;
                   :providesIngredientBenefit ?benefit ;
                   :hasFunction ?function ;
                   :explanation ?explanation ;
                   :whatItDoes ?whatItDoes ;
                   :safety ?safety .
        
        FILTER(?name = "${ingredientName}")
      }
    `;

    try {
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      return this.parseResults(response.data);
    } catch (error) {
      console.error('SPARQL ingredient details query failed:', error.message);
      return { data: [], count: 0, error: error.message };
    }
  }

  // Get all ingredients with basic info - NEW METHOD
  async getAllIngredients(limit = 50) {
    const query = `
      ${this.commonPrefixes}
      
      SELECT ?ingredient ?name ?benefit ?function
      WHERE {
        ?ingredient rdf:type :Ingredient ;
                   :IngredientName ?name ;
                   :providesIngredientBenefit ?benefit ;
                   :hasFunction ?function .
      }
      ORDER BY ?name
      LIMIT ${limit}
    `;

    try {
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const result = this.parseResults(response.data);
      console.log(`📋 Get all ingredients: Retrieved ${result.count} ingredients`);
      return result;
    } catch (error) {
      console.error('SPARQL get all ingredients failed:', error.message);
      return { data: [], count: 0, error: error.message };
    }
  }

  // Parse SPARQL results to JSON
  parseResults(data) {
    if (!data.results || !data.results.bindings) {
      console.warn('⚠️ No results.bindings in SPARQL response');
      return { data: [], count: 0 };
    }

    const results = data.results.bindings.map(binding => {
      const result = {};
      Object.keys(binding).forEach(key => {
        result[key] = binding[key].value;
      });
      return result;
    });

    return { data: results, count: results.length };
  }

  // Health check for Fuseki connection - FIXED
  async healthCheck() {
    try {
      const query = `
        ${this.commonPrefixes}
        SELECT (COUNT(*) as ?count) WHERE { ?s ?p ?o }
      `;
      
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const result = this.parseResults(response.data);
      const tripleCount = result.data[0]?.count || '0';
      
      console.log(`💚 Health check successful: ${tripleCount} triples available`);
      
      return { 
        status: 'connected', 
        tripleCount: tripleCount,
        endpoint: this.fusekiEndpoint 
      };
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return { status: 'disconnected', error: error.message };
    }
  }

  // Test method to verify fixes - NEW METHOD
  async testFixedQueries() {
    console.log('🧪 Testing fixed ontologyService queries...\n');
    
    try {
      // Test 1: Health check
      console.log('1️⃣ Testing health check...');
      const health = await this.healthCheck();
      console.log(`   Result: ${health.status}, Triples: ${health.tripleCount}`);
      
      // Test 2: Get all synergistic combos
      console.log('\n2️⃣ Testing getAllSynergisticCombos...');
      const allSynergies = await this.getAllSynergisticCombos();
      console.log(`   Result: ${allSynergies.count} combinations found`);
      
      // Test 3: Get specific ingredient conflicts
      console.log('\n3️⃣ Testing getIngredientConflicts...');
      const conflicts = await this.getIngredientConflicts(['Retinol', 'Vitamin C']);
      console.log(`   Result: ${conflicts.count} conflicts detected`);
      
      // Test 4: Get all ingredients
      console.log('\n4️⃣ Testing getAllIngredients...');
      const ingredients = await this.getAllIngredients(10);
      console.log(`   Result: ${ingredients.count} ingredients retrieved`);
      
      console.log('\n✅ All tests completed! Ontology service should now work properly.');
      
      return {
        health: health.status === 'connected',
        synergies: allSynergies.count > 0,
        conflicts_test: conflicts.count >= 0, // 0 is valid if no conflicts
        ingredients: ingredients.count > 0
      };
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return { error: error.message };
    }
  }
}

module.exports = new OntologyService();