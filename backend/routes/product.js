// Add image URL processing
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: Brand, attributes: ['name'] }],
      attributes: [
        'id', 'name', 'description', 'main_category', 
        'subcategory', 'image_urls', 'local_image_path'
      ]
    });

    // Process image URLs
    const processedProducts = products.map(product => ({
      ...product.toJSON(),
      imageUrl: product.image_urls ? 
        product.image_urls.split(',')[0].trim() : 
        '/api/images/placeholder.jpg',
      images: product.image_urls ? 
        product.image_urls.split(',').map(url => url.trim()) : 
        []
    }));

    res.json(processedProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});