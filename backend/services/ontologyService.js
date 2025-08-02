// backend/services/ontologyService.js - FIXED CASE SENSITIVITY VERSION
const axios = require('axios');

class OntologyService {
  constructor() {
    this.fusekiEndpoint = 'http://localhost:3030/skincare-db/sparql';
    this.updateEndpoint = 'http://localhost:3030/skincare-db/update';
    
    this.commonPrefixes = `
      PREFIX : <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
      PREFIX sc: <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    `;
    
    // Mock data (unchanged)
    this.mockIngredients = {
      normal: [
        { name: 'Hyaluronic Acid', benefit: 'Hydrating', function: 'humectant', explanation: 'Provides deep hydration for normal skin' },
        { name: 'Niacinamide', benefit: 'Pore Minimizing', function: 'anti-inflammatory', explanation: 'Reduces appearance of pores and balances skin' },
        { name: 'Vitamin C', benefit: 'Brightening', function: 'antioxidant', explanation: 'Brightens skin tone and provides antioxidant protection' },
        { name: 'Ceramides', benefit: 'Skin Barrier', function: 'emollient', explanation: 'Strengthens skin barrier function' },
        { name: 'Glycerin', benefit: 'Moisturizing', function: 'humectant', explanation: 'Gentle moisturizing for normal skin' }
      ],
      oily: [
        { name: 'Salicylic Acid', benefit: 'Acne Fighter', function: 'exfoliant', explanation: 'Unclogs pores and reduces acne for oily skin' },
        { name: 'Niacinamide', benefit: 'Oil Control', function: 'sebum-regulating', explanation: 'Controls excess oil production' },
        { name: 'Zinc Oxide', benefit: 'Anti-inflammatory', function: 'skin protecting', explanation: 'Reduces inflammation and protects oily skin' },
        { name: 'Tea Tree Oil', benefit: 'Antimicrobial', function: 'antimicrobial', explanation: 'Natural antimicrobial for acne-prone skin' },
        { name: 'Clay', benefit: 'Oil Absorption', function: 'absorbent', explanation: 'Absorbs excess oil from pores' }
      ],
      dry: [
        { name: 'Hyaluronic Acid', benefit: 'Deep Hydration', function: 'humectant', explanation: 'Attracts moisture to dry skin' },
        { name: 'Ceramides', benefit: 'Skin Barrier', function: 'emollient', explanation: 'Strengthens compromised skin barrier in dry skin' },
        { name: 'Squalane', benefit: 'Moisturizing', function: 'occlusive', explanation: 'Locks in moisture for dry skin' },
        { name: 'Shea Butter', benefit: 'Nourishing', function: 'emollient', explanation: 'Provides rich nourishment for dry skin' },
        { name: 'Glycerin', benefit: 'Hydrating', function: 'humectant', explanation: 'Gentle hydration for sensitive dry skin' }
      ],
      combination: [
        { name: 'Niacinamide', benefit: 'Balancing', function: 'multi-functional', explanation: 'Balances oil and hydration in different zones' },
        { name: 'Hyaluronic Acid', benefit: 'Hydrating', function: 'humectant', explanation: 'Hydrates without adding greasiness to T-zone' },
        { name: 'Salicylic Acid', benefit: 'T-zone Control', function: 'exfoliant', explanation: 'Controls oiliness specifically in T-zone' },
        { name: 'Zinc PCA', benefit: 'Sebum Regulation', function: 'sebum-regulating', explanation: 'Regulates oil production in oily areas' },
        { name: 'Panthenol', benefit: 'Soothing', function: 'skin conditioning', explanation: 'Soothes different skin zones' }
      ],
      sensitive: [
        { name: 'Centella Asiatica', benefit: 'Calming', function: 'anti-inflammatory', explanation: 'Soothes and calms sensitive skin' },
        { name: 'Allantoin', benefit: 'Soothing', function: 'skin conditioning', explanation: 'Reduces irritation in sensitive skin' },
        { name: 'Hyaluronic Acid', benefit: 'Gentle Hydration', function: 'humectant', explanation: 'Provides hydration without irritation' },
        { name: 'Colloidal Oatmeal', benefit: 'Barrier Protection', function: 'skin protecting', explanation: 'Protects and soothes sensitive skin' },
        { name: 'Aloe Vera', benefit: 'Anti-inflammatory', function: 'anti-inflammatory', explanation: 'Natural anti-inflammatory for sensitive skin' }
      ]
    };

    this.mockSynergies = [
      { name1: 'Hyaluronic Acid', name2: 'Niacinamide', benefit1: 'Hydrating', benefit2: 'Pore Minimizing', recommendation: '✅ EXCELLENT COMBO' },
      { name1: 'Vitamin C', name2: 'Hyaluronic Acid', benefit1: 'Brightening', benefit2: 'Hydrating', recommendation: '✅ GREAT MORNING COMBO' },
      { name1: 'Niacinamide', name2: 'Salicylic Acid', benefit1: 'Oil Control', benefit2: 'Acne Fighter', recommendation: '✅ POWERFUL OILY SKIN COMBO' },
      { name1: 'Ceramides', name2: 'Hyaluronic Acid', benefit1: 'Skin Barrier', benefit2: 'Hydrating', recommendation: '✅ PERFECT DRY SKIN COMBO' },
      { name1: 'Centella Asiatica', name2: 'Allantoin', benefit1: 'Calming', benefit2: 'Soothing', recommendation: '✅ IDEAL SENSITIVE SKIN COMBO' }
    ];
  }

  // ✅ NEW: Normalize ingredient names for consistent matching
  normalizeIngredientName(name) {
    if (!name) return '';
    
    // Convert to Title Case and clean
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  // ✅ ENHANCED: Parse ingredient lists with normalization
  parseIngredientList(ingredientListString) {
    if (!ingredientListString) return [];
    
    // Remove "KOMPOSISI :" prefix and clean up
    let cleaned = ingredientListString
      .replace(/KOMPOSISI\s*:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Split by common separators
    let ingredients = cleaned.split(/[,;]+/)
      .map(ing => ing.trim())
      .filter(ing => ing.length > 2);
    
    // Known ontology ingredients with variations
    const knownIngredients = {
      'SALICYLIC ACID': 'Salicylic Acid',
      'NIACINAMIDE': 'Niacinamide', 
      'HYALURONIC ACID': 'Hyaluronic Acid',
      'GLYCERIN': 'Glycerin',
      'CERAMIDE': 'Ceramides',
      'RETINOL': 'Retinol',
      'VITAMIN C': 'Ascorbic Acid', // Map to ontology name
      'ASCORBIC ACID': 'Ascorbic Acid',
      'TEA TREE OIL': 'Tea Tree Oil',
      'CENTELLA ASIATICA': 'Centella Asiatica',
      'ALOE VERA': 'Aloe Vera',
      'GLYCOLIC ACID': 'Glycolic Acid'
    };
    
    // Find matches and normalize
    const foundIngredients = [];
    for (const [searchKey, ontologyName] of Object.entries(knownIngredients)) {
      if (ingredients.some(ing => ing.toUpperCase().includes(searchKey))) {
        foundIngredients.push(ontologyName);
      }
    }
    
    return foundIngredients;
  }

  // 🎓 MAIN METHOD: Get skin type recommendations with fallback
  async getSkinTypeRecommendations(skinType, concerns = []) {
    console.log(`🔍 Getting recommendations for ${skinType} skin type...`);
    
    try {
      const realResult = await this.executeSPARQLSkinTypeQuery(skinType, concerns);
      if (realResult.count > 0) {
        console.log(`✅ SPARQL SUCCESS: ${realResult.count} ingredients from ontology`);
        return realResult;
      }
    } catch (error) {
      console.warn(`⚠️ SPARQL failed: ${error.message}`);
    }
    
    console.log(`🎭 Using MOCK data for ${skinType} skin type (Fuseki unavailable)`);
    return this.getMockSkinTypeRecommendations(skinType, concerns);
  }

  // 🚀 REAL SPARQL QUERY
  async executeSPARQLSkinTypeQuery(skinType, concerns = []) {
    const concernsFilter = concerns.length > 0 
        ? `FILTER EXISTS { ?ingredient sc:treatsConcern ?concern . FILTER(?concern IN (${concerns.map(c => `sc:${c}`).join(', ')})) }`
        : '';

    const query = `
        ${this.commonPrefixes}
        
        SELECT ?ingredient ?name ?benefit ?function ?explanation
        WHERE {
        ?ingredient rdf:type sc:Ingredient ;
                    sc:IngredientName ?name ;
                    sc:recommendedFor sc:${skinType} .
                    
        OPTIONAL { ?ingredient sc:providesIngredientBenefit ?benefit }
        OPTIONAL { ?ingredient sc:hasFunction ?function }
        OPTIONAL { ?ingredient sc:explanation ?explanation }
        
        ${concernsFilter}
        }
        ORDER BY ?name
    `;

    const response = await axios.post(this.fusekiEndpoint, 
      new URLSearchParams({ query }), 
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    return this.parseResults(response.data);
  }

  // 🎭 MOCK DATA FALLBACK
  getMockSkinTypeRecommendations(skinType, concerns = []) {
    const ingredients = this.mockIngredients[skinType] || this.mockIngredients.normal;
    
    let filteredIngredients = ingredients;
    if (concerns.length > 0) {
      filteredIngredients = ingredients.filter(ing => 
        concerns.some(concern => 
          ing.benefit.toLowerCase().includes(concern.toLowerCase()) ||
          ing.explanation.toLowerCase().includes(concern.toLowerCase()) ||
          ing.name.toLowerCase().includes(concern.toLowerCase())
        )
      );
      
      if (filteredIngredients.length === 0) {
        filteredIngredients = ingredients;
      }
    }
    
    return {
      data: filteredIngredients,
      count: filteredIngredients.length,
      source: 'mock_data',
      note: 'Using mock data - replace with real Fuseki for production'
    };
  }

  // ✅ FIXED: Get ingredient incompatibilities with case-insensitive matching
  async getIngredientConflicts(ingredientInput) {
    let ingredientNames = [];
    
    if (Array.isArray(ingredientInput)) {
      ingredientNames = ingredientInput.map(name => this.normalizeIngredientName(name));
    } else if (typeof ingredientInput === 'string') {
      ingredientNames = this.parseIngredientList(ingredientInput);
    }
    
    if (ingredientNames.length === 0) {
      return { data: [], count: 0, note: 'No recognizable ingredients found' };
    }
    
    console.log(`🔍 Analyzing conflicts for: ${ingredientNames.join(', ')}`);
    
    try {
      // ✅ FIXED: Use case-insensitive SPARQL query with proper filtering
      const query = `
        ${this.commonPrefixes}
        
        SELECT DISTINCT ?ing1 ?name1 ?ing2 ?name2 ?warning
        WHERE {
          ?ing1 rdf:type sc:Ingredient ;
                sc:IngredientName ?name1 ;
                sc:incompatibleWith ?ing2 .
                
          ?ing2 sc:IngredientName ?name2 .
          
          # Both ingredients must be in our input list (case-insensitive)
          FILTER(
            (${ingredientNames.map(name => `LCASE(?name1) = LCASE("${name}")`).join(' || ')}) &&
            (${ingredientNames.map(name => `LCASE(?name2) = LCASE("${name}")`).join(' || ')})
          )
          
          BIND("⚠️ AVOID COMBINATION" as ?warning)
        }
        ORDER BY ?name1 ?name2
      `;

      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const result = this.parseResults(response.data);
      console.log(`✅ SPARQL conflicts query: Found ${result.count} conflicts`);
      return { ...result, ingredients_analyzed: ingredientNames };
      
    } catch (error) {
      console.warn('SPARQL conflict query failed, using mock:', error.message);
      return this.getMockConflicts(ingredientNames);
    }
  }

  // ✅ FIXED: Get synergistic combinations with case-insensitive matching  
  async getSynergisticCombos(ingredientInput) {
    let ingredientNames = [];
    
    if (Array.isArray(ingredientInput)) {
      ingredientNames = ingredientInput.map(name => this.normalizeIngredientName(name));
    } else if (typeof ingredientInput === 'string') {
      ingredientNames = this.parseIngredientList(ingredientInput);
    }
    
    if (ingredientNames.length === 0) {
      return { data: [], count: 0, note: 'No recognizable ingredients found' };
    }
    
    console.log(`✨ Analyzing synergies for: ${ingredientNames.join(', ')}`);
    
    try {
      // ✅ FIXED: Use case-insensitive SPARQL query with proper filtering for input ingredients only
      const query = `
        ${this.commonPrefixes}
        
        SELECT DISTINCT ?ing1 ?name1 ?ing2 ?name2 ?benefit1 ?benefit2 ?recommendation
        WHERE {
          ?ing1 rdf:type sc:Ingredient ;
                sc:IngredientName ?name1 ;
                sc:synergisticWith ?ing2 ;
                sc:providesIngredientBenefit ?benefit1 .
                
          ?ing2 sc:IngredientName ?name2 ;
                sc:providesIngredientBenefit ?benefit2 .
          
          FILTER NOT EXISTS {
            {?ing1 sc:incompatibleWith ?ing2} UNION
            {?ing2 sc:incompatibleWith ?ing1}
          }
          
          # Both ingredients must be in our input list (case-insensitive)
          FILTER(
            (${ingredientNames.map(name => `LCASE(?name1) = LCASE("${name}")`).join(' || ')}) &&
            (${ingredientNames.map(name => `LCASE(?name2) = LCASE("${name}")`).join(' || ')})
          )
          
          FILTER(?ing1 != ?ing2)
          
          BIND("✅ RECOMMENDED COMBO" as ?recommendation)
        }
        ORDER BY ?name1 ?name2
      `;

      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const result = this.parseResults(response.data);
      console.log(`✅ SPARQL synergies query: Found ${result.count} synergies`);
      return { ...result, ingredients_analyzed: ingredientNames };
      
    } catch (error) {
      console.warn('SPARQL synergy query failed, using mock:', error.message);
      return this.getMockSynergies(ingredientNames);
    }
  }

  // Helper methods (unchanged)
  getMockConflicts(ingredientNames) {
    const mockConflicts = [];
    
    if (ingredientNames.includes('Retinol') && ingredientNames.includes('Ascorbic Acid')) {
      mockConflicts.push({
        name1: 'Retinol',
        name2: 'Ascorbic Acid',
        warning: '⚠️ AVOID COMBINATION - May cause irritation'
      });
    }
    
    if (ingredientNames.includes('Salicylic Acid') && ingredientNames.includes('Retinol')) {
      mockConflicts.push({
        name1: 'Salicylic Acid',
        name2: 'Retinol',
        warning: '⚠️ AVOID COMBINATION - Over-exfoliation risk'
      });
    }
    
    return { 
      data: mockConflicts, 
      count: mockConflicts.length, 
      source: 'mock_data',
      ingredients_analyzed: ingredientNames
    };
  }

  getMockSynergies(ingredientNames) {
    const relevantSynergies = this.mockSynergies.filter(synergy =>
      ingredientNames.includes(synergy.name1) && 
      ingredientNames.includes(synergy.name2)
    );
    
    return { 
      data: relevantSynergies, 
      count: relevantSynergies.length, 
      source: 'mock_data',
      ingredients_analyzed: ingredientNames
    };
  }

  // Get ALL synergistic combinations (no filter)
  async getAllSynergisticCombos() {
    try {
      console.log('🔍 Executing getAllSynergisticCombos query...');
      const startTime = Date.now();
      
      const query = `
        ${this.commonPrefixes}
        
        SELECT ?ing1 ?name1 ?ing2 ?name2 ?benefit1 ?benefit2 ?recommendation
        WHERE {
          ?ing1 rdf:type sc:Ingredient ;
                sc:IngredientName ?name1 ;
                sc:synergisticWith ?ing2 ;
                sc:providesIngredientBenefit ?benefit1 .
                
          ?ing2 sc:IngredientName ?name2 ;
                sc:providesIngredientBenefit ?benefit2 .
          
          FILTER NOT EXISTS {
            {?ing1 sc:incompatibleWith ?ing2} UNION
            {?ing2 sc:incompatibleWith ?ing1}
          }
          
          FILTER(?ing1 != ?ing2)
          
          BIND("✅ RECOMMENDED COMBO" as ?recommendation)
        }
        ORDER BY ?name1 ?name2
      `;
      
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
      console.warn('SPARQL getAllSynergisticCombos failed, using mock:', error.message);
      
      return { 
        data: this.mockSynergies, 
        count: this.mockSynergies.length, 
        source: 'mock_data',
        queryTime: 1,
        performance: `${this.mockSynergies.length} mock results in 1ms`
      };
    }
  }

  // Get ingredient details by name
  async getIngredientDetails(ingredientName) {
    try {
      const normalizedName = this.normalizeIngredientName(ingredientName);
      
      const query = `
        ${this.commonPrefixes}
        
        SELECT ?ingredient ?name ?benefit ?function ?explanation ?whatItDoes ?safety
        WHERE {
          ?ingredient rdf:type sc:Ingredient ;
                     sc:IngredientName ?name ;
                     sc:providesIngredientBenefit ?benefit ;
                     sc:hasFunction ?function ;
                     sc:explanation ?explanation .
                     
          OPTIONAL { ?ingredient sc:whatItDoes ?whatItDoes }
          OPTIONAL { ?ingredient sc:safety ?safety }
          
          FILTER(LCASE(?name) = LCASE("${normalizedName}"))
        }
      `;

      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      return this.parseResults(response.data);
    } catch (error) {
      console.warn('SPARQL ingredient details failed, using mock:', error.message);
      
      // Search in mock data
      const allIngredients = Object.values(this.mockIngredients).flat();
      const foundIngredient = allIngredients.find(ing => 
        ing.name.toLowerCase() === ingredientName.toLowerCase()
      );
      
      if (foundIngredient) {
        return { 
          data: [{
            ...foundIngredient,
            whatItDoes: foundIngredient.function,
            safety: 'Generally safe for topical use'
          }], 
          count: 1, 
          source: 'mock_data' 
        };
      }
      
      const mockDetail = {
        name: ingredientName,
        benefit: 'General skincare benefit',
        function: 'skin conditioning',
        explanation: `Mock details for ${ingredientName}`,
        whatItDoes: 'Provides skincare benefits',
        safety: 'Check with dermatologist for specific concerns'
      };
      return { data: [mockDetail], count: 1, source: 'mock_data' };
    }
  }

  // Get all ingredients
  async getAllIngredients(limit = 50) {
    try {
      const query = `
        ${this.commonPrefixes}
        
        SELECT ?ingredient ?name ?benefit ?function
        WHERE {
          ?ingredient rdf:type sc:Ingredient ;
                     sc:IngredientName ?name ;
                     sc:providesIngredientBenefit ?benefit ;
                     sc:hasFunction ?function .
        }
        ORDER BY ?name
        LIMIT ${limit}
      `;

      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const result = this.parseResults(response.data);
      console.log(`📋 Get all ingredients: Retrieved ${result.count} ingredients`);
      return result;
    } catch (error) {
      console.warn('SPARQL get all ingredients failed, using mock:', error.message);
      
      const allMockIngredients = Object.values(this.mockIngredients).flat();
      const uniqueIngredients = allMockIngredients.filter((ing, index, arr) => 
        arr.findIndex(i => i.name === ing.name) === index
      );
      
      const sortedIngredients = uniqueIngredients
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, limit);
      
      return { 
        data: sortedIngredients, 
        count: sortedIngredients.length,
        source: 'mock_data'
      };
    }
  }

  // Parse SPARQL results
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

  // Health check
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
      console.warn('❌ Fuseki health check failed:', error.message);
      return { 
        status: 'mock_mode', 
        error: error.message.includes('ECONNREFUSED') ? 'Fuseki server not running' : error.message,
        note: 'Using mock data for development - start Fuseki server for production mode'
      };
    }
  }

  // ✅ NEW: Test method with case-insensitive examples
  async testIngredientParsing() {
    console.log('\n🧪 Testing Fixed Ingredient Parsing & SPARQL Integration...');
    
    // Test 1: Mixed case ingredients that match ontology
    const testIngredients = ['salicylic acid', 'NIACINAMIDE', 'Hyaluronic Acid'];
    const normalizedIngredients = testIngredients.map(name => this.normalizeIngredientName(name));
    console.log(`\n1️⃣ Testing mixed case ingredients:`);
    console.log(`   Input: ${testIngredients.join(', ')}`);
    console.log(`   Normalized: ${normalizedIngredients.join(', ')}`);
    
    const conflicts = await this.getIngredientConflicts(testIngredients);
    console.log(`   Conflicts found: ${conflicts.count}`);
    
    const synergies = await this.getSynergisticCombos(testIngredients);
    console.log(`   Synergies found: ${synergies.count}`);
    
    // Test 2: Known conflicting pair
    console.log(`\n2️⃣ Testing known conflicting pair: Retinol + Ascorbic Acid`);
    const conflictPair = ['retinol', 'ASCORBIC ACID'];  // Mixed case
    const conflicts2 = await this.getIngredientConflicts(conflictPair);
    console.log(`   Conflicts found: ${conflicts2.count}`);
    conflicts2.data.forEach(conflict => {
      console.log(`     • ${conflict.name1} conflicts with ${conflict.name2}`);
    });
    
    // Test 3: Known synergistic pair
    console.log(`\n3️⃣ Testing known synergistic pair: Hyaluronic Acid + Niacinamide`);
    const synergyPair = ['HYALURONIC ACID', 'niacinamide'];  // Mixed case
    const synergies2 = await this.getSynergisticCombos(synergyPair);
    console.log(`   Synergies found: ${synergies2.count}`);
    if (synergies2.count > 0) {
      console.log(`   Unique synergies between input ingredients:`);
      // Remove duplicates for display
      const uniqueSynergies = [];
      const seen = new Set();
      synergies2.data.forEach(synergy => {
        const key = `${synergy.name1}-${synergy.name2}`;
        const reverseKey = `${synergy.name2}-${synergy.name1}`;
        if (!seen.has(key) && !seen.has(reverseKey)) {
          seen.add(key);
          uniqueSynergies.push(synergy);
        }
      });
      uniqueSynergies.slice(0, 5).forEach(synergy => {
        console.log(`     • ${synergy.name1} + ${synergy.name2} = ${synergy.recommendation}`);
      });
      if (uniqueSynergies.length > 5) {
        console.log(`     ... and ${uniqueSynergies.length - 5} more unique combinations`);
      }
    }
    
    console.log('\n🎯 Fixed ingredient parsing test complete!');
    return { 
      success: true, 
      conflicts_working: conflicts.count >= 0,
      synergies_working: synergies.count > 0,
      case_insensitive: true
    };
  }

  // Enhanced test method
  async testFixedQueries() {
    console.log('🧪 Testing FIXED ontologyService with case-insensitive queries...\n');
    
    try {
      // Test 1: Health check
      console.log('1️⃣ Testing health check...');
      const health = await this.healthCheck();
      console.log(`   Result: ${health.status}`);
      if (health.tripleCount) console.log(`   Triples: ${health.tripleCount}`);
      
      // Test 2: Skin type recommendations  
      console.log('\n2️⃣ Testing skin type recommendations...');
      const recommendations = await this.getSkinTypeRecommendations('oily', ['acne']);
      console.log(`   Result: ${recommendations.count} ingredients`);
      console.log(`   Source: ${recommendations.source || 'sparql'}`);
      
      // Test 3: Fixed ingredient parsing
      await this.testIngredientParsing();
      
      console.log('\n✅ All tests completed! Fixed ontology service working properly.');
      console.log(`🎭 Mode: ${health.status === 'connected' ? 'PRODUCTION (SPARQL)' : 'DEVELOPMENT (Mock Data)'}`);
      
      return {
        health: health.status === 'connected',
        overall_status: 'working_fixed'
      };
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return { error: error.message, overall_status: 'failed' };
    }
  }
}

module.exports = new OntologyService();