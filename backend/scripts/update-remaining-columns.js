const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Function to find CSV file in multiple locations
function findCSVFile() {
    const possiblePaths = [
        'new_final_corrected_matchcare_data.csv',
        'data/csv/new_final_corrected_matchcare_data.csv',
        '../new_final_corrected_matchcare_data.csv',
        '../../new_final_corrected_matchcare_data.csv',
        '../../../new_final_corrected_matchcare_data.csv',
        path.join(process.cwd(), 'new_final_corrected_matchcare_data.csv'),
        path.join(process.cwd(), '..', 'data', 'csv', 'new_final_corrected_matchcare_data.csv'),
        path.join(process.cwd(), '..', 'new_final_corrected_matchcare_data.csv'),
        path.join(process.cwd(), '..', '..', 'new_final_corrected_matchcare_data.csv'),
    ];
    
    console.log('🔍 Searching for CSV file in multiple locations...');
    
    for (const csvPath of possiblePaths) {
        const fullPath = path.resolve(csvPath);
        console.log(`   Checking: ${fullPath}`);
        
        if (fs.existsSync(fullPath)) {
            console.log(`✅ Found CSV file: ${fullPath}`);
            return fullPath;
        }
    }
    
    return null;
}

async function updateRemainingColumns() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🔄 Starting safe update of remaining columns...\n');
        
        // 1. Find CSV file
        const csvFilePath = findCSVFile();
        if (!csvFilePath) {
            throw new Error('CSV file not found in any expected location. Please ensure new_final_corrected_matchcare_data.csv exists.');
        }
        
        // 2. Check current table structure
        console.log('📋 Checking current table structure...');
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'products' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        const existingColumns = columns.rows.map(row => row.column_name);
        console.log('Current columns:', existingColumns.join(', '));
        
        // 3. Check if missing columns exist, if not add them
        const requiredColumns = [
            { name: 'main_category', type: 'VARCHAR(100)' },
            { name: 'subcategory', type: 'VARCHAR(100)' },
            { name: 'key_ingredients_csv', type: 'TEXT' },
            { name: 'image_urls', type: 'TEXT' },
            { name: 'local_image_path', type: 'VARCHAR(255)' },
            { name: 'product_url', type: 'VARCHAR(500)' },
            { name: 'bpom_number', type: 'VARCHAR(100)' }
        ];
        
        console.log('\n🔧 Checking and adding missing columns...');
        for (const column of requiredColumns) {
            if (!existingColumns.includes(column.name)) {
                console.log(`➕ Adding column: ${column.name}`);
                await client.query(`
                    ALTER TABLE products 
                    ADD COLUMN ${column.name} ${column.type}
                `);
                console.log(`✅ Added ${column.name}`);
            } else {
                console.log(`⏭️  Column ${column.name} already exists`);
            }
        }
        
        // 4. Read and process CSV data
        console.log(`\n📂 Reading CSV data from: ${csvFilePath}`);
        const csvData = [];
        
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (row) => {
                    // Debug: Show first few rows to understand CSV structure
                    if (csvData.length < 3) {
                        console.log(`Row ${csvData.length + 1} columns:`, Object.keys(row));
                        console.log(`Sample data:`, {
                            'Product Name': row['Product Name'],
                            'Brand': row['Brand'],
                            'Main_Category': row['Main_Category'],
                            'Subcategory': row['Subcategory']
                        });
                    }
                    
                    // Check for required fields
                    if (row['Product Name'] && row['Product Name'].trim() && 
                        row['Brand'] && row['Brand'].trim()) {
                        csvData.push({
                            productName: row['Product Name'].trim(),
                            brand: row['Brand'].trim(),
                            mainCategory: row['Main_Category'] || '',
                            subcategory: row['Subcategory'] || '',
                            keyIngredients: row['Key_Ingredients'] || '',
                            imageUrls: row['Image URLs'] || '',
                            localImagePath: row['Local Image Path'] || '',
                            productUrl: row['Product URL'] || '',
                            bpomNumber: row['BPOM Number'] || ''
                        });
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });
        
        console.log(`✅ CSV data loaded: ${csvData.length} records`);
        
        if (csvData.length === 0) {
            throw new Error('No valid data found in CSV file. Check CSV format and column names.');
        }
        
        // 5. Get existing products from database
        console.log('\n🔍 Getting existing products from database...');
        const existingProducts = await client.query(`
            SELECT p.id, p.name, p.brand_id, 
                   b.name as brand_name,
                   p.main_category, p.subcategory, p.key_ingredients_csv
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.name IS NOT NULL AND p.name != ''
        `);
        
        console.log(`📊 Found ${existingProducts.rows.length} existing products`);
        
        // 6. Create mapping and update strategy
        console.log('\n🎯 Mapping CSV data to existing products...');
        
        let matchedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const csvRow of csvData) {
            // Find matching product based on name and brand
            const matchingProduct = existingProducts.rows.find(product => {
                const productNameMatch = product.name.toLowerCase().trim() === 
                                       csvRow.productName.toLowerCase().trim();
                const brandNameMatch = product.brand_name && 
                                     product.brand_name.toLowerCase().trim() === 
                                     csvRow.brand.toLowerCase().trim();
                return productNameMatch && brandNameMatch;
            });
            
            if (matchingProduct) {
                matchedCount++;
                
                // Check if columns are already filled (skip if already has data)
                const hasExistingData = matchingProduct.main_category || 
                                       matchingProduct.subcategory || 
                                       matchingProduct.key_ingredients_csv;
                
                if (!hasExistingData) {
                    // Update only if columns are still empty
                    try {
                        await client.query(`
                            UPDATE products 
                            SET 
                                main_category = COALESCE(NULLIF($2, ''), main_category),
                                subcategory = COALESCE(NULLIF($3, ''), subcategory),
                                key_ingredients_csv = COALESCE(NULLIF($4, ''), key_ingredients_csv),
                                image_urls = COALESCE(NULLIF($5, ''), image_urls),
                                local_image_path = COALESCE(NULLIF($6, ''), local_image_path),
                                product_url = COALESCE(NULLIF($7, ''), product_url),
                                bpom_number = COALESCE(NULLIF($8, ''), bpom_number),
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                        `, [
                            matchingProduct.id,
                            csvRow.mainCategory,
                            csvRow.subcategory,
                            csvRow.keyIngredients,
                            csvRow.imageUrls,
                            csvRow.localImagePath,
                            csvRow.productUrl,
                            csvRow.bpomNumber
                        ]);
                        
                        updatedCount++;
                        
                        if (updatedCount % 100 === 0) {
                            console.log(`📈 Updated ${updatedCount} products...`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ Error updating product ${matchingProduct.id}:`, error.message);
                    }
                } else {
                    skippedCount++;
                }
            }
        }
        
        // 7. Create indexes for new columns
        console.log('\n📊 Creating indexes for better performance...');
        const indexQueries = [
            'CREATE INDEX IF NOT EXISTS idx_products_main_category ON products(main_category)',
            'CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory)',
            'CREATE INDEX IF NOT EXISTS idx_products_product_url ON products(product_url)',
            'CREATE INDEX IF NOT EXISTS idx_products_bpom_number ON products(bpom_number)'
        ];
        
        for (const indexQuery of indexQueries) {
            try {
                await client.query(indexQuery);
                console.log(`✅ Index created`);
            } catch (error) {
                console.log(`⚠️  Index already exists: ${error.message}`);
            }
        }
        
        // 8. Verify results
        console.log('\n🔍 Verifying update results...');
        const verificationQuery = await client.query(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(main_category) as has_main_category,
                COUNT(subcategory) as has_subcategory,
                COUNT(key_ingredients_csv) as has_key_ingredients,
                COUNT(product_url) as has_product_url,
                COUNT(bpom_number) as has_bpom_number
            FROM products
        `);
        
        console.table(verificationQuery.rows[0]);
        
        await client.query('COMMIT');
        
        console.log('\n✅ Update completed successfully!');
        console.log('═'.repeat(50));
        console.log(`📊 SUMMARY:`);
        console.log(`   - CSV records processed: ${csvData.length}`);
        console.log(`   - Products matched: ${matchedCount}`);
        console.log(`   - Products updated: ${updatedCount}`);
        console.log(`   - Products skipped (already had data): ${skippedCount}`);
        console.log(`   - Database products: ${existingProducts.rows.length}`);
        
        // 9. Show sample of updated data
        const sampleData = await client.query(`
            SELECT p.id, p.name, p.main_category, p.subcategory, p.key_ingredients_csv
            FROM products p
            WHERE p.main_category IS NOT NULL 
            LIMIT 5
        `);
        
        console.log('\n🧪 Sample updated products:');
        console.table(sampleData.rows);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error during update:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Enhanced safety check function
async function safetyCheck() {
    console.log('🛡️  Performing safety checks before update...\n');
    
    try {
        // Check if CSV file exists
        const csvFilePath = findCSVFile();
        if (!csvFilePath) {
            console.error('❌ CSV file not found in any expected location!');
            console.log('\n📍 Expected locations checked:');
            console.log('   - ./new_final_corrected_matchcare_data.csv');
            console.log('   - ../new_final_corrected_matchcare_data.csv');
            console.log('   - ../../new_final_corrected_matchcare_data.csv');
            console.log('\n💡 Solutions:');
            console.log('   1. Copy CSV file to current directory:');
            console.log('      cp /path/to/new_final_corrected_matchcare_data.csv .');
            console.log('   2. Or run script from directory containing CSV file');
            return false;
        }
        
        console.log(`✅ CSV file found: ${csvFilePath}`);
        
        // Check database connection
        const client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) FROM products');
        console.log(`✅ Database connected. Found ${result.rows[0].count} products`);
        client.release();
        
        // Check if products table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'products'
            )
        `);
        
        if (!tableCheck.rows[0].exists) {
            throw new Error('Products table does not exist');
        }
        
        console.log('✅ All safety checks passed!\n');
        return true;
        
    } catch (error) {
        console.error('❌ Safety check failed:', error.message);
        return false;
    }
}

// Main execution
async function main() {
    try {
        console.log('🚀 MatchCare Database Update - Remaining Columns\n');
        
        // Perform safety checks first
        const isSafe = await safetyCheck();
        if (!isSafe) {
            console.log('❌ Aborting due to safety check failures');
            process.exit(1);
        }
        
        // Create backup recommendation
        console.log('💡 RECOMMENDATION: Create a database backup before proceeding');
        console.log('   Command: pg_dump your_database > backup_before_update.sql\n');
        
        // Proceed with update
        await updateRemainingColumns();
        
        console.log('\n🎉 All operations completed successfully!');
        
    } catch (error) {
        console.error('❌ Operation failed:', error.message);
        console.error('\n🔧 Troubleshooting tips:');
        console.error('1. Check your database connection settings in .env');
        console.error('2. Ensure CSV file is in the correct location');
        console.error('3. Verify database permissions');
        console.error('4. Check if there are any foreign key constraints');
        
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { updateRemainingColumns, safetyCheck };