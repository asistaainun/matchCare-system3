// backend/scripts/test-hybrid-query.js
// Test the exact query that hybrid engine is running

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function testHybridQuery() {
    console.log('🧪 Testing Hybrid Engine Query\n');
    
    try {
        const client = await pool.connect();
        
        // Test 1: Check if we have any products at all
        console.log('1️⃣ Basic product count:');
        const countResult = await client.query('SELECT COUNT(*) FROM products');
        console.log(`   Total products: ${countResult.rows[0].count}\n`);
        
        if (parseInt(countResult.rows[0].count) === 0) {
            console.log('❌ PROBLEM: Database is empty! No products to recommend.');
            console.log('💡 SOLUTION: Import your CSV data first');
            client.release();
            return;
        }
        
        // Test 2: Check table structure
        console.log('2️⃣ Table structure check:');
        const columns = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'products' 
            ORDER BY ordinal_position
        `);
        const columnNames = columns.rows.map(row => row.column_name);
        console.log(`   Columns: ${columnNames.join(', ')}\n`);
        
        // Test 3: Test exact hybrid engine query step by step
        console.log('3️⃣ Step-by-step query testing:\n');
        
        // Step 3a: Basic WHERE clause
        const basicWhere = await client.query(`
            SELECT COUNT(*) FROM products p WHERE p.name IS NOT NULL
        `);
        console.log(`   ✅ p.name IS NOT NULL: ${basicWhere.rows[0].count} products`);
        
        // Step 3b: Check brands table relationship
        try {
            const brandsTest = await client.query(`
                SELECT COUNT(*) FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE p.name IS NOT NULL
            `);
            console.log(`   ✅ LEFT JOIN brands: ${brandsTest.rows[0].count} products`);
        } catch (error) {
            console.log(`   ❌ LEFT JOIN brands failed: ${error.message}`);
        }
        
        // Step 3c: Test fragrance sensitivity filter
        const fragranceTest = await client.query(`
            SELECT COUNT(*) FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.name IS NOT NULL
            AND (p.fragrance_free = true OR p.fragrance_free IS NULL)
        `);
        console.log(`   ✅ Fragrance filter: ${fragranceTest.rows[0].count} products`);
        
        // Step 3d: Test concern-based filtering (acne, pores)
        try {
            const concernTest = await client.query(`
                SELECT COUNT(*) FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE p.name IS NOT NULL
                AND (p.fragrance_free = true OR p.fragrance_free IS NULL)
                AND (
                    LOWER(COALESCE(p.name, '') || ' ' || COALESCE(p.description, '')) 
                    ~* '(acne|blemish|salicylic|benzoyl peroxide|jerawat|pore|blackhead|whitehead|komedo|pori)'
                )
            `);
            console.log(`   ✅ Concern filter (acne, pores): ${concernTest.rows[0].count} products`);
        } catch (error) {
            console.log(`   ❌ Concern filter failed: ${error.message}`);
        }
        
        // Test 4: Run the exact hybrid engine query
        console.log('\n4️⃣ Exact hybrid engine query:');
        
        const hybridQuery = `
            SELECT 
                p.id,
                p.name,
                COALESCE(b.name, p.brand, 'Unknown Brand') as brand_name,
                p.main_category,
                p.subcategory,
                p.description,
                p.alcohol_free,
                p.fragrance_free,
                p.paraben_free,
                p.sulfate_free,
                p.silicone_free,
                p.product_url,
                p.local_image_path
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.name IS NOT NULL
            AND (p.fragrance_free = true OR p.fragrance_free IS NULL)
            AND (
                LOWER(COALESCE(p.name, '') || ' ' || COALESCE(p.description, '')) 
                ~* '(acne|blemish|salicylic|benzoyl peroxide|jerawat|pore|blackhead|whitehead|komedo|pori)'
            )
            ORDER BY p.name ASC 
            LIMIT 50
        `;
        
        console.log('Query:');
        console.log(hybridQuery);
        console.log('\nExecuting...\n');
        
        const hybridResult = await client.query(hybridQuery);
        
        console.log(`📊 RESULT: ${hybridResult.rows.length} products found`);
        
        if (hybridResult.rows.length > 0) {
            console.log('\n✅ SUCCESS! Products found:');
            hybridResult.rows.slice(0, 5).forEach((product, i) => {
                console.log(`   ${i + 1}. ${product.name} (${product.brand_name})`);
                console.log(`      Category: ${product.main_category || 'N/A'}`);
                console.log(`      Fragrance-free: ${product.fragrance_free || 'N/A'}`);
            });
            
            console.log('\n🎉 The query works! Your hybrid engine should return products.');
            console.log('💡 If it still returns 0, check:');
            console.log('   1. Database connection in hybrid engine');
            console.log('   2. Query parameters being passed');
            console.log('   3. Error handling in the engine');
        } else {
            console.log('\n❌ No products match the criteria');
            
            // Try without concern filter
            console.log('\n🔍 Testing without concern filter:');
            const noConcernQuery = `
                SELECT COUNT(*) FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE p.name IS NOT NULL
                AND (p.fragrance_free = true OR p.fragrance_free IS NULL)
            `;
            
            const noConcernResult = await client.query(noConcernQuery);
            console.log(`   Without concern filter: ${noConcernResult.rows[0].count} products`);
            
            if (parseInt(noConcernResult.rows[0].count) > 0) {
                console.log('💡 Issue: Concern filter is too restrictive');
                console.log('   Solutions:');
                console.log('   1. Expand concern keywords');
                console.log('   2. Make concern filter optional');
                console.log('   3. Use broader matching criteria');
            }
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    testHybridQuery();
}

module.exports = { testHybridQuery };