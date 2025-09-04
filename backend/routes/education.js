// backend/routes/education.js
// 📚 HYBRID EDUCATION API - Database + Hardcoded Content

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const {
    SKIN_TYPES_EDUCATION,
    ROUTINE_GUIDE_EDUCATION,
    INGREDIENTS_EDUCATION
} = require('../constants/educationalContent');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost', 
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// GET /api/education/skin-types - Hybrid: DB + Hardcoded
router.get('/skin-types', async (req, res) => {
    try {
        // 1. Get basic skin types from database (if available)
        let dbSkinTypes = [];
        try {
            const skinTypesQuery = `SELECT name, description FROM skin_types ORDER BY id`;
            const result = await pool.query(skinTypesQuery);
            dbSkinTypes = result.rows;
        } catch (dbError) {
            console.log('Database not available, using fallback');
        }
        
        // 2. Combine database data with rich educational content
        const enrichedSkinTypes = Object.keys(SKIN_TYPES_EDUCATION.types).map(skinTypeKey => {
            const dbData = dbSkinTypes.find(db => 
                db.name.toLowerCase() === skinTypeKey.toLowerCase()
            );
            
            return {
                type: skinTypeKey.charAt(0).toUpperCase() + skinTypeKey.slice(1),
                database_info: dbData || null,
                ...SKIN_TYPES_EDUCATION.types[skinTypeKey]
            };
        });
        
        // 3. Add products count for each skin type (if database available)
        for (let skinType of enrichedSkinTypes) {
            try {
                const productCountQuery = `
                    SELECT COUNT(*) as count 
                    FROM products 
                    WHERE suitable_for_skin_types ILIKE $1
                `;
                const result = await pool.query(productCountQuery, [`%${skinType.type}%`]);
                skinType.product_count = parseInt(result.rows[0].count);
            } catch (error) {
                skinType.product_count = 0;
            }
        }
        
        res.json({
            success: true,
            data: {
                overview: SKIN_TYPES_EDUCATION.overview,
                skin_types: enrichedSkinTypes,
                source: dbSkinTypes.length > 0 ? 'hybrid' : 'hardcoded_fallback'
            },
            message: "Skin types education retrieved successfully"
        });
        
    } catch (error) {
        console.error('Error in skin types education:', error);
        
        // Pure fallback - return hardcoded content only
        res.json({
            success: true,
            data: {
                overview: SKIN_TYPES_EDUCATION.overview,
                skin_types: Object.keys(SKIN_TYPES_EDUCATION.types).map(key => ({
                    type: key.charAt(0).toUpperCase() + key.slice(1),
                    ...SKIN_TYPES_EDUCATION.types[key],
                    product_count: 0
                })),
                source: 'pure_fallback'
            },
            message: "Skin types education retrieved (fallback mode)"
        });
    }
});

// GET /api/education/routine-guide - Pure Hardcoded
router.get('/routine-guide', async (req, res) => {
    try {
        res.json({
            success: true,
            data: ROUTINE_GUIDE_EDUCATION,
            message: "Routine guide retrieved successfully"
        });
    } catch (error) {
        console.error('Error getting routine guide:', error);
        res.status(500).json({
            success: false,
            message: "Failed to get routine guide",
            error: error.message
        });
    }
});

// GET /api/education/ingredients - Hybrid: DB + Hardcoded
router.get('/ingredients', async (req, res) => {
    try {
        // 1. Get key ingredients from database (if available)
        let dbIngredients = [];
        try {
            const ingredientsQuery = `
                SELECT name, slug, display_name, category, description
                FROM key_ingredient_types
                ORDER BY category, name
            `;
            const result = await pool.query(ingredientsQuery);
            dbIngredients = result.rows;
        } catch (dbError) {
            console.log('Key ingredients table not available, using hardcoded content');
        }
        
        // 2. Group database ingredients by category
        const dbIngredientsByCategory = {};
        dbIngredients.forEach(ing => {
            if (!dbIngredientsByCategory[ing.category]) {
                dbIngredientsByCategory[ing.category] = [];
            }
            dbIngredientsByCategory[ing.category].push(ing);
        });
        
        res.json({
            success: true,
            data: {
                ...INGREDIENTS_EDUCATION,
                database_ingredients: dbIngredientsByCategory,
                source: dbIngredients.length > 0 ? 'hybrid' : 'hardcoded_fallback'
            },
            message: "Ingredients education retrieved successfully"
        });
        
    } catch (error) {
        console.error('Error getting ingredients education:', error);
        res.json({
            success: true,
            data: {
                ...INGREDIENTS_EDUCATION,
                database_ingredients: {},
                source: 'pure_fallback'
            },
            message: "Ingredients education retrieved (fallback mode)"
        });
    }
});

// GET /api/education/product-categories - Database First
router.get('/product-categories', async (req, res) => {
    try {
        // Try to get categories from database first
        let categories = [];
        try {
            const categoriesQuery = `
                SELECT name, description, parent_id
                FROM product_categories
                ORDER BY parent_id NULLS FIRST, name
            `;
            const result = await pool.query(categoriesQuery);
            categories = result.rows;
        } catch (dbError) {
            console.log('Product categories table not available');
        }
        
        // Hardcoded educational content for categories
        const categoryEducation = {
            overview: "Memahami kategori produk membantu Anda memilih produk yang sesuai dengan kebutuhan kulit Anda.",
            
            main_categories: [
                {
                    category: "Cleansers",
                    purpose: "Menghapus kotoran, minyak, makeup, dan kotoran dari kulit",
                    types: [
                        {
                            type: "Oil Cleanser",
                            description: "Formula Oil-based yang melarutkan makeup dan tabir surya",
                            best_for: ["All skin types"],
                            texture: "Minyak yang emulsi dengan air"
                        },
                        {
                            type: "Gel Cleanser", 
                            description: "Pembersih berbasis air yang menghasilkan busa ringan",
                            best_for: ["Oily", "Combination"],
                            texture: "Gel bening atau transparan"
                        },
                        {
                            type: "Cream Cleanser",
                            description: "Pembersih yang kaya dan melembapkan",
                            best_for: ["Dry"],
                            texture: "Creamy, milky consistency"
                        }
                    ]
                },
                {
                    category: "Moisturizers",
                    purpose: "Menghidrasi kulit dan mengunci produk perawatan kulit sebelumnya",
                    types: [
                        {
                            type: "Gel Moisturizer",
                            description: "Hidrasi ringan berbasis air",
                            best_for: ["Oily", "Combination"],
                            texture: "Clear, gel-like consistency"
                        },
                        {
                            type: "Cream Moisturizer",
                            description: "Hidrasi yang kaya dan emolien",
                            best_for: ["Dry", "Normal", "Mature"],
                            texture: "Konsistensi yang tebal dan creamy"
                        }
                    ]
                }
            ],
            
            how_to_choose: {
                by_skin_type: {
                    "Normal": "Fokus pada produk perawatan - pembersih lembut, pelembap seimbang, serum antioksidan",
                    "Dry": "Pilih produk berbasis krim - pembersih krim, pelembap kaya, serum hidrasi",
                    "Oily": "Pilih produk gel/busa - pembersih gel, pelembap gel, serum pengontrol minyak",
                    "Combination": "Campur dan sesuaikan - pembersih lembut, pelembap ringan, perawatan yang ditargetkan"
                }
            }
        };
        
        res.json({
            success: true,
            data: {
                ...categoryEducation,
                database_categories: categories,
                source: categories.length > 0 ? 'hybrid' : 'hardcoded_fallback'
            },
            message: "Product categories education retrieved successfully"
        });
        
    } catch (error) {
        console.error('Error getting categories education:', error);
        res.status(500).json({
            success: false,
            message: "Failed to get categories education",
            error: error.message
        });
    }
});

module.exports = router;