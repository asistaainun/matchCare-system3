// src/services/RecommendationService.js - UPDATED FOR TRUE ONTOLOGY INTEGRATION
import { getOntologyRecommendations, analyzeIngredientConflicts, getIngredientSynergies } from './api';

class RecommendationService {
  constructor() {
    this.cachedRecommendations = null;
    this.lastProfile = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  // ================== 🧠 MAIN ONTOLOGY RECOMMENDATIONS ==================

  /**
   * Get personalized skincare recommendations using TRUE ontology-based algorithm
   * @param {Object} profile - User skin profile
   * @param {string} profile.skin_type - 'normal', 'dry', 'oily', 'combination'
   * @param {Array} profile.concerns - ['acne', 'wrinkles', 'dryness', etc.]
   * @param {Array} profile.sensitivities - ['fragrance', 'alcohol', 'silicone']
   * @returns {Promise<Object>} Ontology-based recommendations
   */
  async getPersonalizedRecommendations(profile, options = {}) {
    try {
      const { 
        useCache = true, 
        forceRefresh = false,
        includeExplanation = true 
      } = options;

      // Validate profile
      if (!this.validateProfile(profile)) {
        throw new Error('Invalid skin profile provided');
      }

      // Check cache (if enabled and not forced refresh)
      if (useCache && !forceRefresh && this.isCacheValid(profile)) {
        console.log('📦 Using cached ontology recommendations');
        return this.cachedRecommendations;
      }

      console.log('🧠 Getting fresh ontology recommendations for profile:', profile);

      // Call TRUE ontology-based API
      const startTime = Date.now();
      const result = await getOntologyRecommendations(profile);
      const responseTime = Date.now() - startTime;

      // Process and enhance recommendations
      const processedRecommendations = this.processOntologyRecommendations(result, profile);

      // Cache results
      if (useCache) {
        this.cacheRecommendations(processedRecommendations, profile);
      }

      console.log(`✅ Ontology recommendations completed in ${responseTime}ms`);
      console.log(`🎯 Found ${processedRecommendations.recommendations.length} recommendations`);

      return {
        success: true,
        ...processedRecommendations,
        performance: {
          frontend_processing_time: responseTime,
          backend_processing_time: result.metadata?.processing_time_ms,
          total_recommendations: processedRecommendations.recommendations.length
        }
      };

    } catch (error) {
      console.error('❌ Personalized recommendations failed:', error);
      
      // Return fallback recommendations if available
      if (this.cachedRecommendations) {
        console.log('🔄 Falling back to cached recommendations');
        return {
          success: false,
          fallback: true,
          error: error.message,
          ...this.cachedRecommendations
        };
      }

      throw new Error(`Failed to get personalized recommendations: ${error.message}`);
    }
  }

  /**
   * Process raw ontology recommendations and add frontend enhancements
   */
  processOntologyRecommendations(rawResult, profile) {
    const { recommendations, metadata, academic_analysis } = rawResult;

    // Enhance each recommendation with UI-friendly data
    const enhancedRecommendations = recommendations.map((product, index) => ({
      ...product,
      ui_enhancements: {
        ranking: index + 1,
        confidence_badge: this.getConfidenceBadge(product.final_ontology_score),
        suitable_for: this.getSuitabilityText(product, profile),
        why_recommended: this.getRecommendationReason(product, profile),
        semantic_highlights: this.getSemanticHighlights(product),
        safety_status: product.semantic_safety_analysis?.overall_safety_status || 'unknown'
      }
    }));

    // Group recommendations by category for better UX
    const groupedByCategory = this.groupByCategory(enhancedRecommendations);

    // Extract key insights for dashboard
    const insights = this.extractInsights(enhancedRecommendations, metadata, profile);

    return {
      recommendations: enhancedRecommendations,
      grouped_recommendations: groupedByCategory,
      insights,
      metadata: {
        ...metadata,
        profile_used: profile,
        generated_at: new Date().toISOString(),
        frontend_version: '2.0.0'
      },
      academic_analysis
    };
  }

  // ================== 🔍 ANALYSIS HELPERS ==================

  /**
   * Analyze ingredient compatibility for selected products
   */
  async analyzeProductCompatibility(selectedProducts) {
    try {
      if (!selectedProducts || selectedProducts.length < 2) {
        return { compatible: true, message: 'Need at least 2 products to analyze compatibility' };
      }

      // Extract all ingredients from selected products
      const allIngredients = this.extractIngredientsFromProducts(selectedProducts);
      
      // Analyze conflicts using ontology
      const conflictAnalysis = await analyzeIngredientConflicts(allIngredients);

      // Get synergies
      const synergyAnalysis = await getIngredientSynergies();

      return {
        compatible: conflictAnalysis.analysis?.conflict_analysis?.total_conflicts === 0,
        conflict_details: conflictAnalysis.analysis?.conflict_analysis,
        synergy_opportunities: this.findSynergiesInProducts(selectedProducts, synergyAnalysis),
        recommendations: this.generateCompatibilityRecommendations(conflictAnalysis),
        selected_products: selectedProducts.map(p => ({
          id: p.id,
          name: p.name,
          brand_name: p.brand_name,
          main_category: p.main_category
        }))
      };

    } catch (error) {
      console.error('❌ Product compatibility analysis failed:', error);
      return {
        compatible: null,
        error: error.message,
        selected_products: selectedProducts
      };
    }
  }

  /**
   * Get recommendations by category with ontology insights
   */
  async getRecommendationsByCategory(category, userProfile = null) {
    try {
      // If user profile available, use ontology recommendations and filter by category
      if (userProfile) {
        const ontologyResults = await this.getPersonalizedRecommendations(userProfile);
        const categoryRecommendations = ontologyResults.recommendations.filter(
          product => product.main_category?.toLowerCase() === category.toLowerCase()
        );

        return {
          success: true,
          category,
          recommendations: categoryRecommendations,
          ontology_powered: true,
          insights: ontologyResults.insights
        };
      }

      // Fallback to generic category recommendations
      // This would typically call a different API endpoint
      console.log(`📂 Getting generic recommendations for category: ${category}`);
      
      return {
        success: true,
        category,
        recommendations: [],
        ontology_powered: false,
        message: 'Complete skin quiz for personalized ontology-based recommendations'
      };

    } catch (error) {
      console.error(`❌ Category recommendations failed for ${category}:`, error);
      throw error;
    }
  }

  // ================== 🛠️ UTILITY METHODS ==================

  validateProfile(profile) {
    if (!profile || typeof profile !== 'object') return false;
    
    const validSkinTypes = ['normal', 'dry', 'oily', 'combination'];
    if (!profile.skin_type || !validSkinTypes.includes(profile.skin_type)) {
      return false;
    }

    // Concerns and sensitivities are optional but should be arrays if provided
    if (profile.concerns && !Array.isArray(profile.concerns)) return false;
    if (profile.sensitivities && !Array.isArray(profile.sensitivities)) return false;

    return true;
  }

  isCacheValid(profile) {
    if (!this.cachedRecommendations || !this.lastProfile) return false;
    
    // Check if profile changed
    const profileChanged = JSON.stringify(profile) !== JSON.stringify(this.lastProfile);
    if (profileChanged) return false;

    // Check cache timeout
    const cacheAge = Date.now() - this.cachedRecommendations.cached_at;
    return cacheAge < this.cacheTimeout;
  }

  cacheRecommendations(recommendations, profile) {
    this.cachedRecommendations = {
      ...recommendations,
      cached_at: Date.now()
    };
    this.lastProfile = { ...profile };
    console.log('📦 Recommendations cached for 5 minutes');
  }

  getConfidenceBadge(score) {
    if (score >= 80) return { level: 'high', color: 'green', text: 'Highly Recommended' };
    if (score >= 60) return { level: 'medium', color: 'yellow', text: 'Good Match' };
    if (score >= 40) return { level: 'low', color: 'orange', text: 'Potential Match' };
    return { level: 'very_low', color: 'red', text: 'Poor Match' };
  }

  getSuitabilityText(product, profile) {
    const suitableReasons = [];
    
    if (product.matched_semantic_ingredients?.length > 0) {
      suitableReasons.push(`Contains ${product.matched_semantic_ingredients.length} ontology-matched ingredients`);
    }
    
    if (product.semantic_safety_analysis?.overall_safety_status === 'safe') {
      suitableReasons.push('Safe ingredient combination');
    }

    if (suitableReasons.length === 0) {
      return `Suitable for ${profile.skin_type} skin`;
    }

    return suitableReasons.join(' • ');
  }

  getRecommendationReason(product, profile) {
    const reasons = [];
    
    // Add ontology-specific reasons
    if (product.ontology_explanation) {
      reasons.push(product.ontology_explanation);
    }

    // Add semantic ingredient reasons
    if (product.matched_semantic_ingredients?.length > 0) {
      const ingredientNames = product.matched_semantic_ingredients.map(i => i.name).join(', ');
      reasons.push(`Key ingredients: ${ingredientNames}`);
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Recommended by ontology algorithm';
  }

  getSemanticHighlights(product) {
    const highlights = [];
    
    if (product.matched_semantic_ingredients) {
      product.matched_semantic_ingredients.forEach(ingredient => {
        highlights.push({
          type: 'ingredient',
          name: ingredient.name,
          benefit: ingredient.benefit,
          function: ingredient.function
        });
      });
    }

    return highlights;
  }

  groupByCategory(recommendations) {
    return recommendations.reduce((groups, product) => {
      const category = product.main_category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(product);
      return groups;
    }, {});
  }

  extractInsights(recommendations, metadata, profile) {
    const insights = {
      total_recommendations: recommendations.length,
      algorithm_performance: {
        processing_time: metadata?.processing_time_ms,
        confidence: metadata?.ontology_confidence
      },
      profile_analysis: {
        skin_type: profile.skin_type,
        concerns_count: profile.concerns?.length || 0,
        sensitivities_count: profile.sensitivities?.length || 0
      },
      recommendation_breakdown: {},
      top_ingredients: this.getTopIngredients(recommendations),
      safety_overview: this.getSafetyOverview(recommendations)
    };

    // Category breakdown
    const categoryBreakdown = this.groupByCategory(recommendations);
    Object.keys(categoryBreakdown).forEach(category => {
      insights.recommendation_breakdown[category] = categoryBreakdown[category].length;
    });

    return insights;
  }

  getTopIngredients(recommendations) {
    const ingredientCount = {};
    
    recommendations.forEach(product => {
      if (product.matched_semantic_ingredients) {
        product.matched_semantic_ingredients.forEach(ingredient => {
          ingredientCount[ingredient.name] = (ingredientCount[ingredient.name] || 0) + 1;
        });
      }
    });

    return Object.entries(ingredientCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, frequency: count }));
  }

  getSafetyOverview(recommendations) {
    const safetyStatus = {
      safe: 0,
      warning: 0,
      conflict: 0,
      unknown: 0
    };

    recommendations.forEach(product => {
      const status = product.semantic_safety_analysis?.overall_safety_status || 'unknown';
      safetyStatus[status] = (safetyStatus[status] || 0) + 1;
    });

    return safetyStatus;
  }

  extractIngredientsFromProducts(products) {
    const ingredients = new Set();
    
    products.forEach(product => {
      if (product.ingredient_list) {
        // Simple ingredient extraction - could be enhanced
        const productIngredients = product.ingredient_list
          .split(/[,\n]/)
          .map(ingredient => ingredient.trim())
          .filter(ingredient => ingredient.length > 0);
        
        productIngredients.forEach(ingredient => ingredients.add(ingredient));
      }
    });

    return Array.from(ingredients).slice(0, 20); // Limit for API performance
  }

  findSynergiesInProducts(products, synergyData) {
    // Implementation would analyze synergies between products
    // For now, return placeholder
    return [];
  }

  generateCompatibilityRecommendations(conflictAnalysis) {
    const recommendations = [];
    
    if (conflictAnalysis.analysis?.conflict_analysis?.total_conflicts > 0) {
      recommendations.push({
        type: 'warning',
        message: 'Some ingredients may conflict. Consider using products at different times.',
        action: 'Review ingredient conflicts'
      });
    } else {
      recommendations.push({
        type: 'success',
        message: 'Products appear compatible for combined use.',
        action: 'Safe to use together'
      });
    }

    return recommendations;
  }

  // ================== 🔄 CACHE MANAGEMENT ==================

  clearCache() {
    this.cachedRecommendations = null;
    this.lastProfile = null;
    console.log('🗑️ Recommendation cache cleared');
  }

  getCacheInfo() {
    if (!this.cachedRecommendations) {
      return { cached: false };
    }

    const cacheAge = Date.now() - this.cachedRecommendations.cached_at;
    const isValid = cacheAge < this.cacheTimeout;

    return {
      cached: true,
      age_ms: cacheAge,
      is_valid: isValid,
      profile: this.lastProfile,
      expires_in_ms: this.cacheTimeout - cacheAge
    };
  }
}

// Export singleton instance
const recommendationService = new RecommendationService();
export default recommendationService;