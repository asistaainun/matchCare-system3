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

// Function to find CSV file
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

async function safeBatchUpdate() {
    console.log('🚀 Safe Batch Update - MatchCare Database\n');
    
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
        
        // 3. Check and add missing columns (without transaction)
        console.log('\n🔧 Checking table structure...');
        await ensureColumnsExist();
        
        // 4. Read CSV data
        console.log('\n📂 Reading CSV data...');
        const csvData = await readCSVData(csvFilePath);
        console.log(`✅ Loaded ${csvData.length} CSV records`);
        
        // 5. Get existing products
        console.log('\n🔍 Getting existing products...');
        const existingProducts = await getExistingProducts();
        console.log(`✅ Found ${existingProducts.length} database products`);
        
        // 6. Process updates in small batches (no transaction)
        console.log('\n🎯 Processing updates...');
        const results = await processUpdatesInBatches(csvData, existingProducts);
        
        // 7. Create indexes
        console.log('\n📊 Creating indexes...');
        await createIndexes();
        
        // 8. Show results
        console.log('\n✅ Update completed!');
        console.log('═'.repeat(50));
        console.log(`📊 RESULTS:`);
        console.log(`   - CSV records: ${csvData.length}`);
        console.log(`   - Matched products: ${results.matched}`);
        console.log(`   - Successful updates: ${results.updated}`);
        console.log(`   - Failed updates: ${results.failed}`);
        console.log(`   - Skipped (had data): ${results.skipped}`);
        
        // 9. Verify results
        await verifyResults();
        
    } catch (error) {
        console.error('❌ Operation failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

async function ensureColumnsExist() {
    const client = await pool.connect();
    try {
        const columns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'products' AND table_schema = 'public'
        `);
        
        const existingColumns = columns.rows.map(row => row.column_name);
        
        const requiredColumns = [
            { name: 'main_category', type: 'VARCHAR(100)' },
            { name: 'subcategory', type: 'VARCHAR(100)' },
            { name: 'key_ingredients_csv', type: 'TEXT' },
            { name: 'image_urls', type: 'TEXT' },
            { name: 'local_image_path', type: 'VARCHAR(255)' },
            { name: 'product_url', type: 'VARCHAR(500)' },
            { name: 'bpom_number', type: 'VARCHAR(100)' }
        ];
        
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

async function processUpdatesInBatches(csvData, existingProducts) {
    let matched = 0;
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    console.log('Starting individual updates (no transaction)...');
    
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
                // Try to update this product individually
                const success = await updateSingleProduct(matchingProduct.id, csvRow);
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
        if ((i + 1) % 100 === 0) {
            console.log(`📈 Processed ${i + 1}/${csvData.length} records...`);
        }
    }
    
    return { matched, updated, failed, skipped };
}

async function updateSingleProduct(productId, csvRow) {
    const client = await pool.connect();
    
    try {
        // Individual update without transaction
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
            productId,
            csvRow.mainCategory,
            csvRow.subcategory,
            csvRow.keyIngredients,
            csvRow.imageUrls,
            csvRow.localImagePath,
            csvRow.productUrl,
            csvRow.bpomNumber
        ]);
        
        return true;
    } catch (error) {
        console.error(`❌ Failed to update product ${productId}:`, error.message);
        return false;
    } finally {
        client.release();
    }
}

async function createIndexes() {
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

async function verifyResults() {
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
        
        // Show sample data
        const sampleData = await client.query(`
            SELECT 
                p.id, 
                p.name, 
                p.main_category, 
                p.subcategory,
                CASE 
                    WHEN LENGTH(p.key_ingredients_csv) > 50 
                    THEN LEFT(p.key_ingredients_csv, 50) || '...'
                    ELSE p.key_ingredients_csv 
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
        } else {
            console.log('\n⚠️  LOW SUCCESS RATE: <50% of products updated');
            console.log('This might indicate name/brand matching issues');
        }
        
    } finally {
        client.release();
    }
}

// Run the script
if (require.main === module) {
    safeBatchUpdate()
        .then(() => {
            console.log('\n🎉 Script completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { safeBatchUpdate };