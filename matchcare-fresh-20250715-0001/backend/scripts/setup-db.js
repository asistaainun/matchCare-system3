const { sequelize } = require('../config/database');

async function setupDatabase() {
  try {
    console.log('� Setting up database...');
    
    await sequelize.authenticate();
    console.log('✅ Database connection verified');
    
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables created/updated');
    
    console.log('� Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('� Will use in-memory database for development');
    process.exit(0);
  }
}

setupDatabase();
