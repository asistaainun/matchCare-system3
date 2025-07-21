
// ===== CORRECTED PRODUCTS ENDPOINT =====
// This replaces the problematic section in server.js

app.get('/api/products', async (req, res) => {
  try {
    const { 
      search, limit = 20, offset = 0,
      alcohol_free, fragrance_free, paraben_free 
    } = req.query;

    let whereClause = { is_active: true };
    
    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Safety filters
    if (alcohol_free === 'true') whereClause.alcohol_free = true;
    if (fragrance_free === 'true') whereClause.fragrance_free = true;
    if (paraben_free === 'true') whereClause.paraben_free = true;

    const products = await Product.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: Brand, 
          as: 'Brand',
          attributes: ["id","name"]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: ["id","name","description","brand_id","product_type","how_to_use","alcohol_free","fragrance_free","paraben_free","sulfate_free","silicone_free","is_active","created_at","updated_at"]
    });

    res.json({
      success: true,
      data: products.rows,
      pagination: {
        total: products.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(products.count / limit)
      }
    });

  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});
