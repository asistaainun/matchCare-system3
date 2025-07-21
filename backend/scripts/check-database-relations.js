
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function checkDatabaseRelations() {
    try {
        console.log('🔍 Checking Database Relations & Structure\n');
        
        // 1. Check all tables
        console.log('📋 Available Tables:');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        tables.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        
        // 2. Check products table structure
        console.log('\n📦 Products Table Structure:');
        const productColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'products'
            ORDER BY ordinal_position
        `);
        
        productColumns.rows.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // 3. Check if product_categories table exists
        const categoryTableExists = tables.rows.find(table => 
            table.table_name === 'product_categories'
        );
        
        if (categoryTableExists) {
            console.log('\n✅ Product Categories Table Found:');
            
            const categoryColumns = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'product_categories'
                ORDER BY ordinal_position
            `);
            
            categoryColumns.rows.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });
            
            // Check sample data
            const sampleCategories = await pool.query(`
                SELECT id, name, parent_id FROM product_categories LIMIT 10
            `);
            
            console.log('\n📂 Sample Categories:');
            sampleCategories.rows.forEach(cat => {
                console.log(`   ${cat.id}. ${cat.name} ${cat.parent_id ? `(parent: ${cat.parent_id})` : '(main category)'}`);
            });
            
        } else {
            console.log('\n❌ Product Categories Table NOT FOUND');
        }
        
        // 4. Check foreign key constraints
        console.log('\n🔗 Foreign Key Constraints on Products Table:');
        const foreignKeys = await pool.query(`
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'products'
        `);
        
        if (foreignKeys.rows.length > 0) {
            foreignKeys.rows.forEach(fk => {
                console.log(`   - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
        } else {
            console.log('   No foreign key constraints found');
        }
        
        // 5. Check current data inconsistency
        console.log('\n📊 Current Data Analysis:');
        
        const productCount = await pool.query('SELECT COUNT(*) FROM products');
        console.log(`   Total products: ${productCount.rows[0].count}`);
        
        // Check string-based categories
        const stringCategories = await pool.query(`
            SELECT main_category, COUNT(*) as count
            FROM products 
            WHERE main_category IS NOT NULL
            GROUP BY main_category
            ORDER BY count DESC
            LIMIT 10
        `);
        
        console.log('\n📂 Current String-based Categories:');
        stringCategories.rows.forEach(cat => {
            console.log(`   - ${cat.main_category}: ${cat.count} products`);
        });
        
        // Check if relational columns exist
        const hasRelationalColumns = productColumns.rows.some(col => 
            col.column_name === 'main_category_id' || col.column_name === 'subcategory_id'
        );
        
        console.log(`\n🔍 Relational category columns exist: ${hasRelationalColumns ? '✅ YES' : '❌ NO'}`);
        
        // 6. Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        
        if (!categoryTableExists) {
            console.log('   1. ❌ Create product_categories table');
            console.log('   2. ❌ Seed category data');
            console.log('   3. ❌ Add foreign key columns to products');
            console.log('   4. ❌ Migrate existing string data to relational');
        } else if (!hasRelationalColumns) {
            console.log('   1. ✅ Product_categories table exists');
            console.log('   2. ❌ Add main_category_id and subcategory_id to products');
            console.log('   3. ❌ Migrate existing string data to relational');
            console.log('   4. ❌ Update application code to use IDs');
        } else {
            console.log('   1. ✅ All tables and columns exist');
            console.log('   2. 🔄 Check if data migration is needed');
            console.log('   3. 🔄 Update application code if needed');
        }
        
    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        await pool.end();
    }
}

// Run the check
checkDatabaseRelations();