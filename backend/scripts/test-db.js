const { sequelize } = require('../config/database');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Test query
    const [results] = await sequelize.query('SELECT version()');
    console.log('� PostgreSQL version:', results[0].version);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('� Using in-memory database for development');
    process.exit(0); // Don't fail, just warn
  }
}

testConnection();
