const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'matchcare_fresh_db',
  password: '90226628',
  port: 5432,
});

async function updateProductBrands() {
  try {
    console.log('Ì¥Ñ Updating product brands and missing data...');
    
    const csvPath = path.join(__dirname, '../data/csv/final_corrected_matchcare_data.csv');
    const products = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => products.push(row))
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`Ì≥¶ Processing ${products.length} products for brand update...`);
    
    let updateCount = 0;
    
    for (let i = 0; i < products.length; i++) {
      const row = products[i];
      
      try {
        await pool.query(`
          UPDATE products 
          SET 
            brand = $1,
            ingredients = $2,
            image_urls = $3,
            local_image_path = $4,
            bpom_number = $5,
            main_category = $6,
            subcategory = $7,
            key_ingredients = $8
          WHERE id = $9
        `, [
          row['Brand'] || '',
          row['IngredientList'] || '',
          row['Image URLs'] || '',
          row['Local Image Path'] || '',
          row['BPOM Number'] || '',
          row['Main_Category'] || '',
          row['Subcategory'] || '',
          row['Key_Ingredients'] || '',
          i + 1  // assuming sequential IDs
        ]);
        
        updateCount++;
        
        if (updateCount % 500 === 0) {
          console.log(`‚úÖ Updated ${updateCount} products...`);
        }
        
      } catch (error) {
        console.log(`‚ö†Ô∏è  Error updating product ${i + 1}: ${error.message}`);
      }
    }
    
    console.log(`Ìæâ Update completed! Updated ${updateCount} products`);
    
    // Verify update
    const verifyResult = await pool.query(`
      SELECT name, brand, main_category 
      FROM products 
      WHERE brand IS NOT NULL 
      LIMIT 5
    `);
    
    console.log('Ì≥ã Sample updated products:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.brand}: ${row.name} (${row.main_category})`);
    });
    
  } catch (error) {
    console.error('‚ùå Update failed:', error.message);
  } finally {
    pool.end();
  }
}

updateProductBrands();
