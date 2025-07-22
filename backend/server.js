const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000; // Sesuai dengan port aktual Anda

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Middleware
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

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'MatchCare API',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API info endpoint  
app.get('/', (req, res) => {
  res.json({
    message: 'MatchCare API - Fixed for Actual Database',
    version: '1.0.0-fixed',
    port: PORT,
    endpoints: {
      health: '/health',
      products: '/api/products',
      quiz_start: '/api/quiz/start',
      quiz_reference: '/api/quiz/reference-data',
      quiz_submit: '/api/quiz/submit'
    }
  });
});

// ===== QUIZ ENDPOINTS - FIXED =====

// Start quiz session - FIXED untuk insert ke guest_sessions
app.post('/api/quiz/start', async (req, res) => {
  try {
    console.log('🚀 Starting quiz session...');
    
    // Generate session ID
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sessionId = `quiz_${timestamp}_${randomString}`;
    
    console.log(`📝 Generated session ID: ${sessionId}`);
    
    // Get client info
    const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    console.log(`📍 Client info - IP: ${clientIp}, User-Agent: ${userAgent}`);
    
    // SIMPLE INSERT without transaction
    console.log('💾 Inserting to guest_sessions...');
    
    const insertQuery = `
      INSERT INTO guest_sessions (session_id, ip_address, user_agent, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, session_id, created_at, expires_at
    `;
    
    const insertValues = [
      sessionId,
      clientIp,
      userAgent,
      new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      new Date()
    ];
    
    console.log('🔧 Query:', insertQuery);
    console.log('🔧 Values:', insertValues);
    
    const result = await pool.query(insertQuery, insertValues);
    
    if (result.rows.length === 0) {
      throw new Error('Insert returned no rows');
    }
    
    const sessionData = result.rows[0];
    console.log('✅ Insert successful:', sessionData);
    
    // VERIFY insert worked
    console.log('🔍 Verifying insert...');
    const verifyResult = await pool.query(
      'SELECT session_id, created_at FROM guest_sessions WHERE session_id = $1',
      [sessionId]
    );
    
    if (verifyResult.rows.length === 0) {
      console.error('❌ VERIFICATION FAILED - Session not found after insert!');
      throw new Error('Session verification failed');
    }
    
    console.log('✅ Verification successful:', verifyResult.rows[0]);

    res.json({
      success: true,
      data: {
        session_id: sessionData.session_id,
        started_at: sessionData.created_at,
        expires_at: sessionData.expires_at
      },
      message: 'Quiz session started'
    });

  } catch (error) {
    console.error('❌ Quiz start error:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to start quiz session',
      error: error.message,
      debug: {
        query_failed: true,
        error_code: error.code,
        error_detail: error.detail
      }
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

    // Default allergen data jika table tidak ada
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

    console.log(`📊 Reference data: ${skinTypes.rows.length} skin types, ${skinConcerns.rows.length} concerns`);

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

// Submit quiz - FIXED untuk proper foreign key handling
app.post('/api/quiz/submit', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { session_id, skin_type, concerns = [], sensitivities = [] } = req.body;
    
    console.log('📝 Quiz submit data:', { session_id, skin_type, concerns, sensitivities });

    if (!session_id || !skin_type) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and skin type are required'
      });
    }

    // 1. VERIFY session exists di guest_sessions
    console.log(`🔍 Verifying session exists: ${session_id}`);
    const sessionCheck = await client.query(
      'SELECT id, session_id, expires_at FROM guest_sessions WHERE session_id = $1',
      [session_id]
    );

    if (sessionCheck.rows.length === 0) {
      console.error(`❌ Session not found: ${session_id}`);
      return res.status(404).json({
        success: false,
        message: `Invalid session ID: ${session_id}. Session not found in guest_sessions table.`
      });
    }

    // Check if session expired
    const sessionData = sessionCheck.rows[0];
    if (new Date() > new Date(sessionData.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'Quiz session has expired. Please start a new quiz.'
      });
    }

    console.log(`✅ Session verified: ${sessionData.session_id}`);

    // 2. Get skin type ID
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
    console.log(`✅ Skin type resolved: ${skin_type} -> ID ${skin_type_id}`);

    // 3. Get concern IDs (optional)
    let concern_ids = [];
    if (concerns && concerns.length > 0) {
      const concernsResult = await client.query(
        'SELECT id FROM skin_concerns WHERE name = ANY($1)',
        [concerns]
      );
      concern_ids = concernsResult.rows.map(row => row.id);
      console.log(`📋 Concerns resolved: ${concerns.join(', ')} -> IDs [${concern_ids.join(', ')}]`);
    }

    // 4. Process sensitivities
    const fragrance_sensitivity = sensitivities.includes('fragrance');
    const alcohol_sensitivity = sensitivities.includes('alcohol'); 
    const silicone_sensitivity = sensitivities.includes('silicone');

    console.log(`⚠️ Sensitivities: fragrance=${fragrance_sensitivity}, alcohol=${alcohol_sensitivity}, silicone=${silicone_sensitivity}`);

    // 5. INSERT quiz result dengan proper foreign key
    console.log(`💾 Inserting quiz result for session: ${session_id}`);
    
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
      session_id,          // Use session_id langsung (VARCHAR)
      skin_type_id,
      concern_ids,
      fragrance_sensitivity,
      alcohol_sensitivity,
      silicone_sensitivity
    ]);

    await client.query('COMMIT');

    const quizResult = result.rows[0];
    console.log('✅ Quiz submitted successfully:', quizResult);

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
      message: 'Quiz submitted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Quiz submit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz',
      error: `Failed to submit quiz: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
  }
});

// Get recommendations based on quiz results
app.get('/api/recommendations/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { limit = 10 } = req.query;

    console.log(`🎯 Getting recommendations for session: ${session_id}`);

    // Verify quiz result exists
    const quizCheck = await pool.query(
      'SELECT * FROM quiz_results WHERE session_id = $1',
      [session_id]
    );

    if (quizCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No quiz results found for this session. Please complete the quiz first.'
      });
    }

    const quizData = quizCheck.rows[0];
    
    // Simple recommendation logic for now (will be enhanced with ontology later)
    // For now, just return sample products
    const sampleRecommendations = [
      {
        id: 1,
        name: "Gentle Moisturizing Cream",
        brand: "CeraVe", 
        product_type: "Moisturizer",
        description: "A gentle, fragrance-free moisturizer perfect for dry and sensitive skin",
        main_category: "Moisturizer",
        match_score: 95,
        reasons: [
          "Suitable for your dry skin type",
          "Fragrance-free (matches your sensitivity)",
          "Addresses dryness concern"
        ]
      },
      {
        id: 2,
        name: "Hydrating Serum",
        brand: "The Ordinary",
        product_type: "Serum", 
        description: "Hyaluronic acid serum for intense hydration",
        main_category: "Treatment",
        match_score: 88,
        reasons: [
          "Excellent for dry skin hydration",
          "Alcohol-free formulation",
          "Helps with sensitivity"
        ]
      }
    ];

    res.json({
      success: true,
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
        recommendations: sampleRecommendations,
        total_found: sampleRecommendations.length
      },
      message: 'Recommendations generated successfully'
    });

  } catch (error) {
    console.error('❌ Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: error.message
    });
  }
});

// ===== ERROR HANDLERS =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
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
      '/', '/health', '/api/quiz/start', '/api/quiz/submit', 
      '/api/quiz/reference-data', '/api/recommendations/:session_id'
    ]
  });
});

// ===== SERVER STARTUP =====
async function startServer() {
  try {
    console.log('🚀 Starting MatchCare Server - Fixed Version...');
    
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log(`📊 Database: ${process.env.DB_NAME || 'matchcare_fresh_db'}`);
    
    // Test quiz tables
    try {
      const skinTypeCount = await pool.query('SELECT COUNT(*) FROM skin_types');
      const skinConcernCount = await pool.query('SELECT COUNT(*) FROM skin_concerns');
      const guestSessionCount = await pool.query('SELECT COUNT(*) FROM guest_sessions');
      
      console.log(`📋 Skin types: ${skinTypeCount.rows[0].count}`);
      console.log(`📋 Skin concerns: ${skinConcernCount.rows[0].count}`);
      console.log(`👥 Guest sessions: ${guestSessionCount.rows[0].count}`);
    } catch (error) {
      console.warn('⚠️ Quiz tables test failed:', error.message);
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('🎉 MatchCare Server Started Successfully!');
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🧪 Quiz Start: http://localhost:${PORT}/api/quiz/start`);
      console.log('✅ Quiz foreign key issue FIXED!');
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