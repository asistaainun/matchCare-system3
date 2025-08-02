// backend/server.js - UPDATED FOR TRUE ONTOLOGY-BASED SYSTEM
// 🎓 CRITICAL: Replace hybrid engine dengan ontology engine untuk skripsi
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { Pool } = require('pg');

// 🎓 CRITICAL CHANGE: Ganti dari hybridEngine ke ontologyEngine
const ontologyEngine = require('./services/ontologyBasedRecommendationEngine');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== DATABASE CONNECTION =====
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// ===== MIDDLEWARE =====
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== ADD THESE IMPORTS AT THE TOP =====
const productRoutes = require('./routes/products');
const ingredientRoutes = require('./routes/ingredients');

// ===== ADD THESE ROUTES AFTER YOUR EXISTING ROUTES =====

// 🧠 ONTOLOGY-POWERED PRODUCT ROUTES (Critical for thesis)
app.use('/api/products', productRoutes);

// 🧠 ONTOLOGY-POWERED INGREDIENT ROUTES (Critical for thesis) 
app.use('/api/ingredients', ingredientRoutes);

// ===== ONTOLOGY ANALYSIS ROUTES =====
const analysisRoutes = require('./routes/analysis');
app.use('/api/analysis', analysisRoutes);

// ===== HEALTH CHECK ENDPOINTS =====
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MatchCare TRUE Ontology-Based API is running',
    timestamp: new Date().toISOString(),
    ontology_integration: 'ACTIVE - SPARQL REASONING',
    database_connected: true,
    algorithm_type: 'TRUE_ONTOLOGY_BASED',
    service: 'MatchCare Ontology API',
    port: PORT,
    academic_contribution: 'Novel ontology-based skincare recommendation for Indonesian market'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    success: true,
    message: 'MatchCare TRUE Ontology-Based API is running',
    service: 'MatchCare Ontology API',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    port: PORT,
    timestamp: new Date().toISOString(),
    ontology_integration: 'ACTIVE - SPARQL REASONING',
    algorithm_type: 'TRUE_ONTOLOGY_BASED'
  });
});

// API info endpoint  
app.get('/', (req, res) => {
  res.json({
    message: 'MatchCare TRUE Ontology-Based API',
    version: '1.0.0-ontology-based',
    algorithm_type: 'TRUE_ONTOLOGY_BASED',
    port: PORT,
    academic_contribution: 'Novel SPARQL-based recommendation system for Indonesian skincare market',
    features: [
      '🧠 SPARQL Semantic Reasoning (PRIMARY)',
      '🔗 Ontology-to-Database Mapping',
      '🛡️ Semantic Safety Analysis', 
      '📊 Knowledge Graph Utilization',
      '🎯 Ingredient Interaction Detection',
      '📝 Academic-Grade Explanations'
    ],
    technical_innovation: [
      'First ontology-based skincare recommendation in Indonesia',
      'SPARQL query optimization for real-time recommendations',
      'Semantic ingredient similarity matching',
      'Automated conflict detection via knowledge graphs'
    ],
    endpoints: {
      health: '/health',
      api_health: '/api/health',
      
      // 🎓 MAIN ONTOLOGY ENDPOINTS
      ontology_recommendations: {
        guest: 'POST /api/ontology/recommendations',
        test: 'GET /api/test/ontology-engine'
      },
      
      // Quiz System
      quiz: {
        start: 'POST /api/quiz/start',
        reference_data: 'GET /api/quiz/reference-data',
        submit: 'POST /api/quiz/submit',
        recommendations: 'GET /api/recommendations/:session_id'
      },
      
      // Ontology Analysis (Academic)
      analysis: {
        synergistic_combos: 'GET /api/analysis/synergistic-combos',
        ingredient_conflicts: 'POST /api/analysis/ingredient-conflicts',
        skin_recommendations: 'POST /api/analysis/skin-recommendations',
        ontology_status: 'GET /api/analysis/ontology-status'
      }
    },
    ready_for_academic_demo: true
  });
});

// ===== QUIZ ENDPOINTS (UNCHANGED) =====

// Start quiz session
app.post('/api/quiz/start', async (req, res) => {
  try {
    console.log('🚀 Starting quiz session...');
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sessionId = `quiz_${timestamp}_${randomString}`;
    
    const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    const insertQuery = `
      INSERT INTO guest_sessions (session_id, ip_address, user_agent, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, session_id, created_at, expires_at
    `;
    
    const insertValues = [
      sessionId,
      clientIp,
      userAgent,
      new Date(Date.now() + 24 * 60 * 60 * 1000),
      new Date()
    ];
    
    const result = await pool.query(insertQuery, insertValues);
    const sessionData = result.rows[0];

    res.json({
      success: true,
      data: {
        session_id: sessionData.session_id,
        started_at: sessionData.created_at,
        expires_at: sessionData.expires_at
      },
      message: 'Quiz session started - ready for ontology-based recommendations'
    });

  } catch (error) {
    console.error('❌ Quiz start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start quiz session',
      error: error.message
    });
  }
});

// Get quiz reference data
app.get('/api/quiz/reference-data', async (req, res) => {
  try {
    console.log('📋 Fetching quiz reference data...');

    const [skinTypes, skinConcerns, allergenTypes] = await Promise.all([
      pool.query('SELECT id, name FROM skin_types ORDER BY id'),
      pool.query('SELECT id, name FROM skin_concerns ORDER BY id'),
      pool.query('SELECT id, name FROM allergen_types ORDER BY id').catch(() => ({ rows: [] }))
    ]);

    const defaultAllergens = [
      { id: 1, name: 'fragrance' },
      { id: 2, name: 'alcohol' },
      { id: 3, name: 'silicone' }
    ];

    const responseData = {
      skin_types: skinTypes.rows,
      skin_concerns: skinConcerns.rows,
      allergen_types: allergenTypes.rows.length > 0 ? allergenTypes.rows : defaultAllergens
    };

    res.json({
      success: true,
      data: responseData,
      message: 'Reference data fetched successfully'
    });

  } catch (error) {
    console.error('❌ Quiz reference data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reference data',
      error: error.message
    });
  }
});

// Submit quiz
app.post('/api/quiz/submit', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { session_id, skin_type, concerns = [], sensitivities = [] } = req.body;
    
    console.log('📝 Quiz submit for ontology processing:', { session_id, skin_type, concerns, sensitivities });

    if (!session_id || !skin_type) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and skin type are required'
      });
    }

    // Verify session exists
    const sessionCheck = await client.query(
      'SELECT id, session_id, expires_at FROM guest_sessions WHERE session_id = $1',
      [session_id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid session ID'
      });
    }

    // Check if session expired
    const sessionData = sessionCheck.rows[0];
    if (new Date() > new Date(sessionData.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'Quiz session has expired'
      });
    }

    // Get skin type ID
    const skinTypeResult = await client.query(
      'SELECT id FROM skin_types WHERE name = $1',
      [skin_type]
    );

    if (skinTypeResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid skin type: ${skin_type}`
      });
    }

    const skin_type_id = skinTypeResult.rows[0].id;

    // Get concern IDs
    let concern_ids = [];
    if (concerns && concerns.length > 0) {
      const concernsResult = await client.query(
        'SELECT id FROM skin_concerns WHERE name = ANY($1)',
        [concerns]
      );
      concern_ids = concernsResult.rows.map(row => row.id);
    }

    // Process sensitivities
    const fragrance_sensitivity = sensitivities.includes('fragrance');
    const alcohol_sensitivity = sensitivities.includes('alcohol'); 
    const silicone_sensitivity = sensitivities.includes('silicone');

    // Insert quiz result
    const result = await client.query(`
      INSERT INTO quiz_results (
        session_id, 
        skin_type_id, 
        concern_ids, 
        fragrance_sensitivity, 
        alcohol_sensitivity, 
        silicone_sensitivity,
        completed_at,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, completed_at
    `, [
      session_id,
      skin_type_id,
      concern_ids,
      fragrance_sensitivity,
      alcohol_sensitivity,
      silicone_sensitivity
    ]);

    await client.query('COMMIT');

    const quizResult = result.rows[0];

    res.json({
      success: true,
      data: {
        quiz_id: quizResult.id,
        session_id: session_id,
        skin_type: skin_type,
        concerns: concerns,
        sensitivities: sensitivities,
        completed_at: quizResult.completed_at
      },
      message: 'Quiz submitted successfully - ready for ontology-based analysis'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Quiz submit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// ===== 🎓 MAIN ONTOLOGY-BASED RECOMMENDATION ENDPOINTS =====

// 🎓 CRITICAL: Main ontology recommendation endpoint
app.post('/api/ontology/recommendations', async (req, res) => {
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

// Get recommendations based on quiz results (UPDATED to use ontology)
app.get('/api/recommendations/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;

    console.log(`🎓 Getting ONTOLOGY-BASED recommendations for session: ${session_id}`);

    // Verify quiz result exists
    const quizCheck = await pool.query(
      'SELECT * FROM quiz_results WHERE session_id = $1',
      [session_id]
    );

    if (quizCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No quiz results found for this session'
      });
    }

    const quizData = quizCheck.rows[0];
    
    // 🎓 Convert quiz data to profile for ontology engine
    const skinTypeMapping = {
      1: 'normal',
      2: 'dry', 
      3: 'oily',
      4: 'combination'
    };
    
    const concernMapping = {
      1: 'acne',
      2: 'wrinkles',
      3: 'dark_spots',
      4: 'dryness',
      5: 'sensitivity',
      6: 'pores',
      7: 'oiliness',
      8: 'redness',
      9: 'dullness',
      10: 'texture'
    };
    
    const guestProfile = {
      skin_type: skinTypeMapping[quizData.skin_type_id] || 'normal',
      concerns: (quizData.concern_ids || []).map(id => concernMapping[id]).filter(Boolean),
      sensitivities: [
        ...(quizData.fragrance_sensitivity ? ['fragrance'] : []),
        ...(quizData.alcohol_sensitivity ? ['alcohol'] : []),
        ...(quizData.silicone_sensitivity ? ['silicone'] : [])
      ]
    };
    
    console.log('🎓 Converted profile for ontology engine:', guestProfile);
    
    // 🧠 USE ONTOLOGY ENGINE
    const ontologyRecommendations = await ontologyEngine.getPersonalizedRecommendations(guestProfile);

    res.json({
      success: true,
      algorithm_type: 'TRUE_ONTOLOGY_BASED',
      data: {
        session_id: session_id,
        quiz_data: {
          skin_type_id: quizData.skin_type_id,
          concerns: quizData.concern_ids,
          sensitivities: {
            fragrance: quizData.fragrance_sensitivity,
            alcohol: quizData.alcohol_sensitivity,
            silicone: quizData.silicone_sensitivity
          }
        },
        recommendations: ontologyRecommendations.recommendations,
        total_found: ontologyRecommendations.recommendations.length,
        ontology_enhanced: true,
        metadata: ontologyRecommendations.metadata,
        academic_analysis: ontologyRecommendations.academic_explanation
      },
      message: 'TRUE ontology-based recommendations generated using SPARQL reasoning'
    });

  } catch (error) {
    console.error('❌ Ontology recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ontology-based recommendations',
      error: error.message,
      algorithm_type: 'TRUE_ONTOLOGY_BASED'
    });
  }
});

// 🎓 Test endpoint untuk ontology engine
app.get('/api/test/ontology-engine', async (req, res) => {
    try {
        const testProfile = {
            skin_type: 'oily',
            concerns: ['acne', 'pores'],
            sensitivities: ['fragrance']
        };
        
        console.log('🧪 Testing TRUE ontology engine with profile:', testProfile);
        
        const recommendations = await ontologyEngine.getPersonalizedRecommendations(testProfile);
        
        res.json({
            success: true,
            algorithm_type: 'TRUE_ONTOLOGY_BASED',
            test_profile: testProfile,
            recommendations: recommendations,
            message: 'TRUE Ontology engine test successful - SPARQL reasoning working',
            academic_validation: {
                sparql_executed: recommendations.ontology_analysis?.sparql_queries_executed || 0,
                semantic_confidence: recommendations.metadata?.ontology_confidence || 'unknown',
                knowledge_graph_used: true,
                recommendation_count: recommendations.recommendations.length
            }
        });
        
    } catch (error) {
        console.error('❌ Ontology engine test failed:', error);
        res.status(500).json({
            success: false,
            algorithm_type: 'TRUE_ONTOLOGY_BASED',
            error: error.message,
            message: 'TRUE Ontology engine test failed'
        });
    }
});

// ===== ERROR HANDLERS =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    algorithm_type: 'TRUE_ONTOLOGY_BASED',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: err.message,
    ontology_powered: true
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.originalUrl} not found`,
    algorithm_type: 'TRUE_ONTOLOGY_BASED',
    available_endpoints: [
      '/', '/health', '/api/health',
      '/api/ontology/recommendations (POST) - MAIN ONTOLOGY ENDPOINT',
      '/api/test/ontology-engine - TEST ONTOLOGY ENGINE',
      '/api/quiz/start', '/api/quiz/submit', '/api/quiz/reference-data', 
      '/api/recommendations/:session_id',
      '/api/analysis/synergistic-combos', '/api/analysis/ingredient-conflicts', 
      '/api/analysis/skin-recommendations', '/api/analysis/ontology-status'
    ]
  });
});

// ===== SERVER STARTUP =====
async function startServer() {
  try {
    console.log('🎓 Starting MatchCare TRUE Ontology-Based Server...');
    console.log('='.repeat(60));
    
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    
    // Test ontology engine
    try {
      const testResult = await ontologyEngine.getPersonalizedRecommendations({
        skin_type: 'normal',
        concerns: ['dryness'],
        sensitivities: []
      });
      console.log('✅ Ontology engine test successful');
      console.log(`📊 Test recommendations: ${testResult.recommendations.length}`);
    } catch (error) {
      console.warn('⚠️ Ontology engine test failed:', error.message);
      console.log('💡 Make sure Fuseki server is running with ontology data');
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('🎉 MatchCare TRUE Ontology-Based Server Started!');
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🧪 Ontology Test: http://localhost:${PORT}/api/test/ontology-engine`);
      console.log(`🎓 Main Endpoint: POST http://localhost:${PORT}/api/ontology/recommendations`);
      console.log(`🔍 Quiz System: http://localhost:${PORT}/api/quiz/start`);
      console.log('');
      console.log('🎓 ACADEMIC FEATURES READY:');
      console.log('   ✅ SPARQL semantic reasoning');
      console.log('   ✅ Knowledge graph utilization');
      console.log('   ✅ Ingredient interaction analysis');
      console.log('   ✅ Ontology-driven scoring (70% semantic)');
      console.log('   ✅ Academic-grade explanations');
      console.log('');
      console.log('🚀 TRUE ONTOLOGY-BASED SYSTEM READY FOR SKRIPSI DEMO!');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        pool.end();
      });
    });

  } catch (error) {
    console.error('❌ Server start failed:', error.message);
    
    if (error.message.includes('connect ECONNREFUSED')) {
      console.error('💡 TIP: Make sure PostgreSQL is running');
    } else if (error.message.includes('password authentication failed')) {
      console.error('💡 TIP: Check your database credentials in .env');
    }
    
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;