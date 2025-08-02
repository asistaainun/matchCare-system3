// backend/routes/products.js - COMPLETE ONTOLOGY-BASED PRODUCT ENDPOINTS
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const ontologyService = require('../services/ontologyService');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// ===== 1. MAIN PRODUCT LISTING (Ontology-Enhanced) =====
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      category, 
      brand, 
      skinType,
      concerns,
      avoidedIngredients 
    } = req.query;

    console.log('🔍 Product listing with ontology enhancement...');

    let query = `
      SELECT 
        p.id,
        p.name,
        COALESCE(b.name, 'Unknown Brand') as brand_name,
        p.main_category,
        p.subcategory,
        p.description,
        p.ingredient_list,
        p.key_ingredients_csv,
        p.alcohol_free,
        p.fragrance_free,
        p.paraben_free,
        p.sulfate_free,
        p.silicone_free,
        p.product_url,
        p.local_image_path,
        p.image_urls
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.name IS NOT NULL 
      AND p.is_active = true
    `;

    const params = [];
    let paramCount = 0;

    // Standard filters
    if (category) {
      query += ` AND p.main_category ILIKE $${++paramCount}`;
      params.push(`%${category}%`);
    }

    if (brand) {
      query += ` AND b.name ILIKE $${++paramCount}`;
      params.push(`%${brand}%`);
    }

    // 🧠 ONTOLOGY-BASED FILTERING
    if (skinType) {
      console.log(`🧠 Applying ontology-based filtering for ${skinType} skin...`);
      
      try {
        // Get recommended ingredients from ontology
        const ontologyIngredients = await ontologyService.getSkinTypeRecommendations(
          skinType, 
          concerns ? concerns.split(',') : []
        );

        if (ontologyIngredients.count > 0) {
          const recommendedIngredients = ontologyIngredients.data.map(ing => ing.name.toLowerCase());
          
          // Add ontology-based WHERE clause
          const ingredientConditions = recommendedIngredients.map(() => 
            `LOWER(p.ingredient_list) LIKE $${++paramCount}`
          ).join(' OR ');
          
          if (ingredientConditions) {
            query += ` AND (${ingredientConditions})`;
            recommendedIngredients.forEach(ingredient => {
              params.push(`%${ingredient}%`);
            });
          }
          
          console.log(`✅ Ontology filter applied: ${recommendedIngredients.length} ingredients`);
        }
      } catch (error) {
        console.warn('⚠️ Ontology filtering failed, using standard filter:', error.message);
      }
    }

    // Safety filters based on avoided ingredients
    if (avoidedIngredients) {
      const avoided = avoidedIngredients.split(',');
      avoided.forEach(ingredient => {
        if (ingredient === 'fragrance') {
          query += ` AND (p.fragrance_free = true OR p.fragrance_free IS NULL)`;
        } else if (ingredient === 'alcohol') {
          query += ` AND (p.alcohol_free = true OR p.alcohol_free IS NULL)`;
        } else {
          query += ` AND LOWER(p.ingredient_list) NOT LIKE $${++paramCount}`;
          params.push(`%${ingredient.toLowerCase()}%`);
        }
      });
    }

    // Add pagination
    query += ` ORDER BY 
      CASE WHEN p.key_ingredients_csv IS NOT NULL THEN 1 ELSE 2 END,
      LENGTH(p.ingredient_list) DESC,
      p.name ASC
      LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // 🧠 ENHANCE WITH ONTOLOGY ANALYSIS
    const enhancedProducts = await Promise.all(
      result.rows.map(async (product) => {
        try {
          // Parse ingredient list and get ontology insights
          const ingredientNames = ontologyService.parseIngredientList(product.ingredient_list || '');
          
          let ontologyInsights = {
            analyzed_ingredients: ingredientNames,
            conflicts_count: 0,
            synergies_count: 0,
            safety_status: 'safe'
          };

          if (ingredientNames.length >= 2) {
            // Get conflicts and synergies from ontology
            const [conflicts, synergies] = await Promise.all([
              ontologyService.getIngredientConflicts(ingredientNames),
              ontologyService.getSynergisticCombos(ingredientNames)
            ]);

            ontologyInsights = {
              analyzed_ingredients: ingredientNames,
              conflicts_count: conflicts.count,
              synergies_count: synergies.count,
              safety_status: conflicts.count > 0 ? 'caution' : 'safe',
              ontology_powered: true
            };
          }

          return {
            ...product,
            ontology_analysis: ontologyInsights
          };
          
        } catch (error) {
          console.warn(`Ontology analysis failed for ${product.name}:`, error.message);
          return {
            ...product,
            ontology_analysis: { 
              analyzed_ingredients: [],
              conflicts_count: 0,
              synergies_count: 0,
              safety_status: 'unknown',
              ontology_powered: false
            }
          };
        }
      })
    );

    // Get total count for pagination
    const countQuery = query.split('ORDER BY')[0].replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      success: true,
      data: enhancedProducts,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + enhancedProducts.length < parseInt(countResult.rows[0].count)
      },
      filters_applied: {
        category,
        brand,
        skinType,
        concerns,
        avoidedIngredients,
        ontology_enhanced: !!skinType
      },
      ontology_powered: true,
      message: 'Product listing enhanced with ontology analysis'
    });

  } catch (error) {
    console.error('❌ Product listing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      ontology_powered: false
    });
  }
});

// ===== 2. PRODUCT DETAIL (Ontology-Enhanced) =====
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Getting product detail with ontology analysis: ${id}`);

    const query = `
      SELECT 
        p.*,
        COALESCE(b.name, 'Unknown Brand') as brand_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = $1 AND p.is_active = true
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = result.rows[0];

    // 🧠 COMPREHENSIVE ONTOLOGY ANALYSIS
    const ingredientNames = ontologyService.parseIngredientList(product.ingredient_list || '');
    
    let ontologyAnalysis = {
      ingredients_analyzed: ingredientNames,
      total_ingredients: ingredientNames.length,
      conflicts: { count: 0, details: [] },
      synergies: { count: 0, details: [] },
      safety_assessment: 'Unknown - insufficient ingredient data',
      ontology_powered: false
    };

    if (ingredientNames.length >= 2) {
      console.log(`🧠 Running comprehensive ontology analysis for ${ingredientNames.length} ingredients...`);
      
      try {
        const [conflicts, synergies] = await Promise.all([
          ontologyService.getIngredientConflicts(ingredientNames),
          ontologyService.getSynergisticCombos(ingredientNames)
        ]);

        ontologyAnalysis = {
          ingredients_analyzed: ingredientNames,
          total_ingredients: ingredientNames.length,
          conflicts: {
            count: conflicts.count,
            details: conflicts.data.slice(0, 5) // Show top 5 conflicts
          },
          synergies: {
            count: synergies.count,
            details: synergies.data.slice(0, 5) // Show top 5 synergies
          },
          safety_assessment: this.generateSafetyAssessment(conflicts.count, synergies.count),
          compatibility_score: this.calculateCompatibilityScore(conflicts.count, synergies.count, ingredientNames.length),
          ontology_powered: true,
          analysis_timestamp: new Date().toISOString()
        };

        console.log(`✅ Ontology analysis complete: ${conflicts.count} conflicts, ${synergies.count} synergies`);

      } catch (error) {
        console.warn('⚠️ Ontology analysis failed:', error.message);
      }
    }

    // 🎯 GET SIMILAR PRODUCTS (Ontology-based)
    const similarProducts = await this.getSimilarProductsViaOntology(product, ingredientNames);

    res.json({
      success: true,
      data: {
        ...product,
        ontology_analysis: ontologyAnalysis,
        similar_products: similarProducts
      },
      ontology_powered: true,
      message: 'Product detail enhanced with comprehensive ontology analysis'
    });

  } catch (error) {
    console.error('❌ Product detail error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== 3. ONTOLOGY-BASED PRODUCT RECOMMENDATIONS =====
router.post('/recommendations', async (req, res) => {
  try {
    const { skinType, concerns = [], avoidedIngredients = [], limit = 12 } = req.body;

    if (!skinType) {
      return res.status(400).json({
        success: false,
        message: 'Skin type is required for ontology-based recommendations'
      });
    }

    console.log('🧠 Generating ontology-based product recommendations...');
    console.log(`Profile: ${skinType} skin, concerns: [${concerns.join(', ')}]`);

    // 🧠 STEP 1: Get recommended ingredients from ontology
    const ontologyIngredients = await ontologyService.getSkinTypeRecommendations(skinType, concerns);
    
    if (ontologyIngredients.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'No ontology-based ingredient recommendations found for this profile',
        ontology_powered: true
      });
    }

    console.log(`✅ Ontology found ${ontologyIngredients.count} recommended ingredients`);

    // 🔍 STEP 2: Find products containing these ingredients
    const recommendedIngredientNames = ontologyIngredients.data.map(ing => ing.name.toLowerCase());
    
    let query = `
      SELECT 
        p.id, p.name,
        COALESCE(b.name, 'Unknown Brand') as brand_name,
        p.main_category, p.subcategory, p.description,
        p.ingredient_list, p.key_ingredients_csv,
        p.alcohol_free, p.fragrance_free, p.paraben_free,
        p.sulfate_free, p.silicone_free,
        p.product_url, p.local_image_path, p.image_urls
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.name IS NOT NULL 
      AND p.is_active = true
      AND p.ingredient_list IS NOT NULL
    `;

    const params = [];
    let paramCount = 0;

    // Filter products that contain ontology-recommended ingredients
    const ingredientConditions = recommendedIngredientNames.map(() => 
      `LOWER(p.ingredient_list) LIKE $${++paramCount}`
    ).join(' OR ');
    
    query += ` AND (${ingredientConditions})`;
    recommendedIngredientNames.forEach(ingredient => {
      params.push(`%${ingredient}%`);
    });

    // Apply safety filters
    avoidedIngredients.forEach(avoided => {
      if (avoided === 'fragrance') {
        query += ` AND (p.fragrance_free = true OR p.fragrance_free IS NULL)`;
      } else if (avoided === 'alcohol') {
        query += ` AND (p.alcohol_free = true OR p.alcohol_free IS NULL)`;
      } else {
        query += ` AND LOWER(p.ingredient_list) NOT LIKE $${++paramCount}`;
        params.push(`%${avoided.toLowerCase()}%`);
      }
    });

    query += ` ORDER BY 
      CASE WHEN p.key_ingredients_csv IS NOT NULL THEN 1 ELSE 2 END,
      LENGTH(p.ingredient_list) DESC
      LIMIT $${++paramCount}`;
    params.push(limit * 2); // Get more for scoring

    const result = await pool.query(query, params);
    
    console.log(`🔍 Found ${result.rows.length} candidate products`);

    // 🎯 STEP 3: Score products based on ontology match
    const scoredProducts = await Promise.all(
      result.rows.map(async (product) => {
        const productIngredients = ontologyService.parseIngredientList(product.ingredient_list || '');
        
        // Calculate ontology match score
        const matchScore = this.calculateOntologyMatchScore(
          productIngredients, 
          ontologyIngredients.data
        );

        // Get safety analysis
        let safetyAnalysis = { conflicts: 0, synergies: 0, score: 50 };
        if (productIngredients.length >= 2) {
          try {
            const [conflicts, synergies] = await Promise.all([
              ontologyService.getIngredientConflicts(productIngredients),
              ontologyService.getSynergisticCombos(productIngredients)
            ]);
            
            safetyAnalysis = {
              conflicts: conflicts.count,
              synergies: synergies.count,
              score: this.calculateSafetyScore(conflicts.count, synergies.count)
            };
          } catch (error) {
            console.warn(`Safety analysis failed for ${product.name}`);
          }
        }

        const finalScore = (matchScore * 0.7) + (safetyAnalysis.score * 0.3);

        return {
          ...product,
          ontology_match_score: matchScore,
          safety_analysis: safetyAnalysis,
          final_recommendation_score: Math.round(finalScore),
          matched_ontology_ingredients: productIngredients.filter(ing => 
            recommendedIngredientNames.some(rec => rec.includes(ing.toLowerCase()))
          ),
          recommendation_reason: this.generateRecommendationReason(matchScore, safetyAnalysis, skinType)
        };
      })
    );

    // Sort by final score and take top results
    const topRecommendations = scoredProducts
      .sort((a, b) => b.final_recommendation_score - a.final_recommendation_score)
      .slice(0, limit);

    res.json({
      success: true,
      data: {
        recommendations: topRecommendations,
        ontology_insights: {
          recommended_ingredients: ontologyIngredients.data,
          total_ingredients_found: ontologyIngredients.count,
          products_analyzed: result.rows.length,
          final_recommendations: topRecommendations.length
        },
        user_profile: {
          skinType,
          concerns,
          avoidedIngredients
        }
      },
      ontology_powered: true,
      algorithm_type: 'ONTOLOGY_BASED_PRODUCT_RECOMMENDATION',
      message: `Generated ${topRecommendations.length} ontology-based recommendations`
    });

  } catch (error) {
    console.error('❌ Ontology recommendations error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      ontology_powered: true
    });
  }
});

// ===== 4. PRODUCT SEARCH (Ontology-Enhanced) =====
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20, skinType } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    console.log(`🔍 Ontology-enhanced search for: "${q}"`);

    let query = `
      SELECT 
        p.id, p.name,
        COALESCE(b.name, 'Unknown Brand') as brand_name,
        p.main_category, p.subcategory, p.description,
        p.ingredient_list, p.product_url, p.local_image_path, p.image_urls
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.is_active = true
      AND (
        LOWER(p.name) LIKE $1 OR
        LOWER(p.description) LIKE $1 OR
        LOWER(p.ingredient_list) LIKE $1 OR
        LOWER(b.name) LIKE $1 OR
        LOWER(p.main_category) LIKE $1
      )
    `;

    const params = [`%${q.toLowerCase()}%`];

    // 🧠 ONTOLOGY-ENHANCED SEARCH
    if (skinType) {
      console.log(`🧠 Applying ontology enhancement for ${skinType} skin...`);
      
      try {
        const ontologyIngredients = await ontologyService.getSkinTypeRecommendations(skinType);
        
        if (ontologyIngredients.count > 0) {
          const recommendedIngredients = ontologyIngredients.data.map(ing => ing.name.toLowerCase());
          
          // Boost products that contain ontology-recommended ingredients
          query = query.replace('SELECT ', `SELECT 
            CASE 
              WHEN ${recommendedIngredients.map((_, index) => 
                `LOWER(p.ingredient_list) LIKE $${params.length + 1 + index}`
              ).join(' OR ')} THEN 1 
              ELSE 2 
            END as ontology_priority,
          `);
          
          recommendedIngredients.forEach(ingredient => {
            params.push(`%${ingredient}%`);
          });
        }
      } catch (error) {
        console.warn('⚠️ Ontology enhancement failed for search:', error.message);
      }
    }

    query += ` ORDER BY 
      ${skinType ? 'ontology_priority ASC,' : ''}
      CASE 
        WHEN LOWER(p.name) LIKE $1 THEN 1
        WHEN LOWER(p.description) LIKE $1 THEN 2
        WHEN LOWER(p.ingredient_list) LIKE $1 THEN 3
        ELSE 4
      END,
      LENGTH(p.ingredient_list) DESC
      LIMIT $${params.length + 1}`;
    
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      search_meta: {
        query: q,
        total_found: result.rows.length,
        ontology_enhanced: !!skinType,
        skin_type_filter: skinType
      },
      ontology_powered: !!skinType,
      message: `Found ${result.rows.length} products${skinType ? ' (ontology-enhanced)' : ''}`
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== 5. GET PRODUCT CATEGORIES (with ontology stats) =====
router.get('/categories', async (req, res) => {
  try {
    const query = `
      SELECT 
        main_category as category,
        COUNT(*) as product_count,
        COUNT(CASE WHEN ingredient_list IS NOT NULL AND LENGTH(ingredient_list) > 20 THEN 1 END) as products_with_ingredients
      FROM products 
      WHERE is_active = true 
      AND main_category IS NOT NULL
      GROUP BY main_category
      ORDER BY product_count DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      ontology_powered: true,
      message: 'Product categories with ontology-ready ingredient data'
    });

  } catch (error) {
    console.error('❌ Categories error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== 6. GET PRODUCT BRANDS =====
router.get('/brands', async (req, res) => {
  try {
    const query = `
      SELECT 
        b.name as brand,
        COUNT(p.id) as product_count
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id AND p.is_active = true
      WHERE b.name IS NOT NULL
      GROUP BY b.name
      HAVING COUNT(p.id) > 0
      ORDER BY product_count DESC, b.name ASC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      message: 'Available product brands'
    });

  } catch (error) {
    console.error('❌ Brands error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== HELPER METHODS =====
router.calculateOntologyMatchScore = function(productIngredients, ontologyIngredients) {
  if (ontologyIngredients.length === 0) return 20;
  
  let matchCount = 0;
  const productIngredientsLower = productIngredients.map(ing => ing.toLowerCase());
  
  ontologyIngredients.forEach(ontologyIng => {
    const ontologyNameLower = ontologyIng.name.toLowerCase();
    if (productIngredientsLower.some(prodIng => 
      prodIng.includes(ontologyNameLower) || ontologyNameLower.includes(prodIng)
    )) {
      matchCount++;
    }
  });
  
  const baseScore = (matchCount / ontologyIngredients.length) * 80;
  const ingredientQualityBonus = productIngredients.length > 5 ? 10 : 5;
  
  return Math.min(95, baseScore + ingredientQualityBonus);
};

router.calculateSafetyScore = function(conflictCount, synergyCount) {
  let score = 70; // Base safety score
  score -= conflictCount * 15; // Penalty for conflicts
  score += synergyCount * 5;   // Bonus for synergies
  return Math.max(10, Math.min(95, score));
};

router.generateSafetyAssessment = function(conflictCount, synergyCount) {
  if (conflictCount > 0) {
    return `Caution recommended: ${conflictCount} ingredient interaction(s) detected`;
  } else if (synergyCount > 0) {
    return `Excellent compatibility: ${synergyCount} beneficial interaction(s) found`;
  } else {
    return 'Safe: No ingredient conflicts detected';
  }
};

router.calculateCompatibilityScore = function(conflictCount, synergyCount, totalIngredients) {
  let score = 50; // Base score
  score -= conflictCount * 20; // Penalty for conflicts
  score += synergyCount * 10;  // Bonus for synergies
  score += Math.min(totalIngredients * 2, 20); // Bonus for ingredient richness
  return Math.max(0, Math.min(100, score));
};

router.generateRecommendationReason = function(matchScore, safetyAnalysis, skinType) {
  const reasons = [];
  
  if (matchScore >= 70) {
    reasons.push(`High ontology match (${Math.round(matchScore)}%) for ${skinType} skin`);
  }
  
  if (safetyAnalysis.synergies > 0) {
    reasons.push(`Contains ${safetyAnalysis.synergies} beneficial ingredient combination(s)`);
  }
  
  if (safetyAnalysis.conflicts === 0) {
    reasons.push('No ingredient conflicts detected');
  }
  
  if (reasons.length === 0) {
    reasons.push(`Basic compatibility for ${skinType} skin type`);
  }
  
  return reasons.join(' • ');
};

router.getSimilarProductsViaOntology = async function(baseProduct, ingredientNames) {
  if (ingredientNames.length === 0) return [];
  
  try {
    const query = `
      SELECT 
        p.id, p.name,
        COALESCE(b.name, 'Unknown Brand') as brand_name,
        p.main_category, p.local_image_path, p.image_urls
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id != $1 
      AND p.is_active = true
      AND p.ingredient_list IS NOT NULL
      AND (${ingredientNames.slice(0, 3).map((_, index) => 
        `LOWER(p.ingredient_list) LIKE $${index + 2}`
      ).join(' OR ')})
      ORDER BY 
        CASE WHEN p.main_category = $${ingredientNames.length + 2} THEN 1 ELSE 2 END,
        LENGTH(p.ingredient_list) DESC
      LIMIT 6
    `;
    
    const params = [
      baseProduct.id,
      ...ingredientNames.slice(0, 3).map(ing => `%${ing.toLowerCase()}%`),
      baseProduct.main_category
    ];
    
    const result = await pool.query(query, params);
    return result.rows;
    
  } catch (error) {
    console.warn('Similar products query failed:', error.message);
    return [];
  }
};

module.exports = router;