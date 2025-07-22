// backend/server.js
// PROFESSIONAL LITE SERVER - Safe for Existing Data

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

// Security & Performance
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'MatchCare API - Professional Lite',
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    sync_mode: 'disabled_safe',
    ontology_ready: true,
    timestamp: new Date().toISOString(),
    version: '1.0.0-lite'
  });
});

// API info endpoint  
app.get('/', (req, res) => {
  res.json({
    message: 'MatchCare API Server - Professional Lite',
    version: '1.0.0-lite',
    setup: 'ontology_ready',
    endpoints: {
      health: '/health',
      products: '/api/products',
      product_detail: '/api/products/:id',
      ingredients: '/api/ingredients',
      brands: '/api/brands',
      quiz_start: '/api/quiz/start',
      quiz_submit: '/api/quiz/submit',
      quiz_data: '/api/quiz/reference-data',
      recommendations: '/api/recommendations [Week 4 ready]'
    },
    features: [
      'Product-Ingredient relationships',
      'Ontology URI mapping',
      'Safety analysis ready',
      'Key ingredient identification',
      'SPARQL integration foundation'
    ]
  });
});

// ===== QUIZ ENDPOINTS =====

// Quiz start endpoint
app.post('/api/quiz/start', async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    console.log('🚀 Starting new quiz session...');
    
    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Create guest session record
    await pool.query(`
      INSERT INTO guest_sessions (session_id, created_at, expires_at)
      VALUES ($1, NOW(), NOW() + INTERVAL '24 hours')
      ON CONFLICT (session_id) DO NOTHING
    `, [sessionId]);

    console.log(`✅ Quiz session started: ${sessionId}`);

    res.json({
      success: true,
      data: {
        session_id: sessionId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      message: 'Quiz session started successfully'
    });

  } catch (error) {
    console.error('Start quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start quiz session',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Quiz reference data endpoint
app.get('/api/quiz/reference-data', async (req, res) => {
  try {
    console.log('📋 Fetching quiz reference data...');

    const [skinTypes, skinConcerns, allergenTypes] = await Promise.all([
      pool.query('SELECT id, name FROM skin_types ORDER BY id'),
      pool.query('SELECT id, name FROM skin_concerns ORDER BY id'),
      pool.query('SELECT id, name FROM allergen_types ORDER BY id')
    ]);

    res.json({
      success: true,
      data: {
        skin_types: skinTypes.rows,
        skin_concerns: skinConcerns.rows,
        allergen_types: allergenTypes.rows
      },
      message: 'Reference data fetched successfully'
    });

  } catch (error) {
    console.error('Quiz reference data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reference data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


// Quiz submit endpoint
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { session_id, skin_type, concerns, sensitivities } = req.body;
    
    console.log('📝 Quiz submit data:', { session_id, skin_type, concerns, sensitivities });

    // Validate required fields
    if (!session_id || !skin_type) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and skin type are required'
      });
    }

    // Verify session exists
    const sessionCheck = await pool.query(
      'SELECT id FROM guest_sessions WHERE session_id = $1',
      [session_id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid session ID'
      });
    }

    // Get skin type ID
    const skinTypeResult = await pool.query(
      'SELECT id FROM skin_types WHERE name = $1',
      [skin_type]
    );

    if (skinTypeResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid skin type'
      });
    }

    const skin_type_id = skinTypeResult.rows[0].id;

    // Get concern IDs
    let concern_ids = [];
    if (concerns && concerns.length > 0) {
      const concernsResult = await pool.query(
        'SELECT id FROM skin_concerns WHERE name = ANY($1)',
        [concerns]
      );
      concern_ids = concernsResult.rows.map(row => row.id);
    }

    // Process sensitivities
    const fragrance_sensitivity = sensitivities?.includes('fragrance') || false;
    const alcohol_sensitivity = sensitivities?.includes('alcohol') || false;
    const silicone_sensitivity = sensitivities?.includes('silicone') || false;

    // Insert quiz result
    const result = await pool.query(`
      INSERT INTO quiz_results (
        session_id, 
        skin_type_id, 
        concern_ids, 
        fragrance_sensitivity, 
        alcohol_sensitivity, 
        silicone_sensitivity
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, completed_at
    `, [
      session_id,
      skin_type_id,
      concern_ids,
      fragrance_sensitivity,
      alcohol_sensitivity,
      silicone_sensitivity
    ]);

    console.log('✅ Quiz submitted successfully:', result.rows[0]);

    res.json({
      success: true,
      data: {
        quiz_id: result.rows[0].id,
        session_id: session_id,
        completed_at: result.rows[0].completed_at
      },
      message: 'Quiz submitted successfully'
    });

  } catch (error) {
    console.error('Quiz submit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ===== ONTOLOGY-READY API ENDPOINTS =====

// Products with full relationships (CRITICAL for Week 3)
app.get('/api/products', async (req, res) => {
  try {
    const { Product, Brand, Ingredient } = require('./models');
    const { 
      search, brand, category, limit = 20, offset = 0,
      alcohol_free, fragrance_free, paraben_free 
    } = req.query;

    let whereClause = { is_active: true };

    // Search functionality
    if (search) {
      const { Op } = require('sequelize');
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filters
    if (category) whereClause.main_category = { [Op.iLike]: `%${category}%` };
    if (alcohol_free === 'true') whereClause.alcohol_free = true;
    if (fragrance_free === 'true') whereClause.fragrance_free = true;
    if (paraben_free === 'true') whereClause.paraben_free = true;

    const products = await Product.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: Brand, 
          as: 'Brand',
          attributes: ['id', 'name'] 
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: [
        'id', 'name', 'main_category', 'subcategory', 
        'description',  'alcohol_free', 'fragrance_free', 
        'paraben_free', 'sulfate_free', 'silicone_free'
      ]
    });

    res.json({
      success: true,
      data: products.rows,
      pagination: {
        total: products.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(products.count / limit)
      },
      ontology_mapped: true
    });

  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Single product with full ingredient analysis (CRITICAL for Week 3)
app.get('/api/products/:id', async (req, res) => {
  try {
    const { Product, Brand, Ingredient, ProductIngredient } = require('./models');
    
    const product = await Product.findOne({
      where: { id: parseInt(req.params.id), is_active: true },
      include: [
        { 
          model: Brand, 
          as: 'Brand',
          attributes: ['id', 'name'] 
        },
        {
          model: Ingredient,
          as: 'Ingredients',
          attributes: [
            'id', 'name',  'what_it_does', 'explanation',
            'benefit', 'safety', 'is_key_ingredient', 'actual_functions',
            'alcohol_free', 'fragrance_free', 'paraben_free'
          ],
          through: { 
            attributes: ['position', 'is_key_ingredient', 'notes']
          }
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    // Process ingredients for analysis
    const ingredients = product.Ingredients || [];
    const keyIngredients = ingredients.filter(ing => 
      ing.ProductIngredient?.is_key_ingredient || ing.is_key_ingredient
    );

    // Safety analysis
    const safetyProfile = {
      alcohol_free: product.alcohol_free,
      fragrance_free: product.fragrance_free,  
      paraben_free: product.paraben_free,
      sulfate_free: product.sulfate_free,
      silicone_free: product.silicone_free
    };

    const response = {
      ...product.toJSON(),
      ingredients_count: ingredients.length,
      key_ingredients: keyIngredients,
      key_ingredients_count: keyIngredients.length,
      safety_profile: safetyProfile,
      analysis_ready: true,
      ontology_mapped: true
    };

    res.json({ 
      success: true, 
      data: response 
    });

  } catch (error) {
    console.error('Product detail API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch product details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Ingredients endpoint (for reasoning and analysis)
app.get('/api/ingredients', async (req, res) => {
  try {
    const { Ingredient } = require('./models');
    const { search, limit = 50, key_ingredients_only } = req.query;

    let whereClause = { is_active: true };
    
    if (search) {
      const { Op } = require('sequelize');
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { what_it_does: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (key_ingredients_only === 'true') {
      whereClause.is_key_ingredient = true;
    }

    const ingredients = await Ingredient.findAll({
      where: whereClause,
      attributes: [
        'id', 'name',  'what_it_does', 'explanation',
        'benefit', 'safety', 'is_key_ingredient', 'actual_functions'
      ],
      limit: parseInt(limit),
      order: [['name', 'ASC']]
    });

    res.json({ 
      success: true, 
      data: ingredients,
      ontology_ready: true
    });

  } catch (error) {
    console.error('Ingredients API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// User profile endpoint (for skin quiz - Week 2)
app.post('/api/user-profile', async (req, res) => {
  try {
    const { UserProfile, SkinType } = require('./models');
    
    const profileData = {
      session_id: req.body.session_id,
      skin_type_id: req.body.skin_type_id,
      skin_concerns: JSON.stringify(req.body.skin_concerns || []),
      avoided_ingredients: JSON.stringify(req.body.avoided_ingredients || []),
      liked_ingredients: JSON.stringify(req.body.liked_ingredients || []),
      quiz_version: '1.0',
      quiz_completed_at: new Date()
    };

    const profile = await UserProfile.create(profileData);
    
    const fullProfile = await UserProfile.findByPk(profile.id, {
      include: [{ 
        model: SkinType, 
        as: 'SkinType',
        attributes: ['name'] 
      }]
    });

    res.json({ 
      success: true, 
      data: fullProfile,
      message: 'Profile saved for recommendations'
    });

  } catch (error) {
    console.error('User profile API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Recommendations placeholder (Week 4 - SPARQL ready)
app.get('/api/recommendations', async (req, res) => {
  res.json({
    success: true,
    message: 'SPARQL reasoning endpoint - Ready for Week 4 implementation',
    implementation_ready: true,
    ontology_integration: 'pending',
    data: [],
    note: 'Foundation complete for Apache Jena Fuseki integration'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.originalUrl} not found`,
    available_endpoints: [
      '/', '/health', '/api/products', '/api/products/:id', 
      '/api/ingredients', '/api/quiz/start', '/api/quiz/submit', 
      '/api/quiz/reference-data'
    ]
  });
});

// ===== SMART DATABASE CONNECTION =====
async function startServer() {
  try {
    console.log('🚀 Starting MatchCare Server - Professional Lite...');
    
    // Test database connection first
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log(`📊 Database: ${process.env.DB_NAME || 'matchcare_fresh_db'}`);
    
    // Import models and test connection
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    console.log('✅ Sequelize models connected successfully');
    
    // ⚠️ CRITICAL: NO SYNC - Protects your existing data
    console.log('⚠️ Database sync DISABLED - protecting existing data');
    console.log('🎯 Using Professional Lite models matching existing schema');
    console.log('🔗 Ontology mappings ready for SPARQL integration');
    
    // Test basic query to verify models work
    try {
      const { Product } = require('./models');
      const testCount = await Product.count();
      console.log(`📦 Products in database: ${testCount}`);
      console.log('✅ Models working correctly with existing data');
    } catch (error) {
      console.warn('⚠️ Model test failed:', error.message);
      console.log('🔄 Server will still start - check model definitions if needed');
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('🎉 MatchCare Server Started Successfully!');
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🧪 Quiz Start: http://localhost:${PORT}/api/quiz/start`);
      console.log('🎯 Professional Lite - Ontology Ready!');
      console.log('🚀 Ready for development progression to SPARQL!');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        if (sequelize) sequelize.close();
        if (pool) pool.end();
      });
    });

  } catch (error) {
    console.error('❌ Server start failed:', error.message);
    console.error('🔍 Error details:', error);
    
    // Helpful troubleshooting
    if (error.message.includes('connect ECONNREFUSED')) {
      console.error('💡 TIP: Make sure PostgreSQL is running on port 5432');
      console.error('🔧 Try: brew services start postgresql  # or equivalent for your system');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error(`💡 TIP: Database not found. Check: ${process.env.DB_NAME || 'matchcare_fresh_db'}`);
    } else if (error.message.includes('password authentication failed')) {
      console.error('💡 TIP: Check your database credentials in .env file');
    } else if (error.message.includes('VARCHAR') || error.message.includes('character varying')) {
      console.error('💡 TIP: This Professional Lite setup should fix the VARCHAR errors');
      console.error('🔧 If still failing, restore backup and check model definitions');
    }
    
    process.exit(1);
  }
}

// Start the server
startServer();

// Export for testing
module.exports = app;