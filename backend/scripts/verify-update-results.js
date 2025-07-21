const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function verifyUpdateResults() {
    try {
        console.log('🔍 Verifying Database Update Results\n');
        console.log('═'.repeat(60));
        
        // 1. Check table structure
        console.log('\n📋 1. TABLE STRUCTURE VERIFICATION');
        console.log('-'.repeat(40));
        
        const columns = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'products' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        const requiredColumns = [
            'main_category', 'subcategory', 'key_ingredients_csv', 
            'image_urls', 'local_image_path', 'product_url', 'bpom_number'
        ];
        
        const existingColumns = columns.rows.map(row => row.column_name);
        
        console.log('✅ Required columns status:');
        requiredColumns.forEach(col => {
            const exists = existingColumns.includes(col);
            console.log(`   ${exists ? '✅' : '❌'} ${col}`);
        });
        
        // 2. Data population statistics
        console.log('\n📊 2. DATA POPULATION STATISTICS');
        console.log('-'.repeat(40));
        
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(name) as has_name,
                COUNT(brand_id) as has_brand,
                COUNT(main_category) as has_main_category,
                COUNT(subcategory) as has_subcategory,
                COUNT(key_ingredients_csv) as has_key_ingredients,
                COUNT(image_urls) as has_image_urls,
                COUNT(local_image_path) as has_local_image_path,
                COUNT(product_url) as has_product_url,
                COUNT(bpom_number) as has_bpom_number,
                
                -- Calculate percentages
                ROUND(COUNT(main_category) * 100.0 / COUNT(*), 2) as main_category_percent,
                ROUND(COUNT(subcategory) * 100.0 / COUNT(*), 2) as subcategory_percent,
                ROUND(COUNT(key_ingredients_csv) * 100.0 / COUNT(*), 2) as key_ingredients_percent,
                ROUND(COUNT(product_url) * 100.0 / COUNT(*), 2) as product_url_percent,
                ROUND(COUNT(bpom_number) * 100.0 / COUNT(*), 2) as bpom_number_percent
            FROM products
        `);
        
        const stat = stats.rows[0];
        
        console.log('Population Summary:');
        console.log(`   Total Products: ${stat.total_products}`);
        console.log(`   Has Name: ${stat.has_name} (${Math.round(stat.has_name/stat.total_products*100)}%)`);
        console.log(`   Has Brand: ${stat.has_brand} (${Math.round(stat.has_brand/stat.total_products*100)}%)`);
        console.log('\nNew Columns Population:');
        console.log(`   Main Category: ${stat.has_main_category} (${stat.main_category_percent}%)`);
        console.log(`   Subcategory: ${stat.has_subcategory} (${stat.subcategory_percent}%)`);
        console.log(`   Key Ingredients: ${stat.has_key_ingredients} (${stat.key_ingredients_percent}%)`);
        console.log(`   Product URL: ${stat.has_product_url} (${stat.product_url_percent}%)`);
        console.log(`   BPOM Number: ${stat.has_bpom_number} (${stat.bpom_number_percent}%)`);
        
        // 3. Sample data verification
        console.log('\n🧪 3. SAMPLE DATA VERIFICATION');
        console.log('-'.repeat(40));
        
        const sampleData = await pool.query(`
            SELECT 
                id,
                name,
                b.name as brand_name,
                main_category,
                subcategory,
                CASE 
                    WHEN key_ingredients_csv IS NOT NULL 
                    THEN LEFT(key_ingredients_csv, 50) || '...'
                    ELSE NULL 
                END as key_ingredients_preview,
                CASE 
                    WHEN product_url IS NOT NULL 
                    THEN 'Has URL'
                    ELSE 'No URL' 
                END as url_status,
                bpom_number
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE main_category IS NOT NULL
            ORDER BY id
            LIMIT 5
        `);
        
        if (sampleData.rows.length > 0) {
            console.log('✅ Sample products with updated data:');
            console.table(sampleData.rows);
        } else {
            console.log('❌ No products found with updated data');
        }
        
        // 4. Category analysis
        console.log('\n📂 4. CATEGORY ANALYSIS');
        console.log('-'.repeat(40));
        
        const categoryStats = await pool.query(`
            SELECT 
                main_category,
                COUNT(*) as product_count,
                COUNT(DISTINCT subcategory) as subcategory_count
            FROM products 
            WHERE main_category IS NOT NULL AND main_category != ''
            GROUP BY main_category
            ORDER BY product_count DESC
            LIMIT 10
        `);
        
        if (categoryStats.rows.length > 0) {
            console.log('Top Categories:');
            categoryStats.rows.forEach((cat, index) => {
                console.log(`   ${index + 1}. ${cat.main_category}: ${cat.product_count} products (${cat.subcategory_count} subcategories)`);
            });
        } else {
            console.log('❌ No category data found');
        }
        
        // 5. Data quality checks
        console.log('\n🔍 5. DATA QUALITY CHECKS');
        console.log('-'.repeat(40));
        
        const qualityChecks = await pool.query(`
            SELECT 
                -- Check for empty strings vs NULL
                COUNT(CASE WHEN main_category = '' THEN 1 END) as empty_main_category,
                COUNT(CASE WHEN subcategory = '' THEN 1 END) as empty_subcategory,
                COUNT(CASE WHEN key_ingredients_csv = '' THEN 1 END) as empty_key_ingredients,
                
                -- Check for potential issues
                COUNT(CASE WHEN LENGTH(main_category) < 3 AND main_category IS NOT NULL THEN 1 END) as short_main_category,
                COUNT(CASE WHEN LENGTH(subcategory) < 3 AND subcategory IS NOT NULL THEN 1 END) as short_subcategory,
                
                -- Check for URL validity
                COUNT(CASE WHEN product_url IS NOT NULL AND product_url NOT LIKE 'http%' THEN 1 END) as invalid_urls,
                
                -- Check for BPOM format
                COUNT(CASE WHEN bpom_number IS NOT NULL AND LENGTH(bpom_number) < 5 THEN 1 END) as short_bpom
            FROM products
        `);
        
        const quality = qualityChecks.rows[0];
        
        console.log('Quality Issues Found:');
        console.log(`   Empty main_category strings: ${quality.empty_main_category}`);
        console.log(`   Empty subcategory strings: ${quality.empty_subcategory}`);
        console.log(`   Empty key_ingredients strings: ${quality.empty_key_ingredients}`);
        console.log(`   Very short main_category: ${quality.short_main_category}`);
        console.log(`   Very short subcategory: ${quality.short_subcategory}`);
        console.log(`   Invalid URLs: ${quality.invalid_urls}`);
        console.log(`   Short BPOM numbers: ${quality.short_bpom}`);
        
        // 6. Update recommendation
        console.log('\n💡 6. RECOMMENDATIONS');
        console.log('-'.repeat(40));
        
        const populationRate = stat.main_category_percent;
        
        if (populationRate < 50) {
            console.log('❌ LOW DATA POPULATION DETECTED');
            console.log('   - Less than 50% of products have category data');
            console.log('   - Check CSV file format and product name matching');
            console.log('   - Consider running data cleaning script');
        } else if (populationRate < 80) {
            console.log('⚠️  MODERATE DATA POPULATION');
            console.log('   - 50-80% of products have category data');
            console.log('   - Some products may not have matches in CSV');
            console.log('   - This is normal if CSV doesn\'t contain all products');
        } else {
            console.log('✅ EXCELLENT DATA POPULATION');
            console.log('   - Over 80% of products have category data');
            console.log('   - Update appears successful');
        }
        
        // 7. Index verification
        console.log('\n🗄️  7. INDEX VERIFICATION');
        console.log('-'.repeat(40));
        
        const indexes = await pool.query(`
            SELECT 
                indexname, 
                tablename,
                indexdef
            FROM pg_indexes 
            WHERE tablename = 'products' 
            AND indexname LIKE '%main_category%' 
            OR indexname LIKE '%subcategory%'
            OR indexname LIKE '%product_url%'
            OR indexname LIKE '%bpom%'
        `);
        
        if (indexes.rows.length > 0) {
            console.log('✅ Indexes created:');
            indexes.rows.forEach(idx => {
                console.log(`   - ${idx.indexname}`);
            });
        } else {
            console.log('⚠️  No new indexes found - this may affect performance');
        }
        
        // 8. Final summary
        console.log('\n🎯 8. FINAL SUMMARY');
        console.log('═'.repeat(60));
        
        const overallStatus = populationRate >= 80 ? 'EXCELLENT' : 
                             populationRate >= 50 ? 'GOOD' : 'NEEDS_ATTENTION';
        
        console.log(`Overall Status: ${overallStatus}`);
        console.log(`Data Population Rate: ${populationRate}%`);
        console.log(`Total Products Updated: ${stat.has_main_category}`);
        
        if (overallStatus === 'EXCELLENT') {
            console.log('\n🎉 Update completed successfully! Your database is ready for use.');
        } else if (overallStatus === 'GOOD') {
            console.log('\n✅ Update mostly successful. Some manual data cleaning may be beneficial.');
        } else {
            console.log('\n⚠️  Update completed but data population is low. Check CSV file and matching logic.');
        }
        
        console.log('\nNext Steps:');
        console.log('1. Update your application queries to use new columns');
        console.log('2. Test product filtering and search functionality');
        console.log('3. Consider implementing data validation rules');
        console.log('4. Monitor application performance with new indexes');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        console.error('\nPossible causes:');
        console.error('1. Database connection issues');
        console.error('2. Missing table or columns');
        console.error('3. Permission issues');
    } finally {
        await pool.end();
    }
}

// Run verification
if (require.main === module) {
    verifyUpdateResults()
        .then(() => {
            console.log('\n✅ Verification completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Verification failed:', error.message);
            process.exit(1);
        });
}

module.exports = { verifyUpdateResults };