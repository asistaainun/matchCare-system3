const { sequelize } = require('../models');
const { Ingredient } = require('../models');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function importIngredients() {
  try {
    console.log('�� Starting ingredients import with correct credentials...');
    
    // Sync database first
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');
    
    const csvPath = path.join(__dirname, '../data/csv/matchcare_ultimate_cleaned.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    console.log(`� Reading ingredients CSV: ${csvPath}`);
    
    const ingredients = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          ingredients.push(row);
        })
        .on('end', () => {
          console.log(`� Found ${ingredients.length} ingredients in CSV`);
          resolve();
        })
        .on('error', reject);
    });
    
    console.log('� Starting ingredients import...');
    let importCount = 0;
    let errorCount = 0;
    
    for (const row of ingredients) {
      try {
        const ingredientData = {
          name: row['name'] || '',
          whatItDoes: row['whatItDoes'] || '',
          explanation: row['explanation'] || '',
          benefit: row['benefit'] || '',
          safety: row['safety'] || '',
          suitableForSkinTypes: row['suitableForSkinTypes'] || '',
          addressesConcerns: row['addressesConcerns'] || '',
          isKeyIngredient: row['isKeyIngredient'] === 'true',
          alcoholFree: row['alcoholFree'] === 'true',
          fragranceFree: row['fragranceFree'] === 'true',
          siliconeFree: row['siliconeFree'] === 'true',
          sulfateFree: row['sulfateFree'] === 'true',
          parabenFree: row['parabenFree'] === 'true'
        };
        
        await Ingredient.create(ingredientData);
        importCount++;
        
        if (importCount % 1000 === 0) {
          console.log(`✅ Imported ${importCount} ingredients...`);
        }
        
      } catch (error) {
        errorCount++;
        if (errorCount < 5) {
          console.log(`⚠️  Error importing ingredient ${row['name']}: ${error.message}`);
        }
      }
    }
    
    console.log(`� Ingredients import completed!`);
    console.log(`✅ Successfully imported: ${importCount} ingredients`);
    console.log(`❌ Errors: ${errorCount} ingredients`);
    
  } catch (error) {
    console.error('❌ Ingredients import failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  importIngredients()
    .then(() => {
      console.log('� Ingredients import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Import process failed:', error);
      process.exit(1);
    });
}

module.exports = importIngredients;
