require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Checking database configuration...');
console.log('DB_USER:', process.env.DB_USER || 'postgres');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_NAME:', process.env.DB_NAME || 'matchcare_fresh_db');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : '❌ NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 5432);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD || 'your_password_here', // ⚠️ Set this!
  port: process.env.DB_PORT || 5432,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');
    
    const result = await client.query('SELECT COUNT(*) FROM ingredients WHERE is_active = true');
    console.log('📊 Active ingredients count:', result.rows[0].count);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('💡 Fix: Set DB_PASSWORD in .env file');
  }
}

testConnection();