const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'matchcare_fresh_db',
  password: '90226628',
  port: 5432,
});

async function fixImageUrls() {
  try {
    console.log('Ì∂ºÔ∏è  Fixing image URLs...');
    
    // Get list of available images
    const imagesDir = path.join(__dirname, '../public/images/products');
    const availableImages = fs.readdirSync(imagesDir)
      .filter(file => file.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/));
    
    console.log(`Ì≥Å Found ${availableImages.length} images in directory`);
    
    // Get products that need image URL fixes
    const products = await pool.query('SELECT id, name, brand, local_image_path FROM products');
    
    let updateCount = 0;
    let foundImages = 0;
    
    for (const product of products.rows) {
      let imageUrl = null;
      
      if (product.local_image_path) {
        // Extract filename from path
        const filename = path.basename(product.local_image_path);
        
        // Check if image exists
        if (availableImages.includes(filename)) {
          imageUrl = `/images/products/${filename}`;
          foundImages++;
        }
      }
      
      // If no specific image, try to find by product name
      if (!imageUrl) {
        const productSlug = product.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        
        const matchingImage = availableImages.find(img => 
          img.toLowerCase().includes(productSlug.substring(0, 15)) ||
          (product.brand && img.toLowerCase().includes(product.brand.toLowerCase().substring(0, 8)))
        );
        
        if (matchingImage) {
          imageUrl = `/images/products/${matchingImage}`;
          foundImages++;
        }
      }
      
      // Update database with image URL
      if (imageUrl) {
        await pool.query(
          'UPDATE products SET image_urls = $1 WHERE id = $2',
          [imageUrl, product.id]
        );
        updateCount++;
      }
      
      if (updateCount % 100 === 0) {
        console.log(`‚úÖ Updated ${updateCount} products with image URLs...`);
      }
    }
    
    console.log(`Ìæâ Image URL fix completed!`);
    console.log(`‚úÖ Updated ${updateCount} products`);
    console.log(`Ì∂ºÔ∏è  Found images for ${foundImages} products`);
    console.log(`Ì≥ä Image coverage: ${Math.round(foundImages/products.rows.length*100)}%`);
    
    // Sample verification
    const sampleWithImages = await pool.query(`
      SELECT name, brand, image_urls 
      FROM products 
      WHERE image_urls IS NOT NULL 
      LIMIT 5
    `);
    
    console.log('\nÌ≥ã Sample products with images:');
    sampleWithImages.rows.forEach(row => {
      console.log(`   - ${row.brand}: ${row.name}`);
      console.log(`     Image: ${row.image_urls}`);
    });
    
  } catch (error) {
    console.error('‚ùå Image fix failed:', error.message);
  } finally {
    pool.end();
  }
}

fixImageUrls();
