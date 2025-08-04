// backend/routes/quiz.js
// COMPLETE QUIZ BACKEND ROUTES

const express = require('express');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Session storage for guest users (in memory for now)
const guestSessions = new Map();

// Clean up old sessions periodically (24 hours)
setInterval(() => {
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [sessionId, session] of guestSessions.entries()) {
    if (session.created_at < twentyFourHoursAgo) {
      guestSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Run every hour

// Start quiz session
router.post('/start', async (req, res) => {
  try {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      created_at: Date.now(),
      status: 'started',
      step: 1,
      data: {}
    };
    
    guestSessions.set(sessionId, session);
    
    console.log('🚀 Starting quiz session:', sessionId);
    
    res.json({
      success: true,
      session_id: sessionId,
      message: 'Quiz session started',
      current_step: 1,
      total_steps: 3
    });
    
  } catch (error) {
    console.error('❌ Quiz start error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start quiz session'
    });
  }
});

// Submit quiz and process results
router.post('/submit', async (req, res) => {
  try {
    const { skin_type, concerns = [], sensitivities = [] } = req.body;
    
    console.log('📝 Quiz submit received:', {
      skin_type,
      concerns,
      sensitivities
    });

    // Validate required fields
    if (!skin_type) {
      return res.status(400).json({
        success: false,
        error: 'Skin type is required'
      });
    }

    // Validate skin type
    const validSkinTypes = ['normal', 'dry', 'oily', 'combination'];
    if (!validSkinTypes.includes(skin_type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid skin type'
      });
    }

    // Store quiz result in database (for analytics)
    const client = await pool.connect();
    try {
      // Convert skin_type string to skin_type_id
      const skinTypeQuery = await client.query(
        'SELECT id FROM skin_types WHERE name = $1', 
        [skin_type.toLowerCase()]
      );
      const skinTypeId = skinTypeQuery.rows[0]?.id || 1;

      // Convert concerns array to concern_ids
      const concernIds = [];
      if (concerns.length > 0) {
        const concernQuery = await client.query(
          'SELECT id FROM skin_concerns WHERE name = ANY($1)', 
          [concerns.map(c => c.toLowerCase())]
        );
        concernIds.push(...concernQuery.rows.map(row => row.id));
      }

      // Extract sensitivity booleans
      const fragranceSensitive = sensitivities.includes('fragrance');
      const alcoholSensitive = sensitivities.includes('alcohol');
      const siliconeSensitive = sensitivities.includes('silicone');
      const parabenSensitive = sensitivities.includes('paraben');
      const sulfateSensitive = sensitivities.includes('sulfate');

      const insertQuery = `
        INSERT INTO quiz_results (
          session_id, skin_type_id, concern_ids, 
          fragrance_sensitivity, alcohol_sensitivity, silicone_sensitivity,
          completed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id
      `;
      
      const sessionId = req.body.session_id || uuidv4();
      const result = await client.query(insertQuery, [
        sessionId,
        skinTypeId,
        concernIds,
        fragranceSensitive,
        alcoholSensitive,
        siliconeSensitive,
        parabenSensitive,
        sulfateSensitive
      ]);

      console.log('✅ Quiz result saved to database:', result.rows[0].id);

    } catch (dbError) {
      console.warn('⚠️ Database save failed, continuing:', dbError.message);
    } finally {
      client.release();
    }

    // Generate immediate recommendations
    const recommendations = await generateQuizRecommendations({
      skin_type: skin_type.toLowerCase(),
      concerns,
      sensitivities
    });

    res.json({
      success: true,
      message: 'Quiz completed successfully',
      data: {
        skin_type: skin_type.toLowerCase(),
        concerns,
        sensitivities,
        recommendations_count: recommendations.length
      },
      recommendations: recommendations.slice(0, 20),
      next_steps: {
        view_all_products: `/products?skin_type=${skin_type.toLowerCase()}&concerns=${concerns.join(',')}&ontology=true`,
        get_more_recommendations: '/api/ontology/recommendations'
      }
    });

  } catch (error) {
    console.error('❌ Quiz submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process quiz submission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get quiz session status
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = guestSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        step: session.step,
        created_at: session.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ Session lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session'
    });
  }
});

// Generate recommendations based on quiz results
async function generateQuizRecommendations({ skin_type, concerns, sensitivities }) {
  const client = await pool.connect();
  
  try {
    console.log('🎯 Generating recommendations for:', { skin_type, concerns, sensitivities });

    // Build dynamic query based on quiz results
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filter by skin type suitability
    whereConditions.push(`$${paramIndex} = ANY(suitable_for_skin_types) OR suitable_for_skin_types = '{}'`);
    queryParams.push(skin_type);
    paramIndex++;

    // Filter by concerns if specified
    if (concerns.length > 0) {
      const concernConditions = concerns.map(concern => {
        const condition = `$${paramIndex} = ANY(addresses_concerns)`;
        queryParams.push(concern.toLowerCase());
        paramIndex++;
        return condition;
      });
      whereConditions.push(`(${concernConditions.join(' OR ')})`);
    }

    // Avoid products with user sensitivities
    if (sensitivities.length > 0) {
      sensitivities.forEach(sensitivity => {
        switch(sensitivity.toLowerCase()) {
          case 'fragrance':
            whereConditions.push('fragrance_free = true');
            break;
          case 'alcohol':
            whereConditions.push('alcohol_free = true');
            break;
          case 'silicone':
            whereConditions.push('silicone_free = true');
            break;
          case 'paraben':
            whereConditions.push('paraben_free = true');
            break;
          case 'sulfate':
            whereConditions.push('sulfate_free = true');
            break;
        }
      });
    }

    const query = `
      SELECT 
        p.id,
        p.name,
        b.name as brand_name,
        p.product_type,
        p.description,
        p.main_category,
        p.subcategory,
        p.local_image_path,
        p.suitable_for_skin_types,
        p.addresses_concerns,
        p.alcohol_free,
        p.fragrance_free,
        p.paraben_free,
        p.sulfate_free,
        p.silicone_free,
        p.key_ingredients_csv,
        -- Calculate match score
        CASE 
          WHEN $1 = ANY(suitable_for_skin_types) THEN 40
          ELSE 0
        END +
        CASE 
          WHEN array_length(suitable_for_skin_types, 1) IS NULL THEN 20
          ELSE 0
        END as skin_type_score
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.is_active = true
        ${whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : ''}
      ORDER BY skin_type_score DESC, p.name
      LIMIT 50
    `;

    console.log('🔍 Executing recommendation query:', query);
    console.log('📊 Query parameters:', queryParams);

    const result = await client.query(query, queryParams);
    
    console.log(`✅ Found ${result.rows.length} matching products`);

    // Format results with match explanations
    const recommendations = result.rows.map(product => ({
      id: product.id,
      name: product.name,
      brand: product.brand_name,
      product_type: product.product_type,
      description: product.description,
      category: product.main_category,
      subcategory: product.subcategory,
      image: product.local_image_path || '/images/placeholder-product.jpg',
      suitable_for: product.suitable_for_skin_types || [],
      addresses: product.addresses_concerns || [],
      formulation: {
        alcohol_free: product.alcohol_free,
        fragrance_free: product.fragrance_free,
        paraben_free: product.paraben_free,
        sulfate_free: product.sulfate_free,
        silicone_free: product.silicone_free
      },
      key_ingredients: product.key_ingredients_csv ? 
        product.key_ingredients_csv.split(',').map(i => i.trim()) : [],
      match_score: calculateMatchScore(product, { skin_type, concerns, sensitivities }),
      match_reasons: generateMatchReasons(product, { skin_type, concerns, sensitivities })
    }));

    // Sort by match score
    recommendations.sort((a, b) => b.match_score - a.match_score);

    return recommendations;

  } catch (error) {
    console.error('❌ Recommendation generation error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Calculate match score based on quiz data
function calculateMatchScore(product, quizData) {
  let score = 0;
  
  // Skin type match (40 points)
  if (product.suitable_for_skin_types && 
      product.suitable_for_skin_types.includes(quizData.skin_type)) {
    score += 40;
  } else if (!product.suitable_for_skin_types || 
             product.suitable_for_skin_types.length === 0) {
    score += 20; // Universal product
  }

  // Concern addressing (30 points max)
  if (product.addresses_concerns && quizData.concerns.length > 0) {
    const matchingConcerns = quizData.concerns.filter(concern =>
      product.addresses_concerns.includes(concern.toLowerCase())
    );
    score += Math.min(matchingConcerns.length * 10, 30);
  }

  // Sensitivity avoidance (20 points max)
  if (quizData.sensitivities.length > 0) {
    let sensitivityScore = 0;
    quizData.sensitivities.forEach(sensitivity => {
      switch(sensitivity.toLowerCase()) {
        case 'fragrance':
          if (product.fragrance_free) sensitivityScore += 5;
          break;
        case 'alcohol':
          if (product.alcohol_free) sensitivityScore += 5;
          break;
        case 'silicone':
          if (product.silicone_free) sensitivityScore += 5;
          break;
        case 'paraben':
          if (product.paraben_free) sensitivityScore += 5;
          break;
        case 'sulfate':
          if (product.sulfate_free) sensitivityScore += 5;
          break;
      }
    });
    score += Math.min(sensitivityScore, 20);
  } else {
    score += 10; // Bonus for no sensitivities
  }

  return score;
}

// Generate human-readable match reasons
function generateMatchReasons(product, quizData) {
  const reasons = [];
  
  // Skin type reasons
  if (product.suitable_for_skin_types && 
      product.suitable_for_skin_types.includes(quizData.skin_type)) {
    reasons.push(`Perfect for ${quizData.skin_type} skin`);
  }

  // Concern reasons
  if (product.addresses_concerns && quizData.concerns.length > 0) {
    const matchingConcerns = quizData.concerns.filter(concern =>
      product.addresses_concerns.includes(concern.toLowerCase())
    );
    if (matchingConcerns.length > 0) {
      reasons.push(`Addresses your concerns: ${matchingConcerns.join(', ')}`);
    }
  }

  // Sensitivity reasons
  if (quizData.sensitivities.length > 0) {
    const safetyFeatures = [];
    quizData.sensitivities.forEach(sensitivity => {
      switch(sensitivity.toLowerCase()) {
        case 'fragrance':
          if (product.fragrance_free) safetyFeatures.push('fragrance-free');
          break;
        case 'alcohol':
          if (product.alcohol_free) safetyFeatures.push('alcohol-free');
          break;
        case 'silicone':
          if (product.silicone_free) safetyFeatures.push('silicone-free');
          break;
      }
    });
    if (safetyFeatures.length > 0) {
      reasons.push(`Safe for you: ${safetyFeatures.join(', ')}`);
    }
  }

  return reasons.length > 0 ? reasons : ['Good general match for your profile'];
}

module.exports = router;