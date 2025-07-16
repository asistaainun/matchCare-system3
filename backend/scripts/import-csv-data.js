const { sequelize } = require('../models');
const { Product, Ingredient, ProductIngredient } = require('../models');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function importCSVData() {
  try {
    console.log('Ì∫Ä Starting CSV data import...');
    
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
        // Create product
        const productData = {
          productName: row['Product Name'] || '',
          brand: row['Brand'] || '',
          productType: row['Product Type'] || '',
          description: row['Description'] || '',
          howToUse: row['How to Use'] || '',
          ingredientList: row['IngredientList'] || '',
          imageUrls: row['Image URLs'] ? [row['Image URLs']] : [],
          localImagePath: row['Local Image Path'] || '',
          bpomNumber: row['BPOM Number'] || '',
          mainCategory: row['Main_Category'] || '',
          subcategory: row['Subcategory'] || '',
          keyIngredients: row['Key_Ingredients'] ? row['Key_Ingredients'].split(',').map(i => i.trim()) : [],
          alcoholFree: row['alcohol_free'] === 'true',
          fragranceFree: row['fragrance_free'] === 'true',
          parabenFree: row['paraben_free'] === 'true',
          sulfateFree: row['sulfate_free'] === 'true',
          siliconeFree: row['silicone_free'] === 'true',
          isActive: true,
          slug: (row['Product Name'] || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
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
    
    // Import ingredients from second CSV
    await importIngredients();
    
  } catch (error) {
    console.error('‚ùå Import failed:', error.message);
    throw error;
  }
}

async function importIngredients() {
  try {
    console.log('Ì∑™ Starting ingredients import...');
    
    const csvPath = path.join(__dirname, '../data/csv/matchcare_ultimate_cleaned.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('‚ö†Ô∏è  Ingredients CSV not found, skipping...');
      return;
    }
    
    const ingredients = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          ingredients.push(row);
        })
        .on('end', () => {
          console.log(`Ì∑™ Found ${ingredients.length} ingredients in CSV`);
          resolve();
        })
        .on('error', reject);
    });
    
    let importCount = 0;
    let errorCount = 0;
    
    for (const row of ingredients) {
      try {
        const ingredientData = {
          name: row['name'] || '',
          whatItDoes: row['whatItDoes'] || '',
          description: row['explanation'] || '',
          benefits: row['benefit'] || '',
          suitableForSkinTypes: row['suitableForSkinTypes'] ? row['suitableForSkinTypes'].split(',').map(s => s.trim()) : [],
          addressesConcerns: row['addressesConcerns'] ? row['addressesConcerns'].split(',').map(s => s.trim()) : [],
          isKeyIngredient: row['isKeyIngredient'] === 'true',
          alcoholFree: row['alcoholFree'] === 'true',
          fragranceFree: row['fragranceFree'] === 'true',
          siliconeFree: row['siliconeFree'] === 'true',
          sulfateFree: row['sulfateFree'] === 'true',
          parabenFree: row['parabenFree'] === 'true',
          slug: (row['name'] || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        };
        
        await Ingredient.create(ingredientData);
        importCount++;
        
        if (importCount % 500 === 0) {
          console.log(`‚úÖ Imported ${importCount} ingredients...`);
        }
        
      } catch (error) {
        errorCount++;
        if (errorCount < 10) {
          console.log(`‚ö†Ô∏è  Error importing ingredient ${row['name']}: ${error.message}`);
        }
      }
    }
    
    console.log(`Ìæâ Ingredients import completed!`);
    console.log(`‚úÖ Successfully imported: ${importCount} ingredients`);
    console.log(`‚ùå Errors: ${errorCount} ingredients`);
    
  } catch (error) {
    console.error('‚ùå Ingredients import failed:', error.message);
  }
}

if (require.main === module) {
  importCSVData()
    .then(() => {
      console.log('ÔøΩÔøΩ All imports completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('‚ùå Import process failed:', error);
      process.exit(1);
    });
}

module.exports = importCSVData;
