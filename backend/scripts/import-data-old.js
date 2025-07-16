const { sequelize, Brand, Product, Ingredient, ProductIngredient } = require('../models');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function importData() {
  try {
    console.log('í³Š Starting data import...');
    
    // Sync database first
    await sequelize.sync({ alter: true });
    console.log('âœ… Database synced');
    
    // Sample data
    const sampleData = [
      {
        name: 'CeraVe Foaming Facial Cleanser',
        brand: 'CeraVe',
        product_type: 'Cleanser',
        description: 'Daily facial cleanser for normal to oily skin',
        ingredients: 'Water|Niacinamide|Ceramide NP',
        alcohol_free: true,
        fragrance_free: true,
        paraben_free: true
      },
      {
        name: 'The Ordinary Hyaluronic Acid 2% + B5',
        brand: 'The Ordinary',
        product_type: 'Serum',
        description: 'Hydrating serum with hyaluronic acid',
        ingredients: 'Aqua|Sodium Hyaluronate|Pentylene Glycol',
        alcohol_free: true,
        fragrance_free: true,
        paraben_free: true
      },
      {
        name: 'Paula\'s Choice 2% BHA Liquid',
        brand: 'Paula\'s Choice',
        product_type: 'Treatment',
        description: 'Leave-on exfoliant with salicylic acid',
        ingredients: 'Aqua|Salicylic Acid|Butylene Glycol',
        alcohol_free: true,
        fragrance_free: true,
        paraben_free: true
      },
      {
        name: 'Neutrogena Hydro Boost Water Gel',
        brand: 'Neutrogena',
        product_type: 'Moisturizer',
        description: 'Oil-free hydrating gel moisturizer',
        ingredients: 'Water|Dimethicone|Glycerin',
        alcohol_free: true,
        fragrance_free: false,
        paraben_free: true
      },
      {
        name: 'La Roche-Posay Anthelios SPF60',
        brand: 'La Roche-Posay',
        product_type: 'Sunscreen',
        description: 'Broad spectrum sunscreen for face',
        ingredients: 'Aqua|Alcohol Denat|Silica',
        alcohol_free: false,
        fragrance_free: true,
        paraben_free: true
      }
    ];

    for (const item of sampleData) {
      // Create or find brand
      const [brand] = await Brand.findOrCreate({
        where: { name: item.brand },
        defaults: { name: item.brand }
      });

      // Create product
      const product = await Product.create({
        name: item.name,
        brand_id: brand.id,
        product_type: item.product_type,
        description: item.description,
        alcohol_free: item.alcohol_free,
        fragrance_free: item.fragrance_free,
        paraben_free: item.paraben_free,
        sulfate_free: true,
        silicone_free: !item.ingredients.toLowerCase().includes('dimethicone')
      });

      // Add ingredients
      const ingredientNames = item.ingredients.split('|');
      for (let i = 0; i < ingredientNames.length; i++) {
        const [ingredient] = await Ingredient.findOrCreate({
          where: { name: ingredientNames[i] },
          defaults: { 
            name: ingredientNames[i],
            what_it_does: 'Skincare ingredient'
          }
        });

        await ProductIngredient.create({
          product_id: product.id,
          ingredient_id: ingredient.id,
          is_key_ingredient: i < 3
        });
      }
    }

    console.log(`âœ… Imported ${sampleData.length} products successfully`);
    
    // Check CSV file in assets
    const csvPath = path.join(__dirname, '../../assets/sample_products.csv');
    if (fs.existsSync(csvPath)) {
      console.log('ï¿½ï¿½ Found CSV file, importing additional data...');
      // Could add CSV import logic here
    }
    
    process.exit(0);
  } catch (error) {
    console.error('âŒ Import failed:', error.message);
    process.exit(1);
  }
}

importData();
