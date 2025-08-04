const ontologyService = require('./ontologyService');

class OntologyReasoningEngine {
    constructor() {
        this.rules = {
            skinTypeRules: new Map(),
            concernRules: new Map(),
            incompatibilityRules: new Map(),
            synergyRules: new Map(),
            safetyRules: new Map()
        };
        
        this.initializeRules();
        console.log('🧠 Ontology Reasoning Engine initialized with explicit rules');
    }

    // ==========================================
    // RULE INITIALIZATION
    // ==========================================
    
    initializeRules() {
        this.initializeSkinTypeRules();
        this.initializeConcernRules();
        this.initializeIncompatibilityRules();
        this.initializeSynergyRules();
        this.initializeSafetyRules();
    }

    initializeSkinTypeRules() {
        // OILY SKIN RULES
        this.rules.skinTypeRules.set('oily', {
            beneficial_ingredients: [
                'niacinamide', 'salicylic acid', 'zinc oxide', 'tea tree oil',
                'benzoyl peroxide', 'retinol', 'clay', 'charcoal'
            ],
            avoid_ingredients: [
                'heavy oils', 'coconut oil', 'shea butter', 'lanolin',
                'petrolatum', 'mineral oil'
            ],
            preferred_functions: [
                'oil_control', 'pore_minimizing', 'antimicrobial', 'exfoliating'
            ],
            reasoning: 'Oily skin benefits from sebum-regulating and pore-clearing ingredients'
        });

        // DRY SKIN RULES
        this.rules.skinTypeRules.set('dry', {
            beneficial_ingredients: [
                'hyaluronic acid', 'ceramides', 'glycerin', 'squalane',
                'shea butter', 'jojoba oil', 'peptides', 'urea'
            ],
            avoid_ingredients: [
                'alcohol denat', 'strong acids', 'sulfates', 'menthol'
            ],
            preferred_functions: [
                'moisturizing', 'barrier_repair', 'hydrating', 'emollient'
            ],
            reasoning: 'Dry skin requires intensive hydration and barrier repair'
        });

        // SENSITIVE SKIN RULES
        this.rules.skinTypeRules.set('sensitive', {
            beneficial_ingredients: [
                'centella asiatica', 'allantoin', 'panthenol', 'chamomile',
                'aloe vera', 'colloidal oatmeal', 'zinc oxide'
            ],
            avoid_ingredients: [
                'fragrance', 'essential oils', 'alcohol', 'strong acids',
                'retinol', 'benzoyl peroxide'
            ],
            preferred_functions: [
                'soothing', 'anti_inflammatory', 'calming', 'gentle'
            ],
            reasoning: 'Sensitive skin needs gentle, anti-inflammatory ingredients'
        });

        // COMBINATION SKIN RULES
        this.rules.skinTypeRules.set('combination', {
            beneficial_ingredients: [
                'niacinamide', 'hyaluronic acid', 'salicylic acid', 'glycerin',
                'zinc', 'green tea', 'ceramides'
            ],
            avoid_ingredients: [
                'heavy oils on t-zone', 'over-drying alcohols'
            ],
            preferred_functions: [
                'balancing', 'hydrating', 'oil_control', 'gentle_exfoliating'
            ],
            reasoning: 'Combination skin needs balanced approach for different zones'
        });
    }

    initializeConcernRules() {
        // ACNE RULES
        this.rules.concernRules.set('acne', {
            primary_ingredients: [
                'salicylic acid', 'benzoyl peroxide', 'niacinamide', 'zinc',
                'tea tree oil', 'retinol', 'azelaic acid'
            ],
            supporting_ingredients: [
                'centella asiatica', 'green tea', 'sulfur', 'clay'
            ],
            avoid_ingredients: [
                'comedogenic oils', 'heavy silicones', 'artificial fragrances'
            ],
            mechanism: 'Antimicrobial, anti-inflammatory, and pore-clearing action',
            confidence_score: 0.9
        });

        // AGING RULES
        this.rules.concernRules.set('aging', {
            primary_ingredients: [
                'retinol', 'vitamin c', 'peptides', 'hyaluronic acid',
                'niacinamide', 'alpha hydroxy acids', 'coenzyme q10'
            ],
            supporting_ingredients: [
                'ceramides', 'antioxidants', 'collagen boosters'
            ],
            avoid_ingredients: [
                'harsh scrubs', 'over-drying alcohols'
            ],
            mechanism: 'Collagen stimulation, antioxidant protection, cell renewal',
            confidence_score: 0.85
        });

        // HYPERPIGMENTATION RULES
        this.rules.concernRules.set('hyperpigmentation', {
            primary_ingredients: [
                'vitamin c', 'kojic acid', 'arbutin', 'niacinamide',
                'alpha arbutin', 'licorice extract', 'azelaic acid'
            ],
            supporting_ingredients: [
                'vitamin e', 'ferulic acid', 'tranexamic acid'
            ],
            avoid_ingredients: [
                'harsh scrubs', 'irritating acids without proper pH'
            ],
            mechanism: 'Melanin inhibition, antioxidant protection, gentle exfoliation',
            confidence_score: 0.8
        });
    }

    initializeIncompatibilityRules() {
        // ACID INCOMPATIBILITIES
        this.rules.incompatibilityRules.set('retinol_acids', {
            ingredient1: 'retinol',
            ingredient2_pattern: ['salicylic acid', 'glycolic acid', 'lactic acid'],
            severity: 'high',
            reason: 'Increased irritation and sensitivity risk',
            recommendation: 'Use on alternate days or different times'
        });

        this.rules.incompatibilityRules.set('vitamin_c_acids', {
            ingredient1: 'vitamin c',
            ingredient2_pattern: ['salicylic acid', 'retinol'],
            severity: 'medium',
            reason: 'pH incompatibility and potential irritation',
            recommendation: 'Use vitamin C in AM, acids in PM'
        });

        this.rules.incompatibilityRules.set('benzoyl_retinol', {
            ingredient1: 'benzoyl peroxide',
            ingredient2_pattern: ['retinol', 'tretinoin'],
            severity: 'high',
            reason: 'Oxidation and severe irritation risk',
            recommendation: 'Never use together, alternate days minimum'
        });
    }

    initializeSynergyRules() {
        // POWERFUL SYNERGIES
        this.rules.synergyRules.set('vitamin_c_e', {
            ingredients: ['vitamin c', 'vitamin e'],
            synergy_type: 'antioxidant_boost',
            benefit_multiplier: 1.5,
            mechanism: 'Vitamin E regenerates oxidized Vitamin C',
            confidence: 0.95
        });

        this.rules.synergyRules.set('niacinamide_hyaluronic', {
            ingredients: ['niacinamide', 'hyaluronic acid'],
            synergy_type: 'hydration_barrier',
            benefit_multiplier: 1.3,
            mechanism: 'Niacinamide strengthens barrier while HA provides hydration',
            confidence: 0.9
        });

        this.rules.synergyRules.set('ceramides_cholesterol', {
            ingredients: ['ceramides', 'cholesterol', 'fatty acids'],
            synergy_type: 'barrier_repair',
            benefit_multiplier: 1.4,
            mechanism: 'Mimics natural skin barrier composition',
            confidence: 0.85
        });
    }

    initializeSafetyRules() {
        // PREGNANCY SAFETY
        this.rules.safetyRules.set('pregnancy_avoid', {
            unsafe_ingredients: [
                'retinol', 'tretinoin', 'salicylic acid', 'hydroquinone',
                'benzoyl peroxide', 'chemical sunscreens'
            ],
            severity: 'critical',
            alternative_suggestions: [
                'bakuchiol', 'azelaic acid', 'vitamin c', 'zinc oxide'
            ]
        });

        // SENSITIVE SKIN SAFETY
        this.rules.safetyRules.set('sensitive_avoid', {
            unsafe_ingredients: [
                'fragrance', 'essential oils', 'alcohol denat', 'sulfates',
                'parabens', 'formaldehyde releasers'
            ],
            severity: 'high',
            alternative_suggestions: [
                'fragrance-free formulas', 'gentle surfactants', 'natural preservatives'
            ]
        });
    }

    // ==========================================
    // REASONING EXECUTION
    // ==========================================

    async executeReasoningRules(guestProfile, candidateProducts) {
        console.log('🧠 Executing explicit reasoning rules...');
        
        const reasoningResults = {
            skin_type_analysis: await this.applySkinTypeRules(guestProfile.skin_type, candidateProducts),
            concern_analysis: await this.applyConcernRules(guestProfile.concerns, candidateProducts),
            safety_analysis: await this.applySafetyRules(guestProfile, candidateProducts),
            compatibility_analysis: await this.applyCompatibilityRules(candidateProducts),
            synergy_analysis: await this.applySynergyRules(candidateProducts)
        };

        return this.synthesizeReasoningResults(reasoningResults, candidateProducts);
    }

    async applySkinTypeRules(skinType, products) {
        const rules = this.rules.skinTypeRules.get(skinType.toLowerCase());
        if (!rules) return { analyzed: false, reason: 'No rules for skin type' };

        const analysis = products.map(product => {
            const ingredients = this.extractIngredients(product);
            
            const beneficialMatches = this.countMatches(ingredients, rules.beneficial_ingredients);
            const avoidMatches = this.countMatches(ingredients, rules.avoid_ingredients);
            
            const skinTypeScore = Math.max(0, (beneficialMatches * 10) - (avoidMatches * 15));
            
            return {
                product_id: product.id,
                skin_type_score: skinTypeScore,
                beneficial_ingredients_found: beneficialMatches,
                problematic_ingredients_found: avoidMatches,
                reasoning: rules.reasoning,
                rule_confidence: 0.9
            };
        });

        return { analyzed: true, results: analysis };
    }

    async applyConcernRules(concerns, products) {
        if (!concerns || concerns.length === 0) {
            return { analyzed: false, reason: 'No concerns specified' };
        }

        const analysis = products.map(product => {
            const ingredients = this.extractIngredients(product);
            let totalConcernScore = 0;
            const concernDetails = [];

            for (const concern of concerns) {
                const rules = this.rules.concernRules.get(concern.toLowerCase());
                if (rules) {
                    const primaryMatches = this.countMatches(ingredients, rules.primary_ingredients);
                    const supportingMatches = this.countMatches(ingredients, rules.supporting_ingredients);
                    const avoidMatches = this.countMatches(ingredients, rules.avoid_ingredients);
                    
                    const concernScore = (primaryMatches * 15) + (supportingMatches * 5) - (avoidMatches * 10);
                    totalConcernScore += concernScore * rules.confidence_score;
                    
                    concernDetails.push({
                        concern,
                        score: concernScore,
                        primary_matches: primaryMatches,
                        supporting_matches: supportingMatches,
                        avoid_matches: avoidMatches,
                        mechanism: rules.mechanism
                    });
                }
            }

            return {
                product_id: product.id,
                total_concern_score: Math.round(totalConcernScore),
                concern_details: concernDetails,
                concerns_addressed: concernDetails.filter(c => c.score > 0).length
            };
        });

        return { analyzed: true, results: analysis };
    }

    async applySafetyRules(guestProfile, products) {
        const analysis = products.map(product => {
            const ingredients = this.extractIngredients(product);
            const safetyIssues = [];
            let safetyScore = 100;

            // Check pregnancy safety if applicable
            if (guestProfile.pregnancy_safe) {
                const pregnancyRules = this.rules.safetyRules.get('pregnancy_avoid');
                const unsafeMatches = this.countMatches(ingredients, pregnancyRules.unsafe_ingredients);
                if (unsafeMatches > 0) {
                    safetyScore -= unsafeMatches * 30;
                    safetyIssues.push({
                        type: 'pregnancy_concern',
                        severity: 'critical',
                        unsafe_ingredients_found: unsafeMatches
                    });
                }
            }

            // Check sensitivity safety
            if (guestProfile.skin_type === 'sensitive' || guestProfile.sensitivities?.length > 0) {
                const sensitiveRules = this.rules.safetyRules.get('sensitive_avoid');
                const sensitiveMatches = this.countMatches(ingredients, sensitiveRules.unsafe_ingredients);
                if (sensitiveMatches > 0) {
                    safetyScore -= sensitiveMatches * 20;
                    safetyIssues.push({
                        type: 'sensitivity_concern',
                        severity: 'high',
                        problematic_ingredients_found: sensitiveMatches
                    });
                }
            }

            return {
                product_id: product.id,
                safety_score: Math.max(0, safetyScore),
                safety_issues: safetyIssues,
                safety_status: safetyScore >= 80 ? 'safe' : safetyScore >= 60 ? 'caution' : 'avoid'
            };
        });

        return { analyzed: true, results: analysis };
    }

    async applyCompatibilityRules(products) {
        const analysis = products.map(product => {
            const ingredients = this.extractIngredients(product);
            const conflicts = [];
            let compatibilityScore = 100;

            // Check all incompatibility rules
            for (const [ruleKey, rule] of this.rules.incompatibilityRules) {
                const hasIngredient1 = ingredients.some(ing => 
                    ing.toLowerCase().includes(rule.ingredient1.toLowerCase())
                );
                
                if (hasIngredient1) {
                    const hasIncompatible = rule.ingredient2_pattern.some(pattern =>
                        ingredients.some(ing => ing.toLowerCase().includes(pattern.toLowerCase()))
                    );

                    if (hasIncompatible) {
                        const severityPenalty = rule.severity === 'high' ? 25 : rule.severity === 'medium' ? 15 : 10;
                        compatibilityScore -= severityPenalty;
                        
                        conflicts.push({
                            rule_triggered: ruleKey,
                            severity: rule.severity,
                            reason: rule.reason,
                            recommendation: rule.recommendation,
                            ingredients_involved: [rule.ingredient1, ...rule.ingredient2_pattern]
                        });
                    }
                }
            }

            return {
                product_id: product.id,
                compatibility_score: Math.max(0, compatibilityScore),
                conflicts_found: conflicts.length,
                conflict_details: conflicts,
                compatibility_status: compatibilityScore >= 80 ? 'excellent' : compatibilityScore >= 60 ? 'good' : 'problematic'
            };
        });

        return { analyzed: true, results: analysis };
    }

    async applySynergyRules(products) {
        const analysis = products.map(product => {
            const ingredients = this.extractIngredients(product);
            const synergies = [];
            let synergyScore = 0;

            // Check all synergy rules
            for (const [ruleKey, rule] of this.rules.synergyRules) {
                const hasAllIngredients = rule.ingredients.every(requiredIng =>
                    ingredients.some(ing => ing.toLowerCase().includes(requiredIng.toLowerCase()))
                );

                if (hasAllIngredients) {
                    const synergyBonus = Math.round(rule.benefit_multiplier * 20 * rule.confidence);
                    synergyScore += synergyBonus;
                    
                    synergies.push({
                        synergy_type: rule.synergy_type,
                        ingredients_involved: rule.ingredients,
                        benefit_multiplier: rule.benefit_multiplier,
                        mechanism: rule.mechanism,
                        confidence: rule.confidence,
                        bonus_points: synergyBonus
                    });
                }
            }

            return {
                product_id: product.id,
                synergy_score: synergyScore,
                synergies_found: synergies.length,
                synergy_details: synergies,
                synergy_status: synergyScore >= 40 ? 'excellent' : synergyScore >= 20 ? 'good' : 'basic'
            };
        });

        return { analyzed: true, results: analysis };
    }

    synthesizeReasoningResults(reasoningResults, products) {
        console.log('🔬 Synthesizing reasoning results...');
        
        const synthesizedProducts = products.map(product => {
            const productId = product.id;
            
            // Get analysis results for this product
            const skinTypeResult = reasoningResults.skin_type_analysis.results?.find(r => r.product_id === productId);
            const concernResult = reasoningResults.concern_analysis.results?.find(r => r.product_id === productId);
            const safetyResult = reasoningResults.safety_analysis.results?.find(r => r.product_id === productId);
            const compatibilityResult = reasoningResults.compatibility_analysis.results?.find(r => r.product_id === productId);
            const synergyResult = reasoningResults.synergy_analysis.results?.find(r => r.product_id === productId);

            // Calculate composite reasoning score
            const reasoningScore = this.calculateCompositeReasoningScore({
                skinTypeScore: skinTypeResult?.skin_type_score || 0,
                concernScore: concernResult?.total_concern_score || 0,
                safetyScore: safetyResult?.safety_score || 50,
                compatibilityScore: compatibilityResult?.compatibility_score || 50,
                synergyScore: synergyResult?.synergy_score || 0
            });

            // Generate comprehensive explanation
            const reasoningExplanation = this.generateReasoningExplanation({
                skinTypeResult,
                concernResult,
                safetyResult,
                compatibilityResult,
                synergyResult
            });

            return {
                ...product,
                reasoning_analysis: {
                    composite_reasoning_score: reasoningScore,
                    skin_type_analysis: skinTypeResult,
                    concern_analysis: concernResult,
                    safety_analysis: safetyResult,
                    compatibility_analysis: compatibilityResult,
                    synergy_analysis: synergyResult,
                    reasoning_explanation: reasoningExplanation,
                    reasoning_confidence: this.calculateReasoningConfidence(reasoningScore, safetyResult, compatibilityResult)
                }
            };
        });

        // Sort by composite reasoning score
        synthesizedProducts.sort((a, b) => 
            b.reasoning_analysis.composite_reasoning_score - a.reasoning_analysis.composite_reasoning_score
        );

        console.log(`✅ Reasoning synthesis completed for ${synthesizedProducts.length} products`);
        
        return {
            products: synthesizedProducts,
            reasoning_metadata: {
                rules_applied: {
                    skin_type_rules: reasoningResults.skin_type_analysis.analyzed,
                    concern_rules: reasoningResults.concern_analysis.analyzed,
                    safety_rules: reasoningResults.safety_analysis.analyzed,
                    compatibility_rules: reasoningResults.compatibility_analysis.analyzed,
                    synergy_rules: reasoningResults.synergy_analysis.analyzed
                },
                top_score: synthesizedProducts[0]?.reasoning_analysis?.composite_reasoning_score || 0,
                products_with_high_confidence: synthesizedProducts.filter(p => 
                    p.reasoning_analysis.reasoning_confidence === 'high'
                ).length
            }
        };
    }

    calculateCompositeReasoningScore({ skinTypeScore, concernScore, safetyScore, compatibilityScore, synergyScore }) {
        // Weighted scoring system
        const weights = {
            safety: 0.3,        // Safety is most important
            skinType: 0.25,     // Skin type compatibility
            concerns: 0.25,     // Addressing specific concerns
            compatibility: 0.15, // Ingredient compatibility
            synergy: 0.05       // Bonus for synergies
        };

        const normalizedScores = {
            safety: Math.min(100, safetyScore),
            skinType: Math.min(100, Math.max(0, skinTypeScore)),
            concerns: Math.min(100, Math.max(0, concernScore)),
            compatibility: Math.min(100, compatibilityScore),
            synergy: Math.min(50, synergyScore) * 2 // Normalize synergy to 100 scale
        };

        const compositeScore = Math.round(
            normalizedScores.safety * weights.safety +
            normalizedScores.skinType * weights.skinType +
            normalizedScores.concerns * weights.concerns +
            normalizedScores.compatibility * weights.compatibility +
            normalizedScores.synergy * weights.synergy
        );

        return Math.min(100, Math.max(0, compositeScore));
    }

    generateReasoningExplanation({ skinTypeResult, concernResult, safetyResult, compatibilityResult, synergyResult }) {
    const explanations = [];

    // Skin type explanation
    if (skinTypeResult && skinTypeResult.skin_type_score > 0) {
        explanations.push(`✅ Skin Type Match: ${skinTypeResult.beneficial_ingredients_found} beneficial ingredients found`);
    }

    // Concern explanation
    if (concernResult && concernResult.concerns_addressed > 0) {
        explanations.push(`🎯 Addresses ${concernResult.concerns_addressed} of your concerns with targeted ingredients`);
    }

    // Safety explanation
    if (safetyResult) {
        if (safetyResult.safety_score >= 80) {
            explanations.push(`🛡️ Safety: Excellent safety profile with no major concerns`);
        } else if (safetyResult.safety_issues.length > 0) {
            explanations.push(`⚠️ Safety: ${safetyResult.safety_issues.length} potential concerns identified`);
        }
    }

    // Compatibility explanation
    if (compatibilityResult) {
        if (compatibilityResult.conflicts_found === 0) {
            explanations.push(`🤝 Compatibility: No ingredient conflicts detected`);
        } else {
            explanations.push(`⚠️ Compatibility: ${compatibilityResult.conflicts_found} potential conflicts found`);
        }
    }

    // Synergy explanation
    if (synergyResult && synergyResult.synergies_found > 0) {
        explanations.push(`⚡ Synergies: ${synergyResult.synergies_found} beneficial ingredient combinations detected`);
    }

    return explanations.length > 0 ? explanations.join(' • ') : 'Basic compatibility analysis completed';
}

    // Add the missing calculateReasoningConfidence method
    calculateReasoningConfidence(reasoningScore, safetyResult, compatibilityResult) {
        let confidence = 'medium';
        
        if (reasoningScore >= 80 && 
            safetyResult?.safety_score >= 80 && 
            compatibilityResult?.conflicts_found === 0) {
            confidence = 'high';
        } else if (reasoningScore < 50 || 
                safetyResult?.safety_score < 60 || 
                compatibilityResult?.conflicts_found > 2) {
            confidence = 'low';
        }
        
        return confidence;
    }

    // Add the missing utility methods
    extractIngredients(product) {
        if (!product.ingredient_list) return [];
        
        return product.ingredient_list
            .split(/[,\n|]/)
            .map(ingredient => ingredient.trim().toLowerCase())
            .filter(ingredient => ingredient.length > 0);
    }

    countMatches(productIngredients, targetIngredients) {
        return targetIngredients.filter(target =>
            productIngredients.some(ingredient =>
                ingredient.includes(target.toLowerCase()) || target.toLowerCase().includes(ingredient)
            )
        ).length;
    }

    // Add rule management methods
    addCustomRule(category, ruleKey, ruleData) {
        if (this.rules[category]) {
            this.rules[category].set(ruleKey, ruleData);
            console.log(`✅ Added custom rule: ${ruleKey} to ${category}`);
            return true;
        }
        return false;
    }

    getRuleCategories() {
        return Object.keys(this.rules);
    }

    getRulesForCategory(category) {
        return this.rules[category] ? Array.from(this.rules[category].entries()) : [];
    }
    
    generateAcademicAnalysis(reasoningResults, processingTime) {
        return {
            methodology: "Explicit Rule-Based Ontology Reasoning Engine",
            technical_approach: {
                rule_categories: 5,
                total_rules_applied: this.getTotalRulesCount(),
                reasoning_depth: "Multi-dimensional analysis with weighted scoring",
                confidence_assessment: "High (explicit rule-based reasoning)"
            },
            performance_metrics: {
                processing_time_ms: processingTime,
                rules_execution_success: this.calculateRuleExecutionSuccess(reasoningResults),
                reasoning_coverage: this.calculateReasoningCoverage(reasoningResults)
            },
            academic_contribution: [
                "Demonstrates practical application of explicit reasoning rules in skincare domain",
                "Implements multi-criteria decision analysis for personalized recommendations",
                "Validates rule-based approach for ingredient compatibility assessment",
                "Provides framework for safety-first recommendation systems"
            ]
        };
    }

    getTotalRulesCount() {
        return this.rules.skinTypeRules.size + 
            this.rules.concernRules.size + 
            this.rules.incompatibilityRules.size + 
            this.rules.synergyRules.size + 
            this.rules.safetyRules.size;
    }

    calculateRuleExecutionSuccess(reasoningResults) {
        const totalAnalyses = 5; // skin_type, concern, safety, compatibility, synergy
        const successfulAnalyses = Object.values(reasoningResults).filter(result => result.analyzed).length;
        return Math.round((successfulAnalyses / totalAnalyses) * 100);
    }

    calculateReasoningCoverage(reasoningResults) {
        // Calculate how comprehensively the reasoning covered the input
        const coverageMetrics = {
            skin_type_coverage: reasoningResults.skin_type_analysis.analyzed ? 100 : 0,
            concern_coverage: reasoningResults.concern_analysis.analyzed ? 100 : 0,
            safety_coverage: reasoningResults.safety_analysis.analyzed ? 100 : 0,
            compatibility_coverage: reasoningResults.compatibility_analysis.analyzed ? 100 : 0,
            synergy_coverage: reasoningResults.synergy_analysis.analyzed ? 100 : 0
        };
        
        const averageCoverage = Object.values(coverageMetrics).reduce((sum, val) => sum + val, 0) / 5;
        return Math.round(averageCoverage);
    }
    

    // ==========================================
    // SPARQL INTEGRATION
    // ==========================================

    async enhanceWithSparqlReasoning(reasoningResults, guestProfile) {
        console.log('🔗 Enhancing reasoning with SPARQL queries...');
        
        try {
            // Get additional ontology insights
            const sparqlInsights = await this.getSparqlReasoningInsights(guestProfile);
            
            // Merge SPARQL insights with rule-based reasoning
            return this.mergeSparqlWithRules(reasoningResults, sparqlInsights);
            
        } catch (error) {
            console.warn('⚠️ SPARQL enhancement failed, using rule-based reasoning only:', error.message);
            return reasoningResults;
        }
    }

    async getSparqlReasoningInsights(guestProfile) {
        const insights = {};
        
        // Get skin type specific insights
        if (guestProfile.skin_type) {
            insights.skinTypeInsights = await ontologyService.getSkinTypeRecommendations(guestProfile.skin_type);
        }
        
        // Get concern specific insights
        if (guestProfile.concerns && guestProfile.concerns.length > 0) {
            insights.concernInsights = await ontologyService.getConcernRecommendations(guestProfile.concerns);
        }
        
        // Get ingredient compatibility insights
        insights.compatibilityInsights = await ontologyService.getIngredientCompatibilities();
        
        // Get synergy insights
        insights.synergyInsights = await ontologyService.getIngredientSynergies();
        
        return insights;
    }

    mergeSparqlWithRules(reasoningResults, sparqlInsights) {
        console.log('🔀 Merging SPARQL insights with rule-based reasoning...');
        
        // Enhance products with SPARQL data
        const enhancedProducts = reasoningResults.products.map(product => {
            const enhanced = { ...product };
            
            // Add SPARQL-derived confidence boosts
            if (sparqlInsights.skinTypeInsights) {
                enhanced.reasoning_analysis.sparql_skin_type_confidence = 
                    this.calculateSparqlConfidence(product, sparqlInsights.skinTypeInsights);
            }
            
            if (sparqlInsights.concernInsights) {
                enhanced.reasoning_analysis.sparql_concern_confidence = 
                    this.calculateSparqlConfidence(product, sparqlInsights.concernInsights);
            }
            
            // Adjust composite score with SPARQL insights
            const sparqlBonus = this.calculateSparqlBonus(product, sparqlInsights);
            enhanced.reasoning_analysis.composite_reasoning_score = Math.min(100, 
                enhanced.reasoning_analysis.composite_reasoning_score + sparqlBonus
            );
            
            enhanced.reasoning_analysis.sparql_enhanced = true;
            
            return enhanced;
        });
        
        return {
            ...reasoningResults,
            products: enhancedProducts,
            sparql_insights: sparqlInsights
        };
    }

    calculateSparqlConfidence(product, sparqlData) {
        // Calculate confidence based on SPARQL query results
        if (!sparqlData || sparqlData.length === 0) return 0;
        
        const productIngredients = this.extractIngredients(product);
        const sparqlMatches = sparqlData.filter(insight => 
            productIngredients.some(ing => 
                ing.toLowerCase().includes(insight.ingredient?.toLowerCase() || '')
            )
        );
        
        return Math.min(20, sparqlMatches.length * 5); // Max 20 point bonus
    }

    calculateSparqlBonus(product, sparqlInsights) {
        let bonus = 0;
        
        if (sparqlInsights.skinTypeInsights) {
            bonus += this.calculateSparqlConfidence(product, sparqlInsights.skinTypeInsights);
        }
        
        if (sparqlInsights.concernInsights) {
            bonus += this.calculateSparqlConfidence(product, sparqlInsights.concernInsights);
        }
        
        return Math.min(15, bonus); // Max 15 point total bonus
    }

    // ==========================================
    // PUBLIC API METHODS
    // ==========================================

    async getReasoningExplanation(productId, guestProfile) {
        console.log(`🔍 Getting detailed reasoning explanation for product ${productId}...`);
        
        try {
            // Get product data
            const product = await this.getProductById(productId);
            if (!product) {
                throw new Error('Product not found');
            }
            
            // Run reasoning analysis for single product
            const reasoningResults = await this.executeReasoningRules(guestProfile, [product]);
            
            const productAnalysis = reasoningResults.products[0];
            
            return {
                product_id: productId,
                reasoning_explanation: productAnalysis.reasoning_analysis.reasoning_explanation,
                detailed_analysis: {
                    skin_type_analysis: productAnalysis.reasoning_analysis.skin_type_analysis,
                    concern_analysis: productAnalysis.reasoning_analysis.concern_analysis,
                    safety_analysis: productAnalysis.reasoning_analysis.safety_analysis,
                    compatibility_analysis: productAnalysis.reasoning_analysis.compatibility_analysis,
                    synergy_analysis: productAnalysis.reasoning_analysis.synergy_analysis
                },
                composite_score: productAnalysis.reasoning_analysis.composite_reasoning_score,
                confidence: productAnalysis.reasoning_analysis.reasoning_confidence,
                recommendations: this.generateDetailedRecommendations(productAnalysis, guestProfile)
            };
            
        } catch (error) {
            console.error('❌ Failed to get reasoning explanation:', error.message);
            throw error;
        }
    }

    generateDetailedRecommendations(productAnalysis, guestProfile) {
        const recommendations = [];
        
        const analysis = productAnalysis.reasoning_analysis;
        
        // Safety recommendations
        if (analysis.safety_analysis?.safety_issues?.length > 0) {
            recommendations.push({
                type: 'safety',
                priority: 'high',
                message: 'Consider patch testing before use due to potential sensitivity concerns',
                details: analysis.safety_analysis.safety_issues
            });
        }
        
        // Compatibility recommendations
        if (analysis.compatibility_analysis?.conflicts_found > 0) {
            recommendations.push({
                type: 'compatibility',
                priority: 'medium',
                message: 'Be cautious when combining with other active ingredients',
                details: analysis.compatibility_analysis.conflict_details
            });
        }
        
        // Usage recommendations
        if (analysis.synergy_analysis?.synergies_found > 0) {
            recommendations.push({
                type: 'synergy',
                priority: 'low',
                message: 'This product contains synergistic ingredients that work well together',
                details: analysis.synergy_analysis.synergy_details
            });
        }
        
        // Skin type specific recommendations
        if (guestProfile.skin_type && analysis.skin_type_analysis) {
            const skinTypeAdvice = this.getSkinTypeSpecificAdvice(guestProfile.skin_type, analysis.skin_type_analysis);
            if (skinTypeAdvice) {
                recommendations.push(skinTypeAdvice);
            }
        }
        
        return recommendations;
    }

    getSkinTypeSpecificAdvice(skinType, skinTypeAnalysis) {
        const adviceMap = {
            'oily': {
                type: 'usage',
                priority: 'medium',
                message: 'Use in PM routine and follow with lightweight moisturizer',
                tip: 'Start with every other day to build tolerance'
            },
            'dry': {
                type: 'usage',
                priority: 'medium',
                message: 'Layer with hydrating serums and seal with occlusive moisturizer',
                tip: 'Apply to damp skin for better absorption'
            },
            'sensitive': {
                type: 'usage',
                priority: 'high',
                message: 'Introduce gradually and monitor for any irritation',
                tip: 'Always patch test new products for 24-48 hours'
            },
            'combination': {
                type: 'usage',
                priority: 'medium',
                message: 'Focus application on areas that need it most',
                tip: 'Use different products for T-zone and cheek areas if needed'
            }
        };
        
        return adviceMap[skinType.toLowerCase()] || null;
    }

    async getProductById(productId) {
        // This would typically query your database
        // For now, return a placeholder that integrates with your existing product service
        try {
            const { Pool } = require('pg');
            const pool = new Pool({
                user: process.env.DB_USER,
                host: process.env.DB_HOST,
                database: process.env.DB_NAME,
                password: process.env.DB_PASSWORD,
                port: process.env.DB_PORT,
            });
            
            const query = `
                SELECT p.*, b.name as brand_name,
                       array_agg(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL) as ingredient_names
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN product_ingredients pi ON p.id = pi.product_id
                LEFT JOIN ingredients i ON pi.ingredient_id = i.id
                WHERE p.id = $1
                GROUP BY p.id, b.name
            `;
            
            const result = await pool.query(query, [productId]);
            return result.rows[0] || null;
            
        } catch (error) {
            console.error('❌ Failed to get product:', error.message);
            return null;
        }
    }

    // ==========================================
    // RULE MANAGEMENT
    // ==========================================

    addCustomRule(ruleType, ruleKey, ruleData) {
        if (!this.rules[ruleType]) {
            throw new Error(`Invalid rule type: ${ruleType}`);
        }
        
        this.rules[ruleType].set(ruleKey, ruleData);
        console.log(`✅ Added custom ${ruleType} rule: ${ruleKey}`);
    }

    removeRule(ruleType, ruleKey) {
        if (!this.rules[ruleType]) {
            throw new Error(`Invalid rule type: ${ruleType}`);
        }
        
        const removed = this.rules[ruleType].delete(ruleKey);
        if (removed) {
            console.log(`🗑️ Removed ${ruleType} rule: ${ruleKey}`);
        }
        return removed;
    }

    getRulesSummary() {
        return {
            skin_type_rules: this.rules.skinTypeRules.size,
            concern_rules: this.rules.concernRules.size,
            incompatibility_rules: this.rules.incompatibilityRules.size,
            synergy_rules: this.rules.synergyRules.size,
            safety_rules: this.rules.safetyRules.size,
            total_rules: Object.values(this.rules).reduce((sum, ruleMap) => sum + ruleMap.size, 0)
        };
    }

    // ==========================================
    // DEBUGGING & TESTING
    // ==========================================

    async testReasoningEngine(testProfile, testProducts) {
        console.log('🧪 Testing Reasoning Engine...');
        
        const startTime = Date.now();
        
        try {
            const results = await this.executeReasoningRules(testProfile, testProducts);
            const endTime = Date.now();
            
            console.log(`✅ Reasoning test completed in ${endTime - startTime}ms`);
            console.log(`📊 Analyzed ${results.products.length} products`);
            console.log(`🏆 Top score: ${results.reasoning_metadata.top_score}`);
            console.log(`🔒 High confidence products: ${results.reasoning_metadata.products_with_high_confidence}`);
            
            return {
                success: true,
                execution_time: endTime - startTime,
                results_summary: results.reasoning_metadata,
                sample_product: results.products[0]?.reasoning_analysis || null
            };
            
        } catch (error) {
            console.error('❌ Reasoning test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = OntologyReasoningEngine;
    