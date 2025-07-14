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
      include: [{ model: Brand, attributes: ['name'] }],
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Brand, attributes: ['name'] },
        { model: Ingredient, attributes: ['name', 'what_it_does'] }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
