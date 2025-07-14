const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const recommendationController = require('../controllers/recommendationController');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'MatchCare Backend is running!', timestamp: new Date().toISOString() });
});

router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProduct);
router.post('/quiz/recommendations', recommendationController.getRecommendations);

module.exports = router;
