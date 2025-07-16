const { sequelize } = require('../models');

async function resetDatabase() {
  try {
    console.log('��� Resetting database...');
    
    // Drop and recreate all tables
    await sequelize.sync({ force: true });
    console.log('✅ Database reset complete');
    
    // Import sample data
    console.log('��� Importing sample data...');
    require('./import-csv-data.js');
    
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  }
}

resetDatabase();
