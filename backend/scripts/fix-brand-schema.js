const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'matchcare_fresh_db',
  password: '90226628',
  port: 5432,
});

async function fixBrandSchema() {
  try {
    console.log('Ì¥ß Fixing brand schema...');
    
    // Add brand column to products table
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255)');
    console.log('‚úÖ Added brand column');
    
    // Add other missing columns from CSV
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls TEXT');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS local_image_path TEXT');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS bpom_number VARCHAR(255)');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS main_category VARCHAR(255)');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(255)');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS key_ingredients TEXT');
    
    console.log('‚úÖ Added missing columns');
    
    // Check if we have sample data to verify
    const sampleCheck = await pool.query('SELECT id, name, brand FROM products LIMIT 3');
    console.log('Ì≥ã Sample data after fix:');
    sampleCheck.rows.forEach(row => {
      console.log(`   - ID: ${row.id}, Name: ${row.name}, Brand: ${row.brand || 'NULL'}`);
    });
    
    console.log('Ìæâ Schema fix completed!');
    
  } catch (error) {
    console.error('‚ùå Fix failed:', error.message);
  } finally {
    pool.end();
  }
}

fixBrandSchema();
