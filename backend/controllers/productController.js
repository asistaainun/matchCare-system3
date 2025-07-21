const { Product, Brand, Ingredient } = require('../models');
const { Op } = require('sequelize');

exports.getProducts = async (req, res) => {
  try {
    const { search, limit = 20 } = req.query;
    let whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await Product.findAll({
      where: whereClause,
      include: [{ 
        model: Brand, 
        attributes: ['id', 'name'] // ONLY existing columns
      }],
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    // Format for UI
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      product_type: product.product_type,
      brand: {
        id: product.Brand?.id,
        name: product.Brand?.name || 'Unknown Brand'
      },
      safety_flags: {
        alcohol_free: product.alcohol_free,
        fragrance_free: product.fragrance_free,
        paraben_free: product.paraben_free,
        sulfate_free: product.sulfate_free,
        silicone_free: product.silicone_free
      }
    }));

    res.json({ 
      success: true, 
      count: formattedProducts.length,
      data: formattedProducts 
    });
  } catch (error) {
    console.error('Products API Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch products',
      error: error.message 
    });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { 
          model: Brand, 
          attributes: ['id', 'name'] // ONLY existing columns
        },
        { 
          model: Ingredient, 
          attributes: ['id', 'name', 'what_it_does'],
          through: { attributes: ['is_key_ingredient'] }
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    const formattedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      how_to_use: product.how_to_use,
      brand: {
        id: product.Brand?.id,
        name: product.Brand?.name || 'Unknown Brand'
      },
      safety_flags: {
        alcohol_free: product.alcohol_free,
        fragrance_free: product.fragrance_free,
        paraben_free: product.paraben_free,
        sulfate_free: product.sulfate_free,
        silicone_free: product.silicone_free
      },
      ingredients: product.Ingredients?.map(ingredient => ({
        id: ingredient.id,
        name: ingredient.name,
        what_it_does: ingredient.what_it_does,
        is_key_ingredient: ingredient.ProductIngredient?.is_key_ingredient || false
      })) || []
    };
    
    res.json({ 
      success: true, 
      data: formattedProduct 
    });
  } catch (error) {
    console.error('Product Detail API Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch product details',
      error: error.message 
    });
  }
};
