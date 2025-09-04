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

    async getProductWarnings(productId) {
    try {
        console.log(`🔍 Getting warnings for product ID: ${productId}`);
        
        // 1. Get product ingredients
        const productQuery = `
            SELECT p.name as product_name, pi.ingredient_name
            FROM products p
            JOIN product_ingredients pi ON p.id = pi.product_id  
            WHERE p.id = $1
        `;
        
        const productResult = await pool.query(productQuery, [productId]);
        
        if (productResult.rows.length === 0) {
            return { warnings: [], productName: null };
        }

        const productName = productResult.rows[0].product_name;
        const ingredients = productResult.rows.map(row => row.ingredient_name.toLowerCase());
        
        console.log(`📝 Product: ${productName}, Ingredients: ${ingredients.length}`);

        // 2. Check for internal conflicts (ingredients in same product)
        const warnings = [];
        
        for (let i = 0; i < ingredients.length; i++) {
            for (let j = i + 1; j < ingredients.length; j++) {
                const conflict = await this.checkIngredientConflict(ingredients[i], ingredients[j]);
                if (conflict) {
                    warnings.push({
                        type: 'internal_conflict',
                        ingredient1: ingredients[i],
                        ingredient2: ingredients[j],
                        severity: conflict.severity,
                        warning_message: conflict.message,
                        recommendation: conflict.recommendation
                    });
                }
            }
        }

        // 3. Check for common external conflicts
        const commonConflicts = await this.getCommonExternalConflicts(ingredients);
        warnings.push(...commonConflicts);

        // 4. Check for synergies (positive interactions)
        const synergies = await this.getIngredientSynergies(ingredients);

        console.log(`✅ Found ${warnings.length} warnings, ${synergies.length} synergies`);
        
        return {
            productName,
            ingredients,
            warnings,
            synergies,
            warningCount: warnings.length,
            synergyCount: synergies.length
        };
        
    } catch (error) {
        console.error('Error getting product warnings:', error);
        throw error;
    }
}

async checkIngredientConflict(ingredient1, ingredient2) {
    try {
        // Query database untuk conflicts
        const conflictQuery = `
            SELECT ir.relationship_type, ir.strength, ir.notes,
                   i1.name as ing1, i2.name as ing2
            FROM ingredient_relationships ir
            JOIN ingredients i1 ON ir.ingredient1_id = i1.id
            JOIN ingredients i2 ON ir.ingredient2_id = i2.id
            WHERE (LOWER(i1.name) LIKE $1 AND LOWER(i2.name) LIKE $2)
               OR (LOWER(i1.name) LIKE $2 AND LOWER(i2.name) LIKE $1)
            AND ir.relationship_type = 'incompatibleWith'
        `;
        
        const result = await pool.query(conflictQuery, [`%${ingredient1}%`, `%${ingredient2}%`]);
        
        if (result.rows.length > 0) {
            const conflict = result.rows[0];
            return {
                severity: conflict.strength || 'medium',
                message: conflict.notes || `${conflict.ing1} dan ${conflict.ing2} mungkin tidak bisa bekerja dengan baik jika digabung`,
                recommendation: this.getConflictRecommendation(ingredient1, ingredient2)
            };
        }
        
        // Fallback ke hardcoded rules kalau database kosong
        return this.getHardcodedConflict(ingredient1, ingredient2);
        
    } catch (error) {
        console.error('Error checking conflict:', error);
        return null;
    }
}

getHardcodedConflict(ing1, ing2) {
    // Hardcoded conflict rules sebagai fallback
    const conflicts = {
        'retinol,vitamin c': {
            severity: 'high',
            message: 'Retinol dan Vitamin C dapat menyebabkan iritasi jika digunakan bersamaan',
            recommendation: 'Gunakan Retinol di malam hari dan Vitamin C di pagi hari'
        },
        'aha,bha': {
            severity: 'medium', 
            message: 'AHA dan BHA bersama-sama dapat menyebabkan over-exfoliation',
            recommendation: 'Penggunaan bergantian - gunakan pada hari atau waktu yang berbeda'
        },
        'retinol,aha': {
            severity: 'high',
            message: 'Retinol dan AHA dapat menyebabkan iritasi yang parah',
            recommendation: 'Gunakan pada malam yang bergantian, mulai dengan konsentrasi yang lebih rendah'
        }
    };
    
    const key1 = `${ing1},${ing2}`;
    const key2 = `${ing2},${ing1}`;
    
    return conflicts[key1] || conflicts[key2] || null;
}

async getCommonExternalConflicts(ingredients) {
    // Check ingredients yg conflict dengan produk lain yg umum dipakai
    const warnings = [];
    
    for (const ingredient of ingredients) {
        if (ingredient.includes('retinol')) {
            warnings.push({
                type: 'external_warning',
                ingredient1: ingredient,
                ingredient2: 'vitamin c products',
                severity: 'medium',
                warning_message: 'Produk ini mengandung Retinol yang tidak boleh digunakan bersamaan dengan produk Vitamin C',
                recommendation: 'Gunakan produk ini di malam hari, produk Vitamin C di pagi hari'
            });
        }
        
        if (ingredient.includes('aha') || ingredient.includes('glycolic')) {
            warnings.push({
                type: 'timing_warning',
                ingredient1: ingredient,
                severity: 'low',
                warning_message: 'Produk ini mengandung AHA - disarankan untuk digunakan di malam hari',
                recommendation: 'Gunakan di malam hari, selalu gunakan tabir surya di siang hari'
            });
        }
    }
    
    return warnings;
}

async getIngredientSynergies(ingredients) {
    const synergies = [];
    
    // Check for beneficial combinations
    const hasCeramides = ingredients.some(ing => ing.includes('ceramide'));
    const hasNiacinamide = ingredients.some(ing => ing.includes('niacinamide'));
    const hasHyaluronic = ingredients.some(ing => ing.includes('hyaluronic'));
    
    if (hasCeramides && hasNiacinamide) {
        synergies.push({
            type: 'synergy',
            ingredients: ['ceramides', 'niacinamide'],
            message: 'Ceramides dan Niacinamide bekerja sama untuk memperkuat barrier kulit',
            benefit: 'Perbaikan barrier yang lebih baik dan hidrasi'
        });
    }
    
    if (hasHyaluronic && hasNiacinamide) {
        synergies.push({
            type: 'synergy',
            ingredients: ['hyaluronic acid', 'niacinamide'],
            message: 'Hyaluronic Acid dan Niacinamide saling melengkapi dengan sempurna',
            benefit: 'Hidrasi superior dengan efek meminimalkan pori'
        });
    }
    
    return synergies;
}

getConflictRecommendation(ing1, ing2) {
    // Generate smart recommendations
    if (ing1.includes('retinol') || ing2.includes('retinol')) {
        return 'Pertimbangkan untuk menggunakan produk retinol hanya di malam hari, terpisah dari bahan aktif lainnya';
    }
    
    if (ing1.includes('acid') || ing2.includes('acid')) {
        return 'Gunakan asam pada hari yang bergantian atau waktu yang berbeda untuk mencegah iritasi';
    }

    return 'Konsultasikan dengan dokter kulit untuk saran pribadi tentang penggabungan bahan-bahan ini';
}
}



module.exports = new SkincareWarningEngine();