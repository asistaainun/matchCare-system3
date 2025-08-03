// backend/routes/products.js
// FIXED VERSION - Proper Array Handling for Concerns

const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// Get products with filtering, pagination, and quiz integration
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      // Pagination
      page = 1,
      limit = 12,
      
      // Quiz results - FIX: Better array handling
      skin_type,
      concerns,
      sensitivities,
      ontology,
      
      // Filters
      search,
      category,
      brand,
      sort = 'relevance'
    } = req.query;

    console.log('🛍️ Products request RAW:', {
      page, limit, skin_type, concerns, sensitivities, 
      search, category, brand, sort, ontology
    });

    const client = await pool.connect();
    
    try {
      // FIX: Robust array parsing to prevent malformed array literal
      let concernsArray = [];
      let sensitivitiesArray = [];
      
      // Parse concerns - handle both string and array
      if (concerns) {
        if (typeof concerns === 'string') {
          // Split comma-separated string and clean
          concernsArray = concerns.split(',')
            .map(c => c.trim().toLowerCase())
            .filter(c => c.length > 0);
        } else if (Array.isArray(concerns)) {
          concernsArray = concerns
            .map(c => String(c).trim().toLowerCase())
            .filter(c => c.length > 0);
        }
      }
      
      // Parse sensitivities - handle both string and array
      if (sensitivities) {
        if (typeof sensitivities === 'string') {
          sensitivitiesArray = sensitivities.split(',')
            .map(s => s.trim().toLowerCase())
            .filter(s => s.length > 0);
        } else if (Array.isArray(sensitivities)) {
          sensitivitiesArray = sensitivities
            .map(s => String(s).trim().toLowerCase())
            .filter(s => s.length > 0);
        }
      }

      console.log('🛍️ Parsed arrays:', { concernsArray, sensitivitiesArray });

      // Build dynamic query with SAFE array handling
      let whereConditions = ['p.is_active = true'];
      let queryParams = [];
      let paramIndex = 1;
      let joinClauses = ['LEFT JOIN brands b ON p.brand_id = b.id'];
      
      // Skin type filtering with NULL safety
      if (skin_type) {
        whereConditions.push(`(
          p.suitable_for_skin_types IS NULL OR 
          array_length(p.suitable_for_skin_types, 1) IS NULL OR
          $${paramIndex} = ANY(p.suitable_for_skin_types)
        )`);
        queryParams.push(skin_type.toLowerCase());
        paramIndex++;
      }
      
      // FIX: Concerns filtering with proper NULL handling and array safety
      if (concernsArray.length > 0) {
        const concernConditions = concernsArray.map((concern, index) => {
          const condition = `$${paramIndex + index} = ANY(p.addresses_concerns)`;
          return condition;
        });
        
        // Add all concern parameters
        concernsArray.forEach(concern => {
          queryParams.push(concern);
          paramIndex++;
        });
        
        whereConditions.push(`(${concernConditions.join(' OR ')})`);
      }
      
      // FIX: Sensitivity filtering with proper boolean handling
      if (sensitivitiesArray.length > 0) {
        sensitivitiesArray.forEach(sensitivity => {
          switch(sensitivity) {
            case 'fragrance':
              whereConditions.push('(p.fragrance_free IS TRUE)');
              break;
            case 'alcohol':
              whereConditions.push('(p.alcohol_free IS TRUE)');
              break;
            case 'silicone':
              whereConditions.push('(p.silicone_free IS TRUE)');
              break;
            case 'paraben':
              whereConditions.push('(p.paraben_free IS TRUE)');
              break;
            case 'sulfate':
              whereConditions.push('(p.sulfate_free IS TRUE)');
              break;
          }
        });
      }
      
      // Search filtering
      if (search) {
        whereConditions.push(`(
          LOWER(p.name) LIKE LOWER($${paramIndex}) OR 
          LOWER(b.name) LIKE LOWER($${paramIndex}) OR 
          LOWER(p.description) LIKE LOWER($${paramIndex})
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      // Category filtering
      if (category) {
        whereConditions.push(`LOWER(p.main_category) = LOWER($${paramIndex})`);
        queryParams.push(category);
        paramIndex++;
      }
      
      // Brand filtering
      if (brand) {
        whereConditions.push(`LOWER(b.name) = LOWER($${paramIndex})`);
        queryParams.push(brand);
        paramIndex++;
      }
      
      // FIX: Build sorting with SAFE array operations
      let orderBy = '';
      let selectExtraFields = '';
      
      if ((skin_type || concernsArray.length > 0) && sort === 'relevance') {
        // FIX: Safe quiz-based relevance scoring without problematic array operations
        selectExtraFields = `, (
          COALESCE(
            CASE 
              WHEN p.suitable_for_skin_types IS NULL THEN 30
              WHEN array_length(p.suitable_for_skin_types, 1) IS NULL THEN 30
              WHEN $1 = ANY(p.suitable_for_skin_types) THEN 50 
              ELSE 10 
            END, 0
          ) +
          COALESCE(
            (SELECT COUNT(*) * 15 
             FROM unnest(COALESCE(p.addresses_concerns, ARRAY[]::text[])) AS concern 
             WHERE ${concernsArray.length > 0 ? 
               concernsArray.map((_, i) => `concern = $${2 + i}`).join(' OR ') : 
               'FALSE'
             }), 
            0
          )
        ) as match_score`;
        
        orderBy = 'ORDER BY match_score DESC, p.name ASC';
      } else {
        switch (sort) {
          case 'name_asc':
            orderBy = 'ORDER BY p.name ASC';
            break;
          case 'name_desc':
            orderBy = 'ORDER BY p.name DESC';
            break;
          case 'category':
            orderBy = 'ORDER BY p.main_category, p.name';
            break;
          default:
            orderBy = 'ORDER BY p.created_at DESC, p.name ASC';
            break;
        }
      }
      
      // Count total products
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        ${joinClauses.join(' ')}
        WHERE ${whereConditions.join(' AND ')}
      `;
      
      console.log('🔍 Count query:', countQuery);
      console.log('📊 Count params:', queryParams);
      
      const countResult = await client.query(countQuery, queryParams);
      const totalProducts = parseInt(countResult.rows[0].total);
      
      // Calculate pagination
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;
      
      // FIX: Main products query with SAFE parameter handling
      const productsQuery = `
        SELECT 
          p.id,
          p.name,
          b.name as brand_name,
          p.product_type,
          p.description,
          p.main_category,
          p.subcategory,
          p.image_urls,
          p.suitable_for_skin_types,
          p.addresses_concerns,
          p.alcohol_free,
          p.fragrance_free,
          p.paraben_free,
          p.sulfate_free,
          p.silicone_free,
          p.key_ingredients_csv,
          p.product_url
          ${selectExtraFields}
        FROM products p
        ${joinClauses.join(' ')}
        WHERE ${whereConditions.join(' AND ')}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limitNum, offset);
      
      console.log('🔍 Products query:', productsQuery);
      console.log('📊 Query parameters:', queryParams);
      
      const productsResult = await client.query(productsQuery, queryParams);
      
      // Format products with enhanced data
      const products = productsResult.rows.map(product => {
        const formattedProduct = {
          id: product.id,
          name: product.name,
          brand: product.brand_name,
          product_type: product.product_type,
          description: product.description,
          category: product.main_category,
          subcategory: product.subcategory,
          image: product.image_urls || ['/images/placeholder-product.jpg'],
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
          product_url: product.product_url
        };
        
        // Add quiz-specific data if applicable
        if (skin_type || concernsArray.length > 0) {
          formattedProduct.match_score = parseInt(product.match_score) || 0;
          formattedProduct.match_reasons = generateMatchReasons(product, {
            skin_type,
            concerns: concernsArray,
            sensitivities: sensitivitiesArray
          });
        }
        
        return formattedProduct;
      });
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Products loaded: ${products.length}/${totalProducts} in ${processingTime}ms`);
      
      res.json({
        success: true,
        products: products,
        pagination: {
          current_page: pageNum,
          total_pages: Math.ceil(totalProducts / limitNum),
          per_page: limitNum,
          total_products: totalProducts,
          has_next: pageNum < Math.ceil(totalProducts / limitNum),
          has_prev: pageNum > 1
        },
        filters_applied: {
          skin_type,
          concerns: concernsArray,
          sensitivities: sensitivitiesArray,
          search,
          category,
          brand,
          sort
        },
        quiz_based: !!(skin_type || concernsArray.length > 0),
        processing_time_ms: processingTime,
        total: totalProducts
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Products loading error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load products',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// Get single product by ID - FIXED with proper error handling
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid product ID is required'
      });
    }
    
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          p.*,
          b.name as brand_name,
          b.description as brand_description
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.id = $1 AND p.is_active = true
      `;
      
      const result = await client.query(query, [parseInt(id)]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }
      
      const product = result.rows[0];
      
      // FIX: Get product ingredients with proper error handling
      let ingredients = [];
      try {
        const ingredientsQuery = `
          SELECT 
            i.name,
            i.actual_functions,
            i.embedded_functions,
            i.functional_categories,
            i.is_key_ingredient,
            i.what_it_does,
            i.benefit,
            i.explanation,
            i.safety,
            i.usage_instructions,
            i.pregnancy_safe,
            i.alcohol_free,
            i.fragrance_free,
            i.silicone_free,
            i.sulfate_free,
            i.paraben_free,
            pi.is_key_ingredient as product_key_ingredient,
            pi.position
          FROM product_ingredients pi
          JOIN ingredients i ON pi.ingredient_id = i.id
          WHERE pi.product_id = $1
          ORDER BY pi.position ASC, i.name ASC
        `;
        
        const ingredientsResult = await client.query(ingredientsQuery, [parseInt(id)]);
        ingredients = ingredientsResult.rows;
      } catch (ingredientError) {
        console.warn('⚠️ Could not load ingredients for product:', ingredientError.message);
      }
      
      const formattedProduct = {
        id: product.id,
        name: product.name,
        brand: {
          name: product.brand_name,
          description: product.brand_description
        },
        product_type: product.product_type,
        description: product.description,
        how_to_use: product.how_to_use,
        category: product.main_category,
        subcategory: product.subcategory,
        image: product.image_urls || '/images/placeholder-product.jpg',
        image_urls: product.image_urls ? product.image_urls.split(',') : [],
        suitable_for: product.suitable_for_skin_types || [],
        addresses: product.addresses_concerns || [],
        formulation: {
          alcohol_free: product.alcohol_free,
          fragrance_free: product.fragrance_free,
          paraben_free: product.paraben_free,
          sulfate_free: product.sulfate_free,
          silicone_free: product.silicone_free
        },
        ingredients: ingredients.map(ing => ({
          name: ing.name,
          what_it_does: ing.what_it_does,
          functions: ing.actual_functions ? ing.actual_functions.split(',') : [],
          categories: ing.functional_categories ? ing.functional_categories.split(',') : [],
          is_key: ing.product_key_ingredient || ing.is_key_ingredient,
          benefit: ing.benefit,
          explanation: ing.explanation,
          safety: ing.safety,
          usage_instructions: ing.usage_instructions,
          safety_flags: {
            pregnancy_safe: ing.pregnancy_safe,
            alcohol_free: ing.alcohol_free,
            fragrance_free: ing.fragrance_free,
            silicone_free: ing.silicone_free,
            sulfate_free: ing.sulfate_free,
            paraben_free: ing.paraben_free
          },
          position: ing.position
        })),
        bpom_number: product.bpom_number,
        product_url: product.product_url,
        created_at: product.created_at,
        updated_at: product.updated_at
      };
      
      console.log(`✅ Product detail loaded: ${product.name}`);
      
      res.json({
        success: true,
        product: formattedProduct
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Product detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load product details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get product categories for filtering
router.get('/meta/categories', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT DISTINCT main_category as category, COUNT(*) as product_count
        FROM products 
        WHERE main_category IS NOT NULL AND is_active = true
        GROUP BY main_category
        ORDER BY product_count DESC, main_category
      `;
      
      const result = await client.query(query);
      
      res.json({
        success: true,
        categories: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Categories loading error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load categories'
    });
  }
});

// Get brands for filtering
router.get('/meta/brands', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT DISTINCT b.name as brand, COUNT(p.id) as product_count
        FROM brands b
        JOIN products p ON b.id = p.brand_id
        WHERE p.is_active = true
        GROUP BY b.name
        ORDER BY product_count DESC, b.name
      `;
      
      const result = await client.query(query);
      
      res.json({
        success: true,
        brands: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Brands loading error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load brands'
    });
  }
});

// Perbaiki endpoint search yang error

router.get('/search', async (req, res) => {
  try {
    const { 
      q, 
      category, 
      skin_type, 
      concerns = [], 
      sensitivities = [], 
      properties = [],
      page = 1, 
      limit = 12 
    } = req.query;
    
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          p.id,
          p.name,
          COALESCE(b.name, 'Unknown Brand') as brand_name,
          p.main_category,
          p.subcategory,
          p.description,
          p.ingredient_list,
          p.alcohol_free,
          p.fragrance_free,
          p.paraben_free,
          p.sulfate_free,
          p.silicone_free,
          p.product_url,
          p.local_image_path
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.is_active = true
      `;
      
      const params = [];
      let paramCount = 0;
      
      // Search query
      if (q && q.trim()) {
        paramCount++;
        query += ` AND (
          LOWER(p.name) LIKE LOWER($${paramCount}) 
          OR LOWER(b.name) LIKE LOWER($${paramCount})
          OR LOWER(p.description) LIKE LOWER($${paramCount})
        )`;
        params.push(`%${q.trim()}%`);
      }
      
      // Category filter
      if (category) {
        paramCount++;
        query += ` AND LOWER(p.main_category) = LOWER($${paramCount})`;
        params.push(category);
      }
      
      // Sensitivities filter (avoid ingredients)
      const sensitivitiesArray = Array.isArray(sensitivities) ? sensitivities : 
                                typeof sensitivities === 'string' ? sensitivities.split(',') : [];
      
      if (sensitivitiesArray.includes('fragrance')) {
        query += ` AND (p.fragrance_free = true OR p.fragrance_free IS NULL)`;
      }
      if (sensitivitiesArray.includes('alcohol')) {
        query += ` AND (p.alcohol_free = true OR p.alcohol_free IS NULL)`;
      }
      if (sensitivitiesArray.includes('parabens')) {
        query += ` AND (p.paraben_free = true OR p.paraben_free IS NULL)`;
      }
      if (sensitivitiesArray.includes('sulfates')) {
        query += ` AND (p.sulfate_free = true OR p.sulfate_free IS NULL)`;
      }
      if (sensitivitiesArray.includes('silicones')) {
        query += ` AND (p.silicone_free = true OR p.silicone_free IS NULL)`;
      }
      
      // Properties filter
      const propertiesArray = Array.isArray(properties) ? properties : 
                             typeof properties === 'string' ? properties.split(',') : [];
      
      if (propertiesArray.includes('alcohol_free')) {
        query += ` AND p.alcohol_free = true`;
      }
      if (propertiesArray.includes('fragrance_free')) {
        query += ` AND p.fragrance_free = true`;
      }
      if (propertiesArray.includes('paraben_free')) {
        query += ` AND p.paraben_free = true`;
      }
      if (propertiesArray.includes('sulfate_free')) {
        query += ` AND p.sulfate_free = true`;
      }
      if (propertiesArray.includes('silicone_free')) {
        query += ` AND p.silicone_free = true`;
      }
      
      // Pagination
      const offset = (page - 1) * limit;
      query += ` ORDER BY p.name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);
      
      const result = await client.query(query, params);
      
      // Count total
      let countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM')
                           .replace(/ORDER BY.*$/, '');
      const countParams = params.slice(0, -2); // Remove limit and offset
      const countResult = await client.query(countQuery, countParams);
      
      res.json({
        success: true,
        products: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit)
        },
        filters_applied: {
          search: q || null,
          category: category || null,
          sensitivities: sensitivitiesArray,
          properties: propertiesArray
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

// Generate match reasons for quiz-based recommendations
function generateMatchReasons(product, { skin_type, concerns, sensitivities }) {
  const reasons = [];
  
  // Skin type matching
  if (skin_type && product.suitable_for_skin_types && 
      product.suitable_for_skin_types.includes(skin_type)) {
    reasons.push(`Perfect for ${skin_type} skin`);
  } else if (!product.suitable_for_skin_types || 
             product.suitable_for_skin_types.length === 0) {
    reasons.push('Suitable for all skin types');
  }
  
  // Concern matching
  if (concerns.length > 0 && product.addresses_concerns) {
    const matchingConcerns = concerns.filter(concern =>
      product.addresses_concerns.includes(concern)
    );
    if (matchingConcerns.length > 0) {
      reasons.push(`Addresses: ${matchingConcerns.join(', ')}`);
    }
  }
  
  // Safety features
  if (sensitivities.length > 0) {
    const safetyFeatures = [];
    sensitivities.forEach(sensitivity => {
      switch(sensitivity) {
        case 'fragrance':
          if (product.fragrance_free) safetyFeatures.push('fragrance-free');
          break;
        case 'alcohol':
          if (product.alcohol_free) safetyFeatures.push('alcohol-free');
          break;
        case 'silicone':
          if (product.silicone_free) safetyFeatures.push('silicone-free');
          break;
        case 'paraben':
          if (product.paraben_free) safetyFeatures.push('paraben-free');
          break;
        case 'sulfate':
          if (product.sulfate_free) safetyFeatures.push('sulfate-free');
          break;
      }
    });
    if (safetyFeatures.length > 0) {
      reasons.push(`Safe for you: ${safetyFeatures.join(', ')}`);
    }
  }
  
  return reasons.length > 0 ? reasons : ['Good match for your profile'];
}


// ===== PRODUCT COMPATIBILITY CHECK =====
router.post('/:id/compatibility-check', async (req, res) => {
  try {
    const { id } = req.params;
    const { skin_type, sensitivities = [], concerns = [] } = req.body;

    console.log(`🧪 Compatibility check for product ${id}`, { skin_type, sensitivities, concerns });

    const client = await pool.connect();
    
    try {
      // Get product details
      const productQuery = `
        SELECT 
          p.name,
          p.ingredient_list,
          p.key_ingredients_csv,
          p.suitable_for_skin_types,
          p.addresses_concerns,
          p.alcohol_free,
          p.fragrance_free,
          p.paraben_free,
          p.sulfate_free,
          p.silicone_free
        FROM products p
        WHERE p.id = $1 AND p.is_active = true
      `;

      const productResult = await client.query(productQuery, [id]);

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const product = productResult.rows[0];

      // Perform compatibility analysis
      const compatibility = {
        overall_score: 100,
        skin_type_match: false,
        concern_match: false,
        safety_warnings: [],
        recommendations: []
      };

      // Check skin type compatibility
      if (product.suitable_for_skin_types && skin_type) {
        const suitableTypes = product.suitable_for_skin_types || [];
        compatibility.skin_type_match = suitableTypes.includes(skin_type.toLowerCase()) || 
                                       suitableTypes.includes('all');
        
        if (!compatibility.skin_type_match) {
          compatibility.overall_score -= 20;
          compatibility.recommendations.push(`This product is not specifically formulated for ${skin_type} skin`);
        }
      }

      // Check concern compatibility
      if (product.addresses_concerns && concerns.length > 0) {
        const productConcerns = product.addresses_concerns || [];
        const matchingConcerns = concerns.filter(concern => 
          productConcerns.some(pc => pc.toLowerCase().includes(concern.toLowerCase()))
        );
        
        compatibility.concern_match = matchingConcerns.length > 0;
        compatibility.matching_concerns = matchingConcerns;

        if (!compatibility.concern_match) {
          compatibility.overall_score -= 15;
          compatibility.recommendations.push('This product may not address your primary skin concerns');
        }
      }

      // Check sensitivities
      sensitivities.forEach(sensitivity => {
        switch (sensitivity.toLowerCase()) {
          case 'fragrance':
            if (!product.fragrance_free) {
              compatibility.overall_score -= 25;
              compatibility.safety_warnings.push('Contains fragrance - may cause irritation');
            }
            break;
          case 'alcohol':
            if (!product.alcohol_free) {
              compatibility.overall_score -= 20;
              compatibility.safety_warnings.push('Contains alcohol - may be drying');
            }
            break;
          case 'paraben':
            if (!product.paraben_free) {
              compatibility.overall_score -= 15;
              compatibility.safety_warnings.push('Contains parabens - may cause sensitivity');
            }
            break;
          case 'sulfate':
            if (!product.sulfate_free) {
              compatibility.overall_score -= 15;
              compatibility.safety_warnings.push('Contains sulfates - may be harsh');
            }
            break;
          case 'silicone':
            if (!product.silicone_free) {
              compatibility.overall_score -= 10;
              compatibility.safety_warnings.push('Contains silicones - may cause buildup');
            }
            break;
        }
      });

      // Determine overall recommendation
      if (compatibility.overall_score >= 80) {
        compatibility.recommendation = 'Highly Recommended';
        compatibility.status = 'excellent';
      } else if (compatibility.overall_score >= 60) {
        compatibility.recommendation = 'Good Match';
        compatibility.status = 'good';
      } else if (compatibility.overall_score >= 40) {
        compatibility.recommendation = 'Proceed with Caution';
        compatibility.status = 'caution';
      } else {
        compatibility.recommendation = 'Not Recommended';
        compatibility.status = 'not_recommended';
      }

      console.log(`✅ Compatibility analysis complete: ${compatibility.overall_score}% match`);

      res.json({
        success: true,
        data: {
          product_name: product.name,
          compatibility,
          analysis_date: new Date().toISOString()
        }
      });
      
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Compatibility check error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to perform compatibility check',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;