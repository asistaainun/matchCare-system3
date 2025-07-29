// backend/routes/analysis.js - FIXED HYBRID VERSION
const express = require('express');
const router = express.Router();
const ontologyService = require('../services/ontologyService');

// 1. GET ALL synergistic combinations (untuk test script)
router.get('/synergistic-combos', async (req, res) => {
  try {
    console.log('📊 Fetching all synergistic combinations...');
    
    const result = await ontologyService.getAllSynergisticCombos();
    
    res.json({
      success: true,
      data: {
        total_combinations: result.count,
        combinations: result.data,
        performance: result.performance,
        query_time_ms: result.queryTime
      },
      ontology_powered: true,
      expected_count: 25, // Your actual count
      status: result.count > 0 ? 'WORKING' : 'NO_DATA'
    });

  } catch (error) {
    console.error('Synergistic combos error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch synergistic combinations',
      details: error.message
    });
  }
});

// 2. Ingredient conflict analysis (untuk test script - endpoint name fixed)
router.post('/ingredient-conflicts', async (req, res) => {
  try {
    const { ingredients } = req.body;
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least 2 ingredient names in an array'
      });
    }

    console.log(`🔍 Analyzing conflicts for: ${ingredients.join(', ')}`);
    
    // Get conflicts and synergies in parallel
    const [conflicts, synergies] = await Promise.all([
      ontologyService.getIngredientConflicts(ingredients),
      ontologyService.getSynergisticCombos(ingredients)
    ]);

    const analysis = {
      ingredients_analyzed: ingredients,
      analysis_timestamp: new Date().toISOString(),
      conflict_analysis: {
        total_conflicts: conflicts.count || 0,
        conflicts_found: conflicts.data || [],
        safety_status: (conflicts.count || 0) === 0 ? 'SAFE' : 'CAUTION_NEEDED'
      },
      synergy_analysis: {
        total_synergies: synergies.count || 0,
        synergies_found: synergies.data || [],
        enhancement_potential: (synergies.count || 0) > 0 ? 'HIGH' : 'NONE'
      },
      overall_recommendation: generateOverallRecommendation(conflicts.data || [], synergies.data || []),
      safety_score: calculateSafetyScore(conflicts.count || 0, synergies.count || 0),
      usage_advice: generateUsageAdvice(conflicts.data || [], synergies.data || [])
    };

    res.json({
      success: true,
      analysis,
      ontology_powered: true
    });

  } catch (error) {
    console.error('Ingredient analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Ingredient analysis failed',
      details: error.message
    });
  }
});

// 3. Ingredient analysis (alternative endpoint name - keep both for compatibility)
router.post('/ingredient-analysis', async (req, res) => {
  try {
    const { ingredients } = req.body;
    
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of ingredient names'
      });
    }

    // Get conflicts and synergies in parallel
    const [conflicts, synergies] = await Promise.all([
      ontologyService.getIngredientConflicts(ingredients),
      ontologyService.getSynergisticCombos(ingredients)
    ]);

    const analysis = {
      ingredients_analyzed: ingredients,
      total_conflicts: conflicts.count || 0,
      total_synergies: synergies.count || 0,
      conflicts: conflicts.data || [],
      synergies: synergies.data || [],
      overall_safety: (conflicts.count || 0) === 0 ? 'SAFE' : 'CAUTION_NEEDED',
      recommendations: generateRecommendations(conflicts.data || [], synergies.data || [])
    };

    res.json({
      success: true,
      analysis,
      ontology_powered: true,
      query_time: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ingredient analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      fallback: 'Using basic rule-based analysis'
    });
  }
});

// 4. Skin recommendations
router.post('/skin-recommendations', async (req, res) => {
  try {
    const { skinType, concerns, avoidedIngredients = [] } = req.body;

    if (!skinType) {
      return res.status(400).json({
        success: false,
        error: 'Skin type is required'
      });
    }

    // Get personalized recommendations from ontology
    const recommendations = await ontologyService.getSkinTypeRecommendations(
      skinType, 
      concerns
    );

    // Filter out avoided ingredients
    const filteredRecs = (recommendations.data || []).filter(rec => 
      !avoidedIngredients.includes(rec.name)
    );

    const result = {
      profile: { skinType, concerns, avoidedIngredients },
      total_recommendations: filteredRecs.length,
      ingredients: filteredRecs,
      reasoning: `Based on ${skinType} skin type and ${(concerns || []).length} specific concerns`,
      ontology_based: true,
      personalization_level: calculatePersonalizationLevel(skinType, concerns, avoidedIngredients)
    };

    res.json({
      success: true,
      data: result,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Skin recommendation error:', error);
    res.status(500).json({
      success: false,
      error: 'Recommendation generation failed'
    });
  }
});

// 5. Ontology health check
router.get('/ontology-status', async (req, res) => {
  try {
    console.log('🔍 Checking ontology health...');
    
    const health = await ontologyService.healthCheck();
    
    const systemStatus = {
      connection: health,
      system_readiness: {
        fuseki_connected: health.status === 'connected',
        data_loaded: health.tripleCount > 10,
        ready_for_queries: health.status === 'connected' && health.tripleCount > 10
      }
    };

    const overallStatus = systemStatus.system_readiness.ready_for_queries ? 'FULLY_OPERATIONAL' : 'PARTIALLY_OPERATIONAL';

    res.json({
      success: true,
      status: overallStatus,
      system: systemStatus,
      ontology_status: health,
      integration_ready: health.status === 'connected',
      development_phase: overallStatus === 'FULLY_OPERATIONAL' 
        ? 'Ready for frontend integration' 
        : 'Backend setup needed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      status: 'ERROR',
      error: 'Health check failed',
      ontology_status: 'unknown',
      details: error.message
    });
  }
});

// Helper functions
function generateRecommendations(conflicts, synergies) {
  const recommendations = [];
  
  if (conflicts.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `Found ${conflicts.length} ingredient conflicts that should be avoided`
    });
  }
  
  if (synergies.length > 0) {
    recommendations.push({
      type: 'positive',
      message: `Found ${synergies.length} beneficial ingredient combinations`
    });
  }
  
  if (conflicts.length === 0) {
    recommendations.push({
      type: 'safe',
      message: 'No conflicts detected - ingredients are compatible'
    });
  }
  
  return recommendations;
}

function generateOverallRecommendation(conflicts, synergies) {
  if (conflicts.length > 0 && synergies.length === 0) {
    return 'AVOID - Contains incompatible ingredients that may cause irritation';
  }
  
  if (conflicts.length === 0 && synergies.length > 0) {
    return 'EXCELLENT - No conflicts and contains beneficial combinations';
  }
  
  if (conflicts.length > 0 && synergies.length > 0) {
    return 'MIXED - Has both benefits and risks, use with caution';
  }
  
  return 'NEUTRAL - No significant interactions detected';
}

function calculateSafetyScore(conflictCount, synergyCount) {
  const baseScore = 70;
  const conflictPenalty = conflictCount * 15;
  const synergyBonus = synergyCount * 5;
  
  return Math.max(0, Math.min(100, baseScore - conflictPenalty + synergyBonus));
}

function generateUsageAdvice(conflicts, synergies) {
  const advice = [];
  
  if (conflicts.length > 0) {
    advice.push('🚨 Avoid using conflicting ingredients together');
    advice.push('⏰ Consider alternating usage (morning/evening)');
    advice.push('🧪 Start with patch testing');
  }
  
  if (synergies.length > 0) {
    advice.push('✨ These ingredients work well together');
    advice.push('🔄 Can be used in the same routine');
    advice.push('📈 May enhance each other\'s benefits');
  }
  
  if (conflicts.length === 0 && synergies.length === 0) {
    advice.push('✅ Safe to use together');
    advice.push('📋 No special precautions needed');
  }
  
  return advice;
}

function calculatePersonalizationLevel(skinType, concerns, avoided) {
  let level = 1; // Basic
  if ((concerns || []).length > 0) level = 2; // Targeted
  if ((avoided || []).length > 0) level = 3; // Personalized
  if ((concerns || []).length > 2 && (avoided || []).length > 2) level = 4; // Highly Personalized
  return level;
}

module.exports = router;