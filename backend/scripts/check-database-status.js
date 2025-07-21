const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function checkDatabaseStatus() {
    console.log('🔍 Database Status Check\n');
    
    try {
        // 1. Test connection
        const client = await pool.connect();
        console.log('✅ Database connection successful');
        
        // 2. Check products table structure
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'products' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Products Table Columns:');
        const columnNames = columns.rows.map(row => row.column_name);
        columnNames.forEach(col => console.log(`   - ${col}`));
        
        // 3. Check data status
        const stats = await client.query(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(name) as has_name,
                COUNT(brand_id) as has_brand,
                COUNT(main_category) as has_main_category,
                COUNT(subcategory) as has_subcategory,
                COUNT(key_ingredients_csv) as has_key_ingredients,
                COUNT(product_url) as has_product_url,
                COUNT(bpom_number) as has_bpom_number
            FROM products
        `);
        
        console.log('\n📊 Data Population:');
        const stat = stats.rows[0];
        console.log(`   Total Products: ${stat.total_products}`);
        console.log(`   Has Name: ${stat.has_name}`);
        console.log(`   Has Brand: ${stat.has_brand}`);
        console.log(`   Has Main Category: ${stat.has_main_category}`);
        console.log(`   Has Subcategory: ${stat.has_subcategory}`);
        console.log(`   Has Key Ingredients: ${stat.has_key_ingredients}`);
        console.log(`   Has Product URL: ${stat.has_product_url}`);
        console.log(`   Has BPOM Number: ${stat.has_bpom_number}`);
        
        // 4. Check for required columns
        const requiredColumns = [
            'main_category', 'subcategory', 'key_ingredients_csv', 
            'image_urls', 'local_image_path', 'product_url', 'bpom_number'
        ];
        
        console.log('\n🔧 Required Columns Status:');
        requiredColumns.forEach(col => {
            const exists = columnNames.includes(col);
            console.log(`   ${exists ? '✅' : '❌'} ${col}`);
        });
        
        // 5. Sample data
        const sampleData = await client.query(`
            SELECT 
                id, name, main_category, subcategory
            FROM products 
            WHERE name IS NOT NULL
            LIMIT 3
        `);
        
        console.log('\n🧪 Sample Products:');
        if (sampleData.rows.length > 0) {
            console.table(sampleData.rows);
        } else {
            console.log('   No products found');
        }
        
        // 6. Recommendations
        console.log('\n💡 Recommendations:');
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length > 0) {
            console.log('   ❌ Some columns are missing - run safe-batch-update.js');
        } else if (parseInt(stat.has_main_category) === 0) {
            console.log('   ⚠️  Columns exist but no data - run safe-batch-update.js');
        } else {
            console.log('   ✅ Database looks good - update may have partially succeeded');
            console.log('   💡 You can run safe-batch-update.js to fill remaining gaps');
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    } finally {
        await pool.end();
    }
}

// Run the check
if (require.main === module) {
    checkDatabaseStatus()
        .then(() => {
            console.log('\n✅ Database check completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Check failed:', error.message);
            process.exit(1);
        });
}

module.exports = { checkDatabaseStatus };