// backend/routes/products.js
// COMPLETE PRODUCTS ROUTES WITH QUIZ INTEGRATION

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
      
      // Quiz results
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

    console.log('🛍️ Products request:', {
      page, limit, skin_type, concerns, sensitivities, 
      search, category, brand, sort, ontology
    });

    const client = await pool.connect();
    
    try {
      // Parse concerns and sensitivities
      const concernsArray = concerns ? concerns.split(',').map(c => c.trim().toLowerCase()) : [];
      const sensitivitiesArray = sensitivities ? sensitivities.split(',').map(s => s.trim().toLowerCase()) : [];
      
      // Build dynamic query
      let whereConditions = ['p.is_active = true'];
      let queryParams = [];
      let paramIndex = 1;
      let joinClauses = ['LEFT JOIN brands b ON p.brand_id = b.id'];
      
      // Quiz-based filtering
      if (skin_type) {
        whereConditions.push(`($${paramIndex} = ANY(p.suitable_for_skin_types) OR array_length(p.suitable_for_skin_types, 1) IS NULL)`);
        queryParams.push(skin_type.toLowerCase());
        paramIndex++;
      }
      
      // Concerns filtering
      if (concernsArray.length > 0) {
        const concernConditions = concernsArray.map(concern => {
          const condition = `$${paramIndex} = ANY(p.addresses_concerns)`;
          queryParams.push(concern);
          paramIndex++;
          return condition;
        });
        whereConditions.push(`(${concernConditions.join(' OR ')})`);
      }
      
      // Sensitivity filtering (avoid products that contain sensitive ingredients)
      if (sensitivitiesArray.length > 0) {
        sensitivitiesArray.forEach(sensitivity => {
          switch(sensitivity) {
            case 'fragrance':
              whereConditions.push('p.fragrance_free = true');
              break;
            case 'alcohol':
              whereConditions.push('p.alcohol_free = true');
              break;
            case 'silicone':
              whereConditions.push('p.silicone_free = true');
              break;
            case 'paraben':
              whereConditions.push('p.paraben_free = true');
              break;
            case 'sulfate':
              whereConditions.push('p.sulfate_free = true');
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
      
      // Build sorting
      let orderBy = '';
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
        case 'relevance':
        default:
          if (skin_type || concernsArray.length > 0) {
            // Quiz-based relevance scoring
            orderBy = `ORDER BY 
              (CASE WHEN $1 = ANY(p.suitable_for_skin_types) THEN 40 ELSE 0 END) +
              (CASE WHEN array_length(p.suitable_for_skin_types, 1) IS NULL THEN 20 ELSE 0 END) +
              (SELECT COUNT(*) * 10 FROM unnest(p.addresses_concerns) AS concern 
               WHERE concern = ANY($${concernsArray.length > 0 ? '2' : 'null'}::text[]))
              DESC, p.name ASC`;
          } else {
            orderBy = 'ORDER BY p.name ASC';
          }
          break;
      }
      
      // Count total products
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        ${joinClauses.join(' ')}
        WHERE ${whereConditions.join(' AND ')}
      `;
      
      const countResult = await client.query(countQuery, queryParams);
      const totalProducts = parseInt(countResult.rows[0].total);
      
      // Calculate pagination
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Max 50 per page
      const offset = (pageNum - 1) * limitNum;
      
      // Main products query
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
          p.product_url,
          -- Calculate match score for quiz results
          ${skin_type || concernsArray.length > 0 ? `
          (CASE WHEN $1 = ANY(p.suitable_for_skin_types) THEN 40 ELSE 0 END) +
          (CASE WHEN array_length(p.suitable_for_skin_types, 1) IS NULL THEN 20 ELSE 0 END) +
          (SELECT COALESCE(COUNT(*) * 10, 0) FROM unnest(p.addresses_concerns) AS concern 
           WHERE concern = ANY(ARRAY[${concernsArray.map((_, i) => `$${i + 2}`).join(',')}]::text[]))
          ` : '0'} as match_score
        FROM products p
        ${joinClauses.join(' ')}
        WHERE ${whereConditions.join(' AND ')}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limitNum, offset);
      
      console.log('🔍 Executing products query:', productsQuery);
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
          image: product.image_urls || '/images/placeholder-product.jpg',
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
        total: totalProducts // For backward compatibility
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

// Get single product by ID
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
      
      // Get product ingredients
      const ingredientsQuery = `
        SELECT 
          i.name,
          i.actual_functions,
          i.embedded_functions,
          i.functional_categories,
          i.key_ingredient_types,
          i.is_key_ingredient,
          i.suitable_for_skin_types,
          i.addresses_concerns,
          i.provided_benefits,
          i.sensitivities,
          pi.is_key_ingredient as product_key_ingredient,
          pi.position
        FROM product_ingredients pi
        JOIN ingredients i ON pi.ingredient_id = i.id
        WHERE pi.product_id = $1
        ORDER BY pi.position ASC, i.name ASC
      `;
      
      const ingredientsResult = await client.query(ingredientsQuery, [parseInt(id)]);
      
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
        ingredients: ingredientsResult.rows.map(ing => ({
          name: ing.name,
          functions: ing.actual_functions ? ing.actual_functions.split(',') : [],
          categories: ing.functional_categories ? ing.functional_categories.split(',') : [],
          is_key: ing.product_key_ingredient || ing.is_key_ingredient === 'true',
          benefits: ing.provided_benefits ? ing.provided_benefits.split(',') : [],
          suitable_for: ing.suitable_for_skin_types ? ing.suitable_for_skin_types.split(',') : [],
          addresses: ing.addresses_concerns ? ing.addresses_concerns.split(',') : [],
          sensitivities: ing.sensitivities ? ing.sensitivities.split(',') : [],
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
        SELECT DISTINCT main_category as category
        FROM products 
        WHERE main_category IS NOT NULL AND is_active = true
        ORDER BY main_category
      `;
      
      const result = await client.query(query);
      
      res.json({
        success: true,
        categories: result.rows.map(row => row.category)
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
        SELECT DISTINCT b.name as brand
        FROM brands b
        JOIN products p ON b.id = p.brand_id
        WHERE p.is_active = true
        ORDER BY b.name
      `;
      
      const result = await client.query(query);
      
      res.json({
        success: true,
        brands: result.rows.map(row => row.brand)
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

module.exports = router;