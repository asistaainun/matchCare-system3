const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function fixProductsTableStructure() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🔧 Fixing Products Table Structure...\n');
        
        // 1. Check existing columns
        const existingColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'products' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        const columnNames = existingColumns.rows.map(row => row.column_name);
        console.log('📋 Current columns:', columnNames.join(', '));
        
        // 2. Check if product_categories table exists
        const categoriesTableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'product_categories'
            )
        `);
        
        if (!categoriesTableExists.rows[0].exists) {
            console.log('📦 Creating product_categories table first...');
            await client.query(`
                CREATE TABLE product_categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    ontology_uri VARCHAR(255),
                    parent_id INTEGER REFERENCES product_categories(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ product_categories table created');
        }
        
        // 3. Add missing columns to products table
        const columnsToAdd = [
            {
                name: 'main_category',
                definition: 'VARCHAR(100)',
                description: 'Main category as string'
            },
            {
                name: 'subcategory',
                definition: 'VARCHAR(100)',
                description: 'Subcategory as string'
            },
            {
                name: 'main_category_id',
                definition: 'INTEGER REFERENCES product_categories(id)',
                description: 'Foreign key to main category'
            },
            {
                name: 'subcategory_id',
                definition: 'INTEGER REFERENCES product_categories(id)',
                description: 'Foreign key to subcategory'
            }
        ];
        
        for (const column of columnsToAdd) {
            if (!columnNames.includes(column.name)) {
                console.log(`➕ Adding column: ${column.name} (${column.description})`);
                
                try {
                    await client.query(`
                        ALTER TABLE products 
                        ADD COLUMN ${column.name} ${column.definition}
                    `);
                    console.log(`✅ Added ${column.name}`);
                } catch (error) {
                    console.error(`❌ Error adding ${column.name}:`, error.message);
                }
            } else {
                console.log(`⏭️  Column ${column.name} already exists`);
            }
        }
        
        // 4. Create indexes for new columns
        console.log('\n📊 Creating indexes for new columns...');
        
        const indexesToCreate = [
            'CREATE INDEX IF NOT EXISTS idx_products_main_category_string ON products(main_category)',
            'CREATE INDEX IF NOT EXISTS idx_products_subcategory_string ON products(subcategory)',
            'CREATE INDEX IF NOT EXISTS idx_products_main_category_id ON products(main_category_id)',
            'CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id)'
        ];
        
        for (const indexQuery of indexesToCreate) {
            try {
                await client.query(indexQuery);
                console.log(`✅ Index created: ${indexQuery.split(' ')[5]}`);
            } catch (error) {
                console.log(`⚠️  Index might already exist: ${error.message}`);
            }
        }
        
        // 5. Populate main_category and subcategory from existing data if available
        console.log('\n🔄 Checking if we can populate category data from CSV...');
        
        // Check if we have any products with empty categories
        const productsWithoutCategories = await client.query(`
            SELECT COUNT(*) as count 
            FROM products 
            WHERE main_category IS NULL OR main_category = ''
        `);
        
        console.log(`📊 Products without categories: ${productsWithoutCategories.rows[0].count}`);
        
        if (productsWithoutCategories.rows[0].count > 0) {
            console.log('💡 You may need to run the CSV import again to populate category data');
            console.log('   Or manually update categories based on your CSV data');
        }
        
        // 6. Verify final structure
        console.log('\n🔍 Verifying final table structure...');
        
        const finalColumns = await client.query(`
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'products' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Final Products Table Structure:');
        console.table(finalColumns.rows);
        
        await client.query('COMMIT');
        console.log('\n✅ Products table structure fixed successfully!');
        
        // 7. Show sample data
        const sampleData = await client.query(`
            SELECT 
                id, name, brand, main_category, subcategory, 
                main_category_id, subcategory_id
            FROM products 
            LIMIT 5
        `);
        
        console.log('\n🧪 Sample data:');
        console.table(sampleData.rows);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error fixing table structure:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the fix
if (require.main === module) {
    fixProductsTableStructure()
        .then(() => {
            console.log('\n🎉 Table structure fix completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fix failed:', error.message);
            process.exit(1);
        });
}

module.exports = { fixProductsTableStructure };