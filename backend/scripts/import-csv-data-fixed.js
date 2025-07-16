const { sequelize } = require('../models');
const { Product, Ingredient, ProductIngredient } = require('../models');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function importCSVData() {
  try {
    console.log('Ì∫Ä Starting CSV data import with correct mapping...');
    
    // Sync database first
    await sequelize.sync({ alter: true });
    console.log('‚úÖ Database synced');
    
    const csvPath = path.join(__dirname, '../data/csv/final_corrected_matchcare_data.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    console.log(`Ì≥Ñ Reading CSV file: ${csvPath}`);
    
    const products = [];
    
    // Read CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          products.push(row);
        })
        .on('end', () => {
          console.log(`Ì≥¶ Found ${products.length} products in CSV`);
          resolve();
        })
        .on('error', reject);
    });
    
    console.log('Ì≤æ Starting database import...');
    let importCount = 0;
    let errorCount = 0;
    
    for (const row of products) {
      try {
        // FIXED: Correct field mapping
        const productData = {
          name: row['Product Name'] || '', // CHANGED: productName -> name
          brand: row['Brand'] || '',
          product_type: row['Product Type'] || '', // CHANGED: productType -> product_type
          description: row['Description'] || '',
          how_to_use: row['How to Use'] || '', // CHANGED: howToUse -> how_to_use
          ingredients: row['IngredientList'] || '', // CHANGED: ingredientList -> ingredients
          image_urls: row['Image URLs'] || '', // CHANGED: imageUrls -> image_urls
          local_image_path: row['Local Image Path'] || '', // CHANGED: localImagePath -> local_image_path
          bpom_number: row['BPOM Number'] || '', // CHANGED: bpomNumber -> bpom_number
          main_category: row['Main_Category'] || '', // CHANGED: mainCategory -> main_category
          subcategory: row['Subcategory'] || '',
          key_ingredients: row['Key_Ingredients'] || '', // CHANGED: keep as string for now
          alcohol_free: row['alcohol_free'] === 'true', // CHANGED: alcoholFree -> alcohol_free
          fragrance_free: row['fragrance_free'] === 'true', // CHANGED: fragranceFree -> fragrance_free
          paraben_free: row['paraben_free'] === 'true', // CHANGED: parabenFree -> paraben_free
          sulfate_free: row['sulfate_free'] === 'true', // CHANGED: sulfateFree -> sulfate_free
          silicone_free: row['silicone_free'] === 'true' // CHANGED: siliconeFree -> silicone_free
        };
        
        await Product.create(productData);
        importCount++;
        
        if (importCount % 100 === 0) {
          console.log(`‚úÖ Imported ${importCount} products...`);
        }
        
      } catch (error) {
        errorCount++;
        if (errorCount < 10) {
          console.log(`‚ö†Ô∏è  Error importing product ${row['Product Name']}: ${error.message}`);
        }
      }
    }
    
    console.log(`Ìæâ Import completed!`);
    console.log(`‚úÖ Successfully imported: ${importCount} products`);
    console.log(`‚ùå Errors: ${errorCount} products`);
    
  } catch (error) {
    console.error('‚ùå Import failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  importCSVData()
    .then(() => {
      console.log('Ìæâ Product import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('‚ùå Import process failed:', error);
      process.exit(1);
    });
}

module.exports = importCSVData;
