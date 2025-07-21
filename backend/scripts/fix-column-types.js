const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function fixColumnTypes() {
    console.log('🔧 Fixing Column Data Types\n');
    
    try {
        // 1. Check current column types
        console.log('🔍 Checking current column data types...');
        const columnTypes = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                udt_name,
                is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'products' AND table_schema = 'public'
            AND column_name IN (
                'main_category', 'subcategory', 'key_ingredients_csv', 
                'image_urls', 'local_image_path', 'product_url', 'bpom_number'
            )
            ORDER BY column_name
        `);
        
        console.log('📋 Current Column Types:');
        console.table(columnTypes.rows);
        
        // 2. Identify problematic columns (arrays)
        const arrayColumns = columnTypes.rows.filter(col => 
            col.data_type === 'ARRAY' || col.udt_name.includes('_')
        );
        
        if (arrayColumns.length > 0) {
            console.log('\n⚠️  Found array columns that need fixing:');
            arrayColumns.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (${col.udt_name})`);
            });
            
            // 3. Fix each array column
            for (const col of arrayColumns) {
                await fixArrayColumn(col.column_name);
            }
        } else {
            console.log('\n✅ No array columns found - checking for other type issues...');
        }
        
        // 4. Ensure all target columns have correct types
        await ensureCorrectTypes();
        
        // 5. Verify the fix
        console.log('\n🔍 Verifying column types after fix...');
        const verifyTypes = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                udt_name
            FROM information_schema.columns 
            WHERE table_name = 'products' AND table_schema = 'public'
            AND column_name IN (
                'main_category', 'subcategory', 'key_ingredients_csv', 
                'image_urls', 'local_image_path', 'product_url', 'bpom_number'
            )
            ORDER BY column_name
        `);
        
        console.log('✅ Column Types After Fix:');
        console.table(verifyTypes.rows);
        
        console.log('\n🎉 Column type fixing completed!');
        console.log('✅ You can now run the update script again.');
        
    } catch (error) {
        console.error('❌ Error fixing column types:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

async function fixArrayColumn(columnName) {
    console.log(`\n🔧 Fixing array column: ${columnName}`);
    
    try {
        // Step 1: Check if column has data
        const dataCheck = await pool.query(`
            SELECT COUNT(*) as total, COUNT(${columnName}) as has_data
            FROM products 
            WHERE ${columnName} IS NOT NULL
        `);
        
        console.log(`   Data check: ${dataCheck.rows[0].has_data}/${dataCheck.rows[0].total} rows have data`);
        
        // Step 2: Create temporary column
        const tempColumnName = `${columnName}_temp`;
        console.log(`   Creating temporary column: ${tempColumnName}`);
        
        await pool.query(`
            ALTER TABLE products 
            ADD COLUMN ${tempColumnName} TEXT
        `);
        
        // Step 3: Convert array data to text (if any)
        if (parseInt(dataCheck.rows[0].has_data) > 0) {
            console.log(`   Converting array data to text...`);
            
            // Handle array conversion - join array elements with comma
            await pool.query(`
                UPDATE products 
                SET ${tempColumnName} = array_to_string(${columnName}, ', ')
                WHERE ${columnName} IS NOT NULL
            `);
            
            console.log(`   ✅ Converted array data to text`);
        }
        
        // Step 4: Drop original column
        console.log(`   Dropping original array column...`);
        await pool.query(`ALTER TABLE products DROP COLUMN ${columnName}`);
        
        // Step 5: Rename temp column to original name
        console.log(`   Renaming temporary column...`);
        await pool.query(`
            ALTER TABLE products 
            RENAME COLUMN ${tempColumnName} TO ${columnName}
        `);
        
        console.log(`   ✅ Fixed ${columnName} - converted from array to text`);
        
    } catch (error) {
        console.error(`   ❌ Error fixing ${columnName}:`, error.message);
        
        // Try to clean up temp column if it exists
        try {
            await pool.query(`ALTER TABLE products DROP COLUMN IF EXISTS ${columnName}_temp`);
        } catch (cleanupError) {
            // Ignore cleanup errors
        }
    }
}

async function ensureCorrectTypes() {
    console.log('\n🔧 Ensuring all columns have correct types...');
    
    const requiredColumns = [
        { name: 'main_category', type: 'VARCHAR(100)' },
        { name: 'subcategory', type: 'VARCHAR(100)' },
        { name: 'key_ingredients_csv', type: 'TEXT' },
        { name: 'image_urls', type: 'TEXT' },
        { name: 'local_image_path', type: 'VARCHAR(255)' },
        { name: 'product_url', type: 'VARCHAR(500)' },
        { name: 'bpom_number', type: 'VARCHAR(100)' }
    ];
    
    // Check which columns exist
    const existingColumns = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'products' AND table_schema = 'public'
    `);
    
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);
    
    // Add missing columns
    for (const column of requiredColumns) {
        if (!existingColumnNames.includes(column.name)) {
            console.log(`   ➕ Adding missing column: ${column.name}`);
            await pool.query(`
                ALTER TABLE products 
                ADD COLUMN ${column.name} ${column.type}
            `);
            console.log(`   ✅ Added ${column.name}`);
        } else {
            console.log(`   ✅ Column ${column.name} exists`);
        }
    }
}

// Alternative: Simple data type check script
async function checkDataTypes() {
    console.log('🔍 Checking All Column Data Types\n');
    
    try {
        const allColumns = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                udt_name,
                character_maximum_length,
                is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'products' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 All Products Table Columns:');
        console.table(allColumns.rows);
        
        // Highlight potential issues
        const problematicColumns = allColumns.rows.filter(col => 
            col.data_type === 'ARRAY' || 
            col.udt_name.includes('_') && col.data_type !== 'character varying'
        );
        
        if (problematicColumns.length > 0) {
            console.log('\n⚠️  Potentially Problematic Columns:');
            console.table(problematicColumns);
            
            console.log('\n💡 To fix these issues, run:');
            console.log('   node scripts/fix-column-types.js');
        } else {
            console.log('\n✅ No obvious data type issues found');
        }
        
    } catch (error) {
        console.error('❌ Error checking data types:', error.message);
    } finally {
        await pool.end();
    }
}

// Run based on command line argument
if (require.main === module) {
    const mode = process.argv[2] || 'fix';
    
    if (mode === 'check') {
        checkDataTypes()
            .then(() => {
                console.log('\n✅ Data type check completed');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Check failed:', error.message);
                process.exit(1);
            });
    } else {
        fixColumnTypes()
            .then(() => {
                console.log('\n✅ Column type fixing completed');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Fix failed:', error.message);
                process.exit(1);
            });
    }
}

module.exports = { fixColumnTypes, checkDataTypes };