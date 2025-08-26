// backend/routes/warnings.js
// 🚨 WARNING SYSTEM API ROUTES

const express = require('express');
const router = express.Router();
const warningEngine = require('../services/warningEngine');
const { Pool } = require('pg');
require('dotenv').config();
const cacheMiddleware = require('../middleware/cache');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost', 
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// GET /api/warnings/test - Test endpoint
router.get('/test', async (req, res) => {
    try {
        // Test database connection
        const testQuery = 'SELECT COUNT(*) FROM ingredient_relationships';
        const result = await pool.query(testQuery);
        
        res.json({
            success: true,
            message: 'Warning system is working!',
            interactionCount: result.rows[0].count,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Warning system test failed',
            error: error.message
        });
    }
});

// GET /api/warnings/product/:id - Get warnings untuk single product
router.get('/product/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Get product data
        const productQuery = 'SELECT * FROM products WHERE id = $1';
        const productResult = await pool.query(productQuery, [productId]);
        
        if (productResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        const product = productResult.rows[0];
        
        // Analyze product safety
        const warnings = await warningEngine.analyzeProductSafety(product);
        
        res.json({
            success: true,
            productId: productId,
            productName: product.name || product.product_name,
            warnings: warnings,
            warningCount: warnings.length
        });
        
    } catch (error) {
        console.error('Error analyzing product safety:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze product safety',
            error: error.message
        });
    }
});

router.get('/test-conflict', async (req, res) => {
    try {
        console.log('🧪 Testing manual conflict detection...');
        
        // Test known conflicting ingredients
        const testIngredients = [
            ['retinol', 'vitamin c'],
            ['salicylic acid', 'retinol'], 
            ['niacinamide', 'vitamin c']
        ];
        
        const results = [];
        
        for (const [ing1, ing2] of testIngredients) {
            console.log(`\n🔍 Testing: ${ing1} vs ${ing2}`);
            
            const interaction = await warningEngine.getIngredientInteraction(ing1, ing2);
            
            results.push({
                ingredient1: ing1,
                ingredient2: ing2,
                interaction: interaction,
                hasConflict: interaction && interaction.relationship_type === 'incompatible'
            });
        }
        
        const conflictCount = results.filter(r => r.hasConflict).length;
        
        res.json({
            success: true,
            message: `Tested ${testIngredients.length} ingredient pairs`,
            conflictCount: conflictCount,
            results: results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error in conflict test:', error);
        res.status(500).json({
            success: false,
            message: 'Conflict test failed',
            error: error.message
        });
    }
});

router.post('/routine', async (req, res) => {
    try {
        const { productIds } = req.body;
        
        if (!productIds || productIds.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'At least 2 products required for routine analysis'
            });
        }
        
        console.log(`🧪 Analyzing routine with products: ${productIds}`);
        
        // Get products data
        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
        const query = `SELECT * FROM products WHERE id IN (${placeholders})`;
        const result = await pool.query(query, productIds);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No products found'
            });
        }
        
        console.log(`📦 Found ${result.rows.length} products for analysis`);
        
        // Analyze routine compatibility
        const warnings = await warningEngine.analyzeRoutineCompatibility(result.rows);
        
        res.json({
            success: true,
            analyzedProducts: result.rows.map(p => ({
                id: p.id,
                name: p.name || p.product_name
            })),
            warnings: warnings,
            warningCount: warnings.length,
            routineStatus: warnings.length === 0 ? 'safe' : 'has_conflicts'
        });
        
    } catch (error) {
        console.error('Error analyzing routine:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze routine',
            error: error.message
        });
    }
});

// GET /api/warnings/ingredient/:ingredient/alternatives  
router.get('/ingredient/:ingredient/alternatives', async (req, res) => {
    try {
        const ingredient = req.params.ingredient;
        console.log(`🔍 Looking for alternatives to: ${ingredient}`);
        
        const alternatives = await warningEngine.suggestAlternatives(ingredient);
        
        res.json({
            success: true,
            ingredient: ingredient,
            alternatives: alternatives
        });
        
    } catch (error) {
        console.error('Error getting alternatives:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get alternatives',
            error: error.message
        });
    }
});

// GET /api/warnings/ingredient/:ingredient/synergistic
router.get('/ingredient/:ingredient/synergistic', async (req, res) => {
    try {
        const ingredient = req.params.ingredient;
        console.log(`🤝 Looking for synergistic ingredients with: ${ingredient}`);
        
        const synergistic = await warningEngine.getSynergisticIngredients(ingredient);
        
        res.json({
            success: true,
            ingredient: ingredient,
            synergisticIngredients: synergistic
        });
        
    } catch (error) {
        console.error('Error getting synergistic ingredients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get synergistic ingredients',
            error: error.message
        });
    }
});

// GET /api/warnings/education/basic-skincare - Basic skincare education
router.get('/education/basic-skincare', async (req, res) => {
    try {
        const basicSkincare = {
            skincare_routine_order: [
                { step: 1, name: "Oil/Balm Cleanser", time: "PM", description: "Remove makeup and sunscreen", optional: true },
                { step: 2, name: "Water-based Cleanser", time: "AM/PM", description: "Deep clean pores and remove dirt" },
                { step: 3, name: "Exfoliant (AHA/BHA)", time: "PM", description: "Remove dead skin cells", frequency: "2-3x per week" },
                { step: 4, name: "Toner/Essence", time: "AM/PM", description: "Balance pH and prep skin" },
                { step: 5, name: "Treatment Serum", time: "varies", description: "Target specific skin concerns" },
                { step: 6, name: "Moisturizer", time: "AM/PM", description: "Hydrate and seal in products" },
                { step: 7, name: "Sunscreen", time: "AM", description: "Protect from UV damage", spf: "minimum SPF 30" }
            ],
            skin_types: [
                { type: "Normal", description: "Balanced oil and moisture, few imperfections", routine_focus: "Maintenance and protection" },
                { type: "Dry", description: "Tight, flaky, rough texture", routine_focus: "Hydration and barrier repair" },
                { type: "Oily", description: "Shiny, large pores, prone to acne", routine_focus: "Oil control and pore care" },
                { type: "Combination", description: "Oily T-zone, dry/normal cheeks", routine_focus: "Zone-specific care" },
                { type: "Sensitive", description: "Easily irritated, reactive", routine_focus: "Gentle, minimal routine" }
            ],
            common_mistakes: [
                "Using too many products at once",
                "Not patch testing new products", 
                "Skipping sunscreen",
                "Over-exfoliating",
                "Not giving products time to work"
            ]
        };
        
        res.json({
            success: true,
            data: basicSkincare,
            message: "Basic skincare education retrieved successfully"
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to get skincare education",
            error: error.message
        });
    }
});

// GET /api/warnings/education/ingredient-combinations - Ingredient combination guide
router.get('/education/ingredient-combinations', async (req, res) => {
    try {
        // Get top synergistic and incompatible combinations
        const synergisticQuery = `
            SELECT 
                i1.name as ingredient1,
                i2.name as ingredient2,
                ir.strength,
                ir.notes,
                COUNT(*) as popularity
            FROM ingredient_relationships ir
            JOIN ingredients i1 ON ir.ingredient1_id = i1.id
            JOIN ingredients i2 ON ir.ingredient2_id = i2.id
            WHERE ir.relationship_type = 'synergistic'
            GROUP BY i1.name, i2.name, ir.strength, ir.notes
            ORDER BY ir.strength DESC, popularity DESC
            LIMIT 10
        `;
        
        const incompatibleQuery = `
            SELECT 
                i1.name as ingredient1,
                i2.name as ingredient2,
                ir.strength,
                ir.notes,
                COUNT(*) as popularity
            FROM ingredient_relationships ir
            JOIN ingredients i1 ON ir.ingredient1_id = i1.id
            JOIN ingredients i2 ON ir.ingredient2_id = i2.id
            WHERE ir.relationship_type = 'incompatible'
            GROUP BY i1.name, i2.name, ir.strength, ir.notes
            ORDER BY ir.strength DESC, popularity DESC
            LIMIT 10
        `;
        
        const [synergistic, incompatible] = await Promise.all([
            pool.query(synergisticQuery),
            pool.query(incompatibleQuery)
        ]);
        
        const educationGuide = {
            safe_combinations: synergistic.rows.map(row => ({
                ingredients: [row.ingredient1, row.ingredient2],
                strength: row.strength,
                benefits: row.notes,
                usage_tip: "Can be used together in the same routine"
            })),
            avoid_combinations: incompatible.rows.map(row => ({
                ingredients: [row.ingredient1, row.ingredient2],
                risk_level: row.strength,
                warning: row.notes,
                alternative: "Gunakan pada waktu yang berbeda (AM/PM) atau hari yang berbeda"
            })),
            general_rules: [
                {
                    rule: "Start Slow",
                    description: "Introduce one new active ingredient at a time"
                },
                {
                    rule: "pH Matters", 
                    description: "Vitamin C (pH 3-4) and Retinol (pH 5.5-6.5) work better at different times"
                },
                {
                    rule: "Less is More",
                    description: "Using too many actives can damage your skin barrier"
                }
            ]
        };
        
        res.json({
            success: true,
            data: educationGuide,
            message: "Ingredient combination guide retrieved successfully"
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to get combination guide", 
            error: error.message
        });
    }
});

// GET /api/warnings/education/visual-guides
router.get('/education/visual-guides', async (req, res) => {
  try {
    const visualGuides = {
      infographics: [
        {
          title: "7-Step Skincare Routine",
          description: "Visual guide for daily skincare routine order",
          topics: ["cleansing", "toning", "treatment", "moisturizing", "sun protection"]
        },
        {
          title: "Skin Types Identification",
          description: "How to identify your skin type",
          topics: ["normal", "dry", "oily", "combination", "sensitive"]
        },
        {
          title: "Ingredient Interaction Matrix",
          description: "Visual matrix of safe vs dangerous ingredient combinations",
          topics: ["retinol", "vitamin c", "aha", "bha", "niacinamide"]
        }
      ],
      learning_modules: [
        {
          module: "Beginner Basics",
          lessons: [
            "Understanding Your Skin",
            "Building Your First Routine", 
            "Common Mistakes to Avoid"
          ]
        },
        {
          module: "Ingredient Science",
          lessons: [
            "Active Ingredients Explained",
            "pH and Skin Compatibility",
            "Layering Products Correctly"
          ]
        },
        {
          module: "Advanced Topics",
          lessons: [
            "Troubleshooting Skin Issues",
            "Seasonal Routine Adjustments",
            "Product Recommendations by Concern"
          ]
        }
      ],
      interactive_tools: [
        {
          tool: "Routine Builder",
          description: "Step-by-step routine creation with conflict checking"
        },
        {
          tool: "Ingredient Checker", 
          description: "Real-time compatibility analysis for your products"
        },
        {
          tool: "Skin Assessment Quiz",
          description: "Comprehensive skin analysis with personalized recommendations"
        }
      ]
    };

    res.json({
      success: true,
      data: visualGuides,
      message: "Visual learning guides retrieved successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get visual guides",
      error: error.message
    });
  }
});

module.exports = router;