const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'matchcare_fresh_db',
  password: '90226628',
  port: 5432,
});

async function checkResults() {
  try {
    console.log('� FINAL VERIFICATION');
    console.log('====================');

    const [productRes, ingredientRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM products'),
      pool.query('SELECT COUNT(*) FROM ingredients')
    ]);
    
    const productCount = parseInt(productRes.rows[0].count);
    const ingredientCount = parseInt(ingredientRes.rows[0].count);
    
    console.log('� PRODUCTS: ' + productCount + ' / 3940 expected');
    console.log('� INGREDIENTS: ' + ingredientRes.rows[0].count + ' / 28502 expected');
    console.log('====================');
    
    if (productCount >= 3900 && ingredientCount >= 28000) {
      console.log('� PERFECT! Semua data berhasil diimport');
      console.log('� READY untuk start servers dan development');
    } else if (productCount >= 3900) {
      console.log('� Products OK, tapi ingredients perlu diimport');
      console.log('� Jalankan: node scripts/import-ingredients-only.js');
    } else {
      console.log('⚠️  Masih ada yang kurang, perlu troubleshooting');
    }
    
    // Sample data
    const sampleProducts = await pool.query('SELECT name, brand, product_type FROM products LIMIT 3');
    console.log('\n� Sample Products:');
    sampleProducts.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.brand} - ${row.name} (${row.product_type})`);
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    pool.end();
  }
}

checkResults();
