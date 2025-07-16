const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'matchcare_fresh_db',
  password: '90226628',
  port: 5432,
});

async function checkSchema() {
  try {
    console.log('Ì¥ç ACTUAL DATABASE SCHEMA');
    console.log('=========================');

    // Check products table columns
    const productCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position
    `);
    
    console.log('Ì≥¶ PRODUCTS TABLE COLUMNS:');
    productCols.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    // Check ingredients table columns
    const ingredientCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ingredients' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nÌ∑™ INGREDIENTS TABLE COLUMNS:');
    ingredientCols.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    // Try to get sample data with correct column names
    console.log('\nÌ≥ã SAMPLE DATA:');
    const sampleQuery = await pool.query('SELECT * FROM products LIMIT 1');
    if (sampleQuery.rows.length > 0) {
      console.log('   ‚úÖ First product data structure:');
      Object.keys(sampleQuery.rows[0]).forEach(key => {
        const value = sampleQuery.rows[0][key];
        const displayValue = typeof value === 'string' ? value.substring(0, 50) : value;
        console.log(`      ${key}: ${displayValue}`);
      });
    }
    
  } catch (error) {
    console.error('‚ùå ERROR:', error.message);
  } finally {
    pool.end();
  }
}

checkSchema();
