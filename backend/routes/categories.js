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

// GET /api/categories - List all categories with statistics
router.get('/', async (req, res) => {
  try {
    console.log('📂 Fetching categories list...');
    
    const { include_subcategories = false } = req.query;
    
    // Get main categories with product counts
    const categoriesQuery = `
      SELECT 
        main_category as name,
        COUNT(*) as product_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products WHERE main_category IS NOT NULL), 1) as percentage,
        MIN(p.id) as sample_product_id,
        MIN(p.name) as sample_product_name
      FROM products p
      WHERE main_category IS NOT NULL AND main_category != ''
      GROUP BY main_category
      ORDER BY product_count DESC
    `;
    
    const result = await pool.query(categoriesQuery);
    
    let responseData = {
      categories: result.rows,
      total_categories: result.rows.length
    };
    
    // Include subcategories if requested
    if (include_subcategories === 'true') {
      const subcategoriesQuery = `
        SELECT 
          subcategory as name,
          main_category,
          COUNT(*) as product_count
        FROM products 
        WHERE subcategory IS NOT NULL AND subcategory != ''
        GROUP BY subcategory, main_category
        ORDER BY main_category, product_count DESC
      `;
      
      const subResult = await pool.query(subcategoriesQuery);
      responseData.subcategories = subResult.rows;
      responseData.total_subcategories = subResult.rows.length;
    }
    
    console.log(`✅ Found ${result.rows.length} main categories`);
    
    res.json({
      success: true,
      data: responseData.categories,
      metadata: {
        total_categories: responseData.total_categories,
        total_subcategories: responseData.total_subcategories || 0,
        includes_subcategories: include_subcategories === 'true'
      },
      ontology_powered: true,
      message: `${result.rows.length} product categories available`
    });
    
  } catch (error) {
    console.error('❌ Categories fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: { 
        id: 'CATEGORIES_ERROR', 
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /api/categories/:name - Get specific category details
router.get('/:name', async (req, res) => {
  try {
    const categoryName = decodeURIComponent(req.params.name);
    console.log(`🔍 Fetching category details for: ${categoryName}`);
    
    // Get category statistics
    const categoryQuery = `
      SELECT 
        main_category as name,
        COUNT(*) as product_count,
        COUNT(DISTINCT brand_id) as brand_count,
        AVG(CASE WHEN alcohol_free THEN 1 ELSE 0 END) * 100 as alcohol_free_percentage,
        AVG(CASE WHEN fragrance_free THEN 1 ELSE 0 END) * 100 as fragrance_free_percentage,
        AVG(CASE WHEN paraben_free THEN 1 ELSE 0 END) * 100 as paraben_free_percentage
      FROM products p
      WHERE main_category = $1
      GROUP BY main_category
    `;
    
    const result = await pool.query(categoryQuery, [categoryName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Category '${categoryName}' not found`,
        error: { id: 'CATEGORY_NOT_FOUND', message: `Category ${categoryName} does not exist` }
      });
    }
    
    // Get top brands in this category
    const brandsQuery = `
      SELECT 
        b.name as brand_name,
        COUNT(p.id) as product_count
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      WHERE p.main_category = $1
      GROUP BY b.id, b.name
      ORDER BY product_count DESC
      LIMIT 10
    `;
    
    const brandsResult = await pool.query(brandsQuery, [categoryName]);
    
    const categoryData = result.rows[0];
    
    console.log(`✅ Category ${categoryName}: ${categoryData.product_count} products`);
    
    res.json({
      success: true,
      data: {
        ...categoryData,
        top_brands: brandsResult.rows,
        alcohol_free_percentage: parseFloat(categoryData.alcohol_free_percentage).toFixed(1),
        fragrance_free_percentage: parseFloat(categoryData.fragrance_free_percentage).toFixed(1),
        paraben_free_percentage: parseFloat(categoryData.paraben_free_percentage).toFixed(1)
      },
      ontology_powered: true,
      message: `Category details for ${categoryName}`
    });
    
  } catch (error) {
    console.error('❌ Category detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category details',
      error: { 
        id: 'CATEGORY_DETAIL_ERROR', 
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;