const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize } = require('./config/database');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(morgan('combined'));
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/images', express.static('public/images'));
app.use('/api', routes);

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('‚úÖ Database connected');
    await sequelize.sync({ alter: true });
    console.log('‚úÖ Database synced');
    
    app.listen(PORT, () => {
      console.log(`Ì∫Ä Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('‚ùå Server start failed:', error);
  }
}

startServer();
