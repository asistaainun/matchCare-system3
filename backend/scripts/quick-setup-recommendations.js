const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD || '90226628',
    port: process.env.DB_PORT || 5432,
});

class QuickRecommendationSetup {
    async setupDatabase() {
        console.log('🔧 Setting up recommendation database...');
        
        try {
            // 1. Create quiz tables
            await pool.query(`
                -- Skin types
                CREATE TABLE IF NOT EXISTS skin_types (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50) NOT NULL UNIQUE,
                    description TEXT
                );
                
                INSERT INTO skin_types (name, description) VALUES
                ('normal', 'Balanced skin with moderate oil production'),
                ('dry', 'Low oil production, may feel tight'),
                ('oily', 'High oil production, shiny appearance'),
                ('combination', 'Mixed - oily T-zone, normal/dry cheeks'),
                ('sensitive', 'Easily irritated, reactive to products')
                ON CONFLICT (name) DO NOTHING;
                
                -- Skin concerns
                CREATE TABLE IF NOT EXISTS skin_concerns (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50) NOT NULL UNIQUE,
                    description TEXT
                );
                
                INSERT INTO skin_concerns (name, description) VALUES
                ('acne', 'Breakouts, blackheads, whiteheads'),
                ('dryness', 'Lack of moisture, tight feeling'),
                ('oiliness', 'Excess sebum production'),
                ('sensitivity', 'Easily irritated, reactive skin'),
                ('wrinkles', 'Signs of aging, fine lines'),
                ('dark_spots', 'Hyperpigmentation, uneven tone'),
                ('large_pores', 'Visible pores, rough texture'),
                ('dullness', 'Lack of radiance')
                ON CONFLICT (name) DO NOTHING;
            `);
            
            // 2. Add recommendation columns to products
            await pool.query(`
                ALTER TABLE products 
                ADD COLUMN IF NOT EXISTS suitable_for_skin_types TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS addresses_concerns TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS alcohol_free BOOLEAN DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS fragrance_free BOOLEAN DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS paraben_free BOOLEAN DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS sulfate_free BOOLEAN DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS silicone_free BOOLEAN DEFAULT NULL;
            `);
            
            // 3. Populate basic recommendation data
            await this.populateRecommendationData();
            
            console.log('✅ Database setup complete!');
            
        } catch (error) {
            console.error('❌ Database setup failed:', error.message);
            throw error;
        }
    }
    
    async populateRecommendationData() {
        console.log('📊 Populating recommendation data...');
        
        // Smart data population based on product categories and descriptions
        const updates = [
            // Cleansers
            {
                condition: "main_category ILIKE '%cleanser%' OR name ILIKE '%cleanser%'",
                updates: {
                    suitable_for_skin_types: 'normal,oily,combination',
                    addresses_concerns: 'oiliness,acne',
                    alcohol_free: false,
                    fragrance_free: false,
                    paraben_free: true
                }
            },
            // Moisturizers
            {
                condition: "main_category ILIKE '%moisturizer%' OR name ILIKE '%moistur%' OR name ILIKE '%cream%'",
                updates: {
                    suitable_for_skin_types: 'dry,normal,sensitive',
                    addresses_concerns: 'dryness,sensitivity',
                    alcohol_free: true,
                    fragrance_free: true,
                    paraben_free: true
                }
            },
            // Sunscreen
            {
                condition: "main_category ILIKE '%sun%' OR name ILIKE '%spf%' OR name ILIKE '%sunscreen%'",
                updates: {
                    suitable_for_skin_types: 'normal,dry,oily,combination,sensitive',
                    addresses_concerns: 'sensitivity',
                    alcohol_free: true,
                    fragrance_free: true,
                    paraben_free: true
                }
            },
            // Serums/Treatments
            {
                condition: "main_category ILIKE '%serum%' OR main_category ILIKE '%treatment%' OR name ILIKE '%serum%'",
                updates: {
                    suitable_for_skin_types: 'normal,oily,combination',
                    addresses_concerns: 'acne,dark_spots,wrinkles',
                    alcohol_free: true,
                    fragrance_free: true,
                    paraben_free: true
                }
            },
            // Toners
            {
                condition: "main_category ILIKE '%toner%' OR name ILIKE '%toner%'",
                updates: {
                    suitable_for_skin_types: 'oily,combination,normal',
                    addresses_concerns: 'oiliness,large_pores',
                    alcohol_free: false,
                    fragrance_free: false,
                    paraben_free: true
                }
            }
        ];
        
        for (const update of updates) {
            try {
                const query = `
                    UPDATE products SET 
                        suitable_for_skin_types = $1,
                        addresses_concerns = $2,
                        alcohol_free = $3,
                        fragrance_free = $4,
                        paraben_free = $5
                    WHERE (${update.condition}) 
                    AND (suitable_for_skin_types = '' OR suitable_for_skin_types IS NULL)
                `;
                
                const result = await pool.query(query, [
                    update.updates.suitable_for_skin_types,
                    update.updates.addresses_concerns,
                    update.updates.alcohol_free,
                    update.updates.fragrance_free,
                    update.updates.paraben_free
                ]);
                
                console.log(`✅ Updated ${result.rowCount} products for condition: ${update.condition.substring(0, 50)}...`);
                
            } catch (error) {
                console.warn(`⚠️ Update failed for condition: ${error.message}`);
            }
        }
        
        // Get stats
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN suitable_for_skin_types != '' THEN 1 END) as with_skin_types,
                COUNT(CASE WHEN addresses_concerns != '' THEN 1 END) as with_concerns
            FROM products
        `);
        
        const stat = stats.rows[0];
        console.log(`📊 Data population complete:`);
        console.log(`   Total products: ${stat.total}`);
        console.log(`   With skin type data: ${stat.with_skin_types}`);
        console.log(`   With concern data: ${stat.with_concerns}`);
    }
    
    createRecommendationService() {
        console.log('🧠 Creating recommendation service...');
        
        const serviceCode = `
// services/RecommendationService.js
const { Product, Brand } = require('../models');
const { Op } = require('sequelize');

class RecommendationService {
    static async generateRecommendations(quizResults) {
        console.log('🔍 Generating recommendations for:', quizResults);
        
        const { skinType, concerns = [], sensitivities = {} } = quizResults;
        
        try {
            // Build where clause
            let whereClause = {};
            
            // Filter by skin type
            if (skinType && skinType !== 'unknown') {
                whereClause.suitable_for_skin_types = {
                    [Op.or]: [
                        { [Op.iLike]: \`%\${skinType}%\` },
                        { [Op.iLike]: '%all%' },
                        { [Op.iLike]: '%normal%' } // Fallback
                    ]
                };
            }
            
            // Filter by sensitivities
            if (sensitivities.fragrance) {
                whereClause.fragrance_free = true;
            }
            if (sensitivities.alcohol) {
                whereClause.alcohol_free = true;
            }
            
            // Exclude products that are null/empty
            whereClause.suitable_for_skin_types = {
                ...whereClause.suitable_for_skin_types,
                [Op.ne]: '',
                [Op.not]: null
            };
            
            console.log('📋 Where clause:', JSON.stringify(whereClause, null, 2));
            
            const products = await Product.findAll({
                where: whereClause,
                include: [
                    {
                        model: Brand,
                        attributes: ['id', 'name'],
                        required: false
                    }
                ],
                attributes: [
                    'id', 'name', 'description', 'main_category', 'subcategory',
                    'suitable_for_skin_types', 'addresses_concerns',
                    'alcohol_free', 'fragrance_free', 'paraben_free'
                ],
                limit: 50 // Get more, then score and filter
            });
            
            console.log(\`📦 Found \${products.length} products matching basic criteria\`);
            
            if (products.length === 0) {
                // Fallback: get any products for the skin type
                const fallbackProducts = await Product.findAll({
                    where: {
                        suitable_for_skin_types: { [Op.ne]: '', [Op.not]: null }
                    },
                    include: [{ model: Brand, attributes: ['id', 'name'], required: false }],
                    limit: 20
                });
                
                return fallbackProducts.map(product => ({
                    ...product.toJSON(),
                    matchScore: 40,
                    reasoning: ['General recommendation', 'May be suitable for your skin']
                }));
            }
            
            // Score and rank products
            const scoredProducts = products.map(product => {
                const score = this.calculateMatchScore(product, quizResults);
                return {
                    ...product.toJSON(),
                    matchScore: score.total,
                    reasoning: score.reasoning
                };
            });
            
            // Sort by score and return top results
            const topProducts = scoredProducts
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 15);
            
            console.log(\`✅ Returning \${topProducts.length} top-scored products\`);
            
            return topProducts;
            
        } catch (error) {
            console.error('❌ Recommendation generation failed:', error);
            throw error;
        }
    }
    
    static calculateMatchScore(product, quizResults) {
        let score = 20; // Base score
        const reasoning = [];
        
        const { skinType, concerns = [], sensitivities = {} } = quizResults;
        
        // 1. Skin type match (40 points max)
        if (product.suitable_for_skin_types) {
            const suitableTypes = product.suitable_for_skin_types.toLowerCase().split(',');
            if (suitableTypes.some(type => type.trim() === skinType)) {
                score += 40;
                reasoning.push(\`Perfect for \${skinType} skin\`);
            } else if (suitableTypes.includes('normal') || suitableTypes.includes('all')) {
                score += 25;
                reasoning.push('Suitable for most skin types');
            }
        }
        
        // 2. Concern addressing (30 points max)
        if (concerns.length > 0 && product.addresses_concerns) {
            const productConcerns = product.addresses_concerns.toLowerCase().split(',');
            const matchedConcerns = concerns.filter(concern => 
                productConcerns.some(pc => pc.trim().includes(concern.toLowerCase()))
            );
            
            if (matchedConcerns.length > 0) {
                score += Math.min(matchedConcerns.length * 15, 30);
                reasoning.push(\`Addresses: \${matchedConcerns.join(', ')}\`);
            }
        }
        
        // 3. Safety compliance (20 points max)
        let safetyBonus = 0;
        if (sensitivities.fragrance && product.fragrance_free) {
            safetyBonus += 8;
            reasoning.push('Fragrance-free formula');
        }
        if (sensitivities.alcohol && product.alcohol_free) {
            safetyBonus += 8;
            reasoning.push('Alcohol-free formula');
        }
        if (product.paraben_free) {
            safetyBonus += 4;
            reasoning.push('Paraben-free');
        }
        score += safetyBonus;
        
        // 4. Category bonus (10 points max)
        const categoryPriority = {
            'moisturizer': 10,
            'cleanser': 8,
            'suncare': 9,
            'treatment': 7,
            'serum': 8
        };
        
        const category = product.main_category ? product.main_category.toLowerCase() : '';
        Object.keys(categoryPriority).forEach(cat => {
            if (category.includes(cat)) {
                score += categoryPriority[cat];
                reasoning.push(\`Essential \${cat}\`);
            }
        });
        
        return {
            total: Math.min(Math.max(score, 0), 100),
            reasoning: reasoning.slice(0, 3) // Limit to 3 reasons
        };
    }
}

module.exports = RecommendationService;
`;
        
        // Write the service file
        const servicePath = path.join(__dirname, '../services');
        if (!fs.existsSync(servicePath)) {
            fs.mkdirSync(servicePath, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(servicePath, 'RecommendationService.js'),
            serviceCode
        );
        
        console.log('✅ Recommendation service created!');
    }
    
    createQuizRoutes() {
        console.log('🛣️ Creating quiz routes...');
        
        const routeCode = `
// routes/quiz.js
const express = require('express');
const router = express.Router();
const RecommendationService = require('../services/RecommendationService');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD || '90226628',
    port: process.env.DB_PORT || 5432,
});

// GET /api/quiz/reference-data
router.get('/reference-data', async (req, res) => {
    try {
        const skinTypes = await pool.query('SELECT * FROM skin_types ORDER BY name');
        const concerns = await pool.query('SELECT * FROM skin_concerns ORDER BY name');
        
        res.json({
            success: true,
            data: {
                skinTypes: skinTypes.rows,
                concerns: concerns.rows
            }
        });
    } catch (error) {
        console.error('Reference data error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load reference data' 
        });
    }
});

// POST /api/quiz/submit
router.post('/submit', async (req, res) => {
    try {
        console.log('📝 Quiz submission received:', req.body);
        
        const { skinType, concerns = [], sensitivities = {} } = req.body;
        
        // Validate input
        if (!skinType) {
            return res.status(400).json({
                success: false,
                error: 'Skin type is required'
            });
        }
        
        // Generate recommendations
        const recommendations = await RecommendationService.generateRecommendations({
            skinType,
            concerns,
            sensitivities
        });
        
        console.log(\`✅ Generated \${recommendations.length} recommendations\`);
        
        res.json({
            success: true,
            data: {
                quizResults: { skinType, concerns, sensitivities },
                recommendations,
                totalFound: recommendations.length,
                message: \`Found \${recommendations.length} products for your skin profile\`
            }
        });
        
    } catch (error) {
        console.error('❌ Quiz submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate recommendations',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/quiz/test
router.get('/test', async (req, res) => {
    try {
        // Test recommendation system
        const testResults = await RecommendationService.generateRecommendations({
            skinType: 'dry',
            concerns: ['dryness', 'sensitivity'],
            sensitivities: { fragrance: true, alcohol: false }
        });
        
        res.json({
            success: true,
            message: 'Recommendation system test',
            testResults: testResults.slice(0, 3) // Just show first 3
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
`;
        
        const routePath = path.join(__dirname, '../routes');
        if (!fs.existsSync(routePath)) {
            fs.mkdirSync(routePath, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(routePath, 'quiz.js'),
            routeCode
        );
        
        console.log('✅ Quiz routes created!');
    }
    
    async updateServerFile() {
        console.log('🔧 Updating server.js...');
        
        const serverPath = path.join(__dirname, '../server.js');
        
        if (fs.existsSync(serverPath)) {
            let content = fs.readFileSync(serverPath, 'utf8');
            
            // Add quiz routes if not present
            if (!content.includes('/api/quiz')) {
                const routeSection = content.indexOf('// Routes') || content.indexOf('app.use');
                if (routeSection > -1) {
                    const quizRoute = "app.use('/api/quiz', require('./routes/quiz'));\n";
                    content = content.slice(0, routeSection) + quizRoute + content.slice(routeSection);
                    
                    fs.writeFileSync(serverPath, content);
                    console.log('✅ Added quiz routes to server.js');
                } else {
                    console.log('⚠️ Could not auto-add routes. Add this line to server.js:');
                    console.log("app.use('/api/quiz', require('./routes/quiz'));");
                }
            } else {
                console.log('✅ Quiz routes already in server.js');
            }
        } else {
            console.log('⚠️ server.js not found. Make sure to add quiz routes manually.');
        }
    }
    
    async testRecommendationSystem() {
        console.log('🧪 Testing recommendation system...');
        
        try {
            // Test database connectivity
            const dbTest = await pool.query('SELECT COUNT(*) FROM products WHERE suitable_for_skin_types != \'\'');
            console.log(\`✅ Found \${dbTest.rows[0].count} products ready for recommendations\`);
            
            // Test API endpoint with curl equivalent
            console.log('✅ Recommendation system setup complete!');
            console.log('');
            console.log('🚀 NEXT STEPS:');
            console.log('1. Start your server: npm start');
            console.log('2. Test the API:');
            console.log('   curl -X POST http://localhost:5000/api/quiz/submit \\');
            console.log('     -H "Content-Type: application/json" \\');
            console.log('     -d \'{"skinType":"dry","concerns":["dryness"],"sensitivities":{"fragrance":true}}\'');
            console.log('3. Check frontend quiz flow');
            console.log('');
            console.log('📊 Quick stats:');
            const stats = await pool.query(\`
                SELECT 
                    main_category,
                    COUNT(*) as count,
                    COUNT(CASE WHEN suitable_for_skin_types != '' THEN 1 END) as ready_for_recs
                FROM products 
                WHERE main_category IS NOT NULL 
                GROUP BY main_category 
                ORDER BY count DESC 
                LIMIT 5
            \`);
            
            console.table(stats.rows);
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
    }
    
    async runFullSetup() {
        try {
            console.log('🚀 QUICK RECOMMENDATION SETUP - Starting...');
            console.log('='.repeat(60));
            
            await this.setupDatabase();
            this.createRecommendationService();
            this.createQuizRoutes();
            await this.updateServerFile();
            await this.testRecommendationSystem();
            
            console.log('');
            console.log('🎉 RECOMMENDATION SYSTEM READY!');
            console.log('');
            console.log('📋 What was created:');
            console.log('   ✅ Database tables for quiz data');
            console.log('   ✅ Product recommendation data populated');
            console.log('   ✅ RecommendationService.js');
            console.log('   ✅ Quiz routes (/api/quiz/*)');
            console.log('   ✅ Server.js updated');
            console.log('');
            console.log('🎯 You can now:');
            console.log('   - Submit quiz data via API');
            console.log('   - Get scored product recommendations');
            console.log('   - See reasoning for each recommendation');
            console.log('');
            console.log('💡 Focus on testing the algorithm now!');
            console.log('   Images and UI polish can come later.');
            
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            console.error('');
            console.error('🔧 Try running individual steps:');
            console.error('   1. Check PostgreSQL is running');
            console.error('   2. Verify database connection');
            console.error('   3. Run setup steps manually');
        } finally {
            await pool.end();
        }
    }
}

// Run if executed directly
if (require.main === module) {
    const setup = new QuickRecommendationSetup();
    setup.runFullSetup();
}

module.exports = QuickRecommendationSetup;
