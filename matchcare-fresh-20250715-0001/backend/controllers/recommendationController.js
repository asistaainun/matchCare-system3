const { Product, Brand, Ingredient } = require('../models');

exports.getRecommendations = async (req, res) => {
  try {
    const { skinType, concerns = [], sensitivities = [] } = req.body;
    
    const validSkinTypes = ['normal', 'dry', 'oily', 'combination'];
    if (!validSkinTypes.includes(skinType?.toLowerCase())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid skin type. Please select: normal, dry, oily, or combination.' 
      });
    }

    let products = await Product.findAll({
      include: [
        { model: Brand, attributes: ['name'] },
        { model: Ingredient, attributes: ['name'] }
      ]
    });
    
    // Filter based on sensitivities
    let filteredProducts = products.filter(product => {
      for (const sensitivity of sensitivities) {
        if (sensitivity === 'Fragrance' && !product.fragrance_free) return false;
        if (sensitivity === 'Alcohol' && !product.alcohol_free) return false;
        if (sensitivity === 'Paraben' && !product.paraben_free) return false;
      }
      return true;
    });

    // Score products
    filteredProducts = filteredProducts.map(product => {
      let score = 0;
      if (product.fragrance_free) score += 10;
      if (product.alcohol_free) score += 10;
      if (product.paraben_free) score += 5;
      
      return {
        ...product.toJSON(),
        ontology_score: score,
        reasoning: `Suitable for ${skinType} skin type. ${sensitivities.length > 0 ? `Avoids ${sensitivities.join(', ')}.` : ''}`
      };
    });

    filteredProducts.sort((a, b) => b.ontology_score - a.ontology_score);

    res.json({
      success: true,
      data: {
        recommendations: filteredProducts.slice(0, 10),
        explanation: `Based on your ${skinType} skin type${sensitivities.length > 0 ? ` and sensitivities to ${sensitivities.join(', ')}` : ''}, we found ${filteredProducts.length} suitable products.`,
        total_products_analyzed: products.length,
        recommendations_count: Math.min(filteredProducts.length, 10)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
