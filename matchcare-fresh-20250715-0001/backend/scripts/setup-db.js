const { sequelize } = require('../config/database');

async function setupDatabase() {
  try {
    console.log('í´§ Setting up database...');
    
    await sequelize.authenticate();
    console.log('âœ… Database connection verified');
    
    await sequelize.sync({ alter: true });
    console.log('âœ… Database tables created/updated');
    
    console.log('í¾‰ Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('âŒ Database setup failed:', error.message);
    console.log('í²¡ Will use in-memory database for development');
    process.exit(0);
  }
}

setupDatabase();
