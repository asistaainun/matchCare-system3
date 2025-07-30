// backend/scripts/urgent-database-diagnostic.js
// URGENT: Find out why hybrid engine returns 0 products

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function urgentDiagnostic() {
    console.log('🚨 URGENT: MatchCare Database Diagnostic');
    console.log('========================================\n');
    
    try {
        console.log('1️⃣ BASIC CONNECTION TEST');
        console.log('-'.repeat(30));
        
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        console.log(`📅 Server time: ${result.rows[0].now}`);
        
        console.log('\n2️⃣ PRODUCTS TABLE EXISTENCE TEST');
        console.log('-'.repeat(30));
        
        // Check if products table exists
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'products'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('❌ CRITICAL: products table does not exist!');
            console.log('💡 SOLUTION: Create products table and import CSV data');
            client.release();
            return;
        }
        
        console.log('✅ products table exists');
        
        console.log('\n3️⃣ PRODUCTS TABLE ROW COUNT');
        console.log('-'.repeat(30));
        
        const countResult = await client.query('SELECT COUNT(*) FROM products');
        const totalProducts = parseInt(countResult.rows[0].count);
        
        console.log(`📊 Total products in database: ${totalProducts}`);
        
        if (totalProducts === 0) {
            console.log('❌ CRITICAL: products table is EMPTY!');
            console.log('💡 SOLUTION: Import CSV data using data import scripts');
            
            // Check if CSV files exist
            const fs = require('fs');
            const path = require('path');
            
            const csvPath1 = path.join(__dirname, '../../new_final_corrected_matchcare_data.csv');
            const csvPath2 = path.join(__dirname, '../data/new_final_corrected_matchcare_data.csv');
            
            console.log('\n🔍 Checking for CSV files:');
            console.log(`   ${fs.existsSync(csvPath1) ? '✅' : '❌'} ${csvPath1}`);
            console.log(`   ${fs.existsSync(csvPath2) ? '✅' : '❌'} ${csvPath2}`);
            
            client.release();
            return;
        }
        
        console.log('\n4️⃣ PRODUCTS TABLE STRUCTURE CHECK');
        console.log('-'.repeat(30));
        
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'products' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Actual table columns:');
        const columnNames = columns.rows.map(row => row.column_name);
        columns.rows.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // Check for critical columns
        const hasIsActive = columnNames.includes('is_active');
        const hasName = columnNames.includes('name');
        const hasBrandId = columnNames.includes('brand_id');
        
        console.log('\n🎯 Critical columns check:');
        console.log(`   ${hasName ? '✅' : '❌'} name column exists: ${hasName}`);
        console.log(`   ${hasBrandId ? '✅' : '❌'} brand_id column exists: ${hasBrandId}`);
        console.log(`   ${hasIsActive ? '✅' : '❌'} is_active column exists: ${hasIsActive}`);
        
        console.log('\n5️⃣ SAMPLE DATA TEST');
        console.log('-'.repeat(30));
        
        // Test various query conditions
        console.log('🔍 Testing different query conditions:\n');
        
        // Test 1: Basic query
        const basicQuery = await client.query('SELECT COUNT(*) FROM products LIMIT 1');
        console.log(`   Basic COUNT: ${basicQuery.rows[0].count} products`);
        
        // Test 2: With name filter
        const nameQuery = await client.query('SELECT COUNT(*) FROM products WHERE name IS NOT NULL');
        console.log(`   With name IS NOT NULL: ${nameQuery.rows[0].count} products`);
        
        // Test 3: With is_active filter (if column exists)
        if (hasIsActive) {
            try {
                const activeQuery = await client.query('SELECT COUNT(*) FROM products WHERE is_active = true');
                console.log(`   With is_active = true: ${activeQuery.rows[0].count} products`);
                
                // Check is_active distribution
                const activeDistribution = await client.query(`
                    SELECT 
                        COUNT(CASE WHEN is_active = true THEN 1 END) as active_true,
                        COUNT(CASE WHEN is_active = false THEN 1 END) as active_false,
                        COUNT(CASE WHEN is_active IS NULL THEN 1 END) as active_null
                    FROM products
                `);
                
                const dist = activeDistribution.rows[0];
                console.log(`      ↳ is_active = true: ${dist.active_true}`);
                console.log(`      ↳ is_active = false: ${dist.active_false}`);
                console.log(`      ↳ is_active = null: ${dist.active_null}`);
                
                if (parseInt(dist.active_true) === 0) {
                    console.log('   ❌ PROBLEM FOUND: All products have is_active = false or null!');
                }
            } catch (error) {
                console.log(`   ❌ is_active query failed: ${error.message}`);
            }
        }
        
        console.log('\n6️⃣ SAMPLE PRODUCTS PREVIEW');
        console.log('-'.repeat(30));
        
        const sampleProducts = await client.query(`
            SELECT id, name, main_category, brand_id, is_active
            FROM products 
            LIMIT 5
        `);
        
        if (sampleProducts.rows.length > 0) {
            console.log('📦 First 5 products:');
            sampleProducts.rows.forEach((product, i) => {
                console.log(`   ${i + 1}. ID:${product.id} | ${product.name} | Category:${product.main_category || 'NULL'} | Brand:${product.brand_id || 'NULL'} | Active:${product.is_active}`);
            });
        }
        
        console.log('\n7️⃣ HYBRID ENGINE QUERY SIMULATION');
        console.log('-'.repeat(30));
        
        // Simulate the exact query from hybrid engine
        console.log('🔍 Testing hybrid engine query conditions:\n');
        
        try {
            // Test the exact query from your hybrid engine
            const hybridQuery = `
                SELECT 
                    p.id,
                    p.name,
                    COALESCE(b.name, 'Unknown Brand') as brand_name,
                    p.main_category,
                    p.subcategory,
                    p.description
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE p.name IS NOT NULL
                ${hasIsActive ? 'AND p.is_active = true' : ''}
                LIMIT 5
            `;
            
            console.log('Query being tested:');
            console.log(hybridQuery);
            
            const hybridResult = await client.query(hybridQuery);
            
            console.log(`\n📊 Hybrid query result: ${hybridResult.rows.length} products found`);
            
            if (hybridResult.rows.length > 0) {
                console.log('✅ SUCCESS: Hybrid query returns products!');
                hybridResult.rows.forEach((product, i) => {
                    console.log(`   ${i + 1}. ${product.name} (${product.brand_name})`);
                });
            } else {
                console.log('❌ PROBLEM: Hybrid query returns 0 products!');
                
                // Test without is_active filter
                if (hasIsActive) {
                    const withoutActiveQuery = `
                        SELECT COUNT(*) FROM products p
                        LEFT JOIN brands b ON p.brand_id = b.id
                        WHERE p.name IS NOT NULL
                    `;
                    const withoutActiveResult = await client.query(withoutActiveQuery);
                    console.log(`   Without is_active filter: ${withoutActiveResult.rows[0].count} products`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Hybrid query simulation failed: ${error.message}`);
        }
        
        console.log('\n8️⃣ RECOMMENDED SOLUTIONS');
        console.log('-'.repeat(30));
        
        if (totalProducts === 0) {
            console.log('🎯 PRIMARY ISSUE: Empty database');
            console.log('   SOLUTION: Import CSV data');
            console.log('   COMMAND: node scripts/import-csv-data.js');
        } else if (hasIsActive) {
            const activeCount = await client.query('SELECT COUNT(*) FROM products WHERE is_active = true');
            if (parseInt(activeCount.rows[0].count) === 0) {
                console.log('🎯 PRIMARY ISSUE: All products have is_active = false');
                console.log('   SOLUTION 1: Update products to active');
                console.log('   COMMAND: UPDATE products SET is_active = true WHERE name IS NOT NULL;');
                console.log('   SOLUTION 2: Remove is_active filter from hybrid engine');
            }
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

async function quickFix() {
    console.log('\n🛠️ ATTEMPTING QUICK FIX...');
    console.log('-'.repeat(30));
    
    try {
        const client = await pool.connect();
        
        // Fix 1: Set all products to active if they have names
        try {
            const updateResult = await client.query(`
                UPDATE products 
                SET is_active = true 
                WHERE name IS NOT NULL 
                AND name != ''
            `);
            
            console.log(`✅ Updated ${updateResult.rowCount} products to is_active = true`);
        } catch (error) {
            // Column might not exist
            try {
                await client.query('ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true');
                console.log('✅ Added is_active column with default true');
            } catch (addError) {
                console.log('⚠️ Could not add is_active column:', addError.message);
            }
        }
        
        // Test again
        const testQuery = await client.query(`
            SELECT COUNT(*) FROM products 
            WHERE name IS NOT NULL 
            AND (is_active = true OR is_active IS NULL)
        `);
        
        console.log(`🧪 Test query after fix: ${testQuery.rows[0].count} products available`);
        
        client.release();
        
    } catch (error) {
        console.error('❌ Quick fix failed:', error.message);
    }
}

async function main() {
    await urgentDiagnostic();
    
    console.log('\n🤔 Want to try a quick fix? (y/n)');
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('Apply quick fix? ', async (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            await quickFix();
            console.log('\n✅ Quick fix attempted. Test hybrid engine again!');
        }
        rl.close();
        process.exit(0);
    });
}

if (require.main === module) {
    main();
}

module.exports = { urgentDiagnostic, quickFix };