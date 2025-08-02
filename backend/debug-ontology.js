// Debug script untuk mencari property names yang tepat dan menambahkan data
// Jalankan ini untuk debugging: node debug-ontology.js

const axios = require('axios');

class OntologyDebugger {
  constructor() {
    this.fusekiEndpoint = 'http://localhost:3030/skincare-db/sparql';
    this.updateEndpoint = 'http://localhost:3030/skincare-db/update';
    
    this.commonPrefixes = `
      PREFIX : <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
      PREFIX sc: <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
    `;
  }

  // 🔍 STEP 1: Discover existing properties
  async discoverProperties() {
    console.log('🔍 Step 1: Discovering existing properties in ontology...\n');
    
    const query = `
      ${this.commonPrefixes}
      SELECT DISTINCT ?property (COUNT(?s) as ?usage_count)
      WHERE { 
        ?s ?property ?o .
        FILTER(STRSTARTS(STR(?property), "http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/"))
      }
      GROUP BY ?property
      ORDER BY DESC(?usage_count)
    `;

    try {
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const results = this.parseResults(response.data);
      console.log(`Found ${results.count} properties:`);
      
      results.data.forEach(result => {
        const propName = result.property.split('/').pop();
        console.log(`  • ${propName} (used ${result.usage_count} times)`);
      });
      
      return results.data;
      
    } catch (error) {
      console.error('Property discovery failed:', error.message);
      return [];
    }
  }

  // 🔍 STEP 2: Check existing ingredients and their relations
  async checkIngredientRelations() {
    console.log('\n🔍 Step 2: Checking existing ingredient relations...\n');
    
    const query = `
      ${this.commonPrefixes}
      SELECT ?ingredient ?name ?property ?target
      WHERE {
        ?ingredient rdf:type sc:Ingredient ;
                   sc:IngredientName ?name ;
                   ?property ?target .
        
        FILTER(?property IN (
          sc:incompatibleWith, :incompatibleWith,
          sc:synergisticWith, :synergisticWith,
          sc:conflictsWith, :conflictsWith,
          sc:worksWith, :worksWith,
          sc:enhancesWith, :enhancesWith
        ))
      }
      LIMIT 20
    `;

    try {
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const results = this.parseResults(response.data);
      
      if (results.count > 0) {
        console.log(`Found ${results.count} existing relations:`);
        results.data.forEach(result => {
          const propName = result.property.split('/').pop();
          console.log(`  • ${result.name} --${propName}--> ${result.target}`);
        });
      } else {
        console.log('❌ No ingredient relations found. Need to add them!');
      }
      
      return results.data;
      
    } catch (error) {
      console.error('Relation check failed:', error.message);
      return [];
    }
  }

  // 🛠️ STEP 3: Add sample conflict and synergy data
  async addSampleRelations() {
    console.log('\n🛠️ Step 3: Adding sample conflict and synergy relations...\n');
    
    // Sample conflicts (well-known incompatible combinations)
    const conflicts = [
      { ing1: 'Retinol', ing2: 'Vitamin C' },
      { ing1: 'Salicylic Acid', ing2: 'Retinol' },
      { ing1: 'Vitamin C', ing2: 'Niacinamide' } // controversial but some say conflicts
    ];
    
    // Sample synergies (well-known beneficial combinations)
    const synergies = [
      { ing1: 'Hyaluronic Acid', ing2: 'Niacinamide' },
      { ing1: 'Niacinamide', ing2: 'Salicylic Acid' },
      { ing1: 'Hyaluronic Acid', ing2: 'Vitamin C' }
    ];

    const updateQueries = [];
    
    // Add conflicts
    conflicts.forEach(conflict => {
      updateQueries.push(`
        ${this.commonPrefixes}
        INSERT DATA {
          ?ing1 sc:incompatibleWith ?ing2 .
          ?ing2 sc:incompatibleWith ?ing1 .
        }
        WHERE {
          ?ing1 rdf:type sc:Ingredient ; sc:IngredientName "${conflict.ing1}" .
          ?ing2 rdf:type sc:Ingredient ; sc:IngredientName "${conflict.ing2}" .
        }
      `);
    });
    
    // Add synergies
    synergies.forEach(synergy => {
      updateQueries.push(`
        ${this.commonPrefixes}
        INSERT DATA {
          ?ing1 sc:synergisticWith ?ing2 .
          ?ing2 sc:synergisticWith ?ing1 .
        }
        WHERE {
          ?ing1 rdf:type sc:Ingredient ; sc:IngredientName "${synergy.ing1}" .
          ?ing2 rdf:type sc:Ingredient ; sc:IngredientName "${synergy.ing2}" .
        }
      `);
    });

    // Execute update queries
    for (const updateQuery of updateQueries) {
      try {
        await axios.post(this.updateEndpoint, 
          new URLSearchParams({ update: updateQuery }), 
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        console.log('✅ Added relation');
      } catch (error) {
        console.log(`❌ Failed to add relation: ${error.message}`);
        
        // Alternative: Try different property names
        const altQuery = updateQuery
          .replace(/sc:incompatibleWith/g, ':incompatibleWith')
          .replace(/sc:synergisticWith/g, ':synergisticWith');
          
        try {
          await axios.post(this.updateEndpoint, 
            new URLSearchParams({ update: altQuery }), 
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
          console.log('✅ Added relation (with alternative prefix)');
        } catch (altError) {
          console.log(`❌ Alternative also failed: ${altError.message}`);
        }
      }
    }
  }

  // 🧪 STEP 4: Test queries after adding data
  async testQueriesAfterUpdate() {
    console.log('\n🧪 Step 4: Testing queries after adding sample data...\n');
    
    // Test conflicts
    const conflictQuery = `
      ${this.commonPrefixes}
      SELECT ?ing1 ?name1 ?ing2 ?name2
      WHERE {
        ?ing1 rdf:type sc:Ingredient ;
              sc:IngredientName ?name1 ;
              sc:incompatibleWith ?ing2 .
              
        ?ing2 sc:IngredientName ?name2 .
      }
      LIMIT 10
    `;
    
    try {
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query: conflictQuery }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const results = this.parseResults(response.data);
      console.log(`🔍 Conflicts found: ${results.count}`);
      results.data.forEach(result => {
        console.log(`  • ${result.name1} conflicts with ${result.name2}`);
      });
    } catch (error) {
      console.log(`❌ Conflict query failed: ${error.message}`);
    }
    
    // Test synergies
    const synergyQuery = `
      ${this.commonPrefixes}
      SELECT ?ing1 ?name1 ?ing2 ?name2
      WHERE {
        ?ing1 rdf:type sc:Ingredient ;
              sc:IngredientName ?name1 ;
              sc:synergisticWith ?ing2 .
              
        ?ing2 sc:IngredientName ?name2 .
      }
      LIMIT 10
    `;
    
    try {
      const response = await axios.post(this.fusekiEndpoint, 
        new URLSearchParams({ query: synergyQuery }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const results = this.parseResults(response.data);
      console.log(`✨ Synergies found: ${results.count}`);
      results.data.forEach(result => {
        console.log(`  • ${result.name1} synergizes with ${result.name2}`);
      });
    } catch (error) {
      console.log(`❌ Synergy query failed: ${error.message}`);
    }
  }

  // 🎯 MAIN: Run complete debug and fix process
  async runCompleteDebug() {
    console.log('🚀 Running Complete Ontology Debug & Fix Process...\n');
    
    try {
      // Step 1: Discover existing properties
      await this.discoverProperties();
      
      // Step 2: Check existing relations
      const existingRelations = await this.checkIngredientRelations();
      
      // Step 3: Add sample data if none exists
      if (existingRelations.length === 0) {
        console.log('\n🛠️ No existing relations found. Adding sample data...');
        await this.addSampleRelations();
      } else {
        console.log('\n✅ Existing relations found. Skipping data addition.');
      }
      
      // Step 4: Test queries
      await this.testQueriesAfterUpdate();
      
      console.log('\n🎉 Debug process complete!');
      console.log('\n📝 Next steps:');
      console.log('1. Run your original test again: node -e "const service = require(\'./services/ontologyService\'); service.testIngredientParsing();"');
      console.log('2. Test your API endpoints');
      console.log('3. If still 0 results, check the exact property names used in your ontology');
      
    } catch (error) {
      console.error('❌ Debug process failed:', error.message);
    }
  }

  // Helper method
  parseResults(data) {
    if (!data.results || !data.results.bindings) {
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
}

// 🚀 USAGE
const ontologyDebugger = new OntologyDebugger();

// Option 1: Run complete debug process
ontologyDebugger.runCompleteDebug();

// Option 2: Run individual steps
// ontologyDebugger.discoverProperties();
// ontologyDebugger.checkIngredientRelations();
// ontologyDebugger.addSampleRelations();
// ontologyDebugger.testQueriesAfterUpdate();

module.exports = OntologyDebugger;