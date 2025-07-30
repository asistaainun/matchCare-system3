// backend/services/hybridRecommendationEngine.js
// Advanced hybrid recommendation combining SPARQL reasoning dengan database queries

const { Pool } = require('pg');
const ontologyService = require('./ontologyService');
const { Product, Brand, KeyIngredientType } = require('../models');
const { Op } = require('sequelize');

class HybridRecommendationEngine {
    constructor() {
        this.pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'matchcare_fresh_db',
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 5432,
        });
        
        // Weight distribution untuk hybrid scoring
        this.weights = {
            ontology_reasoning: 0.4,      // SPARQL semantic reasoning
            database_matching: 0.3,       // Direct database matching
            safety_compatibility: 0.2,    // Allergen/sensitivity safety
            ingredient_synergy: 0.1       // Key ingredient combinations
        };
    }

    async getPersonalizedRecommendations(guestProfile) {
        try {
            console.log('🎯 Starting Hybrid Recommendation Engine...');
            const startTime = Date.now();
            
            const { skin_type, concerns = [], sensitivities = [] } = guestProfile;
            
            // PHASE 1: SPARQL Ontology Reasoning
            console.log('🧠 Phase 1: SPARQL Ontology Reasoning...');
            const ontologyResults = await this.getOntologyRecommendations(skin_type, concerns);
            
            // PHASE 2: Database Direct Matching  
            console.log('💾 Phase 2: Database Product Matching...');
            const databaseResults = await this.getDatabaseRecommendations(skin_type, concerns, sensitivities);
            
            // PHASE 3: Hybrid Scoring & Merging
            console.log('⚖️ Phase 3: Hybrid Scoring & Ranking...');
            const hybridResults = await this.mergeAndScore(ontologyResults, databaseResults, guestProfile);
            
            // PHASE 4: Generate Explanations
            console.log('📝 Phase 4: Generating Explanations...');
            const enrichedResults = await this.generateExplanations(hybridResults, guestProfile);
            
            const processingTime = Date.now() - startTime;
            
            console.log(`✅ Hybrid Recommendation Complete in ${processingTime}ms`);
            console.log(`📊 Results: ${enrichedResults.length} personalized recommendations`);
            
            return {
                recommendations: enrichedResults.slice(0, 12), // Top 12
                metadata: {
                    total_candidates: hybridResults.length,
                    processing_time_ms: processingTime,
                    ontology_contribution: ontologyResults.length,
                    database_contribution: databaseResults.length,
                    algorithm_version: 'hybrid_v2.0'
                },
                reasoning_explanation: this.generateSystemExplanation(skin_type, concerns, sensitivities)
            };
            
        } catch (error) {
            console.error('❌ Hybrid Recommendation Error:', error);
            
            // FALLBACK: Pure database recommendations
            console.log('🔄 Falling back to database-only recommendations...');
            return await this.getFallbackRecommendations(guestProfile);
        }
    }

    // PHASE 1: SPARQL Ontology Reasoning
    async getOntologyRecommendations(skinType, concerns) {
        try {
            // Get ingredient recommendations dari ontology
            const ingredientRecommendations = await ontologyService.getSkinTypeRecommendations(skinType, concerns);
            
            if (!ingredientRecommendations.data || ingredientRecommendations.data.length === 0) {
                console.log('⚠️ No ontology recommendations found');
                return [];
            }
            
            // Convert ingredient recommendations ke product recommendations
            const recommendedIngredients = ingredientRecommendations.data.map(r => r.name);
            
            // Find products yang mengandung recommended ingredients
            const client = await this.pool.connect();
            
            try {
                const productQuery = `
                    SELECT DISTINCT 
                        p.id, p.name, p.brand, p.main_category, p.description,
                        p.alcohol_free, p.fragrance_free, p.paraben_free, p.sulfate_free,
                        p.ingredient_list,
                        array_agg(DISTINCT kt.name) as key_ingredients,
                        COUNT(pki.key_type_id) as ingredient_match_count,
                        array_agg(DISTINCT ing_rec.benefit) as ontology_benefits
                    FROM products p
                    LEFT JOIN product_key_ingredients pki ON p.id = pki.product_id
                    LEFT JOIN key_ingredient_types kt ON pki.key_type_id = kt.id
                    LEFT JOIN LATERAL (
                        SELECT UNNEST($1::text[]) as recommended_ingredient,
                               UNNEST($2::text[]) as benefit
                    ) ing_rec ON LOWER(p.ingredient_list) LIKE '%' || LOWER(ing_rec.recommended_ingredient) || '%'
                    WHERE p.is_active = true
                    AND ing_rec.recommended_ingredient IS NOT NULL
                    GROUP BY p.id, p.name, p.brand, p.main_category, p.description,
                             p.alcohol_free, p.fragrance_free, p.paraben_free, p.sulfate_free, p.ingredient_list
                    HAVING COUNT(pki.key_type_id) > 0
                    ORDER BY ingredient_match_count DESC
                    LIMIT 30
                `;
                
                const benefits = ingredientRecommendations.data.map(r => r.benefit || 'skin conditioning');
                const result = await client.query(productQuery, [recommendedIngredients, benefits]);
                
                return result.rows.map(row => ({
                    ...row,
                    recommendation_source: 'ontology',
                    ontology_score: Math.min(95, 60 + (row.ingredient_match_count * 10)),
                    reasoning_data: {
                        matched_ingredients: recommendedIngredients,
                        ontology_benefits: row.ontology_benefits
                    }
                }));
                
            } finally {
                client.release();
            }
            
        } catch (error) {
            console.error('❌ Ontology recommendation error:', error);
            return [];
        }
    }

    // PHASE 2: Database Direct Matching
    async getDatabaseRecommendations(skinType, concerns, sensitivities) {
        try {
            const client = await this.pool.connect();
            
            try {
                // Build dynamic WHERE clause berdasarkan profile
                let whereConditions = ['p.is_active = true'];
                let queryParams = [];
                let paramCount = 0;
                
                // Safety filters berdasarkan sensitivities
                if (sensitivities.includes('fragrance')) {
                    whereConditions.push('p.fragrance_free = true');
                }
                if (sensitivities.includes('alcohol')) {
                    whereConditions.push('p.alcohol_free = true');
                }
                if (sensitivities.includes('paraben')) {
                    whereConditions.push('p.paraben_free = true');
                }
                if (sensitivities.includes('sulfate')) {
                    whereConditions.push('p.sulfate_free = true');
                }
                
                // Concern-based filtering (text search in product descriptions)
                if (concerns.length > 0) {
                    const concernTerms = this.mapConcernsToKeywords(concerns);
                    if (concernTerms.length > 0) {
                        paramCount++;
                        whereConditions.push(`(
                            LOWER(p.name || ' ' || COALESCE(p.description, '')) 
                            SIMILAR TO $${paramCount}
                        )`);
                        queryParams.push(`%(${concernTerms.join('|')})%`);
                    }
                }
                
                const query = `
                    SELECT 
                        p.id, p.name, p.brand, p.main_category, p.subcategory, p.description,
                        p.alcohol_free, p.fragrance_free, p.paraben_free, p.sulfate_free, p.silicone_free,
                        p.ingredient_list, p.key_ingredients_csv,
                        array_agg(DISTINCT kt.display_name) FILTER (WHERE kt.display_name IS NOT NULL) as key_ingredients,
                        COUNT(pki.key_type_id) as key_ingredient_count,
                        p.product_url, p.local_image_path
                    FROM products p
                    LEFT JOIN product_key_ingredients pki ON p.id = pki.product_id
                    LEFT JOIN key_ingredient_types kt ON pki.key_type_id = kt.id
                    WHERE ${whereConditions.join(' AND ')}
                    GROUP BY p.id, p.name, p.brand, p.main_category, p.subcategory, p.description,
                             p.alcohol_free, p.fragrance_free, p.paraben_free, p.sulfate_free, p.silicone_free,
                             p.ingredient_list, p.key_ingredients_csv, p.product_url, p.local_image_path
                    ORDER BY key_ingredient_count DESC, p.name ASC
                    LIMIT 50
                `;
                
                const result = await client.query(query, queryParams);
                
                return result.rows.map(row => ({
                    ...row,
                    recommendation_source: 'database',
                    database_score: this.calculateDatabaseScore(row, skinType, concerns, sensitivities),
                    reasoning_data: {
                        safety_matches: this.getSafetyMatches(row, sensitivities),
                        concern_relevance: this.getConcernRelevance(row, concerns)
                    }
                }));
                
            } finally {
                client.release();
            }
            
        } catch (error) {
            console.error('❌ Database recommendation error:', error);
            return [];
        }
    }

    // PHASE 3: Hybrid Scoring & Merging
    async mergeAndScore(ontologyResults, databaseResults, guestProfile) {
        const allProducts = new Map();
        
        // Merge results by product ID
        [...ontologyResults, ...databaseResults].forEach(product => {
            if (allProducts.has(product.id)) {
                // Merge data dari multiple sources
                const existing = allProducts.get(product.id);
                allProducts.set(product.id, {
                    ...existing,
                    ...product,
                    ontology_score: product.ontology_score || existing.ontology_score || 0,
                    database_score: product.database_score || existing.database_score || 0,
                    recommendation_source: existing.recommendation_source + '+' + product.recommendation_source,
                    reasoning_data: {
                        ...existing.reasoning_data,
                        ...product.reasoning_data
                    }
                });
            } else {
                allProducts.set(product.id, {
                    ...product,
                    ontology_score: product.ontology_score || 0,
                    database_score: product.database_score || 0
                });
            }
        });
        
        // Calculate hybrid scores
        const scoredProducts = Array.from(allProducts.values()).map(product => {
            const hybridScore = this.calculateHybridScore(product, guestProfile);
            
            return {
                ...product,
                hybrid_score: hybridScore,
                confidence_level: this.calculateConfidence(product)
            };
        });
        
        // Sort by hybrid score
        return scoredProducts.sort((a, b) => b.hybrid_score - a.hybrid_score);
    }

    // Calculate weighted hybrid score
    calculateHybridScore(product, guestProfile) {
        const ontologyComponent = (product.ontology_score || 0) * this.weights.ontology_reasoning;
        const databaseComponent = (product.database_score || 0) * this.weights.database_matching;
        const safetyComponent = this.calculateSafetyScore(product, guestProfile.sensitivities) * this.weights.safety_compatibility;
        const synergyComponent = this.calculateSynergyScore(product) * this.weights.ingredient_synergy;
        
        return Math.round(ontologyComponent + databaseComponent + safetyComponent + synergyComponent);
    }

    // Helper methods
    calculateDatabaseScore(product, skinType, concerns, sensitivities) {
        let score = 50; // Base score
        
        // Safety bonus
        if (sensitivities.includes('fragrance') && product.fragrance_free) score += 15;
        if (sensitivities.includes('alcohol') && product.alcohol_free) score += 15;
        if (sensitivities.includes('paraben') && product.paraben_free) score += 15;
        
        // Key ingredient bonus
        score += Math.min(20, (product.key_ingredient_count || 0) * 3);
        
        // Concern relevance
        const concernRelevance = this.getConcernRelevance(product, concerns);
        score += concernRelevance * 10;
        
        return Math.min(100, score);
    }

    calculateSafetyScore(product, sensitivities) {
        if (!sensitivities || sensitivities.length === 0) return 80;
        
        let safetyScore = 100;
        let safetyFeatures = 0;
        
        sensitivities.forEach(sensitivity => {
            switch(sensitivity.toLowerCase()) {
                case 'fragrance':
                    if (product.fragrance_free) safetyFeatures++;
                    else safetyScore -= 20;
                    break;
                case 'alcohol':
                    if (product.alcohol_free) safetyFeatures++;
                    else safetyScore -= 20;
                    break;
                case 'paraben':
                    if (product.paraben_free) safetyFeatures++;
                    else safetyScore -= 20;
                    break;
                case 'sulfate':
                    if (product.sulfate_free) safetyFeatures++;
                    else safetyScore -= 15;
                    break;
            }
        });
        
        return Math.max(0, safetyScore);
    }

    calculateSynergyScore(product) {
        const keyIngredients = product.key_ingredients || [];
        if (keyIngredients.length < 2) return 60;
        
        // Bonus untuk beneficial combinations
        const synergisticPairs = [
            ['niacinamide', 'hyaluronic acid'],
            ['vitamin c', 'vitamin e'],
            ['retinol', 'ceramides'],
            ['aha', 'niacinamide']
        ];
        
        let synergyScore = 60;
        synergisticPairs.forEach(pair => {
            const hasFirst = keyIngredients.some(ing => ing.toLowerCase().includes(pair[0]));
            const hasSecond = keyIngredients.some(ing => ing.toLowerCase().includes(pair[1]));
            if (hasFirst && hasSecond) synergyScore += 10;
        });
        
        return Math.min(100, synergyScore);
    }

    calculateConfidence(product) {
        const hasOntology = product.ontology_score > 0;
        const hasDatabase = product.database_score > 0;
        const hasKeyIngredients = (product.key_ingredient_count || 0) > 0;
        
        if (hasOntology && hasDatabase && hasKeyIngredients) return 'high';
        if ((hasOntology || hasDatabase) && hasKeyIngredients) return 'medium';
        return 'low';
    }

    // PHASE 4: Generate Explanations
    async generateExplanations(products, guestProfile) {
        return products.map(product => ({
            ...product,
            explanation: this.buildExplanation(product, guestProfile),
            recommendation_reasons: this.buildRecommendationReasons(product, guestProfile)
        }));
    }

    buildExplanation(product, guestProfile) {
        const reasons = [];
        
        if (product.ontology_score > 70) {
            reasons.push(`🧠 Semantically matched for ${guestProfile.skin_type} skin based on ingredient ontology`);
        }
        
        if (product.reasoning_data?.safety_matches?.length > 0) {
            reasons.push(`🛡️ Safe choice: ${product.reasoning_data.safety_matches.join(', ')}`);
        }
        
        if (product.key_ingredient_count > 0) {
            reasons.push(`🔑 Contains ${product.key_ingredient_count} beneficial key ingredients`);
        }
        
        if (product.confidence_level === 'high') {
            reasons.push(`✅ High confidence recommendation from ontology analysis`);
        }
        
        return reasons.join(' • ');
    }

    buildRecommendationReasons(product, guestProfile) {
        return {
            ontology_reasoning: product.reasoning_data?.matched_ingredients || [],
            safety_compatibility: product.reasoning_data?.safety_matches || [],
            ingredient_benefits: product.reasoning_data?.ontology_benefits || [],
            overall_score: product.hybrid_score,
            confidence: product.confidence_level
        };
    }

    // Utility methods
    mapConcernsToKeywords(concerns) {
        const concernMap = {
            'acne': ['acne', 'blemish', 'salicylic', 'benzoyl peroxide'],
            'wrinkles': ['anti-aging', 'retinol', 'peptide', 'collagen'],
            'dark_spots': ['brightening', 'vitamin c', 'kojic', 'arbutin'],
            'dryness': ['moisturizing', 'hydrating', 'hyaluronic', 'ceramide'],
            'sensitivity': ['gentle', 'sensitive', 'soothing', 'calming']
        };
        
        return concerns.flatMap(concern => concernMap[concern.toLowerCase()] || []);
    }

    getSafetyMatches(product, sensitivities) {
        const matches = [];
        
        if (sensitivities.includes('fragrance') && product.fragrance_free) matches.push('fragrance-free');
        if (sensitivities.includes('alcohol') && product.alcohol_free) matches.push('alcohol-free');
        if (sensitivities.includes('paraben') && product.paraben_free) matches.push('paraben-free');
        if (sensitivities.includes('sulfate') && product.sulfate_free) matches.push('sulfate-free');
        
        return matches;
    }

    getConcernRelevance(product, concerns) {
        const productText = `${product.name} ${product.description || ''}`.toLowerCase();
        const keywords = this.mapConcernsToKeywords(concerns);
        
        return keywords.filter(keyword => productText.includes(keyword)).length / Math.max(1, keywords.length);
    }

    generateSystemExplanation(skinType, concerns, sensitivities) {
        return {
            approach: "Hybrid ontology-based recommendation system",
            reasoning: `Combining semantic web reasoning (SPARQL) with database matching for ${skinType} skin`,
            factors_considered: [
                "Ingredient ontology semantic relationships",
                "Product-ingredient database mappings", 
                "Safety compatibility with sensitivities",
                "Key ingredient synergistic effects"
            ],
            personalization: {
                skin_type: skinType,
                concerns: concerns,
                sensitivities: sensitivities
            }
        };
    }

    // FALLBACK: Pure database recommendations jika SPARQL gagal
    async getFallbackRecommendations(guestProfile) {
        console.log('🔄 Using fallback database-only recommendations...');
        
        try {
            const databaseResults = await this.getDatabaseRecommendations(
                guestProfile.skin_type, 
                guestProfile.concerns || [], 
                guestProfile.sensitivities || []
            );
            
            const enrichedResults = await this.generateExplanations(databaseResults, guestProfile);
            
            return {
                recommendations: enrichedResults.slice(0, 12),
                metadata: {
                    total_candidates: databaseResults.length,
                    fallback_mode: true,
                    algorithm_version: 'fallback_v1.0'
                },
                reasoning_explanation: {
                    approach: "Database-only recommendation (ontology unavailable)",
                    note: "Using direct product matching without semantic reasoning"
                }
            };
            
        } catch (error) {
            console.error('❌ Fallback recommendation also failed:', error);
            throw new Error('Recommendation system temporarily unavailable');
        }
    }
}

module.exports = new HybridRecommendationEngine();