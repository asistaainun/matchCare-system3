// File: scripts/final-database-fix.js
// Check actual database columns and fix server.js accordingly

const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function finalDatabaseFix() {
    try {
        console.log('🔍 Final Database Column Check & Fix\n');
        
        // 1. Get ACTUAL products table columns
        console.log('📋 Checking ACTUAL products table columns...');
        const productsColumns = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'products' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n✅ ACTUAL PRODUCTS TABLE COLUMNS:');
        const actualColumns = productsColumns.rows.map(row => row.column_name);
        actualColumns.forEach(col => console.log(`   - ${col}`));
        
        // 2. Check brands table columns
        const brandsColumns = await pool.query(`
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'brands' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n✅ ACTUAL BRANDS TABLE COLUMNS:');
        const actualBrandColumns = brandsColumns.rows.map(row => row.column_name);
        actualBrandColumns.forEach(col => console.log(`   - ${col}`));
        
        // 3. Build safe attributes list
        const commonProductColumns = [
            'id', 'name', 'description', 'brand_id', 'product_type', 'how_to_use',
            'alcohol_free', 'fragrance_free', 'paraben_free', 'sulfate_free', 'silicone_free',
            'is_active', 'created_at', 'updated_at'
        ];
        
        const safeProductAttributes = commonProductColumns.filter(col => 
            actualColumns.includes(col)
        );
        
        console.log('\n🎯 SAFE PRODUCT ATTRIBUTES TO USE:');
        safeProductAttributes.forEach(col => console.log(`   - ${col}`));
        
        const safeBrandAttributes = ['id', 'name'].filter(col => 
            actualBrandColumns.includes(col)
        );
        
        console.log('\n🎯 SAFE BRAND ATTRIBUTES TO USE:');
        safeBrandAttributes.forEach(col => console.log(`   - ${col}`));
        
        // 4. Generate corrected server.js
        console.log('\n🔧 Generating corrected server.js...');
        
        const correctedServerTemplate = `
// ===== CORRECTED PRODUCTS ENDPOINT =====
// This replaces the problematic section in server.js

app.get('/api/products', async (req, res) => {
  try {
    const { 
      search, limit = 20, offset = 0,
      alcohol_free, fragrance_free, paraben_free 
    } = req.query;

    let whereClause = { is_active: true };
    
    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: \`%\${search}%\` } },
        { description: { [Op.iLike]: \`%\${search}%\` } }
      ];
    }
    
    // Safety filters
    if (alcohol_free === 'true') whereClause.alcohol_free = true;
    if (fragrance_free === 'true') whereClause.fragrance_free = true;
    if (paraben_free === 'true') whereClause.paraben_free = true;

    const products = await Product.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: Brand, 
          as: 'Brand',
          attributes: ${JSON.stringify(safeBrandAttributes)}
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: ${JSON.stringify(safeProductAttributes)}
    });

    res.json({
      success: true,
      data: products.rows,
      pagination: {
        total: products.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(products.count / limit)
      }
    });

  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});
`;

        // 5. Write the correction instructions
        fs.writeFileSync('server-correction.js', correctedServerTemplate);
        
        console.log('\n✅ Generated server-correction.js');
        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Copy the content from server-correction.js');
        console.log('2. Replace the problematic /api/products endpoint in server.js');
        console.log('3. Restart server: npm start');
        
        // 6. Show what needs to be removed
        const problemColumns = ['main_category', 'subcategory', 'brand'];
        const foundProblems = problemColumns.filter(col => !actualColumns.includes(col));
        
        if (foundProblems.length > 0) {
            console.log('\n❌ COLUMNS TO REMOVE FROM server.js:');
            foundProblems.forEach(col => console.log(`   - ${col} (does not exist)`));
        }
        
        console.log('\n📊 SUMMARY:');
        console.log(`   - Found ${actualColumns.length} actual columns in products table`);
        console.log(`   - Generated safe attributes list with ${safeProductAttributes.length} columns`);
        console.log(`   - Ready to fix server.js!`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

// Generate quick manual fix
function generateQuickFix(safeAttributes, safeBrandAttributes) {
    return `
// 🚀 QUICK MANUAL FIX FOR server.js
// Replace the attributes array in your /api/products endpoint:

// ❌ REMOVE THIS:
// attributes: ['id', 'name', 'brand', 'main_category', 'subcategory', ...]

// ✅ REPLACE WITH THIS:
attributes: ${JSON.stringify(safeAttributes)},

// And for Brand include:
// ✅ USE THIS:
include: [{ 
  model: Brand, 
  as: 'Brand',
  attributes: ${JSON.stringify(safeBrandAttributes)}
}]
`;
}

// Run the fix
if (require.main === module) {
    finalDatabaseFix();
}

module.exports = finalDatabaseFix;