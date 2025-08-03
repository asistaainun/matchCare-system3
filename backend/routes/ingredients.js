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

// Ganti bagian router.get('/', async (req, res) => { ... }) dengan:
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search, skinType, category } = req.query;

    console.log('🧪 Getting ingredients from database first...');

    const client = await pool.connect();
    
    try {
      // Build the query with proper filtering
      let baseQuery = `
        SELECT 
          i.id,
          i.name,
          i.description,
          i.what_it_does,
          i.explanation,
          i.benefit,
          i.safety,
          i.actual_functions,
          i.functional_categories,
          i.is_key_ingredient,
          i.pregnancy_safe,
          i.alcohol_free,
          i.fragrance_free,
          i.silicone_free,
          i.sulfate_free,
          i.paraben_free,
          i.suitable_for_skin_types,
          i.addresses_concerns,
          i.provided_benefits,
          i.sensitivities,
          i.alternative_names,
          'database' as source
        FROM ingredients i
        WHERE i.is_active = true
      `;

      const queryParams = [];
      let paramCount = 0;

      // Add search filter
      if (search && search.trim()) {
        paramCount++;
        baseQuery += ` AND (
          LOWER(i.name) LIKE LOWER($${paramCount}) 
          OR LOWER(i.description) LIKE LOWER($${paramCount})
          OR LOWER(i.what_it_does) LIKE LOWER($${paramCount})
          OR LOWER(i.explanation) LIKE LOWER($${paramCount})
        )`;
        queryParams.push(`%${search.trim()}%`);
      }

      // Add category filter
      if (category && category !== 'all') {
        paramCount++;
        baseQuery += ` AND LOWER(i.functional_categories) LIKE LOWER($${paramCount})`;
        queryParams.push(`%${category}%`);
      }

      // Add ordering and pagination
      baseQuery += ` ORDER BY i.is_key_ingredient DESC, i.name ASC`;
      
      paramCount++;
      baseQuery += ` LIMIT $${paramCount}`;
      queryParams.push(parseInt(limit));
      
      paramCount++;
      baseQuery += ` OFFSET $${paramCount}`;
      queryParams.push(parseInt(offset));

      console.log('🔍 Executing database query...');
      const result = await client.query(baseQuery, queryParams);
      console.log(`📊 Found ${result.rowCount} active ingredients in database`);
      
      // Get total count
      let countQuery = `SELECT COUNT(*) FROM ingredients i WHERE i.is_active = true`;
      const countParams = [];
      let countParamCount = 0;

      if (search && search.trim()) {
      countParamCount++;
      countQuery += ` AND (
        LOWER(i.name) LIKE LOWER($${countParamCount}) 
        OR LOWER(i.description) LIKE LOWER($${countParamCount})
        OR LOWER(i.what_it_does) LIKE LOWER($${countParamCount})
        OR LOWER(i.explanation) LIKE LOWER($${countParamCount})
      )`;
      countParams.push(`%${search.trim()}%`);
      }

      if (category && category !== 'all') {
        countParamCount++;
        countQuery += ` AND LOWER(i.functional_categories) LIKE LOWER($${countParamCount})`;
        countParams.push(`%${category}%`);
      }

      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);
    
      // Format results
      const ingredients = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || row.what_it_does,
        benefit: row.benefit || row.provided_benefits,
        function: row.actual_functions,
        is_key_ingredient: row.is_key_ingredient,
        safety_info: {
          pregnancy_safe: row.pregnancy_safe,
          alcohol_free: row.alcohol_free,
          fragrance_free: row.fragrance_free,
          silicone_free: row.silicone_free,
          sulfate_free: row.sulfate_free,
          paraben_free: row.paraben_free
        },
        source: 'database'
      }));

      
      // If no results from database, try ontology
      if (ingredients.length === 0) {
        console.log('📡 No database results, trying ontology...');
        try {
          const ontologyIngredients = await ontologyService.getAllIngredients(parseInt(limit));
          const ontologyData = ontologyIngredients.data || [];
          
          res.json({
            success: true,
            data: ontologyData,
            pagination: {
              total: ontologyData.length,
              limit: parseInt(limit),
              offset: parseInt(offset),
              has_more: false
            },
            source: 'ontology',
            message: `Retrieved ${ontologyData.length} ingredients from ontology`
          });
          return;
        } catch (ontologyError) {
          console.warn('Ontology fallback failed:', ontologyError.message);
        }
      }

      res.json({
        success: true,
        data: ingredients,
        pagination: {
          total: ingredients.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + result.rows.length) < totalCount
        },
        filters: { search, skinType, category },
        source: 'database',
        message: `Retrieved ${ingredients.length} ingredients from database`
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Ingredients listing error:', error);
    
    // Fallback to ontology
    try {
      console.log('🔄 Database failed, using ontology fallback...');
      const ontologyIngredients = await ontologyService.getAllIngredients(parseInt(req.query.limit || 50));
      
      res.json({
        success: true,
        data: ontologyIngredients.data || [],
        source: 'ontology_fallback',
        message: 'Using ontology data due to database error'
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        success: false, 
        error: 'Both database and ontology failed',
        details: error.message
      });
    }
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

router.calculateRiskLevel = function(conflictCount, ingredientCount) {
  if (ingredientCount < 2) return 'NONE';
  
  const maxPossibleConflicts = ingredientCount * (ingredientCount - 1) / 2;
  const conflictRatio = conflictCount / maxPossibleConflicts;
  
  if (conflictRatio > 0.5) return 'HIGH';
  if (conflictRatio > 0.2) return 'MEDIUM';
  if (conflictCount > 0) return 'LOW';
  return 'NONE';
};

router.generateSafetyWarnings = function(conflicts) {
  return conflicts.map(conflict => ({
    warning: `Avoid using ${conflict.name1} and ${conflict.name2} together`,
    reason: conflict.reason || 'May cause irritation or reduce effectiveness',
    severity: 'medium'
  }));
};

router.calculateEnhancementPotential = function(synergyCount) {
  if (synergyCount > 8) return 'VERY_HIGH';
  if (synergyCount > 5) return 'HIGH';
  if (synergyCount > 2) return 'MEDIUM';
  if (synergyCount > 0) return 'LOW';
  return 'NONE';
};

router.extractBeneficialCombinations = function(synergies) {
  return synergies.map(synergy => ({
    combination: `${synergy.name1} + ${synergy.name2}`,
    benefit: synergy.recommendation || synergy.benefit || 'Enhanced effectiveness',
    confidence: 'high'
  }));
};

router.calculateCompatibilityScore = function(conflictCount, synergyCount, ingredientCount) {
  if (ingredientCount < 2) return 100;
  
  const maxPossibleInteractions = ingredientCount * (ingredientCount - 1) / 2;
  const conflictPenalty = (conflictCount / maxPossibleInteractions) * 40;
  const synergyBonus = Math.min((synergyCount / maxPossibleInteractions) * 20, 20);
  
  const baseScore = 80;
  const finalScore = Math.max(0, Math.min(100, baseScore - conflictPenalty + synergyBonus));
  
  return Math.round(finalScore);
};

router.generateOverallRecommendation = function(conflictCount, synergyCount) {
  if (conflictCount > 3) {
    return 'HIGH_CAUTION: Multiple conflicts detected. Consider reducing ingredients or consulting expert.';
  } else if (conflictCount > 0) {
    return 'MODERATE_CAUTION: Some conflicts detected. Use with care and monitor skin response.';
  } else if (synergyCount > 5) {
    return 'EXCELLENT: Great synergistic potential! This combination should work very well.';
  } else if (synergyCount > 0) {
    return 'GOOD: Some beneficial interactions detected. Safe to use together.';
  } else {
    return 'NEUTRAL: No significant interactions detected. Generally safe to use together.';
  }
};

router.generateUsageGuidance = function(conflicts, synergies) {
  const guidance = [];
  
  if (conflicts.length > 0) {
    guidance.push('⚠️ Separate conflicting ingredients by time (AM/PM) or days');
    guidance.push('🧪 Start with lower concentrations when combining');
    guidance.push('👀 Monitor skin for irritation or sensitivity');
  }
  
  if (synergies.length > 0) {
    guidance.push('✨ These ingredients work better together');
    guidance.push('🎯 Apply in order: thinnest to thickest consistency');
    guidance.push('⏰ Allow 5-10 minutes between applications');
  }
  
  if (guidance.length === 0) {
    guidance.push('ℹ️ Standard skincare application rules apply');
    guidance.push('🧴 Patch test new combinations before full use');
  }
  
  return guidance;
};

router.calculateEnhancementScore = function(synergies) {
  if (!synergies || synergies.length === 0) return 0;
  
  // Score based on number and quality of synergies
  const baseScore = synergies.length * 10;
  const qualityBonus = synergies.filter(s => 
    s.recommendation && s.recommendation.length > 20
  ).length * 5;
  
  return Math.min(100, baseScore + qualityBonus);
};

router.getBestCombinations = function(synergies) {
  return synergies
    .sort((a, b) => (b.recommendation?.length || 0) - (a.recommendation?.length || 0))
    .slice(0, 5)
    .map(synergy => ({
      ingredients: [synergy.name1, synergy.name2],
      benefit: synergy.recommendation || 'Enhanced effectiveness',
      rating: 'high'
    }));
};

router.generateSynergyUsageTips = function(synergies) {
  const tips = [
    '🌟 Apply ingredients in order of thinnest to thickest consistency',
    '⏰ Allow each layer to absorb before applying the next',
    '🧪 Start with lower concentrations to test tolerance'
  ];
  
  if (synergies.some(s => s.name1.toLowerCase().includes('acid') || s.name2.toLowerCase().includes('acid'))) {
    tips.push('🌙 Consider using acids in evening routine');
    tips.push('☀️ Always use sunscreen when using acid combinations');
  }
  
  return tips;
};

router.extractPotentialBenefits = function(synergies) {
  const benefits = synergies.map(synergy => 
    synergy.recommendation || synergy.benefit || 'Enhanced effectiveness'
  );
  
  return [...new Set(benefits)].slice(0, 8);
};

router.assessConflictRisk = function(conflicts) {
  if (conflicts.length === 0) return 'NO_RISK';
  if (conflicts.length > 3) return 'HIGH_RISK';
  if (conflicts.length > 1) return 'MODERATE_RISK';
  return 'LOW_RISK';
};

router.generateImmediateActions = function(conflicts) {
  if (conflicts.length === 0) return ['✅ No immediate actions needed'];
  
  return [
    '🛑 Stop using conflicting ingredients together immediately',
    '🧴 Separate usage by time (AM/PM) or alternate days',
    '💧 Use gentle, hydrating products to calm skin',
    '👨‍⚕️ Consult dermatologist if irritation persists'
  ];
};

router.suggestAlternatives = function(conflicts) {
  const alternatives = [];
  
  conflicts.forEach(conflict => {
    if (conflict.name1.toLowerCase().includes('retinol') && conflict.name2.toLowerCase().includes('acid')) {
      alternatives.push('Use retinol at night and acids in the morning');
    } else if (conflict.name1.toLowerCase().includes('vitamin c') && conflict.name2.toLowerCase().includes('retinol')) {
      alternatives.push('Use Vitamin C in AM and retinol in PM');
    } else {
      alternatives.push(`Alternate ${conflict.name1} and ${conflict.name2} on different days`);
    }
  });
  
  return alternatives.length > 0 ? alternatives : ['Consider using ingredients separately or consulting an expert'];
};

router.generateConflictWarnings = function(conflicts) {
  return conflicts.map(conflict => ({
    ingredients: [conflict.name1, conflict.name2],
    warning: `${conflict.name1} may conflict with ${conflict.name2}`,
    potential_effects: ['Skin irritation', 'Reduced effectiveness', 'Increased sensitivity'],
    recommendation: 'Use separately or under professional guidance'
  }));
};


// Tambah di akhir file sebelum module.exports:
router.testDatabaseConnection = async function() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) FROM ingredients WHERE is_active = true');
    client.release();
    console.log(`✅ Database connected: ${result.rows[0].count} active ingredients found`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Test connection on startup
router.testDatabaseConnection();

module.exports = router;