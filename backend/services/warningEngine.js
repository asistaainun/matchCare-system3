// backend/services/warningEngine.js
// 🧠 INGREDIENT WARNING ENGINE - PAKAI DATA EXISTING

const { Pool } = require('pg');
require('dotenv').config();

const shouldLog = process.env.NODE_ENV !== 'test';

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

class SkincareWarningEngine {
    
    // Parse ingredient list dari product
    parseIngredientList(ingredientList) {
        if (!ingredientList) return [];
        
        // Clean and split ingredients
        const ingredients = ingredientList
            .toLowerCase()
            .split(/[,;]/)
            .map(ing => ing.trim())
            .filter(ing => ing.length > 0);
            
        return ingredients;
    }
    
    // Get ingredient ID by name
    // Get ingredient ID by name (improved matching)
    async getIngredientIdByName(ingredientName) {
        try {
            // First try exact match
            let query = `SELECT id, name FROM ingredients WHERE LOWER(name) = LOWER($1) LIMIT 1`;
            let result = await pool.query(query, [ingredientName.trim()]);
            
            if (result.rows.length === 0) {
                // Then try partial match
                query = `SELECT id, name FROM ingredients WHERE LOWER(name) LIKE LOWER($1) LIMIT 1`;
                result = await pool.query(query, [`%${ingredientName.trim()}%`]);
            }
            
            if (result.rows.length === 0) {
                // Try reverse partial match
                query = `SELECT id, name FROM ingredients WHERE LOWER($1) LIKE LOWER('%' || name || '%') LIMIT 1`;
                result = await pool.query(query, [ingredientName.trim()]);
            }
            
            if (result.rows.length > 0) {
               if (shouldLog) {
                   console.log(`✅ Found ingredient: "${ingredientName}" -> "${result.rows[0].name}" (ID: ${result.rows[0].id})`);
               }
            } else {
               if (shouldLog) {
                   console.log(`❌ Ingredient not found: "${ingredientName}"`);
               }
            }
            
            return result.rows[0] || null;
        } catch (error) {
            if (shouldLog) {
                console.error('Error getting ingredient ID:', error);
            }
            return null;
        }
}
    
    // Get interaction dari database kamu yang existing
    async getIngredientInteraction(ingredient1, ingredient2) {
        try {
            // Get ingredient IDs first
            const ing1 = await this.getIngredientIdByName(ingredient1);
            const ing2 = await this.getIngredientIdByName(ingredient2);
            
            if (!ing1 || !ing2) return null;
            
            const query = `
                SELECT ir.*, 
                       i1.name as ingredient1_name,
                       i2.name as ingredient2_name
                FROM ingredient_relationships ir
                JOIN ingredients i1 ON ir.ingredient1_id = i1.id
                JOIN ingredients i2 ON ir.ingredient2_id = i2.id
                WHERE (
                    (ir.ingredient1_id = $1 AND ir.ingredient2_id = $2) OR
                    (ir.ingredient1_id = $2 AND ir.ingredient2_id = $1)
                )
                AND ir.relationship_type IN ('incompatible', 'synergistic', 'timing_conflict')
                ORDER BY ir.strength DESC
                LIMIT 1
            `;
            
            if (shouldLog) {
                console.log(`🔍 Checking interaction between: "${ingredient1}" and "${ingredient2}"`);
            }
            const result = await pool.query(query, [ing1.id, ing2.id]);
            return result.rows[0] || null;
            
        } catch (error) {
            if (shouldLog) {
                console.error('Error getting ingredient interaction:', error);
            }
            return null;
        }
    }
    
    // Analyze single product untuk internal conflicts
    async analyzeProductSafety(product) {
        // Parse ingredients dari product
        const ingredientList = product.ingredient_list || product.ingredientlist;
        const keyIngredients = product.key_ingredients_csv 
            ? product.key_ingredients_csv.split(',').map(ing => ing.trim())
            : [];
            
        const allIngredients = [
            ...this.parseIngredientList(ingredientList),
            ...keyIngredients.map(ing => ing.toLowerCase())
        ];
        
        // Remove duplicates
        const uniqueIngredients = [...new Set(allIngredients)];
        const warnings = [];
        
        if (shouldLog) {
            console.log(`Analyzing ${uniqueIngredients.length} ingredients for product:`, product.name);
        }
        
        // Check internal ingredient conflicts
        for (let i = 0; i < uniqueIngredients.length; i++) {
            for (let j = i + 1; j < uniqueIngredients.length; j++) {
                const interaction = await this.getIngredientInteraction(
                    uniqueIngredients[i], uniqueIngredients[j]
                );
                
                if (interaction && interaction.relationship_type === 'incompatible') {
                    warnings.push({
                        type: 'internal_conflict',
                        severity: interaction.strength || 3,
                        message: `Contains potentially conflicting ingredients`,
                        explanation: `${this.capitalizeFirst(interaction.ingredient1_name)} and ${this.capitalizeFirst(interaction.ingredient2_name)} may not work well together`,
                        recommendation: interaction.notes || 'Consider using these ingredients at different times',
                        affectedIngredients: [interaction.ingredient1_name, interaction.ingredient2_name]
                    });
                }
            }
        }

        if (shouldLog) {
            console.log(`🧪 Ingredients found:`, uniqueIngredients);
            console.log(`🔍 Checking ${uniqueIngredients.length} ingredients for conflicts...`);
        }
        return warnings;
    }
    
    // Analyze compatibility between multiple products  
    async analyzeRoutineCompatibility(products) {
        const allIngredients = [];
        const warnings = [];
        
        // Extract all ingredients from all products
        products.forEach(product => {
            const ingredientList = product.ingredient_list || product.ingredientlist;
            const keyIngredients = product.key_ingredients_csv 
                ? product.key_ingredients_csv.split(',').map(ing => ing.trim())
                : [];
                
            const productIngredients = [
                ...this.parseIngredientList(ingredientList),
                ...keyIngredients.map(ing => ing.toLowerCase())
            ];
            
            productIngredients.forEach(ingredient => {
                allIngredients.push({
                    ingredient: ingredient,
                    productName: product.name || product.product_name,
                    productId: product.id
                });
            });
        });
        
        if (shouldLog) {
            console.log(`Analyzing routine with ${allIngredients.length} total ingredients`);
        }

        // Check cross-product interactions
        for (let i = 0; i < allIngredients.length; i++) {
            for (let j = i + 1; j < allIngredients.length; j++) {
                const ing1 = allIngredients[i];
                const ing2 = allIngredients[j];
                
                // Skip if same product
                if (ing1.productId === ing2.productId) continue;
                
                const interaction = await this.getIngredientInteraction(
                    ing1.ingredient, ing2.ingredient
                );
                
                if (interaction && interaction.relationship_type === 'incompatible') {
                    warnings.push({
                        type: 'routine_conflict',
                        severity: interaction.strength || 3,
                        message: `Potential conflict between products`,
                        details: `${this.capitalizeFirst(interaction.ingredient1_name)} (in ${ing1.productName}) may conflict with ${this.capitalizeFirst(interaction.ingredient2_name)} (in ${ing2.productName})`,
                        explanation: interaction.notes || 'These ingredients may reduce each other\'s effectiveness',
                        recommendation: 'Consider using these products at different times or days',
                        products: [
                            { name: ing1.productName, ingredient: interaction.ingredient1_name },
                            { name: ing2.productName, ingredient: interaction.ingredient2_name }
                        ]
                    });
                }
            }
        }
        
        return warnings;
    }
    
    // Get synergistic ingredients dari database existing
    async getSynergisticIngredients(ingredientName) {
        try {
            const ingredient = await this.getIngredientIdByName(ingredientName);
            if (!ingredient) return [];
            
            const query = `
                SELECT ir.*, 
                       CASE 
                           WHEN ir.ingredient1_id = $1 THEN i2.name
                           ELSE i1.name 
                       END as synergistic_ingredient_name
                FROM ingredient_relationships ir
                JOIN ingredients i1 ON ir.ingredient1_id = i1.id
                JOIN ingredients i2 ON ir.ingredient2_id = i2.id
                WHERE (ir.ingredient1_id = $1 OR ir.ingredient2_id = $1) 
                AND ir.relationship_type = 'synergistic'
                ORDER BY ir.strength DESC
            `;
            
            const result = await pool.query(query, [ingredient.id]);
            
            return result.rows.map(syn => ({
                ingredient: this.capitalizeFirst(syn.synergistic_ingredient_name),
                benefit: syn.notes || 'Works well together',
                strength: syn.strength || 1
            }));
            
        } catch (error) {

            if (shouldLog) {
                console.error('Error getting synergistic ingredients:', error);
            }
            return [];
        }
    }
    
    // Helper function
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    // Tambah method ini di akhir class SkincareWarningEngine

    // Suggest alternatives untuk ingredient
    async suggestAlternatives(ingredientName) {
        try {
            if (shouldLog) {
                console.log(`🔍 Looking for alternatives to: ${ingredientName}`);
            }

            const ingredient = await this.getIngredientIdByName(ingredientName);
            if (!ingredient) {
                if (shouldLog) {
                    console.log(`❌ Ingredient not found: ${ingredientName}`);
                }
                return [];
            }
            
            // Look for alternative relationships or similar ingredients
            const query = `
                SELECT DISTINCT i.name, i.what_it_does, i.actual_functions
                FROM ingredients i
                WHERE i.id != $1 
                AND (
                    LOWER(i.what_it_does) LIKE LOWER($2) OR
                    LOWER(i.actual_functions) LIKE LOWER($2) OR
                    LOWER(i.functional_categories) LIKE LOWER($2)
                )
                AND i.is_active = true
                LIMIT 5
            `;
            
            // Get main function dari ingredient asli
            const originalQuery = `SELECT what_it_does, actual_functions FROM ingredients WHERE id = $1`;
            const originalResult = await pool.query(originalQuery, [ingredient.id]);
            
            if (originalResult.rows.length === 0) {
                return this.getGenericAlternatives(ingredientName);
            }
            
            const originalFunctions = originalResult.rows[0].what_it_does || '';
            const searchPattern = `%${originalFunctions.split(',')[0]}%`; // Use first function
            
            const result = await pool.query(query, [ingredient.id, searchPattern]);
            
            if (result.rows.length === 0) {
                return this.getGenericAlternatives(ingredientName);
            }
            
            return result.rows.map(alt => ({
                alternative: this.capitalizeFirst(alt.name),
                reason: `Similar function: ${alt.what_it_does}`,
                howToUse: 'Use as substitute with similar concentration'
            }));
            
        } catch (error) {
            if (shouldLog) {
                console.error('Error getting alternatives:', error);
            }
            return this.getGenericAlternatives(ingredientName);
        }
    }

    // Generic alternatives untuk common ingredients
    getGenericAlternatives(ingredientName) {
        const genericAlternatives = {
            'retinol': [
                { alternative: 'Bakuchiol', reason: 'Natural retinol alternative', howToUse: 'Use morning or evening' },
                { alternative: 'Retinyl Palmitate', reason: 'Gentler retinoid', howToUse: 'Start with lower concentration' }
            ],
            'vitamin c': [
                { alternative: 'Magnesium Ascorbyl Phosphate', reason: 'Stable Vitamin C form', howToUse: 'Less irritating option' },
                { alternative: 'Kojic Acid', reason: 'Alternative brightening agent', howToUse: 'Use in evening routine' }
            ],
            'salicylic acid': [
                { alternative: 'Lactic Acid', reason: 'Gentler exfoliant', howToUse: 'Start 2-3x per week' },
                { alternative: 'Mandelic Acid', reason: 'Large molecule AHA', howToUse: 'Better for sensitive skin' }
            ]
        };
        
        const alternatives = genericAlternatives[ingredientName.toLowerCase()];
        return alternatives || [
            { alternative: 'Niacinamide', reason: 'Universal skin-friendly ingredient', howToUse: 'Safe for all skin types' }
        ];
    }

    // Test database connection
    async testConnection() {
        try {
            const result = await pool.query('SELECT COUNT(*) FROM ingredient_relationships');
            if (shouldLog) {
                console.log(`✅ Warning engine connected. Found ${result.rows[0].count} ingredient relationships`);
            }
            return true;
        } catch (error) {
            if (shouldLog) {
                console.error('❌ Warning engine connection failed:', error);
            }
            return false;
        }
    }
}



module.exports = new SkincareWarningEngine();