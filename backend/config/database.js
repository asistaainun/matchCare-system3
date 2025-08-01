// backend/config/database.js
// COMPLETE HYBRID CONFIGURATION for MatchCare

const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
require('dotenv').config();

// Shared configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD,  // NO String() wrapper!
  port: parseInt(process.env.DB_PORT) || 5432,
};

console.log('🔧 MatchCare Database Configuration:');
console.log(`   User: ${dbConfig.user}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   Password: ${dbConfig.password ? '***SET***' : 'NOT SET'}`);

// Sequelize for Models
const sequelize = new Sequelize({
  database: dbConfig.database,
  username: dbConfig.user,
  password: dbConfig.password,
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: 'postgres',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: { timestamps: true, underscored: true }
});

// Pool for Ontology Engine
const pool = new Pool({
  ...dbConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Connection testing
async function testConnections() {
  console.log('🧪 Testing connections...');
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize connected');
    
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Pool connected');
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await sequelize.close();
  await pool.end();
  console.log('✅ Connections closed');
});

module.exports = { sequelize, pool, testConnections, dbConfig };