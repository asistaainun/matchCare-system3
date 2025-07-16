const path = require("path");
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
    console.log('âœ… Database connected');
    await sequelize.sync({ alter: true });
    console.log('âœ… Database synced');
    
    app.listen(PORT, () => {
      console.log(`íº€ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('âŒ Server start failed:', error);
  }
}

startServer();

// Serve static files (images)
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Test endpoint untuk cek gambar
app.get('/test-image', (req, res) => {
  const fs = require('fs');
  const imagePath = path.join(__dirname, 'public/images/products');
  
  fs.readdir(imagePath, (err, files) => {
    if (err) {
      return res.json({ error: 'Cannot read images directory' });
    }
    
    const imageFiles = files.filter(file => 
      file.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)
    );
    
    res.json({
      message: 'Images directory accessible',
      totalImages: imageFiles.length,
      sampleImages: imageFiles.slice(0, 5),
      testUrl: `/images/products/${imageFiles[0] || 'no-images-found'}`
    });
  });
});
