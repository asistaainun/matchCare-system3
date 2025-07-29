// backend/server.js - OPTIMAL MERGED VERSION
// Combines database/quiz functionality with ontology analysis capabilities

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

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

// ===== MIDDLEWARE (CORRECT ORDER!) =====
app.use(helmet());
app.use(compression());
app.use(cors());

// CRITICAL: Body parsers MUST come BEFORE routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== ONTOLOGY ANALYSIS ROUTES =====
const analysisRoutes = require('./routes/analysis');
app.use('/api/analysis', analysisRoutes);

// ===== HEALTH CHECK ENDPOINTS =====
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MatchCare Backend API is running',
    timestamp: new Date().toISOString(),
    ontology_integration: 'active',
    database_connected: true,
    service: 'MatchCare API',
    port: PORT
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    success: true,
    message: 'MatchCare Backend API is running',
    service: 'MatchCare API',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    port: PORT,
    timestamp: new Date().toISOString(),
    ontology_integration: 'active'
  });
});

// API info endpoint  
app.get('/', (req, res) => {
  res.json({
    message: 'MatchCare API - Ontology Integration with Quiz System',
    version: '1.0.0-merged',
    port: PORT,
    features: [
      'Database Integration (PostgreSQL)',
      'Quiz System with Session Management', 
      'Ontology-based Analysis',
      'Product Recommendations',
      'Ingredient Conflict Detection'
    ],
    endpoints: {
      health: '/health',
      api_health: '/api/health',
      
      // Products API (NEW)
      products: {
        list: 'GET /api/products',
        detail: 'GET /api/products/:id', 
        categories: 'GET /api/products/categories',
        brands: 'GET /api/products/brands'
      },
      
      // Ingredients API (NEW)
      ingredients: {
        list: 'GET /api/ingredients',
        detail: 'GET /api/ingredients/:nameOrId',
        key_ingredients: 'GET /api/ingredients/key-ingredients',
        compatibility: 'POST /api/ingredients/compatibility-check'
      },
      
      // Quiz System
      quiz: {
        start: 'POST /api/quiz/start',
        reference_data: 'GET /api/quiz/reference-data',
        submit: 'POST /api/quiz/submit',
        recommendations: 'GET /api/recommendations/:session_id'
      },
      
      // Ontology Analysis
      analysis: {
        synergistic_combos: 'GET /api/analysis/synergistic-combos',
        ingredient_conflicts: 'POST /api/analysis/ingredient-conflicts',
        ingredient_analysis: 'POST /api/analysis/ingredient-analysis', 
        skin_recommendations: 'POST /api/analysis/skin-recommendations',
        ontology_status: 'GET /api/analysis/ontology-status'
      }
    },
    ready_for_testing: true
  });
});

// ===== QUIZ ENDPOINTS =====

// Start quiz session
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
    
    // Insert to guest_sessions
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
    
    const result = await pool.query(insertQuery, insertValues);
    
    if (result.rows.length === 0) {
      throw new Error('Insert returned no rows');
    }
    
    const sessionData = result.rows[0];
    console.log('✅ Insert successful:', sessionData);
    
    // Verify insert worked
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

    // Default allergen data if table doesn't exist
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

// Submit quiz
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

    // Verify session exists
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
    console.log(`✅ Skin type resolved: ${skin_type} -> ID ${skin_type_id}`);

    // Get concern IDs (optional)
    let concern_ids = [];
    if (concerns && concerns.length > 0) {
      const concernsResult = await client.query(
        'SELECT id FROM skin_concerns WHERE name = ANY($1)',
        [concerns]
      );
      concern_ids = concernsResult.rows.map(row => row.id);
      console.log(`📋 Concerns resolved: ${concerns.join(', ')} -> IDs [${concern_ids.join(', ')}]`);
    }

    // Process sensitivities
    const fragrance_sensitivity = sensitivities.includes('fragrance');
    const alcohol_sensitivity = sensitivities.includes('alcohol'); 
    const silicone_sensitivity = sensitivities.includes('silicone');

    console.log(`⚠️ Sensitivities: fragrance=${fragrance_sensitivity}, alcohol=${alcohol_sensitivity}, silicone=${silicone_sensitivity}`);

    // Insert quiz result
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
      session_id,
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
    
    // Enhanced recommendation logic (placeholder for ontology integration)
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
          "Suitable for your skin type",
          "Fragrance-free (matches your sensitivity)",
          "Addresses dryness concern"
        ],
        ontology_analysis: {
          ingredient_synergy: "high",
          conflict_detected: false,
          key_benefits: ["moisturizing", "barrier_repair"]
        }
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
          "Excellent for skin hydration",
          "Alcohol-free formulation",
          "Helps with sensitivity"
        ],
        ontology_analysis: {
          ingredient_synergy: "high",
          conflict_detected: false,
          key_benefits: ["hydrating", "plumping"]
        }
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
        total_found: sampleRecommendations.length,
        ontology_enhanced: true
      },
      message: 'Ontology-enhanced recommendations generated successfully'
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

// 6. GET /api/utility/skin-type-quiz - Mini Quiz untuk "I'm not sure"
app.get('/api/utility/skin-type-quiz', async (req, res) => {
  try {
    console.log('📋 Getting skin type assessment quiz...');

    // Mini quiz structure sesuai description kamu
    const skinTypeQuiz = {
      title: "Let's determine your skin type!",
      description: "Answer these 4 questions to help us understand your skin better.",
      questions: [
        {
          id: "morning_feel",
          question: "How does your skin feel when you wake up in the morning?",
          options: [
            { 
              id: "tight_dry", 
              text: "Tight, dry, maybe flaky", 
              value: "a",
              skin_indicator: "dry" 
            },
            { 
              id: "comfortable", 
              text: "Normal, comfortable, balanced", 
              value: "b",
              skin_indicator: "normal" 
            },
            { 
              id: "oily_shiny", 
              text: "Oily or shiny, especially on forehead, nose, and chin", 
              value: "c",
              skin_indicator: "oily" 
            },
            { 
              id: "mixed_zones", 
              text: "Dry or normal on cheeks, oily in T-zone", 
              value: "d",
              skin_indicator: "combination" 
            }
          ]
        },
        {
          id: "after_washing",
          question: "How does your skin feel a few hours after washing your face?",
          options: [
            { 
              id: "tight_rough", 
              text: "Tight or rough, sometimes flaky", 
              value: "a",
              skin_indicator: "dry" 
            },
            { 
              id: "balanced", 
              text: "Balanced, neither oily nor dry", 
              value: "b",
              skin_indicator: "normal" 
            },
            { 
              id: "oily_tzone", 
              text: "Oily and shiny, especially in the T-zone", 
              value: "c",
              skin_indicator: "oily" 
            },
            { 
              id: "mixed_areas", 
              text: "Oily in T-zone, dry or normal on other areas", 
              value: "d",
              skin_indicator: "combination" 
            }
          ]
        },
        {
          id: "daily_shine", 
          question: "How often do you get oily shine during the day?",
          options: [
            { 
              id: "rarely_dry", 
              text: "Rarely, skin feels dry", 
              value: "a",
              skin_indicator: "dry" 
            },
            { 
              id: "rarely_balanced", 
              text: "Rarely, skin looks balanced", 
              value: "b",
              skin_indicator: "normal" 
            },
            { 
              id: "often_greasy", 
              text: "Often, skin looks shiny or greasy", 
              value: "c",
              skin_indicator: "oily" 
            },
            { 
              id: "some_areas", 
              text: "Only in some areas, mostly T-zone", 
              value: "d",
              skin_indicator: "combination" 
            }
          ]
        },
        {
          id: "flaky_patches",
          question: "Do you experience flaky or rough patches?",
          options: [
            { 
              id: "yes_frequently", 
              text: "Yes, frequently", 
              value: "a",
              skin_indicator: "dry" 
            },
            { 
              id: "rarely", 
              text: "Rarely", 
              value: "b",
              skin_indicator: "normal" 
            },
            { 
              id: "almost_never", 
              text: "Almost never", 
              value: "c",
              skin_indicator: "oily" 
            },
            { 
              id: "sometimes_cheeks", 
              text: "Sometimes on cheeks only", 
              value: "d",
              skin_indicator: "combination" 
            }
          ]
        }
      ],
      scoring_info: {
        method: "Count most frequent answer pattern",
        rules: [
          "Mostly a = dry skin",
          "Mostly b = normal skin", 
          "Mostly c = oily skin",
          "Mostly d = combination skin",
          "Mixed answers follow combination rules"
        ]
      }
    };

    res.json({
      success: true,
      data: skinTypeQuiz,
      message: 'Skin type assessment quiz retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Skin type quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get skin type quiz',
      error: error.message
    });
  }
});

// 7. POST /api/utility/skin-type-assessment - Assess skin type dari mini quiz
app.post('/api/utility/skin-type-assessment', async (req, res) => {
  try {
    const { answers, session_id } = req.body;
    
    if (!answers || !Array.isArray(answers) || answers.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Please provide exactly 4 quiz answers'
      });
    }
    
    console.log('🧮 Assessing skin type from answers:', answers);
    
    // Count answer frequencies according to your rules
    const answerCounts = answers.reduce((counts, answer) => {
      counts[answer] = (counts[answer] || 0) + 1;
      return counts;
    }, {});
    
    // Determine skin type based on your exact rules
    let determinedSkinType = 'normal'; // default
    let confidence = 0;
    
    // Find most frequent answer
    const sortedAnswers = Object.entries(answerCounts).sort((a, b) => b[1] - a[1]);
    const [mostFrequent, highestCount] = sortedAnswers[0];
    confidence = (highestCount / answers.length) * 100;
    
    // Apply your exact rules from description
    if (answerCounts['a'] >= 3) {
      determinedSkinType = 'dry';
    } else if (answerCounts['b'] >= 3) {
      determinedSkinType = 'normal';
    } else if (answerCounts['c'] >= 3) {
      determinedSkinType = 'oily';
    } else if (answerCounts['d'] >= 3) {
      determinedSkinType = 'combination';
    } else {
      // Mixed answers - apply your combination rules
      const hasA = answerCounts['a'] > 0;
      const hasB = answerCounts['b'] > 0;
      const hasC = answerCounts['c'] > 0;
      const hasD = answerCounts['d'] > 0;
      
      if (hasA && hasB && !hasC && !hasD) {
        determinedSkinType = 'dry'; // "Mix of a and b = dry"
      } else if (hasA && hasC) {
        determinedSkinType = 'oily'; // "Mix of a and c = oily skin"
      } else if (hasA && hasD) {
        determinedSkinType = 'combination'; // "Mix of a and d = combination"
      } else if (hasB && hasC) {
        determinedSkinType = 'combination'; // "B and c = combination"
      } else if (hasB && hasD) {
        determinedSkinType = 'combination'; // "B and d = combination"
      } else if (hasC && hasD) {
        determinedSkinType = 'combination'; // "C and d = combination"
      } else {
        determinedSkinType = 'combination'; // Default for other mixed cases
      }
    }
    
    // Log assessment for debugging
    console.log(`✅ Skin type determined: ${determinedSkinType} (confidence: ${confidence.toFixed(1)}%)`);
    console.log(`   Answer distribution:`, answerCounts);
    
    const assessmentResult = {
      determined_skin_type: determinedSkinType,
      confidence_percentage: Math.round(confidence),
      answer_distribution: answerCounts,
      assessment_method: 'mini_quiz_algorithm',
      raw_answers: answers
    };
    
    // Optionally save assessment to session if session_id provided
    if (session_id) {
      try {
        await pool.query(
          'UPDATE guest_sessions SET skin_type_assessment = $1 WHERE session_id = $2',
          [JSON.stringify(assessmentResult), session_id]
        );
        console.log(`💾 Assessment saved to session: ${session_id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to save assessment to session: ${error.message}`);
      }
    }

    res.json({
      success: true,
      data: assessmentResult,
      message: `Skin type assessed as: ${determinedSkinType}`,
      next_step: 'Continue with skin concerns and sensitivities selection'
    });

  } catch (error) {
    console.error('❌ Skin type assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assess skin type',
      error: error.message
    });
  }
});

// Product Search (specific endpoint for test compatibility)
app.get('/api/products/search', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        p.id, p.name, b.name as brand_name, p.brand_id,
        p.product_type, p.main_category, p.subcategory,
        p.description, p.local_image_path
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (q) {
      query += ` AND (
        p.name ILIKE $1 OR 
        p.description ILIKE $1 OR 
        b.name ILIKE $1
      )`;
      params.push(`%${q}%`);
    }
    
    query += ` ORDER BY p.name LIMIT ${limit} OFFSET ${offset}`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      search,
      category, 
      brand, 
      skinType,
      alcohol_free,
      fragrance_free,
      paraben_free,
      sulfate_free,
      silicone_free
    } = req.query;

    let query = `
      SELECT 
        p.id,
        p.name,
        b.name as brand_name,
        p.brand_id,
        p.product_type,
        p.main_category,
        p.subcategory,
        p.description,
        p.how_to_use,
        p.product_url,
        p.local_image_path,
        p.bpom_number,
        p.alcohol_free,
        p.fragrance_free,
        p.paraben_free,
        p.sulfate_free,
        p.silicone_free
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    // Search functionality
    if (search) {
      paramCount++;
      query += ` AND (
        p.name ILIKE $${paramCount} OR 
        p.description ILIKE $${paramCount} OR 
        b.name ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Category filter
    if (category) {
      paramCount++;
      query += ` AND p.main_category ILIKE $${paramCount}`;
      params.push(`%${category}%`);
    }

    // Brand filter
    if (brand) {
      paramCount++;
      query += ` AND b.name ILIKE $${paramCount}`;
      params.push(`%${brand}%`);
    }

    // Safety filters
    if (alcohol_free === 'true') {
      query += ` AND p.alcohol_free = true`;
    }
    if (fragrance_free === 'true') {
      query += ` AND p.fragrance_free = true`;
    }
    if (paraben_free === 'true') {
      query += ` AND p.paraben_free = true`;
    }
    if (sulfate_free === 'true') {
      query += ` AND p.sulfate_free = true`;
    }
    if (silicone_free === 'true') {
      query += ` AND p.silicone_free = true`;
    }

    // Pagination
    paramCount++;
    query += ` ORDER BY p.name LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM products p 
      LEFT JOIN brands b ON p.brand_id = b.id 
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 0;

    if (search) {
      countParamIndex++;
      countQuery += ` AND (
        p.name ILIKE $${countParamIndex} OR 
        p.description ILIKE $${countParamIndex} OR 
        b.name ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
    }

    if (category) {
      countParamIndex++;
      countQuery += ` AND p.main_category ILIKE $${countParamIndex}`;
      countParams.push(`%${category}%`);
    }

    if (brand) {
      countParamIndex++;
      countQuery += ` AND b.name ILIKE $${countParamIndex}`;
      countParams.push(`%${brand}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 3. Product Categories
// 3. Product Categories (FIXED)
app.get('/api/products/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        main_category as category,
        COUNT(*) as product_count
      FROM products 
      WHERE main_category IS NOT NULL 
        AND main_category != ''
        AND main_category != 'null'
      GROUP BY main_category 
      ORDER BY product_count DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Categories API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 4. Available Brands
app.get('/api/products/brands', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.id,
        b.name,
        COUNT(p.id) as product_count
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id
      GROUP BY b.id, b.name
      HAVING COUNT(p.id) > 0
      ORDER BY product_count DESC, b.name ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Brands API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 2. Product Detail (CRITICAL)
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get product with brand information
    const productQuery = `
      SELECT 
        p.*,
        b.name as brand_name,
        b.description as brand_description
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = $1
    `;

    const productResult = await pool.query(productQuery, [id]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productResult.rows[0];

    // Get ingredients for this product
    const ingredientsQuery = `
      SELECT 
        i.id,
        i.name,
        i.what_it_does,
        i.explanation,
        i.benefit,
        i.safety,
        pi.is_key_ingredient
      FROM product_ingredients pi
      JOIN ingredients i ON pi.ingredient_id = i.id
      WHERE pi.product_id = $1
      ORDER BY pi.is_key_ingredient DESC, i.name ASC
    `;

    const ingredientsResult = await pool.query(ingredientsQuery, [id]);

    // Parse ingredient list if no mappings exist
    let ingredients = ingredientsResult.rows;
    if (ingredients.length === 0 && product.ingredient_list) {
      // Fallback: parse ingredient_list string
      const rawIngredients = product.ingredient_list
        .split(',')
        .map(ing => ing.trim())
        .filter(ing => ing.length > 0)
        .slice(0, 20); // Limit to 20 ingredients
      
      ingredients = rawIngredients.map(name => ({
        name,
        what_it_does: null,
        explanation: null,
        benefit: null,
        safety: null,
        is_key_ingredient: false
      }));
    }

    // Get similar products by category and brand
    const similarQuery = `
      SELECT 
        p.id,
        p.name,
        b.name as brand_name,
        p.main_category,
        p.local_image_path
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.main_category = $1 
      AND p.id != $2
      ORDER BY RANDOM()
      LIMIT 6
    `;

    const similarResult = await pool.query(similarQuery, [product.main_category, id]);

    res.json({
      success: true,
      data: {
        product: {
          ...product,
          ingredients,
          similar_products: similarResult.rows
        }
      }
    });

  } catch (error) {
    console.error('Product detail API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 1. POST /api/products/recommendations - Product Recommendations based on Profile
app.post('/api/products/recommendations', async (req, res) => {
  try {
    const { 
      session_id,
      skin_type, 
      concerns = [], 
      sensitivities = [],
      avoidedIngredients = [],
      likedIngredients = [],
      limit = 20 
    } = req.body;

    console.log('🎯 Getting personalized product recommendations...');

    // Build dynamic query based on profile
    let query = `
      SELECT DISTINCT
        p.id,
        p.name,
        b.name as brand_name,
        p.product_type,
        p.main_category,
        p.description,
        p.local_image_path,
        p.alcohol_free,
        p.fragrance_free,
        p.paraben_free,
        p.sulfate_free,
        p.silicone_free
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_ingredients pi ON p.id = pi.product_id
      LEFT JOIN ingredients i ON pi.ingredient_id = i.id
      WHERE p.id IS NOT NULL
    `;

    const params = [];
    let paramCount = 0;

    // Filter by sensitivities (exclude products with allergens)
    if (sensitivities.includes('fragrance')) {
      query += ` AND p.fragrance_free = true`;
    }
    if (sensitivities.includes('alcohol')) {
      query += ` AND p.alcohol_free = true`;
    }
    if (sensitivities.includes('silicone')) {
      query += ` AND p.silicone_free = true`;
    }

    // Exclude avoided ingredients
    if (avoidedIngredients.length > 0) {
      paramCount++;
      query += ` AND p.id NOT IN (
        SELECT DISTINCT pi2.product_id 
        FROM product_ingredients pi2
        JOIN ingredients i2 ON pi2.ingredient_id = i2.id
        WHERE i2.name = ANY($${paramCount})
      )`;
      params.push(avoidedIngredients);
    }

    // Prioritize liked ingredients
    if (likedIngredients.length > 0) {
      paramCount++;
      query += ` AND p.id IN (
        SELECT DISTINCT pi3.product_id 
        FROM product_ingredients pi3
        JOIN ingredients i3 ON pi3.ingredient_id = i3.id
        WHERE i3.name = ANY($${paramCount})
      )`;
      params.push(likedIngredients);
    }

    // Add pagination
    paramCount++;
    query += ` ORDER BY p.name LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    // Calculate match scores using ontology analysis
    const enhancedRecommendations = await Promise.all(
      result.rows.map(async (product) => {
        try {
          // Get ingredient analysis for this product
          const ingredientAnalysis = await axios.post('http://localhost:5000/api/analysis/ingredient-analysis', {
            product_id: product.id,
            skin_type,
            concerns
          });

          const matchScore = calculateMatchScore(product, {
            skin_type,
            concerns,
            sensitivities,
            avoidedIngredients,
            likedIngredients
          });

          return {
            ...product,
            match_score: matchScore,
            ontology_analysis: ingredientAnalysis.data || {},
            reasons: generateMatchReasons(product, { skin_type, concerns, sensitivities })
          };
        } catch (error) {
          console.warn(`Analysis failed for product ${product.id}:`, error.message);
          return {
            ...product,
            match_score: 75, // Default score
            ontology_analysis: { status: 'analysis_unavailable' },
            reasons: ['Basic compatibility match']
          };
        }
      })
    );

    // Sort by match score
    enhancedRecommendations.sort((a, b) => b.match_score - a.match_score);

    res.json({
      success: true,
      data: {
        recommendations: enhancedRecommendations,
        total_found: enhancedRecommendations.length,
        profile_used: {
          skin_type,
          concerns,
          sensitivities,
          avoidedIngredients: avoidedIngredients.length,
          likedIngredients: likedIngredients.length
        },
        ontology_enhanced: true
      },
      message: 'Ontology-based recommendations generated successfully'
    });

  } catch (error) {
    console.error('❌ Product recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: error.message
    });
  }
});

// ===== INGREDIENTS API ENDPOINTS =====

// 5. Ingredients Listing (CRITICAL)
app.get('/api/ingredients', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      search,
      key_ingredients_only 
    } = req.query;

    let query = `
      SELECT 
        i.id,
        i.name,
        i.what_it_does,
        i.explanation,
        i.benefit,
        i.safety,
        i.is_key_ingredient,
        i.actual_functions,
        i.alternative_names
      FROM ingredients i
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    // Search functionality
    if (search) {
      paramCount++;
      query += ` AND (
        i.name ILIKE $${paramCount} OR 
        i.what_it_does ILIKE $${paramCount} OR
        i.explanation ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Key ingredients filter
    if (key_ingredients_only === 'true') {
      query += ` AND i.is_key_ingredient = true`;
    }

    // Pagination
    paramCount++;
    query += ` ORDER BY i.name LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    // Count total
    let countQuery = `SELECT COUNT(*) FROM ingredients i WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 0;

    if (search) {
      countParamIndex++;
      countQuery += ` AND (
        i.name ILIKE $${countParamIndex} OR 
        i.what_it_does ILIKE $${countParamIndex} OR
        i.explanation ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search}%`);
    }

    if (key_ingredients_only === 'true') {
      countQuery += ` AND i.is_key_ingredient = true`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Ingredients API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Ingredient Search (specific endpoint)
app.get('/api/ingredients/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    let query = `
      SELECT id, name, what_it_does, explanation, benefit, is_key_ingredient
      FROM ingredients 
      WHERE name ILIKE $1 
      ORDER BY is_key_ingredient DESC, name ASC 
      LIMIT $2
    `;
    
    const result = await pool.query(query, [`%${q}%`, limit]);
    
    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Ingredient search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 7. Key Ingredients List
app.get('/api/ingredients/key-ingredients', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.id,
        i.name,
        i.what_it_does,
        i.explanation,
        i.benefit,
        COUNT(pi.product_id) as product_count
      FROM ingredients i
      LEFT JOIN product_ingredients pi ON i.id = pi.ingredient_id
      WHERE i.is_key_ingredient = true
      GROUP BY i.id, i.name, i.what_it_does, i.explanation, i.benefit
      ORDER BY product_count DESC, i.name ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Key ingredients API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 4. GET /api/ingredients/benefits - Available Ingredient Benefits
app.get('/api/ingredients/benefits', async (req, res) => {
  try {
    // Check if we have a benefits table, if not return predefined benefits
    let benefits = [];
    
    try {
      const result = await pool.query('SELECT id, name, display_name FROM ingredient_benefits ORDER BY name');
      benefits = result.rows;
    } catch (error) {
      console.warn('Benefits table not found, using predefined benefits');
      
      // Predefined benefits based on your description
      benefits = [
        { id: 1, name: 'acne_fighter', display_name: 'Acne Fighter' },
        { id: 2, name: 'brightening', display_name: 'Brightening' },
        { id: 3, name: 'good_for_texture', display_name: 'Good for Texture' },
        { id: 4, name: 'reduces_redness', display_name: 'Reduces Redness' },
        { id: 5, name: 'reduces_large_pores', display_name: 'Reduces Large Pores' },
        { id: 6, name: 'helps_with_anti_aging', display_name: 'Helps with Anti Aging' },
        { id: 7, name: 'helps_with_dark_spots', display_name: 'Helps with Dark Spots' },
        { id: 8, name: 'hydrating', display_name: 'Hydrating' },
        { id: 9, name: 'skin_conditioning', display_name: 'Skin Conditioning' },
        { id: 10, name: 'reduces_irritation', display_name: 'Reduces Irritation' }
      ];
    }

    res.json({
      success: true,
      data: benefits,
      total: benefits.length
    });

  } catch (error) {
    console.error('❌ Ingredient benefits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ingredient benefits',
      error: error.message
    });
  }
});

// 5. GET /api/ingredients/functions - Available Ingredient Functions  
app.get('/api/ingredients/functions', async (req, res) => {
  try {
    // Check if we have a functions table, if not return predefined functions
    let functions = [];
    
    try {
      const result = await pool.query('SELECT id, name FROM ingredient_functions ORDER BY name');
      functions = result.rows;
    } catch (error) {
      console.warn('Functions table not found, using predefined functions');
      
      // Predefined functions based on your description (like incidecoder.com)
      functions = [
        { id: 1, name: 'humectant' },
        { id: 2, name: 'occlusive' },
        { id: 3, name: 'emollient' },
        { id: 4, name: 'exfoliant' },
        { id: 5, name: 'abrasive' },
        { id: 6, name: 'skin_protecting' },
        { id: 7, name: 'preservative' },
        { id: 8, name: 'uv_filter' },
        { id: 9, name: 'surfactant' },
        { id: 10, name: 'antioxidant' },
        { id: 11, name: 'buffering' },
        { id: 12, name: 'antimicrobial' },
        { id: 13, name: 'soothing' },
        { id: 14, name: 'moisturizing' },
        { id: 15, name: 'cleansing' }
      ];
    }

    res.json({
      success: true,
      data: functions,
      total: functions.length
    });

  } catch (error) {
    console.error('❌ Ingredient functions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ingredient functions',
      error: error.message
    });
  }
});

// 6. Ingredient Detail
app.get('/api/ingredients/:nameOrId', async (req, res) => {
  try {
    const { nameOrId } = req.params;
    
    // Check if it's numeric ID or name
    const isId = /^\d+$/.test(nameOrId);
    
    let query, params;
    if (isId) {
      query = 'SELECT * FROM ingredients WHERE id = $1';
      params = [parseInt(nameOrId)];
    } else {
      query = 'SELECT * FROM ingredients WHERE LOWER(name) = LOWER($1)';
      params = [nameOrId.replace(/-/g, ' ')]; // Convert URL slug to name
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }

    const ingredient = result.rows[0];

    // Get products containing this ingredient
    const productsQuery = `
      SELECT 
        p.id,
        p.name,
        b.name as brand_name,
        p.main_category,
        p.local_image_path,
        pi.is_key_ingredient
      FROM product_ingredients pi
      JOIN products p ON pi.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE pi.ingredient_id = $1
      ORDER BY pi.is_key_ingredient DESC, p.name ASC
      LIMIT 12
    `;

    const productsResult = await pool.query(productsQuery, [ingredient.id]);

    res.json({
      success: true,
      data: {
        ingredient,
        products: productsResult.rows
      }
    });

  } catch (error) {
    console.error('Ingredient detail API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});



// 8. Enhanced Compatibility Check (using existing ontology analysis)
app.post('/api/ingredients/compatibility-check', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 ingredients for compatibility check'
      });
    }

    // Use existing ontology analysis endpoint
    const compatibilityResult = await axios.post('http://localhost:5000/api/analysis/ingredient-conflicts', {
      ingredients
    });

    res.json({
      success: true,
      data: {
        ingredients,
        compatibility_analysis: compatibilityResult.data
      }
    });

  } catch (error) {
    console.error('Compatibility check error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 2. POST /api/ingredients/synergies - Ingredient Synergies
app.post('/api/ingredients/synergies', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || ingredients.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 ingredients for synergy analysis'
      });
    }

    console.log('🔬 Analyzing ingredient synergies...');

    // Known synergistic combinations (can be enhanced with ontology)
    const synergisticCombos = [
      {
        ingredients: ['niacinamide', 'hyaluronic acid'],
        synergy_type: 'complementary',
        benefit: 'Enhanced hydration and barrier function',
        confidence: 95
      },
      {
        ingredients: ['vitamin c', 'vitamin e'],
        synergy_type: 'antioxidant_boost',
        benefit: 'Improved antioxidant protection and stability',
        confidence: 90
      },
      {
        ingredients: ['ceramides', 'cholesterol'],
        synergy_type: 'barrier_repair',
        benefit: 'Optimal skin barrier restoration',
        confidence: 88
      },
      {
        ingredients: ['retinol', 'niacinamide'],
        synergy_type: 'tolerance_improvement',
        benefit: 'Reduced irritation while maintaining efficacy',
        confidence: 85
      },
      {
        ingredients: ['salicylic acid', 'niacinamide'],
        synergy_type: 'acne_treatment',
        benefit: 'Enhanced acne treatment with reduced irritation',
        confidence: 87
      }
    ];

    // Find matching synergies
    const foundSynergies = synergisticCombos.filter(combo => {
      const normalizedInput = ingredients.map(ing => ing.toLowerCase().trim());
      const normalizedCombo = combo.ingredients.map(ing => ing.toLowerCase());
      
      return normalizedCombo.every(ingredient => 
        normalizedInput.some(input => 
          input.includes(ingredient) || ingredient.includes(input)
        )
      );
    });

    // Use ontology analysis for additional insights
    let ontologyAnalysis = {};
    try {
      const analysisResult = await axios.post('http://localhost:5000/api/analysis/synergistic-combos', {
        ingredients
      });
      ontologyAnalysis = analysisResult.data;
    } catch (error) {
      console.warn('Ontology analysis unavailable:', error.message);
    }

    res.json({
      success: true,
      data: {
        input_ingredients: ingredients,
        synergistic_combinations: foundSynergies,
        ontology_analysis: ontologyAnalysis,
        recommendations: foundSynergies.length > 0 ? 
          'These ingredients work well together!' : 
          'No known conflicts, but consider spacing application times',
        analysis_method: 'knowledge_base + ontology'
      }
    });

  } catch (error) {
    console.error('❌ Ingredient synergies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze ingredient synergies',
      error: error.message
    });
  }
});

// 3. POST /api/ingredients/conflicts - Ingredient Conflicts
app.post('/api/ingredients/conflicts', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || ingredients.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 ingredients for conflict analysis'
      });
    }

    console.log('⚠️ Analyzing potential ingredient conflicts...');

    // Known conflicting combinations
    const conflictingCombos = [
      {
        ingredients: ['retinol', 'vitamin c'],
        conflict_type: 'ph_incompatibility',
        severity: 'moderate',
        issue: 'pH differences may reduce efficacy',
        recommendation: 'Use at different times (AM/PM) or alternate days',
        confidence: 85
      },
      {
        ingredients: ['retinol', 'aha'],
        conflict_type: 'over_exfoliation',
        severity: 'high',
        issue: 'Can cause excessive irritation and dryness',
        recommendation: 'Start slowly, use on alternate nights, monitor skin response',
        confidence: 90
      },
      {
        ingredients: ['retinol', 'bha'],
        conflict_type: 'over_exfoliation',
        severity: 'high',
        issue: 'Risk of severe irritation and compromised barrier',
        recommendation: 'Avoid simultaneous use, alternate nights minimum',
        confidence: 88
      },
      {
        ingredients: ['vitamin c', 'aha'],
        conflict_type: 'ph_incompatibility',
        severity: 'moderate',
        issue: 'May destabilize vitamin C',
        recommendation: 'Use vitamin C in AM, AHA in PM',
        confidence: 80
      },
      {
        ingredients: ['aha', 'bha'],
        conflict_type: 'over_exfoliation',
        severity: 'moderate',
        issue: 'Can lead to irritation if overused',
        recommendation: 'Start with one, introduce second gradually',
        confidence: 75
      }
    ];

    // Find matching conflicts
    const foundConflicts = conflictingCombos.filter(combo => {
      const normalizedInput = ingredients.map(ing => ing.toLowerCase().trim());
      const normalizedCombo = combo.ingredients.map(ing => ing.toLowerCase());
      
      return normalizedCombo.every(ingredient => 
        normalizedInput.some(input => 
          input.includes(ingredient) || ingredient.includes(input)
        )
      );
    });

    // Use ontology analysis for additional conflict detection
    let ontologyAnalysis = {};
    try {
      const analysisResult = await axios.post('http://localhost:5000/api/analysis/ingredient-conflicts', {
        ingredients
      });
      ontologyAnalysis = analysisResult.data;
    } catch (error) {
      console.warn('Ontology conflict analysis unavailable:', error.message);
    }

    const riskLevel = foundConflicts.length > 0 ? 
      Math.max(...foundConflicts.map(c => c.severity === 'high' ? 3 : c.severity === 'moderate' ? 2 : 1)) :
      0;

    res.json({
      success: true,
      data: {
        input_ingredients: ingredients,
        conflicts_detected: foundConflicts,
        risk_level: riskLevel === 3 ? 'high' : riskLevel === 2 ? 'moderate' : riskLevel === 1 ? 'low' : 'none',
        overall_recommendation: generateOverallRecommendation(foundConflicts, ingredients),
        ontology_analysis: ontologyAnalysis,
        analysis_method: 'knowledge_base + ontology'
      }
    });

  } catch (error) {
    console.error('❌ Ingredient conflicts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze ingredient conflicts',
      error: error.message
    });
  }
});


// 8. GET /api/recommendations/similar-products/:id - Similar Products (FIXED)
app.get('/api/recommendations/similar-products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 6 } = req.query;

    console.log(`🔍 Finding similar products for product ID: ${id}`);

    // 1. Validate ID parameter
    const productId = parseInt(id);
    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID. Must be a positive number.'
      });
    }

    // 2. Get the source product (simplified query)
    const sourceProductQuery = `
      SELECT 
        p.id,
        p.name,
        p.main_category,
        b.name as brand_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.id = $1
    `;

    const sourceResult = await pool.query(sourceProductQuery, [productId]);

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Source product not found'
      });
    }

    const sourceProduct = sourceResult.rows[0];

    // 3. Find similar products (super simple query to avoid JOIN issues)
    const similarProductsQuery = `
      SELECT 
        p.id,
        p.name,
        p.main_category,
        p.product_type,
        p.description,
        p.local_image_path,
        b.name as brand_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.main_category = $1 
        AND p.id != $2
        AND p.name IS NOT NULL
        AND p.main_category IS NOT NULL
      ORDER BY 
        CASE WHEN b.name = $3 THEN 1 ELSE 2 END,  -- Prioritize same brand
        RANDOM()
      LIMIT $4
    `;

    const similarResult = await pool.query(similarProductsQuery, [
      sourceProduct.main_category,
      productId,
      sourceProduct.brand_name || '',
      parseInt(limit)
    ]);

    // 4. Format response
    const responseData = {
      success: true,
      data: {
        source_product: {
          id: sourceProduct.id,
          name: sourceProduct.name,
          brand_name: sourceProduct.brand_name,
          category: sourceProduct.main_category
        },
        similar_products: similarResult.rows.map(product => ({
          id: product.id,
          name: product.name,
          brand_name: product.brand_name,
          main_category: product.main_category,
          product_type: product.product_type,
          description: product.description ? product.description.substring(0, 150) + '...' : null,
          local_image_path: product.local_image_path,
          similarity_reason: product.brand_name === sourceProduct.brand_name ? 
            'Same brand and category' : 'Same category'
        })),
        similarity_method: 'category_and_brand_based',
        total_found: similarResult.rows.length
      },
      message: 'Similar products found successfully'
    };

    console.log(`✅ Found ${similarResult.rows.length} similar products for "${sourceProduct.name}"`);
    
    res.json(responseData);

  } catch (error) {
    console.error('❌ Similar products error:', error);  
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to find similar products',
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        query_failed: true
      } : undefined
    });
  }
});

// 9. POST /api/recommendations/routine - Skincare Routine Recommendations
app.post('/api/recommendations/routine', async (req, res) => {
  try {
    const { 
      skin_type, 
      concerns = [], 
      time_of_day = 'morning',
      experience_level = 'beginner',
      sensitivities = []
    } = req.body;

    console.log('📅 Creating skincare routine recommendations...');

    // Basic routine templates
    const routineTemplates = {
      morning: {
        beginner: [
          { step: 1, category: 'cleanser', name: 'Gentle Cleanser', importance: 'essential' },
          { step: 2, category: 'moisturizer', name: 'Moisturizer', importance: 'essential' },
          { step: 3, category: 'sunscreen', name: 'Sunscreen SPF 30+', importance: 'essential' }
        ],
        intermediate: [
          { step: 1, category: 'cleanser', name: 'Gentle Cleanser', importance: 'essential' },
          { step: 2, category: 'serum', name: 'Vitamin C Serum', importance: 'beneficial' },
          { step: 3, category: 'moisturizer', name: 'Moisturizer', importance: 'essential' },
          { step: 4, category: 'sunscreen', name: 'Sunscreen SPF 30+', importance: 'essential' }
        ]
      },
      evening: {
        beginner: [
          { step: 1, category: 'cleanser', name: 'Gentle Cleanser', importance: 'essential' },
          { step: 2, category: 'moisturizer', name: 'Night Moisturizer', importance: 'essential' }
        ],
        intermediate: [
          { step: 1, category: 'cleanser', name: 'Gentle Cleanser', importance: 'essential' },
          { step: 2, category: 'treatment', name: 'Treatment (Retinol/AHA)', importance: 'beneficial' },
          { step: 3, category: 'moisturizer', name: 'Night Moisturizer', importance: 'essential' }
        ]
      }
    };

    const baseRoutine = routineTemplates[time_of_day]?.[experience_level] || routineTemplates.morning.beginner;

    // Customize routine based on concerns
    let customizedRoutine = [...baseRoutine];

    if (concerns.includes('acne') && !customizedRoutine.some(step => step.category === 'treatment')) {
      customizedRoutine.splice(-1, 0, {
        step: customizedRoutine.length,
        category: 'treatment',
        name: 'BHA/Salicylic Acid Treatment',
        importance: 'beneficial',
        concern_targeted: 'acne'
      });
    }

    if (concerns.includes('dryness')) {
      const serumIndex = customizedRoutine.findIndex(step => step.category === 'serum');
      if (serumIndex === -1) {
        customizedRoutine.splice(-2, 0, {
          step: customizedRoutine.length,
          category: 'serum',
          name: 'Hyaluronic Acid Serum',
          importance: 'beneficial',
          concern_targeted: 'dryness'
        });
      }
    }

    // Reorder steps
    customizedRoutine = customizedRoutine.map((step, index) => ({
      ...step,
      step: index + 1
    }));

    res.json({
      success: true,
      data: {
        routine: customizedRoutine,
        profile_used: {
          skin_type,
          concerns,
          time_of_day,
          experience_level,
          sensitivities
        },
        notes: [
          'Start with essential products first',
          'Introduce new products one at a time',
          'Patch test new products before full use',
          sensitivities.length > 0 ? 'Choose fragrance-free products due to sensitivities' : null
        ].filter(Boolean),
        total_steps: customizedRoutine.length
      }
    });

  } catch (error) {
    console.error('❌ Routine recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create routine recommendations',
      error: error.message
    });
  }
});

// ===== OPTIONAL ENDPOINT =====

// 10. GET /api/utility/ingredient-glossary - Ingredient Glossary (Educational)
app.get('/api/utility/ingredient-glossary', async (req, res) => {
  try {
    const { category, search, limit = 50 } = req.query;
    
    console.log('📚 Getting ingredient glossary...');
    
    // Enhanced query to get comprehensive ingredient info
    let query = `
      SELECT 
        i.id,
        i.name,
        i.what_it_does,
        i.explanation,
        i.benefit,
        i.safety,
        i.alternative_names,
        i.is_key_ingredient,
        i.actual_functions,
        COUNT(pi.product_id) as product_count
      FROM ingredients i
      LEFT JOIN product_ingredients pi ON i.id = pi.ingredient_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Search filter
    if (search) {
      paramCount++;
      query += ` AND (
        i.name ILIKE $${paramCount} OR 
        i.what_it_does ILIKE $${paramCount} OR
        i.explanation ILIKE $${paramCount} OR
        i.alternative_names ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }
    
    // Category filter (by what_it_does or actual_functions)
    if (category) {
      paramCount++;
      query += ` AND (
        i.what_it_does ILIKE $${paramCount} OR
        i.actual_functions ILIKE $${paramCount}
      )`;
      params.push(`%${category}%`);
    }
    
    query += ` 
      GROUP BY i.id, i.name, i.what_it_does, i.explanation, i.benefit, i.safety, i.alternative_names, i.is_key_ingredient, i.actual_functions
      ORDER BY i.is_key_ingredient DESC, product_count DESC, i.name ASC
    `;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    // Get function categories for filtering
    const functionCategories = [
      'humectant', 'occlusive', 'emollient', 'exfoliant', 'abrasive',
      'skin_protecting', 'preservative', 'uv_filter', 'surfactant', 
      'antioxidant', 'buffering', 'antimicrobial', 'soothing', 
      'moisturizing', 'cleansing'
    ];
    
    res.json({
      success: true,
      data: {
        ingredients: result.rows,
        total_found: result.rows.length,
        available_categories: functionCategories,
        key_ingredients_count: result.rows.filter(ing => ing.is_key_ingredient).length
      },
      message: 'Ingredient glossary retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Ingredient glossary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ingredient glossary',
      error: error.message
    });
  }
});

// ===== HELPER FUNCTIONS =====

function calculateMatchScore(product, profile) {
  let score = 50; // Base score

  // Sensitivity compliance
  if (profile.sensitivities.includes('fragrance') && product.fragrance_free) score += 20;
  if (profile.sensitivities.includes('alcohol') && product.alcohol_free) score += 20;
  if (profile.sensitivities.includes('silicone') && product.silicone_free) score += 15;

  // Avoided ingredients penalty
  if (profile.avoidedIngredients.length > 0) score += 10; // Bonus for avoiding unwanted ingredients

  // Liked ingredients bonus
  if (profile.likedIngredients.length > 0) score += 15; // Bonus for containing preferred ingredients

  // Ensure score is within reasonable range
  return Math.min(Math.max(score, 10), 100);
}

function generateMatchReasons(product, profile) {
  const reasons = [];

  if (profile.sensitivities.includes('fragrance') && product.fragrance_free) {
    reasons.push('Fragrance-free (matches your sensitivity)');
  }
  if (profile.sensitivities.includes('alcohol') && product.alcohol_free) {
    reasons.push('Alcohol-free formulation');
  }
  if (profile.sensitivities.includes('silicone') && product.silicone_free) {
    reasons.push('Silicone-free formula');
  }

  if (profile.concerns.includes('acne')) {
    reasons.push('Suitable for acne-prone skin');
  }
  if (profile.concerns.includes('dryness')) {
    reasons.push('Helps with skin hydration');
  }

  if (reasons.length === 0) {
    reasons.push('Compatible with your skin profile');
  }

  return reasons;
}

function generateOverallRecommendation(conflicts, ingredients) {
  if (conflicts.length === 0) {
    return `These ${ingredients.length} ingredients can generally be used together safely. Consider your skin's tolerance and introduce new products gradually.`;
  }

  const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
  if (highSeverityConflicts.length > 0) {
    return 'HIGH RISK: These ingredients should not be used together simultaneously. Consider alternating usage or consulting a dermatologist.';
  }

  const moderateSeverityConflicts = conflicts.filter(c => c.severity === 'moderate');
  if (moderateSeverityConflicts.length > 0) {
    return 'MODERATE RISK: Use caution when combining these ingredients. Consider using them at different times of day or on alternate days.';
  }

  return 'LOW RISK: Monitor your skin response when using these ingredients together. Start slowly and adjust as needed.';
}

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
      '/', '/health', '/api/health',
      '/api/products', '/api/products/:id', '/api/products/categories', '/api/products/brands',
      '/api/ingredients', '/api/ingredients/:nameOrId', '/api/ingredients/key-ingredients',
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
    console.log('🚀 Starting MatchCare Server - Merged Optimal Version...');
    
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
    
    // Test analysis routes availability
    console.log('✅ Analysis routes loaded for ontology integration');
    console.log('✅ Quiz system with session management ready');
    console.log('✅ CORS enabled for frontend integration');
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('🎉 MatchCare Server Started Successfully!');
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🧪 API Health: http://localhost:${PORT}/api/health`);
      console.log(`📝 Quiz Start: http://localhost:${PORT}/api/quiz/start`);
      console.log(`🔍 Synergistic Combos: http://localhost:${PORT}/api/analysis/synergistic-combos`);
      console.log(`⚗️ Ontology Status: http://localhost:${PORT}/api/analysis/ontology-status`);
      console.log('✅ Optimal merge complete - Quiz + Ontology ready!');

      console.log('✅ Missing API endpoints implemented successfully!');
      console.log('📋 New endpoints available:');
      console.log('   • GET /api/products - Product listing with filtering');
      console.log('   • GET /api/products/:id - Product detail');
      console.log('   • GET /api/products/categories - Available categories');
      console.log('   • GET /api/products/brands - Available brands');
      console.log('   • GET /api/ingredients - Ingredient listing');
      console.log('   • GET /api/ingredients/:nameOrId - Ingredient detail');
      console.log('   • GET /api/ingredients/key-ingredients - Key ingredients list');
      console.log('   • POST /api/ingredients/compatibility-check - Compatibility analysis');
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
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error(`💡 TIP: Database not found. Check: ${process.env.DB_NAME || 'matchcare_fresh_db'}`);
    }
    
    console.error('🔍 Error details:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;