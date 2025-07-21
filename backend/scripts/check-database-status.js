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
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking Database Status...\n');
        
        // 1. Check if products table exists and its structure
        console.log('📋 Products Table Structure:');
        console.log('═'.repeat(50));
        
        const productsColumns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'products'
            ORDER BY ordinal_position
        `);
        
        if (productsColumns.rows.length === 0) {
            console.log('❌ Products table does not exist!');
            return;
        }
        
        productsColumns.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // 2. Check if product_categories table exists
        console.log('\n📋 Product Categories Table:');
        console.log('═'.repeat(50));
        
        const categoriesTableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'product_categories'
            )
        `);
        
        if (categoriesTableExists.rows[0].exists) {
            const categoriesCount = await client.query('SELECT COUNT(*) FROM product_categories');
            console.log(`✅ Product_categories table exists with ${categoriesCount.rows[0].count} categories`);
            
            // Show some categories
            const sampleCategories = await client.query(`
                SELECT name, parent_id FROM product_categories LIMIT 10
            `);
            console.log('Sample categories:');
            sampleCategories.rows.forEach(cat => {
                console.log(`  - ${cat.name} ${cat.parent_id ? '(subcategory)' : '(main category)'}`);
            });
        } else {
            console.log('❌ Product_categories table does not exist');
        }
        
        // 3. Check products data
        console.log('\n📊 Products Data Analysis:');
        console.log('═'.repeat(50));
        
        const productsStats = await client.query(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(main_category) as has_main_category_string,
                COUNT(subcategory) as has_subcategory_string,
                COUNT(main_category_id) as has_main_category_id,
                COUNT(subcategory_id) as has_subcategory_id
            FROM products
        `);
        
        const stats = productsStats.rows[0];
        console.log(`Total products: ${stats.total_products}`);
        console.log(`Products with main_category (string): ${stats.has_main_category_string}`);
        console.log(`Products with subcategory (string): ${stats.has_subcategory_string}`);
        console.log(`Products with main_category_id: ${stats.has_main_category_id || 0}`);
        console.log(`Products with subcategory_id: ${stats.has_subcategory_id || 0}`);
        
        // 4. Show unique categories from string columns
        if (parseInt(stats.has_main_category_string) > 0) {
            console.log('\n📋 Unique Main Categories (from string column):');
            const uniqueMainCategories = await client.query(`
                SELECT main_category, COUNT(*) as count
                FROM products 
                WHERE main_category IS NOT NULL 
                GROUP BY main_category 
                ORDER BY count DESC
            `);
            
            uniqueMainCategories.rows.forEach(cat => {
                console.log(`  - ${cat.main_category}: ${cat.count} products`);
            });
        }
        
        if (parseInt(stats.has_subcategory_string) > 0) {
            console.log('\n📋 Unique Subcategories (from string column):');
            const uniqueSubcategories = await client.query(`
                SELECT subcategory, COUNT(*) as count
                FROM products 
                WHERE subcategory IS NOT NULL 
                GROUP BY subcategory 
                ORDER BY count DESC
                LIMIT 15
            `);
            
            uniqueSubcategories.rows.forEach(cat => {
                console.log(`  - ${cat.subcategory}: ${cat.count} products`);
            });
        }
        
        // 5. Recommendations
        console.log('\n💡 Recommendations:');
        console.log('═'.repeat(50));
        
        if (!categoriesTableExists.rows[0].exists) {
            console.log('1. ❌ Need to create product_categories table');
            console.log('2. ❌ Need to add relational columns to products table');
            console.log('3. ❌ Need to migrate string data to relational structure');
        } else if (parseInt(stats.has_main_category_id) === 0) {
            console.log('1. ✅ Product_categories table exists');
            console.log('2. ❌ Need to migrate string data to relational IDs');
        } else {
            console.log('1. ✅ Product_categories table exists');
            console.log('2. ✅ Products have relational IDs');
            console.log('3. ✅ Database structure looks good');
        }
        
    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await checkDatabaseStatus();
    } catch (error) {
        console.error('❌ Script failed:', error);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = { checkDatabaseStatus };