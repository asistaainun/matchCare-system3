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

function findCSVFile() {
    const possiblePaths = [
        'new_final_corrected_matchcare_data.csv',
        'data/csv/new_final_corrected_matchcare_data.csv',
        '../new_final_corrected_matchcare_data.csv',
        '../../new_final_corrected_matchcare_data.csv',
    ];
    
    for (const csvPath of possiblePaths) {
        const fullPath = path.resolve(csvPath);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }
    return null;
}

async function finalSafeUpdate() {
    console.log('🚀 Final Safe Update - MatchCare Database\n');
    
    try {
        // 1. Find CSV file
        const csvFilePath = findCSVFile();
        if (!csvFilePath) {
            throw new Error('CSV file not found');
        }
        console.log(`✅ Found CSV: ${csvFilePath}`);
        
        // 2. Test database connection
        const testClient = await pool.connect();
        const testResult = await testClient.query('SELECT COUNT(*) FROM products');
        console.log(`✅ Database connected: ${testResult.rows[0].count} products found`);
        testClient.release();
        
        // 3. Check and fix column types first
        console.log('\n🔧 Checking and fixing column types...');
        await checkAndFixColumnTypes();
        
        // 4. Read CSV data
        console.log('\n📂 Reading CSV data...');
        const csvData = await readCSVData(csvFilePath);
        console.log(`✅ Loaded ${csvData.length} CSV records`);
        
        // 5. Get existing products
        console.log('\n🔍 Getting existing products...');
        const existingProducts = await getExistingProducts();
        console.log(`✅ Found ${existingProducts.length} database products`);
        
        // 6. Process updates with safe SQL
        console.log('\n🎯 Processing updates with safe queries...');
        const results = await processUpdatesWithSafeSQL(csvData, existingProducts);
        
        // 7. Create indexes
        console.log('\n📊 Creating indexes...');
        await createIndexesSafely();
        
        // 8. Show results
        console.log('\n✅ Update completed!');
        console.log('═'.repeat(50));
        console.log(`📊 RESULTS:`);
        console.log(`   - CSV records: ${csvData.length}`);
        console.log(`   - Matched products: ${results.matched}`);
        console.log(`   - Successful updates: ${results.updated}`);
        console.log(`   - Failed updates: ${results.failed}`);
        console.log(`   - Skipped (had data): ${results.skipped}`);
        
        // 9. Verify results safely
        await verifyResultsSafely();
        
    } catch (error) {
        console.error('❌ Operation failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

async function checkAndFixColumnTypes() {
    const client = await pool.connect();
    
    try {
        // Check current types
        const columnTypes = await client.query(`
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns 
            WHERE table_name = 'products' AND table_schema = 'public'
            AND column_name IN (
                'main_category', 'subcategory', 'key_ingredients_csv', 
                'image_urls', 'local_image_path', 'product_url', 'bpom_number'
            )
        `);
        
        console.log('   Current column types:');
        columnTypes.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} (${row.udt_name})`);
        });
        
        // Check for array types that need fixing
        const arrayColumns = columnTypes.rows.filter(col => 
            col.data_type === 'ARRAY' || col.udt_name.includes('_')
        );
        
        if (arrayColumns.length > 0) {
            console.log('   ⚠️  Found array columns, recommend running fix-column-types.js first');
            console.log('   Continuing with safe update method...');
        }
        
        // Ensure required columns exist
        const requiredColumns = [
            { name: 'main_category', type: 'VARCHAR(100)' },
            { name: 'subcategory', type: 'VARCHAR(100)' },
            { name: 'key_ingredients_csv', type: 'TEXT' },
            { name: 'image_urls', type: 'TEXT' },
            { name: 'local_image_path', type: 'VARCHAR(255)' },
            { name: 'product_url', type: 'VARCHAR(500)' },
            { name: 'bpom_number', type: 'VARCHAR(100)' }
        ];
        
        const existingColumnNames = columnTypes.rows.map(row => row.column_name);
        
        for (const column of requiredColumns) {
            if (!existingColumnNames.includes(column.name)) {
                console.log(`   ➕ Adding missing column: ${column.name}`);
                await client.query(`
                    ALTER TABLE products 
                    ADD COLUMN ${column.name} ${column.type}
                `);
                console.log(`   ✅ Added ${column.name}`);
            }
        }
        
    } finally {
        client.release();
    }
}

async function readCSVData(csvFilePath) {
    return new Promise((resolve, reject) => {
        const csvData = [];
        
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
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
            .on('end', () => resolve(csvData))
            .on('error', reject);
    });
}

async function getExistingProducts() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                p.id, 
                p.name, 
                p.brand_id, 
                b.name as brand_name,
                p.main_category, 
                p.subcategory, 
                p.key_ingredients_csv
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.name IS NOT NULL AND p.name != ''
        `);
        return result.rows;
    } finally {
        client.release();
    }
}

async function processUpdatesWithSafeSQL(csvData, existingProducts) {
    let matched = 0;
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    console.log('Starting safe updates (without COALESCE)...');
    
    for (let i = 0; i < csvData.length; i++) {
        const csvRow = csvData[i];
        
        // Find matching product
        const matchingProduct = existingProducts.find(product => {
            const productNameMatch = product.name.toLowerCase().trim() === 
                                   csvRow.productName.toLowerCase().trim();
            const brandNameMatch = product.brand_name && 
                                 product.brand_name.toLowerCase().trim() === 
                                 csvRow.brand.toLowerCase().trim();
            return productNameMatch && brandNameMatch;
        });
        
        if (matchingProduct) {
            matched++;
            
            // Check if already has data
            const hasExistingData = matchingProduct.main_category || 
                                   matchingProduct.subcategory || 
                                   matchingProduct.key_ingredients_csv;
            
            if (!hasExistingData) {
                // Try to update this product with safe SQL
                const success = await updateSingleProductSafely(matchingProduct.id, csvRow);
                if (success) {
                    updated++;
                } else {
                    failed++;
                }
            } else {
                skipped++;
            }
        }
        
        // Progress reporting
        if ((i + 1) % 500 === 0) {
            console.log(`📈 Processed ${i + 1}/${csvData.length} records... (Updated: ${updated}, Failed: ${failed})`);
        }
    }
    
    return { matched, updated, failed, skipped };
}

async function updateSingleProductSafely(productId, csvRow) {
    const client = await pool.connect();
    
    try {
        // Use simple UPDATE without COALESCE to avoid type conflicts
        await client.query(`
            UPDATE products 
            SET 
                main_category = CASE 
                    WHEN main_category IS NULL OR main_category = '' 
                    THEN $2 
                    ELSE main_category 
                END,
                subcategory = CASE 
                    WHEN subcategory IS NULL OR subcategory = '' 
                    THEN $3 
                    ELSE subcategory 
                END,
                key_ingredients_csv = CASE 
                    WHEN key_ingredients_csv IS NULL OR key_ingredients_csv = '' 
                    THEN $4 
                    ELSE key_ingredients_csv 
                END,
                image_urls = CASE 
                    WHEN image_urls IS NULL OR image_urls = '' 
                    THEN $5 
                    ELSE image_urls 
                END,
                local_image_path = CASE 
                    WHEN local_image_path IS NULL OR local_image_path = '' 
                    THEN $6 
                    ELSE local_image_path 
                END,
                product_url = CASE 
                    WHEN product_url IS NULL OR product_url = '' 
                    THEN $7 
                    ELSE product_url 
                END,
                bpom_number = CASE 
                    WHEN bpom_number IS NULL OR bpom_number = '' 
                    THEN $8 
                    ELSE bpom_number 
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [
            productId,
            csvRow.mainCategory || null,
            csvRow.subcategory || null,
            csvRow.keyIngredients || null,
            csvRow.imageUrls || null,
            csvRow.localImagePath || null,
            csvRow.productUrl || null,
            csvRow.bpomNumber || null
        ]);
        
        return true;
    } catch (error) {
        // Only log first few errors to avoid spam
        if (error.message.includes('text and text[]')) {
            console.error(`❌ Type mismatch for product ${productId} - run fix-column-types.js first`);
        } else {
            console.error(`❌ Failed to update product ${productId}:`, error.message);
        }
        return false;
    } finally {
        client.release();
    }
}

async function createIndexesSafely() {
    const client = await pool.connect();
    
    const indexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_products_main_category ON products(main_category)',
        'CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory)',
        'CREATE INDEX IF NOT EXISTS idx_products_product_url ON products(product_url)',
        'CREATE INDEX IF NOT EXISTS idx_products_bpom_number ON products(bpom_number)'
    ];
    
    try {
        for (const indexQuery of indexQueries) {
            try {
                await client.query(indexQuery);
                console.log(`✅ Index created successfully`);
            } catch (error) {
                console.log(`⚠️  Index creation skipped: ${error.message}`);
            }
        }
    } finally {
        client.release();
    }
}

async function verifyResultsSafely() {
    const client = await pool.connect();
    
    try {
        console.log('\n🔍 Verification Results:');
        
        const stats = await client.query(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(main_category) as has_main_category,
                COUNT(subcategory) as has_subcategory,
                COUNT(key_ingredients_csv) as has_key_ingredients,
                COUNT(product_url) as has_product_url,
                COUNT(bpom_number) as has_bpom_number,
                ROUND(COUNT(main_category) * 100.0 / COUNT(*), 2) as main_category_percent
            FROM products
        `);
        
        const stat = stats.rows[0];
        console.table(stat);
        
        // Show sample data safely
        const sampleData = await client.query(`
            SELECT 
                p.id, 
                p.name, 
                p.main_category, 
                p.subcategory,
                CASE 
                    WHEN p.key_ingredients_csv IS NOT NULL 
                    THEN SUBSTRING(p.key_ingredients_csv::text, 1, 50) || '...'
                    ELSE NULL 
                END as key_ingredients_preview
            FROM products p
            WHERE p.main_category IS NOT NULL 
            ORDER BY p.id
            LIMIT 5
        `);
        
        if (sampleData.rows.length > 0) {
            console.log('\n🧪 Sample updated products:');
            console.table(sampleData.rows);
        }
        
        // Success rate
        const successRate = parseFloat(stat.main_category_percent);
        if (successRate >= 80) {
            console.log('\n🎉 EXCELLENT: >80% of products updated successfully!');
        } else if (successRate >= 50) {
            console.log('\n✅ GOOD: 50-80% of products updated successfully!');
        } else if (successRate > 0) {
            console.log('\n⚠️  PARTIAL SUCCESS: Some products updated');
            console.log('Consider running fix-column-types.js for better results');
        } else {
            console.log('\n❌ NO UPDATES: Likely data type issues');
            console.log('Run fix-column-types.js first, then try again');
        }
        
    } finally {
        client.release();
    }
}

// Run the script
if (require.main === module) {
    finalSafeUpdate()
        .then(() => {
            console.log('\n🎉 Script completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { finalSafeUpdate };