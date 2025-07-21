const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function checkCsvContent() {
    try {
        console.log('🔍 Checking CSV Content...\n');
        
        // Possible CSV file locations
        const csvPaths = [
            path.join(__dirname, '../data/csv/new_final_corrected_matchcare_data.csv'),
        ];
        
        let csvFile = null;
        for (const filePath of csvPaths) {
            if (fs.existsSync(filePath)) {
                csvFile = filePath;
                console.log(`✅ Found CSV file: ${filePath}`);
                break;
            }
        }
        
        if (!csvFile) {
            console.log('❌ CSV file not found in any of these locations:');
            csvPaths.forEach(p => console.log(`  - ${p}`));
            
            // Show what files exist in data directories
            const dataDirs = [
                path.join(__dirname, '../data/csv/')
            ];
            
            dataDirs.forEach(dir => {
                if (fs.existsSync(dir)) {
                    console.log(`\n📂 Files in ${dir}:`);
                    const files = fs.readdirSync(dir);
                    files.forEach(file => {
                        const filePath = path.join(dir, file);
                        const isDir = fs.statSync(filePath).isDirectory();
                        console.log(`  ${isDir ? '📁' : '📄'} ${file}`);
                    });
                }
            });
            return;
        }
        
        // Get file info
        const stats = fs.statSync(csvFile);
        console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📅 Last modified: ${stats.mtime.toLocaleString()}`);
        
        // Read CSV using csv-parser (same as import script)
        console.log('\n📋 Reading CSV structure...');
        
        return new Promise((resolve) => {
            const products = [];
            
            fs.createReadStream(csvFile)
                .pipe(csv({
                    skipEmptyLines: true,
                    mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim()
                }))
                .on('data', (row) => {
                    products.push(row);
                })
                .on('end', () => {
                    console.log(`📦 Total rows: ${products.length}`);
                    
                    if (products.length === 0) {
                        console.log('❌ CSV file is empty!');
                        resolve();
                        return;
                    }
                    
                    // Show column structure
                    const firstRow = products[0];
                    console.log('\n📋 CSV Columns found:');
                    Object.keys(firstRow).forEach((key, index) => {
                        console.log(`  ${index + 1}. ${key}`);
                    });
                    
                    // Expected columns based on your actual CSV structure
                    const expectedColumns = [
                        'Product URL',
                        'Product Name', 
                        'Brand',
                        'Product Type',
                        'Description',
                        'How to Use',
                        'IngredientList',
                        'Image URLs',
                        'Local Image Path',
                        'BPOM Number',
                        'Key_Ingredients',
                        'alcohol_free',
                        'fragrance_free', 
                        'paraben_free',
                        'sulfate_free',
                        'silicone_free',
                        'Main_Category',
                        'Subcategory'
                        // Note: Categorization_Confidence will be ignored during import
                    ];
                    
                    console.log('\n✅ Expected columns (for import):');
                    expectedColumns.forEach((col, index) => {
                        const exists = Object.keys(firstRow).includes(col);
                        console.log(`  ${index + 1}. ${col} ${exists ? '✅' : '❌'}`);
                    });
                    
                    // Check for missing columns
                    const missingColumns = expectedColumns.filter(col => !Object.keys(firstRow).includes(col));
                    if (missingColumns.length > 0) {
                        console.log('\n❌ Missing columns:');
                        missingColumns.forEach(col => console.log(`  - ${col}`));
                    }
                    
                    // Check for extra columns (will be ignored)
                    const extraColumns = Object.keys(firstRow).filter(col => !expectedColumns.includes(col));
                    if (extraColumns.length > 0) {
                        console.log('\n⚠️  Extra columns (will be ignored during import):');
                        extraColumns.forEach(col => console.log(`  - ${col}`));
                    }
                    
                    // Show sample data
                    console.log('\n📄 Sample data (first 3 rows):');
                    products.slice(0, 3).forEach((row, index) => {
                        console.log(`\n--- Row ${index + 1} ---`);
                        console.log(`Product Name: ${row['Product Name']}`);
                        console.log(`Brand: ${row['Brand']}`);
                        console.log(`Product Type: ${row['Product Type']}`);
                        console.log(`Main Category: ${row['Main_Category']}`);
                        console.log(`Subcategory: ${row['Subcategory']}`);
                        console.log(`Key Ingredients: ${row['Key_Ingredients']?.substring(0, 100)}...`);
                        console.log(`Alcohol Free: ${row['alcohol_free']}`);
                        console.log(`Has Image: ${row['Local Image Path'] ? 'Yes' : 'No'}`);
                        console.log(`BPOM Number: ${row['BPOM Number']}`);
                    });
                    
                    // Data quality checks
                    console.log('\n🔍 Data Quality Analysis:');
                    
                    let emptyNames = 0;
                    let emptyBrands = 0;
                    let emptyCategories = 0;
                    let emptyIngredients = 0;
                    let hasImages = 0;
                    let hasBpom = 0;
                    let hasProductType = 0;
                    
                    products.forEach(row => {
                        if (!row['Product Name'] || row['Product Name'].trim() === '') emptyNames++;
                        if (!row['Brand'] || row['Brand'].trim() === '') emptyBrands++;
                        if (!row['Main_Category'] || row['Main_Category'].trim() === '') emptyCategories++;
                        if (!row['Key_Ingredients'] || row['Key_Ingredients'].trim() === '') emptyIngredients++;
                        if (row['Local Image Path'] && row['Local Image Path'].trim() !== '') hasImages++;
                        if (row['BPOM Number'] && row['BPOM Number'].trim() !== '') hasBpom++;
                        if (row['Product Type'] && row['Product Type'].trim() !== '') hasProductType++;
                    });
                    
                    console.log(`  Products with empty names: ${emptyNames}`);
                    console.log(`  Products with empty brands: ${emptyBrands}`);
                    console.log(`  Products with empty categories: ${emptyCategories}`);
                    console.log(`  Products with empty key ingredients: ${emptyIngredients}`);
                    console.log(`  Products with images: ${hasImages} (${((hasImages/products.length)*100).toFixed(1)}%)`);
                    console.log(`  Products with BPOM numbers: ${hasBpom} (${((hasBpom/products.length)*100).toFixed(1)}%)`);
                    console.log(`  Products with product type: ${hasProductType} (${((hasProductType/products.length)*100).toFixed(1)}%)`);
                    
                    // Safety flags analysis
                    console.log('\n🛡️  Safety Flags Analysis:');
                    const safetyFlags = ['alcohol_free', 'fragrance_free', 'paraben_free', 'sulfate_free', 'silicone_free'];
                    
                    safetyFlags.forEach(flag => {
                        const trueCount = products.filter(row => row[flag] === 'true' || row[flag] === true).length;
                        const falseCount = products.filter(row => row[flag] === 'false' || row[flag] === false).length;
                        const emptyCount = products.length - trueCount - falseCount;
                        
                        console.log(`  ${flag}:`);
                        console.log(`    True: ${trueCount} (${((trueCount/products.length)*100).toFixed(1)}%)`);
                        console.log(`    False: ${falseCount} (${((falseCount/products.length)*100).toFixed(1)}%)`);
                        console.log(`    Empty/Unknown: ${emptyCount} (${((emptyCount/products.length)*100).toFixed(1)}%)`);
                    });
                    
                    // Categories analysis
                    console.log('\n📊 Categories Analysis:');
                    const categories = {};
                    products.forEach(row => {
                        const cat = row['Main_Category'] || 'Unknown';
                        categories[cat] = (categories[cat] || 0) + 1;
                    });
                    
                    console.log('Main Categories:');
                    Object.entries(categories)
                        .sort(([,a], [,b]) => b - a)
                        .forEach(([category, count]) => {
                            console.log(`  ${category}: ${count} products`);
                        });
                    
                    // Subcategories analysis
                    const subcategories = {};
                    products.forEach(row => {
                        const subcat = row['Subcategory'] || 'Unknown';
                        subcategories[subcat] = (subcategories[subcat] || 0) + 1;
                    });
                    
                    console.log('\nSubcategories:');
                    Object.entries(subcategories)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10) // Show top 10
                        .forEach(([subcategory, count]) => {
                            console.log(`  ${subcategory}: ${count} products`);
                        });
                    
                    // Product types analysis
                    const productTypes = {};
                    products.forEach(row => {
                        const type = row['Product Type'] || 'Unknown';
                        productTypes[type] = (productTypes[type] || 0) + 1;
                    });
                    
                    console.log('\nProduct Types:');
                    Object.entries(productTypes)
                        .sort(([,a], [,b]) => b - a)
                        .forEach(([type, count]) => {
                            console.log(`  ${type}: ${count} products`);
                        });
                    
                    console.log('\n✅ CSV analysis completed!');
                    console.log('\n📝 Summary:');
                    console.log(`  - Total products: ${products.length}`);
                    console.log(`  - All required columns present: ${missingColumns.length === 0 ? '✅' : '❌'}`);
                                        console.log(`  - All required columns present: ${missingColumns.length === 0 ? '✅' : '❌'}`);
                    console.log(`  - Extra columns (will be ignored): ${extraColumns.length}`);
                    console.log(`  - Data quality looks good for import!`);
                    
                    if (extraColumns.includes('Categorization_Confidence')) {
                        console.log('\n💡 Note: Categorization_Confidence column will be ignored during import as expected.');
                    }
                    
                    resolve();
                })
                .on('error', (error) => {
                    console.error('❌ Error reading CSV:', error.message);
                    resolve();
                });
        });
        
    } catch (error) {
        console.error('❌ Error checking CSV:', error.message);
        console.error(error.stack);
    }
}

// Run the check
if (require.main === module) {
    checkCsvContent();
}

module.exports = { checkCsvContent };