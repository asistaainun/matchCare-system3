require('dotenv').config();
const { Pool } = require('pg');

console.log('Ì∑™ Testing MatchCare Database Connection...');
console.log('Environment loaded:', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD ? '***SET***' : 'NOT SET',
  port: process.env.DB_PORT
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('‚úÖ Database connection successful!');
    
    const result = await client.query('SELECT COUNT(*) as total FROM products');
    console.log(`Ì≥ä Products in database: ${result.rows[0].total}`);
    
    client.release();
    await pool.end();
    console.log('‚úÖ Connection test completed successfully!');
  } catch (error) {
    console.error('‚ùå Connection failed:', error.message);
    console.error('Ì¥ç Error type:', error.code);
  }
}

testConnection();
