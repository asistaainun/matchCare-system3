// File: backend/routes/brands.js
// Brands route with detailed brand information and statistics
// =============================================================================

const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// GET /api/brands - List all brands with statistics
router.get('/', async (req, res) => {
  try {
    console.log('🏷️ Fetching brands list...');
    
    const { 
      min_products = 1, 
      limit = 50, 
      offset = 0,
      sort = 'product_count' 
    } = req.query;
    
    // Validate sort parameter
    const validSorts = ['product_count', 'name', 'percentage'];
    const sortBy = validSorts.includes(sort) ? sort : 'product_count';
    
    // Get brands with product counts and category distribution
    const brandsQuery = `
      SELECT 
        b.id,
        b.name,
        COUNT(p.id) as product_count,
        ROUND(COUNT(p.id) * 100.0 / (SELECT COUNT(*) FROM products), 2) as percentage,
        COUNT(DISTINCT p.main_category) as category_count,
        STRING_AGG(DISTINCT p.main_category, ', ' ORDER BY p.main_category) as categories,
        AVG(CASE WHEN p.alcohol_free THEN 1 ELSE 0 END) * 100 as alcohol_free_percentage,
        AVG(CASE WHEN p.fragrance_free THEN 1 ELSE 0 END) * 100 as fragrance_free_percentage,
        AVG(CASE WHEN p.paraben_free THEN 1 ELSE 0 END) * 100 as paraben_free_percentage
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id
      GROUP BY b.id, b.name
      HAVING COUNT(p.id) >= $1
      ORDER BY ${sortBy} DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(brandsQuery, [
      parseInt(min_products), 
      parseInt(limit), 
      parseInt(offset)
    ]);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT b.id) as total
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id
      GROUP BY b.id
      HAVING COUNT(p.id) >= $1
    `;
    
    const countResult = await pool.query(countQuery, [parseInt(min_products)]);
    const total = countResult.rows.length;
    
    // Process results
    const processedBrands = result.rows.map(brand => ({
      ...brand,
      alcohol_free_percentage: parseFloat(brand.alcohol_free_percentage).toFixed(1),
      fragrance_free_percentage: parseFloat(brand.fragrance_free_percentage).toFixed(1),
      paraben_free_percentage: parseFloat(brand.paraben_free_percentage).toFixed(1),
      categories: brand.categories ? brand.categories.split(', ') : []
    }));
    
    // Get top brands for summary
    const topBrands = processedBrands.filter(brand => brand.product_count > 10);
    
    console.log(`✅ Found ${result.rows.length} brands (${total} total, ${topBrands.length} top brands)`);
    
    res.json({
      success: true,
      data: processedBrands,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: (parseInt(offset) + parseInt(limit)) < total
      },
      metadata: {
        total_brands: total,
        top_brands_count: topBrands.length,
        min_products_filter: parseInt(min_products),
        sort_by: sortBy
      },
      ontology_powered: true,
      message: `${result.rows.length} skincare brands available`
    });
    
  } catch (error) {
    console.error('❌ Brands fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brands',
      error: { 
        id: 'BRANDS_ERROR', 
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /api/brands/:id - Get specific brand details
router.get('/:id', async (req, res) => {
  try {
    const brandId = req.params.id;
    console.log(`🔍 Fetching brand details for ID: ${brandId}`);
    
    // Get brand information
    const brandQuery = `
      SELECT 
        b.id,
        b.name,
        COUNT(p.id) as product_count,
        COUNT(DISTINCT p.main_category) as category_count,
        COUNT(DISTINCT p.subcategory) as subcategory_count,
        STRING_AGG(DISTINCT p.main_category, ', ' ORDER BY p.main_category) as categories
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id
      WHERE b.id = $1
      GROUP BY b.id, b.name
    `;
    
    const result = await pool.query(brandQuery, [brandId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Brand with ID ${brandId} not found`,
        error: { id: 'BRAND_NOT_FOUND', message: `Brand ${brandId} does not exist` }
      });
    }
    
    // Get category breakdown for this brand
    const categoryQuery = `
      SELECT 
        main_category,
        COUNT(*) as product_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products WHERE brand_id = $1), 1) as percentage
      FROM products
      WHERE brand_id = $1 AND main_category IS NOT NULL
      GROUP BY main_category
      ORDER BY product_count DESC
    `;
    
    const categoryResult = await pool.query(categoryQuery, [brandId]);
    
    // Get sample products
    const sampleQuery = `
      SELECT id, name, main_category, description
      FROM products
      WHERE brand_id = $1
      ORDER BY id
      LIMIT 5
    `;
    
    const sampleResult = await pool.query(sampleQuery, [brandId]);
    
    const brandData = result.rows[0];
    
    console.log(`✅ Brand ${brandData.name}: ${brandData.product_count} products`);
    
    res.json({
      success: true,
      data: {
        ...brandData,
        categories: brandData.categories ? brandData.categories.split(', ') : [],
        category_breakdown: categoryResult.rows,
        sample_products: sampleResult.rows
      },
      ontology_powered: true,
      message: `Brand details for ${brandData.name}`
    });
    
  } catch (error) {
    console.error('❌ Brand detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand details',
      error: { 
        id: 'BRAND_DETAIL_ERROR', 
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;