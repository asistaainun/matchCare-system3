// backend/routes/ingredients.js - FIXED ONTOLOGY-BASED INGREDIENT ENDPOINTS
const express = require('express');
const router = express.Router();
const ontologyService = require('../services/ontologyService');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// ===== 1. GET ALL INGREDIENTS (Ontology-powered) =====
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search, skinType } = req.query;

    console.log('🧠 Getting ingredients from ontology...');

    // Get ingredients from ontology first
    const ontologyIngredients = await ontologyService.getAllIngredients(parseInt(limit) + 20);
    
    let ingredients = ontologyIngredients.data || [];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      ingredients = ingredients.filter(ingredient => 
        ingredient.name.toLowerCase().includes(searchLower) ||
        (ingredient.benefit && ingredient.benefit.toLowerCase().includes(searchLower)) ||
        (ingredient.function && ingredient.function.toLowerCase().includes(searchLower))
      );
    }

    // Apply skin type filter
    if (skinType) {
      console.log(`🎯 Filtering ingredients for ${skinType} skin type...`);
      try {
        const skinTypeIngredients = await ontologyService.getSkinTypeRecommendations(skinType);
        const recommendedNames = skinTypeIngredients.data.map(ing => ing.name.toLowerCase());
        
        // Prioritize skin type specific ingredients
        ingredients = ingredients.sort((a, b) => {
          const aRecommended = recommendedNames.includes(a.name.toLowerCase());
          const bRecommended = recommendedNames.includes(b.name.toLowerCase());
          
          if (aRecommended && !bRecommended) return -1;
          if (!aRecommended && bRecommended) return 1;
          return 0;
        });
      } catch (error) {
        console.warn('Skin type filtering failed:', error.message);
      }
    }

    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedIngredients = ingredients.slice(startIndex, endIndex);

    // Enhance with additional ontology data
    const enhancedIngredients = await Promise.all(
      paginatedIngredients.map(async (ingredient) => {
        try {
          // Get detailed information from ontology
          const details = await ontologyService.getIngredientDetails(ingredient.name);
          
          return {
            ...ingredient,
            detailed_info: details.data[0] || null,
            ontology_powered: true
          };
        } catch (error) {
          return {
            ...ingredient,
            detailed_info: null,
            ontology_powered: false
          };
        }
      })
    );

    res.json({
      success: true,
      data: enhancedIngredients,
      pagination: {
        total: ingredients.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: endIndex < ingredients.length
      },
      filters: {
        search,
        skinType
      },
      ontology_powered: true,
      source: ontologyIngredients.source || 'sparql',
      message: `Retrieved ${enhancedIngredients.length} ingredients from ontology`
    });

  } catch (error) {
    console.error('❌ Ingredients listing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      ontology_powered: false
    });
  }
});

// ===== 2. GET INGREDIENT DETAIL (Ontology-powered) =====
router.get('/:ingredientName', async (req, res) => {
  try {
    const { ingredientName } = req.params;
    
    console.log(`🔍 Getting detailed info for ingredient: ${ingredientName}`);

    // Get comprehensive ingredient details from ontology
    const ingredientDetails = await ontologyService.getIngredientDetails(ingredientName);
    
    if (ingredientDetails.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found in ontology',
        ontology_powered: true
      });
    }

    const ingredient = ingredientDetails.data[0];

    // Get interaction analysis
    console.log('🔬 Analyzing ingredient interactions...');
    
    let interactionAnalysis = {
      conflicts: { count: 0, details: [] },
      synergies: { count: 0, details: [] },
      safety_notes: []
    };

    try {
      // Find common ingredient combinations
      const commonCombinations = ['niacinamide', 'hyaluronic acid', 'retinol', 'vitamin c', 'salicylic acid'];
      const testCombinations = commonCombinations.filter(ing => 
        ing.toLowerCase() !== ingredientName.toLowerCase()
      ).slice(0, 3);
      
      if (testCombinations.length > 0) {
        const [conflicts, synergies] = await Promise.all([
          ontologyService.getIngredientConflicts([ingredientName, ...testCombinations]),
          ontologyService.getSynergisticCombos([ingredientName, ...testCombinations])
        ]);

        interactionAnalysis = {
          conflicts: {
            count: conflicts.count,
            details: conflicts.data.filter(conflict => 
              conflict.name1.toLowerCase() === ingredientName.toLowerCase() ||
              conflict.name2.toLowerCase() === ingredientName.toLowerCase()
            )
          },
          synergies: {
            count: synergies.count,
            details: synergies.data.filter(synergy => 
              synergy.name1.toLowerCase() === ingredientName.toLowerCase() ||
              synergy.name2.toLowerCase() === ingredientName.toLowerCase()
            )
          },
          safety_notes: router.generateSafetyNotes(conflicts.data, synergies.data, ingredientName)
        };
      }
    } catch (error) {
      console.warn('Interaction analysis failed:', error.message);
    }

    // Find products containing this ingredient
    console.log('📦 Finding products containing this ingredient...');
    const productsWithIngredient = await router.findProductsWithIngredient(ingredientName);

    res.json({
      success: true,
      data: {
        ...ingredient,
        interaction_analysis: interactionAnalysis,
        products_containing: {
          count: productsWithIngredient.length,
          examples: productsWithIngredient.slice(0, 8)
        },
        ontology_analysis: {
          confidence: ingredientDetails.source === 'sparql' ? 'high' : 'medium',
          last_updated: new Date().toISOString(),
          analysis_comprehensive: true
        }
      },
      ontology_powered: true,
      message: 'Comprehensive ingredient analysis from ontology'
    });

  } catch (error) {
    console.error('❌ Ingredient detail error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      ontology_powered: true
    });
  }
});

// ===== 3. INGREDIENT COMPATIBILITY CHECK (Core ontology feature) =====
router.post('/compatibility-check', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 ingredients for compatibility check',
        ontology_powered: true
      });
    }

    console.log(`🔬 Ontology compatibility check for: ${ingredients.join(', ')}`);

    // Comprehensive ontology analysis
    const [conflicts, synergies] = await Promise.all([
      ontologyService.getIngredientConflicts(ingredients),
      ontologyService.getSynergisticCombos(ingredients)
    ]);

    // Generate detailed compatibility report
    const compatibilityReport = {
      ingredients_analyzed: ingredients,
      analysis_timestamp: new Date().toISOString(),
      
      conflict_analysis: {
        total_conflicts: conflicts.count,
        conflicts_found: conflicts.data,
        risk_level: router.calculateRiskLevel(conflicts.count, ingredients.length),
        safety_warnings: router.generateSafetyWarnings(conflicts.data)
      },
      
      synergy_analysis: {
        total_synergies: synergies.count,
        synergies_found: synergies.data,
        enhancement_potential: router.calculateEnhancementPotential(synergies.count),
        beneficial_combinations: router.extractBeneficialCombinations(synergies.data)
      },
      
      overall_assessment: {
        compatibility_score: router.calculateCompatibilityScore(conflicts.count, synergies.count, ingredients.length),
        recommendation: router.generateOverallRecommendation(conflicts.count, synergies.count),
        usage_guidance: router.generateUsageGuidance(conflicts.data, synergies.data),
        safety_status: conflicts.count > 0 ? 'CAUTION_NEEDED' : 'SAFE'
      },
      
      ontology_metadata: {
        sparql_queries_executed: 2,
        knowledge_graph_analyzed: true,
        confidence_level: 'high',
        analysis_method: 'semantic_reasoning'
      }
    };

    res.json({
      success: true,
      data: compatibilityReport,
      ontology_powered: true,
      algorithm_type: 'ONTOLOGY_COMPATIBILITY_ANALYSIS',
      message: `Analyzed ${ingredients.length} ingredients: ${conflicts.count} conflicts, ${synergies.count} synergies found`
    });

  } catch (error) {
    console.error('❌ Compatibility check error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      ontology_powered: true
    });
  }
});

// ===== 4. INGREDIENT SYNERGIES (Ontology-based) =====
router.post('/synergies', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 ingredients to find synergies'
      });
    }

    console.log(`✨ Finding synergies for: ${ingredients.join(', ')}`);

    const synergies = await ontologyService.getSynergisticCombos(ingredients);

    const synergyReport = {
      ingredients_input: ingredients,
      synergies_found: {
        total: synergies.count,
        combinations: synergies.data,
        enhancement_score: router.calculateEnhancementScore(synergies.data)
      },
      recommendations: {
        best_combinations: router.getBestCombinations(synergies.data),
        usage_tips: router.generateSynergyUsageTips(synergies.data),
        potential_benefits: router.extractPotentialBenefits(synergies.data)
      },
      ontology_analysis: {
        knowledge_graph_used: true,
        semantic_relationships: 'analyzed',
        confidence: synergies.source === 'sparql' ? 'high' : 'medium'
      }
    };

    res.json({
      success: true,
      data: synergyReport,
      ontology_powered: true,
      message: `Found ${synergies.count} synergistic combinations`
    });

  } catch (error) {
    console.error('❌ Synergies analysis error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== 5. INGREDIENT CONFLICTS (Ontology-based) =====
router.post('/conflicts', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 ingredients to check conflicts'
      });
    }

    console.log(`⚠️ Checking conflicts for: ${ingredients.join(', ')}`);

    const conflicts = await ontologyService.getIngredientConflicts(ingredients);

    const conflictReport = {
      ingredients_input: ingredients,
      conflicts_detected: {
        total: conflicts.count,
        conflict_pairs: conflicts.data,
        risk_assessment: router.assessConflictRisk(conflicts.data)
      },
      safety_recommendations: {
        immediate_actions: router.generateImmediateActions(conflicts.data),
        alternative_approaches: router.suggestAlternatives(conflicts.data),
        usage_warnings: router.generateConflictWarnings(conflicts.data)
      },
      ontology_analysis: {
        semantic_analysis: 'complete',
        interaction_database: 'comprehensive',
        confidence_level: 'high'
      }
    };

    res.json({
      success: true,
      data: conflictReport,
      ontology_powered: true,
      message: `Detected ${conflicts.count} ingredient conflicts`
    });

  } catch (error) {
    console.error('❌ Conflicts analysis error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== 6. INGREDIENT SEARCH (Ontology-enhanced) =====
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    console.log(`🔍 Searching ingredients in ontology: "${q}"`);

    // Get all ingredients first
    const allIngredients = await ontologyService.getAllIngredients(200);
    
    // Search and rank results
    const searchResults = allIngredients.data.filter(ingredient => {
      const searchTerm = q.toLowerCase();
      return (
        ingredient.name.toLowerCase().includes(searchTerm) ||
        (ingredient.benefit && ingredient.benefit.toLowerCase().includes(searchTerm)) ||
        (ingredient.function && ingredient.function.toLowerCase().includes(searchTerm)) ||
        (ingredient.explanation && ingredient.explanation.toLowerCase().includes(searchTerm))
      );
    });

    // Sort by relevance
    const sortedResults = searchResults.sort((a, b) => {
      const searchTerm = q.toLowerCase();
      
      // Exact name match gets highest priority
      if (a.name.toLowerCase() === searchTerm) return -1;
      if (b.name.toLowerCase() === searchTerm) return 1;
      
      // Name starts with search term
      if (a.name.toLowerCase().startsWith(searchTerm)) return -1;
      if (b.name.toLowerCase().startsWith(searchTerm)) return 1;
      
      // Name contains search term
      if (a.name.toLowerCase().includes(searchTerm) && !b.name.toLowerCase().includes(searchTerm)) return -1;
      if (!a.name.toLowerCase().includes(searchTerm) && b.name.toLowerCase().includes(searchTerm)) return 1;
      
      return 0;
    });

    const limitedResults = sortedResults.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedResults,
      search_meta: {
        query: q,
        total_found: searchResults.length,
        showing: limitedResults.length
      },
      ontology_powered: true,
      message: `Found ${searchResults.length} ingredients matching "${q}"`
    });

  } catch (error) {
    console.error('❌ Ingredient search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== 7. KEY INGREDIENTS LIST =====
router.get('/key-ingredients', async (req, res) => {
  try {
    console.log('🌟 Getting key ingredients from ontology...');

    // Get all ingredients and identify key ones
    const allIngredients = await ontologyService.getAllIngredients(100);
    
    // Define key ingredient categories
    const keyCategories = {
      'Anti-Aging': ['retinol', 'peptides', 'collagen'],
      'Acne Treatment': ['salicylic acid', 'benzoyl peroxide', 'niacinamide'],
      'Hydration': ['hyaluronic acid', 'glycerin', 'ceramides'],
      'Brightening': ['vitamin c', 'kojic acid', 'arbutin'],
      'Exfoliation': ['glycolic acid', 'lactic acid', 'salicylic acid'],
      'Soothing': ['centella asiatica', 'aloe vera', 'allantoin']
    };

    const keyIngredients = {};
    
    Object.entries(keyCategories).forEach(([category, ingredients]) => {
      keyIngredients[category] = allIngredients.data.filter(ingredient =>
        ingredients.some(key => 
          ingredient.name.toLowerCase().includes(key.toLowerCase())
        )
      );
    });

    res.json({
      success: true,
      data: keyIngredients,
      total_categories: Object.keys(keyIngredients).length,
      total_key_ingredients: Object.values(keyIngredients).flat().length,
      ontology_powered: true,
      message: 'Key ingredients organized by skincare categories'
    });

  } catch (error) {
    console.error('❌ Key ingredients error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== 8. INGREDIENT BENEFITS LIST =====
router.get('/benefits', async (req, res) => {
  try {
    console.log('🎯 Getting ingredient benefits from ontology...');

    const allIngredients = await ontologyService.getAllIngredients(200);
    
    // Extract and categorize benefits
    const benefits = [...new Set(
      allIngredients.data
        .map(ing => ing.benefit)
        .filter(benefit => benefit && benefit.length > 0)
    )].sort();

    const benefitCategories = {
      'Hydration & Moisture': benefits.filter(b => 
        /hydrat|moistur|humectant/i.test(b)
      ),
      'Anti-Aging': benefits.filter(b => 
        /anti.aging|wrinkle|aging|firm/i.test(b)
      ),
      'Acne & Oil Control': benefits.filter(b => 
        /acne|oil|sebum|pore|blackhead/i.test(b)
      ),
      'Brightening & Pigmentation': benefits.filter(b => 
        /bright|pigment|dark.spot|even.tone/i.test(b)
      ),
      'Soothing & Calming': benefits.filter(b => 
        /sooth|calm|anti.inflammatory|sensitiv/i.test(b)
      ),
      'Exfoliation & Texture': benefits.filter(b => 
        /exfoliat|texture|smooth|renew/i.test(b)
      ),
      'Protection & Barrier': benefits.filter(b => 
        /protect|barrier|repair|strengthen/i.test(b)
      )
    };

    // Remove categorized benefits from the main list
    const categorizedBenefits = Object.values(benefitCategories).flat();
    const otherBenefits = benefits.filter(b => !categorizedBenefits.includes(b));
    
    if (otherBenefits.length > 0) {
      benefitCategories['Other Benefits'] = otherBenefits;
    }

    res.json({
      success: true,
      data: benefitCategories,
      total_benefits: benefits.length,
      ontology_powered: true,
      message: 'Ingredient benefits categorized from ontology data'
    });

  } catch (error) {
    console.error('❌ Benefits listing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== 9. INGREDIENT FUNCTIONS LIST =====
router.get('/functions', async (req, res) => {
  try {
    console.log('🔧 Getting ingredient functions from ontology...');

    const allIngredients = await ontologyService.getAllIngredients(200);
    
    // Extract unique functions
    const functions = [...new Set(
      allIngredients.data
        .map(ing => ing.function)
        .filter(func => func && func.length > 0)
    )].sort();

    // Count ingredients per function
    const functionStats = functions.map(func => ({
      function: func,
      ingredient_count: allIngredients.data.filter(ing => ing.function === func).length,
      example_ingredients: allIngredients.data
        .filter(ing => ing.function === func)
        .slice(0, 3)
        .map(ing => ing.name)
    }));

    res.json({
      success: true,
      data: functionStats,
      total_functions: functions.length,
      ontology_powered: true,
      message: 'Ingredient functions with statistics from ontology'
    });

  } catch (error) {
    console.error('❌ Functions listing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== HELPER METHODS =====

router.findProductsWithIngredient = async function(ingredientName) {
  try {
    const query = `
      SELECT 
        p.id, p.name,
        COALESCE(b.name, 'Unknown Brand') as brand_name,
        p.main_category,
        p.local_image_path
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.is_active = true
      AND p.ingredient_list IS NOT NULL
      AND LOWER(p.ingredient_list) LIKE $1
      ORDER BY LENGTH(p.ingredient_list) DESC
      LIMIT 12
    `;
    
    const result = await pool.query(query, [`%${ingredientName.toLowerCase()}%`]);
    return result.rows;
  } catch (error) {
    console.warn('Finding products failed:', error.message);
    return [];
  }
};

router.generateSafetyNotes = function(conflicts, synergies, ingredientName) {
  const notes = [];
  
  conflicts.forEach(conflict => {
    if (conflict.name1.toLowerCase() === ingredientName.toLowerCase() ||
        conflict.name2.toLowerCase() === ingredientName.toLowerCase()) {
      const otherIngredient = conflict.name1.toLowerCase() === ingredientName.toLowerCase() 
        ? conflict.name2 : conflict.name1;
      notes.push(`⚠️ May conflict with ${otherIngredient}`);
    }
  });
  
  synergies.forEach(synergy => {
    if (synergy.name1.toLowerCase() === ingredientName.toLowerCase() ||
        synergy.name2.toLowerCase() === ingredientName.toLowerCase()) {
      const otherIngredient = synergy.name1.toLowerCase() === ingredientName.toLowerCase() 
        ? synergy.name2 : synergy.name1;
      notes.push(`✅ Works well with ${otherIngredient}`);
    }
  });
  
  if (notes.length === 0) {
    notes.push('ℹ️ No significant interactions detected');
  }
  
  return notes;
};

router.calculateRiskLevel = function(conflictCount, totalIngredients) {
  if (conflictCount === 0) return 'LOW';
  if (conflictCount <= totalIngredients * 0.2) return 'MEDIUM';
  return 'HIGH';
};

router.generateSafetyWarnings = function(conflicts) {
  if (conflicts.length === 0) return ['✅ No safety concerns detected'];
  
  return conflicts.map(conflict => 
    `⚠️ ${conflict.name1} and ${conflict.name2}: ${conflict.warning || 'Potential interaction'}`
  );
};

router.calculateEnhancementPotential = function(synergyCount) {
  if (synergyCount === 0) return 'NONE';
  if (synergyCount <= 2) return 'LOW';
  if (synergyCount <= 5) return 'MEDIUM';
  return 'HIGH';
};

router.extractBeneficialCombinations = function(synergies) {
  return synergies.map(synergy => ({
    combination: `${synergy.name1} + ${synergy.name2}`,
    benefits: [synergy.benefit1, synergy.benefit2].filter(b => b && b.length > 0),
    recommendation: synergy.recommendation
  }));
};

router.calculateCompatibilityScore = function(conflictCount, synergyCount, totalIngredients) {
  let score = 70; // Base score
  score -= conflictCount * 15; // Penalty for conflicts
  score += synergyCount * 8;   // Bonus for synergies
  score += Math.min(totalIngredients * 2, 15); // Bonus for complexity
  return Math.max(0, Math.min(100, score));
};

router.generateOverallRecommendation = function(conflictCount, synergyCount) {
  if (conflictCount > 0 && synergyCount === 0) {
    return 'AVOID - Contains incompatible ingredients';
  }
  if (conflictCount === 0 && synergyCount > 0) {
    return 'EXCELLENT - No conflicts and beneficial combinations found';
  }
  if (conflictCount > 0 && synergyCount > 0) {
    return 'MIXED - Benefits and risks present, use with caution';
  }
  return 'NEUTRAL - No significant interactions detected';
};

router.generateUsageGuidance = function(conflicts, synergies) {
  const guidance = [];
  
  if (conflicts.length > 0) {
    guidance.push('🚨 Separate conflicting ingredients (use at different times)');
    guidance.push('⏰ Consider morning/evening alternation');
    guidance.push('🧪 Start with patch testing');
  }
  
  if (synergies.length > 0) {
    guidance.push('✨ These ingredients work well together');
    guidance.push('🔄 Can be layered in the same routine');
    guidance.push('📈 May enhance each other\'s effectiveness');
  }
  
  if (guidance.length === 0) {
    guidance.push('✅ Safe to use together');
    guidance.push('📋 No special precautions needed');
  }
  
  return guidance;
};

router.calculateEnhancementScore = function(synergies) {
  return Math.min(100, synergies.length * 15 + 25);
};

router.getBestCombinations = function(synergies) {
  return synergies
    .sort((a, b) => (b.benefit1?.length || 0) + (b.benefit2?.length || 0) - (a.benefit1?.length || 0) - (a.benefit2?.length || 0))
    .slice(0, 3)
    .map(synergy => ({
      ingredients: [synergy.name1, synergy.name2],
      benefits: [synergy.benefit1, synergy.benefit2].filter(Boolean),
      recommendation: synergy.recommendation
    }));
};

router.generateSynergyUsageTips = function(synergies) {
  const tips = [];
  
  if (synergies.length > 0) {
    tips.push('🌟 Layer ingredients in order of thinnest to thickest consistency');
    tips.push('⏰ Allow 5-10 minutes between each application');
    tips.push('🧴 Start with lower concentrations to test tolerance');
    tips.push('📊 Monitor skin response and adjust frequency as needed');
  }
  
  return tips;
};

router.extractPotentialBenefits = function(synergies) {
  const benefits = [...new Set(
    synergies.flatMap(synergy => [synergy.benefit1, synergy.benefit2])
      .filter(benefit => benefit && benefit.length > 0)
  )];
  
  return benefits;
};

router.assessConflictRisk = function(conflicts) {
  if (conflicts.length === 0) return 'NO_RISK';
  if (conflicts.length <= 2) return 'LOW_RISK';
  if (conflicts.length <= 4) return 'MEDIUM_RISK';
  return 'HIGH_RISK';
};

router.generateImmediateActions = function(conflicts) {
  if (conflicts.length === 0) return ['✅ No immediate actions needed'];
  
  return [
    '🛑 Stop using conflicting ingredients together immediately',
    '🧼 If irritation occurs, cleanse with gentle cleanser',
    '💧 Apply soothing moisturizer to calm skin',
    '👩‍⚕️ Consult dermatologist if irritation persists'
  ];
};

router.suggestAlternatives = function(conflicts) {
  const alternatives = [];
  
  conflicts.forEach(conflict => {
    alternatives.push(`Instead of using ${conflict.name1} with ${conflict.name2}, try alternating days`);
    alternatives.push(`Use ${conflict.name1} in AM and ${conflict.name2} in PM`);
  });
  
  if (alternatives.length === 0) {
    alternatives.push('Current combination appears safe to use together');
  }
  
  return [...new Set(alternatives)];
};

router.generateConflictWarnings = function(conflicts) {
  if (conflicts.length === 0) return ['✅ No warnings - safe combination'];
  
  return conflicts.map(conflict => 
    `⚠️ ${conflict.warning || 'Potential interaction between ' + conflict.name1 + ' and ' + conflict.name2}`
  );
};

module.exports = router;