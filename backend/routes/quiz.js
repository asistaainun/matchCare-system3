const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Start quiz session

// Add this test endpoint at the top of your routes:
router.get('/api/quiz/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Quiz routes are working!',
    timestamp: new Date().toISOString()
  });
});

router.post('/api/quiz/start', async (req, res) => {
  try {
    console.log('🚀 Starting new quiz session...');
    
    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Create guest session record
    await pool.query(`
      INSERT INTO guest_sessions (session_id, created_at, expires_at)
      VALUES ($1, NOW(), NOW() + INTERVAL '24 hours')
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

// Get reference data for quiz
router.get('/api/quiz/reference-data', async (req, res) => {
  try {
    console.log('📋 Fetching quiz reference data...');
    
    // Get all reference data in parallel - FIXED: Remove description column
    const [skinTypes, skinConcerns, allergenTypes] = await Promise.all([
      pool.query('SELECT id, name, ontology_uri FROM skin_types ORDER BY name'),
      pool.query('SELECT id, name, ontology_uri FROM skin_concerns ORDER BY name'), 
      pool.query('SELECT id, name, ontology_uri FROM allergen_types ORDER BY name')
    ]);

    const referenceData = {
      skin_types: skinTypes.rows,
      skin_concerns: skinConcerns.rows,
      allergen_types: allergenTypes.rows
    };

    console.log(`✅ Reference data loaded: ${skinTypes.rows.length} skin types, ${skinConcerns.rows.length} concerns, ${allergenTypes.rows.length} allergens`);

    res.json({
      success: true,
      data: referenceData,
      message: 'Reference data loaded successfully'
    });

  } catch (error) {
    console.error('Reference data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load reference data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Submit quiz results

// Submit quiz results
router.post('/api/quiz/submit', async (req, res) => {
  try {
    console.log('📝 Processing quiz submission...');
    console.log('Request body:', req.body); // Add this for debugging
    
    const {
      session_id,
      skin_type_id,
      skin_concerns = [],
      sensitivities = [],
      age_range,
      skin_goals = []
    } = req.body;

    // Validate required fields - Fixed validation message
    if (!session_id || !skin_type_id) {
      console.log('Validation failed:', { session_id, skin_type_id }); // Debug log
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: session_id and skin_type_id',
        received: { session_id, skin_type_id } // Add this for debugging
      });
    }

    // Verify session exists and is valid
    const sessionCheck = await pool.query(
      'SELECT id FROM guest_sessions WHERE session_id = $1 AND expires_at > NOW()',
      [session_id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired session ID'
      });
    }

    // Verify skin_type_id exists
    const skinTypeCheck = await pool.query(
      'SELECT id FROM skin_types WHERE id = $1',
      [skin_type_id]
    );

    if (skinTypeCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid skin type ID'
      });
    }

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create or update user profile
      const profileResult = await client.query(`
        INSERT INTO user_profiles (
          session_id, skin_type_id, age_range, skin_goals,
          quiz_version, quiz_completed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, '1.0', NOW(), NOW(), NOW())
        ON CONFLICT (session_id) 
        DO UPDATE SET 
          skin_type_id = EXCLUDED.skin_type_id,
          age_range = EXCLUDED.age_range,
          skin_goals = EXCLUDED.skin_goals,
          quiz_completed_at = NOW(),
          updated_at = NOW()
        RETURNING id
      `, [session_id, skin_type_id, age_range, JSON.stringify(skin_goals)]);

      const profileId = profileResult.rows[0].id;

      // Clear existing relationships
      await client.query('DELETE FROM user_skin_concerns WHERE user_profile_id = $1', [profileId]);
      await client.query('DELETE FROM user_sensitivities WHERE user_profile_id = $1', [profileId]);

      // Insert skin concerns
      if (skin_concerns.length > 0) {
        for (const concernId of skin_concerns) {
          await client.query(`
            INSERT INTO user_skin_concerns (user_profile_id, skin_concern_id)
            VALUES ($1, $2)
          `, [profileId, concernId]);
        }
      }

      // Insert sensitivities
      if (sensitivities.length > 0) {
        for (const sensitivityId of sensitivities) {
          await client.query(`
            INSERT INTO user_sensitivities (user_profile_id, allergen_type_id)
            VALUES ($1, $2)
          `, [profileId, sensitivityId]);
        }
      }

      await client.query('COMMIT');

      // Get complete profile data
      const completeProfile = await client.query(`
        SELECT 
          up.id,
          up.session_id,
          up.skin_type_id,
          st.name as skin_type_name,
          up.age_range,
          up.skin_goals,
          up.quiz_completed_at,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', sc.id,
                'name', sc.name
              )
            ) FILTER (WHERE sc.id IS NOT NULL), 
            '[]'
          ) as skin_concerns,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', at.id,
                'name', at.name
              )
            ) FILTER (WHERE at.id IS NOT NULL),
            '[]'
          ) as sensitivities
        FROM user_profiles up
        LEFT JOIN skin_types st ON up.skin_type_id = st.id
        LEFT JOIN user_skin_concerns usc ON up.id = usc.user_profile_id
        LEFT JOIN skin_concerns sc ON usc.skin_concern_id = sc.id
        LEFT JOIN user_sensitivities us ON up.id = us.user_profile_id
        LEFT JOIN allergen_types at ON us.allergen_type_id = at.id
        WHERE up.id = $1
        GROUP BY up.id, st.name
      `, [profileId]);

      console.log(`✅ Quiz submitted successfully for session: ${session_id}`);

      res.json({
        success: true,
        data: completeProfile.rows[0],
        message: 'Quiz results saved successfully',
        profile_id: profileId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save quiz results',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user profile by session
router.get('/api/quiz/profile/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    
    const profile = await pool.query(`
      SELECT 
        up.id,
        up.session_id,
        up.skin_type_id,
        st.name as skin_type_name,
        up.age_range,
        up.skin_goals,
        up.quiz_completed_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', sc.id,
              'name', sc.name
            )
          ) FILTER (WHERE sc.id IS NOT NULL), 
          '[]'
        ) as skin_concerns,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', at.id,
              'name', at.name
            )
          ) FILTER (WHERE at.id IS NOT NULL),
          '[]'
        ) as sensitivities
      FROM user_profiles up
      LEFT JOIN skin_types st ON up.skin_type_id = st.id
      LEFT JOIN user_skin_concerns usc ON up.id = usc.user_profile_id
      LEFT JOIN skin_concerns sc ON usc.skin_concern_id = sc.id
      LEFT JOIN user_sensitivities us ON up.id = us.user_profile_id
      LEFT JOIN allergen_types at ON us.allergen_type_id = at.id
      WHERE up.session_id = $1
      GROUP BY up.id, st.name
    `, [session_id]);

    if (profile.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found for this session'
      });
    }

    res.json({
      success: true,
      data: profile.rows[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET recommendations based on user profile
router.get('/api/quiz/recommendations/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    
    // Get user profile first
    const profile = await pool.query(`
      SELECT 
        up.skin_type_id,
        st.name as skin_type_name,
        array_agg(DISTINCT sc.name) FILTER (WHERE sc.name IS NOT NULL) as concern_names,
        array_agg(DISTINCT at.name) FILTER (WHERE at.name IS NOT NULL) as sensitivity_names
      FROM user_profiles up
      LEFT JOIN skin_types st ON up.skin_type_id = st.id
      LEFT JOIN user_skin_concerns usc ON up.id = usc.user_profile_id
      LEFT JOIN skin_concerns sc ON usc.skin_concern_id = sc.id
      LEFT JOIN user_sensitivities us ON up.id = us.user_profile_id
      LEFT JOIN allergen_types at ON us.allergen_type_id = at.id
      WHERE up.session_id = $1
      GROUP BY up.skin_type_id, st.name
    `, [session_id]);

    if (profile.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const userProfile = profile.rows[0];
    
    // Generate recommendations (gunakan algorithm yang udah ada)
    const recommendations = await generateRecommendations({
      skinType: userProfile.skin_type_name,
      concerns: userProfile.concern_names || [],
      sensitivities: userProfile.sensitivity_names || []
    });

    res.json({
      success: true,
      data: {
        profile: userProfile,
        recommendations,
        totalFound: recommendations.length
      }
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations'
    });
  }
});


// Add this function before the recommendations endpoint
async function generateRecommendations({ skinType, concerns = [], sensitivities = [] }) {
  try {
    console.log('🔍 Generating recommendations for:', { skinType, concerns, sensitivities });
    
    // Base query to get products with their details
    let query = `
      SELECT DISTINCT
        p.id,
        p.name,
        p.brand_name,
        p.main_category,
        p.sub_category,
        p.description,
        p.price,
        p.image_url,
        p.fragrance_free,
        p.alcohol_free,
        p.paraben_free,
        p.suitable_for_skin_types,
        p.addresses_concerns,
        0 as ontology_score
      FROM products p
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Filter by skin type if available
    if (skinType && skinType.toLowerCase() !== 'unknown') {
      query += ` AND ($${paramIndex} = ANY(p.suitable_for_skin_types) OR p.suitable_for_skin_types = '{}')`;
      queryParams.push(skinType.toLowerCase());
      paramIndex++;
    }
    
    // Filter out products with user's sensitivities
    if (sensitivities.length > 0) {
      for (const sensitivity of sensitivities) {
        switch (sensitivity.toLowerCase()) {
          case 'fragrance':
            query += ` AND (p.fragrance_free = true OR p.fragrance_free IS NULL)`;
            break;
          case 'alcohol':
            query += ` AND (p.alcohol_free = true OR p.alcohol_free IS NULL)`;
            break;
          case 'paraben':
            query += ` AND (p.paraben_free = true OR p.paraben_free IS NULL)`;
            break;
        }
      }
    }
    
    query += ` ORDER BY p.name LIMIT 20`;
    
    const result = await pool.query(query, queryParams);
    
    // Score and rank products
    const scoredProducts = result.rows.map(product => {
      let score = 0;
      let reasoning = [];
      
      // Base scoring
      if (product.fragrance_free) {
        score += 10;
        reasoning.push('fragrance-free');
      }
      if (product.alcohol_free) {
        score += 10;
        reasoning.push('alcohol-free');
      }
      if (product.paraben_free) {
        score += 5;
        reasoning.push('paraben-free');
      }
      
      // Skin type match
      if (product.suitable_for_skin_types && 
          product.suitable_for_skin_types.includes(skinType?.toLowerCase())) {
        score += 20;
        reasoning.push(`suitable for ${skinType} skin`);
      }
      
      // Concern matching
      if (concerns.length > 0 && product.addresses_concerns) {
        const matchedConcerns = concerns.filter(concern => 
          product.addresses_concerns.some(addr => 
            addr.toLowerCase().includes(concern.toLowerCase()) ||
            concern.toLowerCase().includes(addr.toLowerCase())
          )
        );
        score += matchedConcerns.length * 15;
        if (matchedConcerns.length > 0) {
          reasoning.push(`addresses ${matchedConcerns.join(', ')}`);
        }
      }
      
      return {
        ...product,
        ontology_score: score,
        reasoning: reasoning.length > 0 ? reasoning.join(', ') : 'General skincare product'
      };
    });
    
    // Sort by score and return top results
    return scoredProducts
      .sort((a, b) => b.ontology_score - a.ontology_score)
      .slice(0, 10);
      
  } catch (error) {
    console.error('Generate recommendations error:', error);
    return [];
  }
}

module.exports = router;