// backend/scripts/fix-timestamps.js
// Fix existing data to include proper timestamps

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: 'postgres',
    database: 'matchcare_fresh_db',
    password: '90226628',
    host: 'localhost',
    port: 5432
});

async function fixTimestamps() {
    console.log('🔧 Fixing database timestamps...\n');
    
    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected');

        // Check current schema
        console.log('\n📊 Checking current table schemas...');
        
        const tables = ['brands', 'products', 'ingredients'];
        
        for (const tableName of tables) {
            const result = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [tableName]);
            
            console.log(`\n📋 ${tableName} columns:`);
            result.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
            });
            
            // Check if timestamps exist
            const hasCreatedAt = result.rows.some(col => col.column_name === 'created_at');
            const hasUpdatedAt = result.rows.some(col => col.column_name === 'updated_at');
            
            console.log(`  ✅ Has created_at: ${hasCreatedAt}`);
            console.log(`  ✅ Has updated_at: ${hasUpdatedAt}`);
            
            // Add timestamps if they don't exist
            if (!hasCreatedAt) {
                console.log(`🔧 Adding created_at to ${tableName}...`);
                await pool.query(`
                    ALTER TABLE ${tableName} 
                    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                `);
                
                // Update existing records
                await pool.query(`
                    UPDATE ${tableName} 
                    SET created_at = CURRENT_TIMESTAMP 
                    WHERE created_at IS NULL
                `);
                console.log(`✅ Added created_at to ${tableName}`);
            }
            
            if (!hasUpdatedAt) {
                console.log(`🔧 Adding updated_at to ${tableName}...`);
                await pool.query(`
                    ALTER TABLE ${tableName} 
                    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                `);
                
                // Update existing records
                await pool.query(`
                    UPDATE ${tableName} 
                    SET updated_at = CURRENT_TIMESTAMP 
                    WHERE updated_at IS NULL
                `);
                console.log(`✅ Added updated_at to ${tableName}`);
            }
        }

        // Special handling for product_ingredients table
        console.log('\n🔧 Checking product_ingredients table...');
        const piResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'product_ingredients' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        const hasCreatedAt = piResult.rows.some(col => col.column_name === 'created_at');
        
        if (!hasCreatedAt) {
            console.log('🔧 Adding created_at to product_ingredients...');
            await pool.query(`
                ALTER TABLE product_ingredients 
                ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            `);
            
            await pool.query(`
                UPDATE product_ingredients 
                SET created_at = CURRENT_TIMESTAMP 
                WHERE created_at IS NULL
            `);
            console.log('✅ Added created_at to product_ingredients');
        }

        // Verify all timestamps are set
        console.log('\n🔍 Verifying timestamps...');
        
        for (const tableName of [...tables, 'product_ingredients']) {
            const nullCheck = await pool.query(`
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(created_at) as has_created_at,
                    COUNT(updated_at) as has_updated_at
                FROM ${tableName}
            `);
            
            const stats = nullCheck.rows[0];
            console.log(`📊 ${tableName}:`);
            console.log(`  - Total records: ${stats.total_records}`);
            console.log(`  - Has created_at: ${stats.has_created_at}`);
            if (stats.has_updated_at !== undefined) {
                console.log(`  - Has updated_at: ${stats.has_updated_at}`);
            }
            
            if (stats.total_records === stats.has_created_at) {
                console.log(`  ✅ All records have created_at`);
            } else {
                console.log(`  ❌ ${stats.total_records - stats.has_created_at} records missing created_at`);
            }
        }

        console.log('\n✅ Timestamp fix completed successfully!');
        console.log('🎉 You can now start the server with: npm start');
        
    } catch (error) {
        console.error('❌ Error fixing timestamps:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

// Run the fix
if (require.main === module) {
    fixTimestamps()
        .then(() => {
            console.log('\n✅ Fix completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fix failed:', error);
            process.exit(1);
        });
}

module.exports = fixTimestamps;