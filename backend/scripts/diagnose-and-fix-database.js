// backend/scripts/diagnose-and-fix-database.js
// Complete diagnostic and fix for MatchCare database

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

class DatabaseDiagnostic {
    async runCompleteDiagnostic() {
        console.log('🔍 MatchCare Database Complete Diagnostic\n');
        console.log('='.repeat(50));
        
        try {
            await this.checkConnection();
            await this.checkTableStructure();
            await this.checkDataPopulation();
            await this.checkSpecificIssues();
            await this.provideRecommendations();
            
        } catch (error) {
            console.error('❌ Diagnostic failed:', error.message);
        } finally {
            await pool.end();
        }
    }

    async checkConnection() {
        console.log('\n1️⃣ CONNECTION TEST');
        console.log('-'.repeat(30));
        
        try {
            const client = await pool.connect();
            const result = await client.query('SELECT NOW()');
            console.log('✅ Database connection successful');
            console.log(`📅 Server time: ${result.rows[0].now}`);
            client.release();
        } catch (error) {
            console.log('❌ Connection failed:', error.message);
            throw error;
        }
    }

    async checkTableStructure() {
        console.log('\n2️⃣ TABLE STRUCTURE CHECK');
        console.log('-'.repeat(30));
        
        // Check products table columns
        const productsColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'products' 
            ORDER BY ordinal_position
        `);

        console.log('\n📦 PRODUCTS TABLE COLUMNS:');
        const columnNames = productsColumns.rows.map(row => row.column_name);
        productsColumns.rows.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        // Check for problematic columns
        const hasIsActive = columnNames.includes('is_active');
        const hasBrand = columnNames.includes('brand');
        const hasBrandId = columnNames.includes('brand_id');
        
        console.log('\n🎯 CRITICAL COLUMN CHECK:');
        console.log(`   ${hasIsActive ? '✅' : '❌'} is_active column exists: ${hasIsActive}`);
        console.log(`   ${hasBrand ? '⚠️' : '✅'} brand column exists: ${hasBrand} ${hasBrand ? '(redundant)' : ''}`);
        console.log(`   ${hasBrandId ? '✅' : '❌'} brand_id column exists: ${hasBrandId}`);

        // Check brands table
        try {
            const brandsColumns = await pool.query(`
                SELECT column_name, data_type
                FROM information_schema.columns 
                WHERE table_name = 'brands' 
                ORDER BY ordinal_position
            `);

            console.log('\n🏢 BRANDS TABLE COLUMNS:');
            brandsColumns.rows.forEach(col => {
                console.log(`   ${col.column_name} (${col.data_type})`);
            });
        } catch (error) {
            console.log('\n❌ BRANDS TABLE: Not found or inaccessible');
        }
    }

    async checkDataPopulation() {
        console.log('\n3️⃣ DATA POPULATION CHECK');
        console.log('-'.repeat(30));

        // Basic count
        const productCount = await pool.query('SELECT COUNT(*) FROM products');
        console.log(`📊 Total products: ${productCount.rows[0].count}`);

        if (parseInt(productCount.rows[0].count) === 0) {
            console.log('❌ NO PRODUCTS FOUND! Database is empty.');
            return;
        }

        // Check data quality
        const dataQuality = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(name) as has_name,
                COUNT(brand_id) as has_brand_id,
                COUNT(main_category) as has_main_category,
                COUNT(description) as has_description,
                COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as valid_names
            FROM products
        `);

        const stats = dataQuality.rows[0];
        console.log('\n📈 DATA QUALITY:');
        console.log(`   Products with names: ${stats.has_name}/${stats.total} (${((stats.has_name/stats.total)*100).toFixed(1)}%)`);
        console.log(`   Products with brand_id: ${stats.has_brand_id}/${stats.total} (${((stats.has_brand_id/stats.total)*100).toFixed(1)}%)`);
        console.log(`   Products with category: ${stats.has_main_category}/${stats.total} (${((stats.has_main_category/stats.total)*100).toFixed(1)}%)`);
        console.log(`   Products with description: ${stats.has_description}/${stats.total} (${((stats.has_description/stats.total)*100).toFixed(1)}%)`);
        console.log(`   Valid product names: ${stats.valid_names}/${stats.total} (${((stats.valid_names/stats.total)*100).toFixed(1)}%)`);
    }

    async checkSpecificIssues() {
        console.log('\n4️⃣ SPECIFIC ISSUE ANALYSIS');
        console.log('-'.repeat(30));

        // Check is_active issue
        try {
            const isActiveCheck = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active_true,
                    COUNT(CASE WHEN is_active = false THEN 1 END) as active_false,
                    COUNT(CASE WHEN is_active IS NULL THEN 1 END) as active_null
                FROM products
            `);

            const activeStats = isActiveCheck.rows[0];
            console.log('\n🔍 IS_ACTIVE COLUMN ANALYSIS:');
            console.log(`   Total products: ${activeStats.total}`);
            console.log(`   is_active = true: ${activeStats.active_true}`);
            console.log(`   is_active = false: ${activeStats.active_false}`);
            console.log(`   is_active = null: ${activeStats.active_null}`);

            if (parseInt(activeStats.active_true) === 0) {
                console.log('❌ PROBLEM: No products have is_active = true!');
                console.log('💡 SOLUTION: Update products to set is_active = true');
            }
        } catch (error) {
            console.log('❌ is_active column does not exist!');
            console.log('💡 SOLUTION: Add is_active column or remove from queries');
        }

        // Check foreign key relationships
        try {
            const relationshipCheck = await pool.query(`
                SELECT 
                    p.id, 
                    p.name, 
                    p.brand_id, 
                    b.name as brand_name
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LIMIT 5
            `);

            console.log('\n🔗 FOREIGN KEY RELATIONSHIP TEST:');
            relationshipCheck.rows.forEach(row => {
                const hasBrand = Boolean(row.brand_name);
                console.log(`   Product ${row.id}: ${row.name} | Brand: ${row.brand_name || 'NULL'} ${hasBrand ? '✅' : '❌'}`);
            });

            const orphanCheck = await pool.query(`
                SELECT COUNT(*) as orphan_count
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE p.brand_id IS NOT NULL AND b.id IS NULL
            `);

            const orphanCount = orphanCheck.rows[0].orphan_count;
            if (parseInt(orphanCount) > 0) {
                console.log(`❌ PROBLEM: ${orphanCount} products have invalid brand_id references`);
            } else {
                console.log('✅ All brand foreign key relationships are valid');
            }

        } catch (error) {
            console.log('❌ Foreign key check failed:', error.message);
        }
    }

    async provideRecommendations() {
        console.log('\n5️⃣ RECOMMENDATIONS & FIXES');
        console.log('-'.repeat(30));

        console.log('\n🛠️ IMMEDIATE FIXES NEEDED:');
        
        // Fix 1: is_active column
        try {
            const activeCheck = await pool.query(`
                SELECT COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
                FROM products
            `);
            
            if (parseInt(activeCheck.rows[0].active_count) === 0) {
                console.log('\n1️⃣ FIX is_active COLUMN:');
                console.log('   SQL Command to run:');
                console.log('   UPDATE products SET is_active = true WHERE name IS NOT NULL;');
                
                // Actually run the fix
                console.log('\n🔧 APPLYING FIX...');
                const updateResult = await pool.query(`
                    UPDATE products SET is_active = true WHERE name IS NOT NULL
                `);
                console.log(`✅ Updated ${updateResult.rowCount} products to is_active = true`);
            }
        } catch (error) {
            console.log('\n1️⃣ ADD is_active COLUMN:');
            console.log('   SQL Command to run:');
            console.log('   ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true;');
            
            // Actually add the column
            try {
                console.log('\n🔧 ADDING MISSING COLUMN...');
                await pool.query(`ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true`);
                console.log('✅ Added is_active column with default true');
            } catch (addError) {
                console.log('❌ Failed to add column:', addError.message);
            }
        }

        // Fix 2: Test query
        console.log('\n2️⃣ TEST FIXED QUERY:');
        try {
            const testQuery = await pool.query(`
                SELECT 
                    p.id,
                    p.name,
                    COALESCE(b.name, 'Unknown Brand') as brand_name,
                    p.main_category
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                WHERE p.name IS NOT NULL
                AND p.is_active = true
                LIMIT 5
            `);

            console.log(`✅ Test query returned ${testQuery.rows.length} products:`);
            testQuery.rows.forEach(row => {
                console.log(`   - ${row.name} (${row.brand_name}) [${row.main_category || 'No category'}]`);
            });

        } catch (error) {
            console.log('❌ Test query failed:', error.message);
        }

        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Replace hybridRecommendationEngine.js with the fixed version');
        console.log('2. Test the hybrid engine again: curl -X GET http://localhost:5000/api/test/hybrid-engine');
        console.log('3. Check that recommendations are now returned');
        console.log('4. If still no results, check data import process');
    }
}

async function main() {
    const diagnostic = new DatabaseDiagnostic();
    await diagnostic.runCompleteDiagnostic();
}

if (require.main === module) {
    main();
}

module.exports = DatabaseDiagnostic;