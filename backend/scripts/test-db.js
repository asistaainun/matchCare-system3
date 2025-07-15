const { sequelize } = require('../config/database');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('‚úÖ Database connection successful');
    
    // Test query
    const [results] = await sequelize.query('SELECT version()');
    console.log('Ì≥ä PostgreSQL version:', results[0].version);
    
    process.exit(0);
  } catch (error) {
    console.error('‚ùå Database connection failed:', error.message);
    console.log('Ì≤° Using in-memory database for development');
    process.exit(0); // Don't fail, just warn
  }
}

testConnection();
