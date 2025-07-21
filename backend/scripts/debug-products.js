// backend/scripts/debug-products.js
// Debug untuk products CSV parsing

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

class ProductsDebugger {
    constructor() {
        this.dataPath = path.join(__dirname, '../data/csv/');
    }

    getFilePath(filename) {
        return path.join(this.dataPath, filename);
    }

    async debugProductsParsing() {
        console.log('🔍 PRODUCTS PARSING DEBUG\n');
        
        const filePath = this.getFilePath('new_final_corrected_matchcare_data.csv');
        const products = [];
        let rowCount = 0;
        
        console.log(`📁 File path: ${filePath}`);
        console.log(`📄 File exists: ${fs.existsSync(filePath)}\n`);
        
        if (!fs.existsSync(filePath)) {
            console.log('❌ Products CSV file not found!');
            return;
        }
        
        return new Promise((resolve) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('headers', (headers) => {
                    console.log('📋 Headers detected:');
                    headers.forEach((header, index) => {
                        console.log(`  ${index}: "${header}"`);
                    });
                    console.log(`\n📊 Total columns: ${headers.length}`);
                    
                    // Check for expected columns
                    const expectedColumns = [
                        'Product URL', 'Product Name', 'Brand', 'Product Type',
                        'Description', 'How to Use', 'IngredientList', 'Image URLs',
                        'Local Image Path', 'BPOM Number', 'Key_Ingredients',
                        'alcohol_free', 'fragrance_free', 'paraben_free',
                        'sulfate_free', 'silicone_free', 'Main_Category', 'Subcategory'
                    ];
                    
                    console.log('\n🔍 Column mapping check:');
                    expectedColumns.forEach(expected => {
                        const found = headers.find(h => h.trim() === expected);
                        console.log(`  ${expected}: ${found ? '✅ Found' : '❌ Missing'}`);
                    });
                    console.log();
                })
                .on('data', (row) => {
                    rowCount++;
                    
                    if (rowCount <= 3) {
                        console.log(`\n🔍 ROW ${rowCount} ANALYSIS:`);
                        console.log('- Object keys:', Object.keys(row));
                        console.log('- Object keys count:', Object.keys(row).length);
                        
                        // Test access methods for key columns
                        console.log('\n🧪 Testing column access:');
                        console.log('- row["Product Name"]:', JSON.stringify(row['Product Name']));
                        console.log('- row["Brand"]:', JSON.stringify(row['Brand']));
                        console.log('- row["Product Type"]:', JSON.stringify(row['Product Type']));
                        console.log('- row["Main_Category"]:', JSON.stringify(row['Main_Category']));
                        
                        // Check if values exist but with different key names
                        console.log('\n🔎 Alternative access attempts:');
                        const keys = Object.keys(row);
                        const productNameKey = keys.find(k => k.toLowerCase().includes('product') && k.toLowerCase().includes('name'));
                        const brandKey = keys.find(k => k.toLowerCase().includes('brand'));
                        
                        if (productNameKey) {
                            console.log(`- Found product name via "${productNameKey}":`, JSON.stringify(row[productNameKey]));
                        }
                        if (brandKey) {
                            console.log(`- Found brand via "${brandKey}":`, JSON.stringify(row[brandKey]));
                        }
                        
                        // Show first few values regardless of key names
                        console.log('\n📊 First 5 values (regardless of keys):');
                        Object.keys(row).slice(0, 5).forEach((key, index) => {
                            console.log(`  ${index}: "${key}" = "${row[key]}"`);
                        });
                    }
                    
                    // Test the exact condition from import script
                    const hasProductName = !!(row['Product Name'] && row['Product Name'].trim());
                    const hasBrand = !!(row['Brand'] && row['Brand'].trim());
                    
                    if (rowCount <= 3) {
                        console.log('\n✅ Import condition tests:');
                        console.log('- row["Product Name"] exists:', hasProductName);
                        console.log('- row["Brand"] exists:', hasBrand);
                        console.log('- Both conditions met:', hasProductName && hasBrand);
                    }
                    
                    if (hasProductName && hasBrand) {
                        products.push({
                            name: row['Product Name'].trim(),
                            brand: row['Brand'].trim()
                        });
                        
                        if (rowCount <= 3) {
                            console.log('✅ WOULD BE ADDED to products array');
                        }
                    } else {
                        if (rowCount <= 3) {
                            console.log('❌ WOULD NOT BE ADDED - condition failed');
                        }
                    }
                    
                    // Stop after checking first 3 rows for debug
                    if (rowCount >= 3) {
                        console.log('\n⏭️ Stopping debug after 3 rows...');
                    }
                })
                .on('end', () => {
                    console.log('\n📊 FINAL RESULTS:');
                    console.log('- Total rows processed:', rowCount);
                    console.log('- Products that would be imported:', products.length);
                    console.log('- First 3 products:', products.slice(0, 3));
                    
                    if (products.length === 0) {
                        console.log('\n🚨 PROBLEM IDENTIFIED: No products would be imported!');
                        console.log('Possible causes:');
                        console.log('1. Column name mismatch (similar to brands issue)');
                        console.log('2. Empty required fields (Product Name or Brand)');
                        console.log('3. CSV parsing issues');
                        console.log('4. Different column names than expected');
                        
                        console.log('\n💡 SOLUTIONS TO TRY:');
                        console.log('1. Use dynamic column mapping like we did for brands');
                        console.log('2. Check for alternative column names');
                        console.log('3. Handle BOM/encoding issues');
                    } else {
                        console.log('\n✅ SUCCESS: Products parsing works in debug!');
                    }
                    
                    resolve();
                })
                .on('error', (error) => {
                    console.error('❌ Error:', error.message);
                    resolve();
                });
        });
    }
}

// Run the debug
if (require.main === module) {
    const productsDebugger = new ProductsDebugger();
    
    productsDebugger.debugProductsParsing()
        .then(() => {
            console.log('\n✅ Products debug completed!');
            console.log('Now run: node scripts/import-data-fixed.js');
            process.exit(0);
        })
        .catch(error => {
            console.error('Debug failed:', error);
            process.exit(1);
        });
}

module.exports = ProductsDebugger;