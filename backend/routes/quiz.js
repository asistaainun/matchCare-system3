
const express = require('express');
const router = express.Router();
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
        // Fetch skin types
        const skinTypesQuery = 'SELECT id, name, ontology_uri FROM skin_types ORDER BY name';
        const skinTypesResult = await pool.query(skinTypesQuery);

        // Fetch skin concerns
        const skinConcernsQuery = 'SELECT id, name, ontology_uri FROM skin_concerns ORDER BY name';
        const skinConcernsResult = await pool.query(skinConcernsQuery);

        // Fetch allergen types (sensitivities)
        const allergenTypesQuery = 'SELECT id, name, ontology_uri, common_sources as description FROM allergen_types ORDER BY name';
        const allergenTypesResult = await pool.query(allergenTypesQuery);

        const referenceData = {
            skin_types: skinTypesResult.rows,
            skin_concerns: skinConcernsResult.rows,
            allergen_types: allergenTypesResult.rows
        };

        res.json(referenceData);
    } catch (error) {
        console.error('Error fetching reference data:', error);
        res.status(500).json({ 
            error: 'Failed to fetch reference data',
            details: error.message 
        });
    }
});

// POST /api/quiz/submit
router.post('/submit', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { skin_type, skin_concerns, sensitivities, session_id } = req.body;
        
        // Generate session ID if not provided
        const finalSessionId = session_id || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Get skin type ID
        const skinTypeQuery = 'SELECT id FROM skin_types WHERE name = $1';
        const skinTypeResult = await client.query(skinTypeQuery, [skin_type]);
        
        if (skinTypeResult.rows.length === 0) {
            throw new Error(`Invalid skin type: ${skin_type}`);
        }
        
        const skinTypeId = skinTypeResult.rows[0].id;
        
        // Create or update user profile
        const profileQuery = `
            INSERT INTO user_profiles (session_id, skin_type_id, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
            ON CONFLICT (session_id) 
            DO UPDATE SET 
                skin_type_id = $2,
                updated_at = NOW()
            RETURNING id
        `;
        
        const profileResult = await client.query(profileQuery, [finalSessionId, skinTypeId]);
        const profileId = profileResult.rows[0].id;
        
        // Clear existing concerns and sensitivities
        await client.query('DELETE FROM user_skin_concerns WHERE user_profile_id = $1', [profileId]);
        await client.query('DELETE FROM user_sensitivities WHERE user_profile_id = $1', [profileId]);
        
        // Insert skin concerns
        if (skin_concerns && skin_concerns.length > 0) {
            for (const concern of skin_concerns) {
                const concernQuery = 'SELECT id FROM skin_concerns WHERE name = $1';
                const concernResult = await client.query(concernQuery, [concern]);
                
                if (concernResult.rows.length > 0) {
                    const concernId = concernResult.rows[0].id;
                    await client.query(
                        'INSERT INTO user_skin_concerns (user_profile_id, skin_concern_id) VALUES ($1, $2)',
                        [profileId, concernId]
                    );
                }
            }
        }
        
        // Insert sensitivities
        if (sensitivities && sensitivities.length > 0) {
            for (const sensitivity of sensitivities) {
                const sensitivityQuery = 'SELECT id FROM allergen_types WHERE name = $1';
                const sensitivityResult = await client.query(sensitivityQuery, [sensitivity]);
                
                if (sensitivityResult.rows.length > 0) {
                    const sensitivityId = sensitivityResult.rows[0].id;
                    await client.query(
                        'INSERT INTO user_sensitivities (user_profile_id, allergen_type_id) VALUES ($1, $2)',
                        [profileId, sensitivityId]
                    );
                }
            }
        }
        
        await client.query('COMMIT');
        
        // Return success response
        res.json({
            success: true,
            quiz_id: profileId,
            session_id: finalSessionId,
            message: 'Quiz submitted successfully',
            recommendations: [] // Will be populated by recommendation engine later
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error submitting quiz:', error);
        res.status(500).json({ 
            error: 'Failed to submit quiz',
            details: error.message 
        });
    } finally {
        client.release();
    }
});

// GET /api/quiz/recommendations/:sessionId
router.get('/recommendations/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Get user profile
        const profileQuery = `
            SELECT 
                up.id,
                up.session_id,
                st.name as skin_type,
                array_agg(DISTINCT sc.name) FILTER (WHERE sc.name IS NOT NULL) as skin_concerns,
                array_agg(DISTINCT at.name) FILTER (WHERE at.name IS NOT NULL) as sensitivities
            FROM user_profiles up
            LEFT JOIN skin_types st ON up.skin_type_id = st.id
            LEFT JOIN user_skin_concerns usc ON up.id = usc.user_profile_id
            LEFT JOIN skin_concerns sc ON usc.skin_concern_id = sc.id
            LEFT JOIN user_sensitivities us ON up.id = us.user_profile_id
            LEFT JOIN allergen_types at ON us.allergen_type_id = at.id
            WHERE up.session_id = $1
            GROUP BY up.id, up.session_id, st.name
        `;
        
        const profileResult = await pool.query(profileQuery, [sessionId]);
        
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz profile not found' });
        }
        
        const profile = profileResult.rows[0];
        
        // Simple recommendation logic - get products that match skin type
        let recommendationQuery = `
            SELECT DISTINCT
                p.id,
                p.name,
                p.brand,
                p.main_category,
                p.subcategory,
                p.description,
                p.price,
                p.image_url,
                p.fragrance_free,
                p.alcohol_free,
                p.paraben_free,
                0.8 as match_score
            FROM products p
            WHERE p.is_active = true
        `;
        
        const queryParams = [];
        let paramCount = 0;
        
        // Filter by sensitivities
        if (profile.sensitivities && profile.sensitivities.length > 0) {
            const sensitivityFilters = [];
            
            if (profile.sensitivities.includes('fragrance')) {
                sensitivityFilters.push('p.fragrance_free = true');
            }
            if (profile.sensitivities.includes('alcohol')) {
                sensitivityFilters.push('p.alcohol_free = true');
            }
            if (profile.sensitivities.includes('paraben')) {
                sensitivityFilters.push('p.paraben_free = true');
            }
            
            if (sensitivityFilters.length > 0) {
                recommendationQuery += ' AND (' + sensitivityFilters.join(' AND ') + ')';
            }
        }
        
        recommendationQuery += ' ORDER BY p.name LIMIT 20';
        
        const recommendationsResult = await pool.query(recommendationQuery, queryParams);
        
        res.json({
            profile: profile,
            recommendations: recommendationsResult.rows,
            total_recommendations: recommendationsResult.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ 
            error: 'Failed to fetch recommendations',
            details: error.message 
        });
    }
});

module.exports = router;