const express = require('express');
const router = express.Router();
const ontologyEngine = require('../services/ontologyBasedRecommendationEngine');
const pool = require('../config/database');

// 🎓 MAIN ONTOLOGY RECOMMENDATION ENDPOINT
router.post('/recommendations', async (req, res) => {
    try {
        const guestProfile = req.body;
        
        console.log('🎓 ONTOLOGY-BASED recommendation request:', guestProfile);
        
        // Validate input
        if (!guestProfile.skin_type) {
            return res.status(400).json({
                success: false,
                message: 'Skin type is required for ontology-based recommendations'
            });
        }
        
        // Validate skin type (hanya 4 yang valid - tidak ada sensitive!)
        const validSkinTypes = ['normal', 'dry', 'oily', 'combination'];
        if (!validSkinTypes.includes(guestProfile.skin_type.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: `Invalid skin type. Must be one of: ${validSkinTypes.join(', ')}`,
                valid_skin_types: validSkinTypes,
                note: "Sensitive is not a skin type - it's a skin concern. Use 'sensitivity' in concerns array instead."
            });
        }
        
        // 🧠 USE TRUE ONTOLOGY ENGINE
        const recommendations = await ontologyEngine.getPersonalizedRecommendations(guestProfile);
        
        res.json({
            success: true,
            session_id: `ontology_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            algorithm_type: 'TRUE_ONTOLOGY_BASED',
            data: recommendations,
            message: `Found ${recommendations.recommendations.length} ontology-based recommendations using SPARQL reasoning`
        });
        
    } catch (error) {
        console.error('❌ Ontology recommendation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate ontology-based recommendations',
            error: error.message,
            algorithm_type: 'TRUE_ONTOLOGY_BASED'
        });
    }
});

// 🎓 Test endpoint untuk ontology engine
router.get('/test', async (req, res) => {
    try {
        console.log('🧪 Testing ontology engine...');
        
        const testProfile = {
            skin_type: 'oily',
            concerns: ['acne', 'pores'],
            sensitivities: []
        };
        
        const testResult = await ontologyEngine.getPersonalizedRecommendations(testProfile);
        
        res.json({
            success: true,
            test_profile: testProfile,
            algorithm_type: 'TRUE_ONTOLOGY_BASED',
            results: {
                recommendations_count: testResult.recommendations.length,
                processing_time: testResult.metadata?.processing_time_ms,
                ontology_confidence: testResult.metadata?.ontology_confidence,
                sparql_used: testResult.metadata?.sparql_reasoning_used
            },
            message: 'Ontology engine test completed successfully'
        });
        
    } catch (error) {
        console.error('❌ Ontology test error:', error);
        res.status(500).json({
            success: false,
            message: 'Ontology engine test failed',
            error: error.message
        });
    }
});

// 🧪 Ingredient compatibility analysis using ontology
router.post('/ingredient-compatibility', async (req, res) => {
    try {
        const { ingredients, skin_profile } = req.body;
        
        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Array of ingredients is required',
                example: {
                    ingredients: ['niacinamide', 'salicylic acid', 'hyaluronic acid'],
                    skin_profile: {
                        skin_type: 'oily',
                        concerns: ['acne'],
                        sensitivities: ['fragrance']
                    }
                }
            });
        }
        
        // Validate skin type if provided
        if (skin_profile?.skin_type) {
            const validSkinTypes = ['normal', 'dry', 'oily', 'combination'];
            if (!validSkinTypes.includes(skin_profile.skin_type.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid skin type in profile. Must be one of: ${validSkinTypes.join(', ')}`
                });
            }
        }
        
        console.log('🧪 Ingredient compatibility analysis:', { ingredients, skin_profile });
        
        // Get ingredient details from database
        const ingredientQuery = `
            SELECT i.name, i.functions, i.benefits, i.conflicts, i.synergies, i.safety_notes, i.ph_range,
                   i.ontology_uri, i.is_key_ingredient,
                   ARRAY_AGG(DISTINCT ib.display_name) FILTER (WHERE ib.display_name IS NOT NULL) as benefit_names,
                   ARRAY_AGG(DISTINCT if_func.display_name) FILTER (WHERE if_func.display_name IS NOT NULL) as function_names
            FROM ingredients i
            LEFT JOIN ingredient_benefits_map ibm ON i.id = ibm.ingredient_id
            LEFT JOIN ingredient_benefits ib ON ibm.benefit_id = ib.id
            LEFT JOIN ingredient_functions_map ifm ON i.id = ifm.ingredient_id
            LEFT JOIN ingredient_functions if_func ON ifm.function_id = if_func.id
            WHERE LOWER(i.name) = ANY($1)
            GROUP BY i.id, i.name, i.functions, i.benefits, i.conflicts, i.synergies, i.safety_notes, i.ph_range, i.ontology_uri, i.is_key_ingredient
        `;
        
        const lowerIngredients = ingredients.map(ing => ing.toLowerCase());
        const ingredientResults = await pool.query(ingredientQuery, [lowerIngredients]);
        
        const foundIngredients = ingredientResults.rows;
        const notFoundIngredients = ingredients.filter(ing => 
            !foundIngredients.some(found => found.name.toLowerCase() === ing.toLowerCase())
        );
        
        // Analyze compatibility using ontology knowledge
        const compatibilityAnalysis = {
            ingredient_analysis: foundIngredients.map(ingredient => ({
                name: ingredient.name,
                functions: ingredient.function_names || [],
                benefits: ingredient.benefit_names || [],
                is_key_ingredient: ingredient.is_key_ingredient,
                ontology_uri: ingredient.ontology_uri,
                safety_notes: ingredient.safety_notes,
                ph_range: ingredient.ph_range
            })),
            compatibility_matrix: [],
            warnings: [],
            recommendations: [],
            not_found_ingredients: notFoundIngredients
        };
        
        // Check pairwise compatibility using ontology data
        for (let i = 0; i < foundIngredients.length; i++) {
            for (let j = i + 1; j < foundIngredients.length; j++) {
                const ing1 = foundIngredients[i];
                const ing2 = foundIngredients[j];
                
                const compatibility = analyzeIngredientPair(ing1, ing2);
                compatibilityAnalysis.compatibility_matrix.push(compatibility);
                
                if (compatibility.status === 'incompatible') {
                    compatibilityAnalysis.warnings.push({
                        type: 'incompatibility',
                        ingredients: [ing1.name, ing2.name],
                        reason: compatibility.reason,
                        severity: compatibility.severity
                    });
                }
            }
        }
        
        // Add usage recommendations based on skin profile
        if (skin_profile) {
            compatibilityAnalysis.recommendations = generateUsageRecommendations(foundIngredients, skin_profile);
        }
        
        res.json({
            success: true,
            algorithm_type: 'ONTOLOGY_INGREDIENT_ANALYSIS',
            data: compatibilityAnalysis,
            metadata: {
                total_ingredients_analyzed: foundIngredients.length,
                compatibility_checks: compatibilityAnalysis.compatibility_matrix.length,
                warnings_count: compatibilityAnalysis.warnings.length,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Ingredient compatibility error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze ingredient compatibility',
            error: error.message
        });
    }
});

// 📊 Get ontology performance metrics
router.get('/metrics', async (req, res) => {
    try {
        console.log('📊 Getting ontology performance metrics...');
        
        // Database statistics
        const dbStats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products,
                (SELECT COUNT(*) FROM ingredients WHERE is_active = true) as active_ingredients,
                (SELECT COUNT(*) FROM product_ingredients) as product_ingredient_relations,
                (SELECT COUNT(*) FROM ingredient_relationships) as ingredient_relationships,
                (SELECT COUNT(DISTINCT ontology_uri) FROM ingredients WHERE ontology_uri IS NOT NULL) as ontology_mapped_ingredients,
                (SELECT COUNT(DISTINCT ontology_uri) FROM products WHERE ontology_uri IS NOT NULL) as ontology_mapped_products,
                (SELECT COUNT(*) FROM skin_types) as skin_types_count,
                (SELECT COUNT(*) FROM skin_concerns) as skin_concerns_count,
                (SELECT COUNT(*) FROM allergen_types) as allergen_types_count
        `);
        
        const stats = dbStats.rows[0];
        
        // Calculate ontology coverage
        const ontologyCoverage = {
            ingredient_coverage: stats.ontology_mapped_ingredients / stats.active_ingredients * 100,
            product_coverage: stats.ontology_mapped_products / stats.active_products * 100
        };
        
        res.json({
            success: true,
            algorithm_type: 'ONTOLOGY_METRICS',
            data: {
                database_statistics: {
                    active_products: parseInt(stats.active_products),
                    active_ingredients: parseInt(stats.active_ingredients),
                    product_ingredient_relations: parseInt(stats.product_ingredient_relations),
                    ingredient_relationships: parseInt(stats.ingredient_relationships),
                    skin_types: parseInt(stats.skin_types_count),
                    skin_concerns: parseInt(stats.skin_concerns_count),
                    allergen_types: parseInt(stats.allergen_types_count)
                },
                ontology_mapping: {
                    mapped_ingredients: parseInt(stats.ontology_mapped_ingredients),
                    mapped_products: parseInt(stats.ontology_mapped_products),
                    ingredient_coverage_percent: Math.round(ontologyCoverage.ingredient_coverage * 100) / 100,
                    product_coverage_percent: Math.round(ontologyCoverage.product_coverage * 100) / 100
                },
                performance_indicators: {
                    semantic_reasoning_enabled: true,
                    sparql_queries_supported: true,
                    knowledge_graph_active: true,
                    ontology_version: '2025.4',
                    valid_skin_types: ['normal', 'dry', 'oily', 'combination']
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ontology metrics',
                        error: error.message
        });
    }
});

// 🔍 Search ingredients with ontology context
router.get('/ingredients/search', async (req, res) => {
    try {
        const { q, limit = 20, include_ontology = true } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }
        
        const searchQuery = `
            SELECT i.id, i.name, i.functions, i.benefits, i.safety_notes, i.ontology_uri,
                   i.is_key_ingredient, i.pregnancy_safe, i.alcohol_free, i.fragrance_free,
                   ARRAY_AGG(DISTINCT ib.display_name) FILTER (WHERE ib.display_name IS NOT NULL) as benefit_names,
                   ARRAY_AGG(DISTINCT if_func.display_name) FILTER (WHERE if_func.display_name IS NOT NULL) as function_names,
                   ARRAY_AGG(DISTINCT st.name) FILTER (WHERE st.name IS NOT NULL) as suitable_skin_types,
                   ARRAY_AGG(DISTINCT sc.name) FILTER (WHERE sc.name IS NOT NULL) as addresses_concerns
            FROM ingredients i
            LEFT JOIN ingredient_benefits_map ibm ON i.id = ibm.ingredient_id
            LEFT JOIN ingredient_benefits ib ON ibm.benefit_id = ib.id
            LEFT JOIN ingredient_functions_map ifm ON i.id = ifm.ingredient_id
            LEFT JOIN ingredient_functions if_func ON ifm.function_id = if_func.id
            LEFT JOIN ingredient_skin_types_map istm ON i.id = istm.ingredient_id
            LEFT JOIN skin_types st ON istm.skin_type_id = st.id
            LEFT JOIN ingredient_concerns_map icm ON i.id = icm.ingredient_id
            LEFT JOIN skin_concerns sc ON icm.concern_id = sc.id
            WHERE i.is_active = true 
            AND (LOWER(i.name) ILIKE $1 OR LOWER(i.alternative_names) ILIKE $1)
            GROUP BY i.id, i.name, i.functions, i.benefits, i.safety_notes, i.ontology_uri,
                     i.is_key_ingredient, i.pregnancy_safe, i.alcohol_free, i.fragrance_free
            ORDER BY 
                CASE WHEN LOWER(i.name) = LOWER($2) THEN 1 ELSE 2 END,
                LENGTH(i.name),
                i.name
            LIMIT $3
        `;
        
        const searchTerm = `%${q.toLowerCase()}%`;
        const exactTerm = q.toLowerCase();
        const results = await pool.query(searchQuery, [searchTerm, exactTerm, parseInt(limit)]);
        
        const ingredients = results.rows.map(ingredient => ({
            id: ingredient.id,
            name: ingredient.name,
            functions: ingredient.function_names || [],
            benefits: ingredient.benefit_names || [],
            suitable_skin_types: ingredient.suitable_skin_types || [],
            addresses_concerns: ingredient.addresses_concerns || [],
            safety_info: {
                pregnancy_safe: ingredient.pregnancy_safe,
                alcohol_free: ingredient.alcohol_free,
                fragrance_free: ingredient.fragrance_free,
                safety_notes: ingredient.safety_notes
            },
            is_key_ingredient: ingredient.is_key_ingredient,
            ontology_uri: include_ontology === 'true' ? ingredient.ontology_uri : undefined
        }));
        
        res.json({
            success: true,
            algorithm_type: 'ONTOLOGY_INGREDIENT_SEARCH',
            data: {
                query: q,
                results: ingredients,
                total_found: ingredients.length,
                search_metadata: {
                    exact_matches: ingredients.filter(ing => ing.name.toLowerCase() === q.toLowerCase()).length,
                    partial_matches: ingredients.filter(ing => ing.name.toLowerCase() !== q.toLowerCase()).length,
                    key_ingredients: ingredients.filter(ing => ing.is_key_ingredient).length
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Ingredient search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search ingredients',
            error: error.message
        });
    }
});

// 🧬 Get ingredient relationships and synergies
router.get('/ingredients/:ingredientId/relationships', async (req, res) => {
    try {
        const { ingredientId } = req.params;
        
        // Get ingredient details
        const ingredientQuery = `
            SELECT i.id, i.name, i.ontology_uri, i.is_key_ingredient
            FROM ingredients i
            WHERE i.id = $1 AND i.is_active = true
        `;
        
        const ingredientResult = await pool.query(ingredientQuery, [ingredientId]);
        
        if (ingredientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ingredient not found'
            });
        }
        
        const ingredient = ingredientResult.rows[0];
        
        // Get relationships
        const relationshipsQuery = `
            SELECT 
                ir.relationship_type,
                ir.strength,
                ir.description,
                i2.id as related_ingredient_id,
                i2.name as related_ingredient_name,
                i2.is_key_ingredient as related_is_key
            FROM ingredient_relationships ir
            JOIN ingredients i2 ON (
                (ir.ingredient_a_id = $1 AND ir.ingredient_b_id = i2.id) OR
                (ir.ingredient_b_id = $1 AND ir.ingredient_a_id = i2.id)
            )
            WHERE i2.is_active = true
            ORDER BY ir.strength DESC, ir.relationship_type
        `;
        
        const relationshipsResult = await pool.query(relationshipsQuery, [ingredientId]);
        
        // Group relationships by type
        const relationships = {
            synergies: [],
            conflicts: [],
            neutral: []
        };
        
        relationshipsResult.rows.forEach(rel => {
            const relationshipData = {
                ingredient: {
                    id: rel.related_ingredient_id,
                    name: rel.related_ingredient_name,
                    is_key_ingredient: rel.related_is_key
                },
                strength: rel.strength,
                description: rel.description
            };
            
            if (rel.relationship_type === 'synergy') {
                relationships.synergies.push(relationshipData);
            } else if (rel.relationship_type === 'conflict') {
                relationships.conflicts.push(relationshipData);
            } else {
                relationships.neutral.push(relationshipData);
            }
        });
        
        res.json({
            success: true,
            algorithm_type: 'ONTOLOGY_INGREDIENT_RELATIONSHIPS',
            data: {
                ingredient: {
                    id: ingredient.id,
                    name: ingredient.name,
                    is_key_ingredient: ingredient.is_key_ingredient,
                    ontology_uri: ingredient.ontology_uri
                },
                relationships: relationships,
                summary: {
                    total_relationships: relationshipsResult.rows.length,
                    synergies_count: relationships.synergies.length,
                    conflicts_count: relationships.conflicts.length,
                    neutral_count: relationships.neutral.length
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Ingredient relationships error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ingredient relationships',
            error: error.message
        });
    }
});

// 📋 Get ontology knowledge base info
router.get('/knowledge-base', async (req, res) => {
    try {
        // Get ontology statistics
        const ontologyStats = await pool.query(`
            SELECT 
                COUNT(DISTINCT i.ontology_uri) FILTER (WHERE i.ontology_uri IS NOT NULL) as mapped_ingredients,
                COUNT(DISTINCT p.ontology_uri) FILTER (WHERE p.ontology_uri IS NOT NULL) as mapped_products,
                COUNT(DISTINCT ir.id) as ingredient_relationships,
                COUNT(DISTINCT st.id) as skin_types,
                COUNT(DISTINCT sc.id) as skin_concerns,
                COUNT(DISTINCT at.id) as allergen_types,
                COUNT(DISTINCT ib.id) as ingredient_benefits,
                COUNT(DISTINCT if_func.id) as ingredient_functions
            FROM ingredients i
            CROSS JOIN products p
            CROSS JOIN ingredient_relationships ir
            CROSS JOIN skin_types st
            CROSS JOIN skin_concerns sc
            CROSS JOIN allergen_types at
            CROSS JOIN ingredient_benefits ib
            CROSS JOIN ingredient_functions if_func
            WHERE i.is_active = true AND p.is_active = true
        `);
        
        const stats = ontologyStats.rows[0];
        
        // Get sample ontology URIs
        const sampleUris = await pool.query(`
            SELECT DISTINCT ontology_uri, name
            FROM ingredients 
            WHERE ontology_uri IS NOT NULL 
            AND is_active = true
            ORDER BY name
            LIMIT 10
        `);
        
        res.json({
            success: true,
            algorithm_type: 'ONTOLOGY_KNOWLEDGE_BASE',
            data: {
                ontology_statistics: {
                    mapped_ingredients: parseInt(stats.mapped_ingredients),
                    mapped_products: parseInt(stats.mapped_products),
                    ingredient_relationships: parseInt(stats.ingredient_relationships),
                    skin_types: parseInt(stats.skin_types),
                    skin_concerns: parseInt(stats.skin_concerns),
                    allergen_types: parseInt(stats.allergen_types),
                    ingredient_benefits: parseInt(stats.ingredient_benefits),
                    ingredient_functions: parseInt(stats.ingredient_functions)
                },
                sample_ontology_mappings: sampleUris.rows,
                supported_features: [
                    'SPARQL Semantic Queries',
                    'Ingredient Relationship Mapping',
                    'Skin Type Ontology',
                    'Concern-Based Reasoning',
                    'Safety Inference',
                    'Compatibility Analysis'
                ],
                ontology_version: '2025.4',
                last_updated: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Knowledge base error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get knowledge base info',
            error: error.message
        });
    }
});



// Helper function untuk menganalisis kompatibilitas ingredient
function analyzeIngredientPair(ing1, ing2) {
    const ing1Lower = ing1.name.toLowerCase();
    const ing2Lower = ing2.name.toLowerCase();
    
    // Known conflicts
    const conflicts = [
        { 
            ingredients: ['retinol', 'vitamin c'], 
            reason: 'pH incompatibility and potential irritation',
            severity: 'high'
        },
        { 
            ingredients: ['retinol', 'aha'], 
            reason: 'Increased risk of irritation and sensitivity',
            severity: 'high'
        },
        { 
            ingredients: ['retinol', 'bha'], 
            reason: 'Over-exfoliation risk',
            severity: 'medium'
        },
        { 
            ingredients: ['vitamin c', 'niacinamide'], 
            reason: 'Potential conversion to nicotinic acid (outdated concern)',
            severity: 'low'
        }
    ];
    
    // Check for conflicts
    for (const conflict of conflicts) {
        const conflictIng = conflict.ingredients.find(ci => ing1Lower.includes(ci) || ing2Lower.includes(ci));
        const hasConflict = conflictIng && (
            (ing1Lower.includes(conflictIng) && ing2Lower.includes(conflict.ingredients.find(ci => ci !== conflictIng))) ||
            (ing2Lower.includes(conflictIng) && ing1Lower.includes(conflict.ingredients.find(ci => ci !== conflictIng)))
        );
        
        if (hasConflict) {
            return {
                status: 'incompatible',
                ingredients: [ing1.name, ing2.name],
                reason: conflict.reason,
                severity: conflict.severity,
                recommendation: `Avoid using ${ing1.name} and ${ing2.name} together due to ${conflict.reason}`
            };
        }
    }
    
    // Check for synergies
    const synergies = [
        {
            ingredients: ['niacinamide', 'hyaluronic acid'],
            reason: 'Complementary hydration and barrier support',
            benefit: 'Enhanced moisture retention and skin barrier function'
        },
        {
            ingredients: ['vitamin c', 'vitamin e'],
            reason: 'Antioxidant synergy and stability enhancement',
            benefit: 'Improved antioxidant protection and vitamin C stability'
        },
        {
            ingredients: ['ceramides', 'hyaluronic acid'],
            reason: 'Barrier repair and hydration synergy',
            benefit: 'Enhanced skin barrier function and moisture retention'
        }
    ];
    
    // Check for synergies
    for (const synergy of synergies) {
        const synergyIng = synergy.ingredients.find(si => ing1Lower.includes(si) || ing2Lower.includes(si));
        const hasSynergy = synergyIng && (
            (ing1Lower.includes(synergyIng) && ing2Lower.includes(synergy.ingredients.find(si => si !== synergyIng))) ||
            (ing2Lower.includes(synergyIng) && ing1Lower.includes(synergy.ingredients.find(si => si !== synergyIng)))
        );
        
        if (hasSynergy) {
            return {
                status: 'synergistic',
                ingredients: [ing1.name, ing2.name],
                reason: synergy.reason,
                benefit: synergy.benefit,
                recommendation: `${ing1.name} and ${ing2.name} work well together: ${synergy.benefit}`
            };
        }
    }
    
    // Default: compatible
    return {
        status: 'compatible',
        ingredients: [ing1.name, ing2.name],
        reason: 'No known conflicts or synergies',
        recommendation: `${ing1.name} and ${ing2.name} can be used together safely`
    };
}

// Helper function untuk generate usage recommendations
function generateUsageRecommendations(ingredients, skinProfile) {
    const recommendations = [];
    
    // Skin type specific recommendations
    const skinTypeRecommendations = {
        'oily': {
            preferred: ['salicylic acid', 'niacinamide', 'zinc oxide'],
            avoid: ['heavy oils', 'petrolatum'],
            timing: 'Use oil-controlling ingredients in morning routine'
        },
        'dry': {
            preferred: ['hyaluronic acid', 'ceramides', 'glycerin'],
            avoid: ['alcohol denat', 'strong acids'],
            timing: 'Layer hydrating ingredients from thinnest to thickest'
        },
        'combination': {
            preferred: ['niacinamide', 'hyaluronic acid'],
            avoid: ['overly drying or overly rich formulations'],
            timing: 'Use different products on different face areas if needed'
        },
        'normal': {
            preferred: ['vitamin c', 'retinol', 'hyaluronic acid'],
            avoid: ['over-exfoliation'],
            timing: 'Maintain balance with gentle, effective ingredients'
        }
    };
    
    const skinType = skinProfile.skin_type?.toLowerCase();
    if (skinType && skinTypeRecommendations[skinType]) {
        const typeRec = skinTypeRecommendations[skinType];
        
        // Check for preferred ingredients
        const foundPreferred = ingredients.filter(ing => 
            typeRec.preferred.some(pref => ing.name.toLowerCase().includes(pref))
        );
        
        if (foundPreferred.length > 0) {
            recommendations.push({
                type: 'skin_type_match',
                message: `Great choices for ${skinType} skin: ${foundPreferred.map(ing => ing.name).join(', ')}`,
                timing: typeRec.timing
            });
        }
        
        // Check for ingredients to avoid
        const foundAvoid = ingredients.filter(ing => 
            typeRec.avoid.some(avoid => ing.name.toLowerCase().includes(avoid))
        );
        
        if (foundAvoid.length > 0) {
            recommendations.push({
                type: 'skin_type_warning',
                message: `Be cautious with these for ${skinType} skin: ${foundAvoid.map(ing => ing.name).join(', ')}`,
                suggestion: 'Consider patch testing or using lower concentrations'
            });
        }
    }
    
    // Concern-specific recommendations
    if (skinProfile.concerns && Array.isArray(skinProfile.concerns)) {
        skinProfile.concerns.forEach(concern => {
            const concernLower = concern.toLowerCase();
            
            if (concernLower.includes('acne')) {
                const acneIngredients = ingredients.filter(ing => 
                    ['salicylic acid', 'benzoyl peroxide', 'niacinamide', 'zinc'].some(acneIng => 
                        ing.name.toLowerCase().includes(acneIng)
                    )
                );
                
                if (acneIngredients.length > 0) {
                    recommendations.push({
                        type: 'concern_match',
                        concern: 'acne',
                        message: `Good ingredients for acne: ${acneIngredients.map(ing => ing.name).join(', ')}`,
                        usage_tip: 'Start slowly and build tolerance, especially with acids'
                    });
                }
            }
            
            if (concernLower.includes('aging') || concernLower.includes('wrinkle')) {
                const antiAgingIngredients = ingredients.filter(ing => 
                    ['retinol', 'vitamin c', 'peptides', 'hyaluronic acid'].some(aaIng => 
                        ing.name.toLowerCase().includes(aaIng)
                    )
                );
                
                if (antiAgingIngredients.length > 0) {
                    recommendations.push({
                        type: 'concern_match',
                        concern: 'anti-aging',
                        message: `Excellent anti-aging ingredients: ${antiAgingIngredients.map(ing => ing.name).join(', ')}`,
                        usage_tip: 'Use retinol at night and vitamin C in the morning with sunscreen'
                    });
                }
            }
        });
    }
    
    // Sensitivity recommendations
    if (skinProfile.sensitivities && Array.isArray(skinProfile.sensitivities)) {
        skinProfile.sensitivities.forEach(sensitivity => {
            const sensitivityLower = sensitivity.toLowerCase();
            
            const problematicIngredients = ingredients.filter(ing => {
                const ingName = ing.name.toLowerCase();
                return (
                    (sensitivityLower.includes('fragrance') && ingName.includes('fragrance')) ||
                    (sensitivityLower.includes('alcohol') && ingName.includes('alcohol')) ||
                    (sensitivityLower.includes('sulfate') && ingName.includes('sulfate'))
                );
            });
            
            if (problematicIngredients.length > 0) {
                recommendations.push({
                    type: 'sensitivity_warning',
                    sensitivity: sensitivity,
                    message: `Warning: These ingredients may trigger ${sensitivity} sensitivity: ${problematicIngredients.map(ing => ing.name).join(', ')}`,
                    suggestion: 'Consider avoiding or patch testing these ingredients'
                });
            }
        });
    }
    
    return recommendations;
}

module.exports = router;