const { sequelize } = require('../models');

async function resetDatabase() {
  try {
    console.log('Ì¥Ñ Resetting database...');
    
    // Drop and recreate all tables
    await sequelize.sync({ force: true });
    console.log('‚úÖ Database reset complete');
    
    // Import sample data
    console.log('Ì≥ä Importing sample data...');
    require('./import-data.js');
    
  } catch (error) {
    console.error('‚ùå Reset failed:', error.message);
    process.exit(1);
  }
}

resetDatabase();
