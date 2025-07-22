const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function comprehensiveCheck() {
    console.log('🔍 MatchCare Database Comprehensive Check\n');
    console.log('═'.repeat(60));
    
    try {
        // 1. Database Connection & Basic Stats
        console.log('\n📊 1. DATABASE CONNECTION & BASIC STATS');
        console.log('-'.repeat(50));
        
        const basicStats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM products) as total_products,
                (SELECT COUNT(*) FROM brands) as total_brands,
                (SELECT COUNT(DISTINCT main_category) FROM products WHERE main_category IS NOT NULL) as main_categories,
                (SELECT COUNT(DISTINCT subcategory) FROM products WHERE subcategory IS NOT NULL) as subcategories
        `);
        
        const stats = basicStats.rows[0];
        console.log(`✅ Products: ${stats.total_products}`);
        console.log(`✅ Brands: ${stats.total_brands}`);
        console.log(`✅ Main Categories: ${stats.main_categories}`);
        console.log(`✅ Subcategories: ${stats.subcategories}`);
        
        // 2. Products Table Completeness
        console.log('\n📦 2. PRODUCTS TABLE COMPLETENESS');
        console.log('-'.repeat(50));
        
        const completeness = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(name) as has_name,
                COUNT(brand_id) as has_brand,
                COUNT(main_category) as has_main_category,
                COUNT(subcategory) as has_subcategory,
                COUNT(description) as has_description,
                COUNT(product_url) as has_product_url,
                COUNT(key_ingredients_csv) as has_key_ingredients,
                
                ROUND(COUNT(name) * 100.0 / COUNT(*), 2) as name_percent,
                ROUND(COUNT(brand_id) * 100.0 / COUNT(*), 2) as brand_percent,
                ROUND(COUNT(main_category) * 100.0 / COUNT(*), 2) as main_category_percent,
                ROUND(COUNT(subcategory) * 100.0 / COUNT(*), 2) as subcategory_percent,
                ROUND(COUNT(description) * 100.0 / COUNT(*), 2) as description_percent,
                ROUND(COUNT(key_ingredients_csv) * 100.0 / COUNT(*), 2) as key_ingredients_percent
            FROM products
        `);
        
        const comp = completeness.rows[0];
        
        const fields = [
            { name: 'Product Name', count: comp.has_name, percent: comp.name_percent },
            { name: 'Brand', count: comp.has_brand, percent: comp.brand_percent },
            { name: 'Main Category', count: comp.has_main_category, percent: comp.main_category_percent },
            { name: 'Subcategory', count: comp.has_subcategory, percent: comp.subcategory_percent },
            { name: 'Description', count: comp.has_description, percent: comp.description_percent },
            { name: 'Key Ingredients', count: comp.has_key_ingredients, percent: comp.key_ingredients_percent }
        ];
        
        fields.forEach(field => {
            const status = field.percent >= 90 ? '✅' : field.percent >= 70 ? '⚠️' : '❌';
            console.log(`${status} ${field.name}: ${field.count}/${comp.total} (${field.percent}%)`);
        });
        
        // 3. Category Distribution
        console.log('\n📂 3. CATEGORY DISTRIBUTION');
        console.log('-'.repeat(50));
        
        const categories = await pool.query(`
            SELECT 
                main_category,
                COUNT(*) as product_count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products WHERE main_category IS NOT NULL), 2) as percentage
            FROM products 
            WHERE main_category IS NOT NULL 
            GROUP BY main_category 
            ORDER BY product_count DESC
            LIMIT 10
        `);
        
        console.log('Top Categories:');
        categories.rows.forEach((cat, index) => {
            console.log(`   ${index + 1}. ${cat.main_category}: ${cat.product_count} products (${cat.percentage}%)`);
        });
        
        // 4. Brand Distribution
        console.log('\n🏷️  4. BRAND DISTRIBUTION');
        console.log('-'.repeat(50));
        
        const topBrands = await pool.query(`
            SELECT 
                b.name as brand_name,
                COUNT(p.id) as product_count
            FROM brands b
            LEFT JOIN products p ON b.id = p.brand_id
            GROUP BY b.id, b.name
            ORDER BY product_count DESC
            LIMIT 10
        `);
        
        console.log('Top Brands:');
        topBrands.rows.forEach((brand, index) => {
            console.log(`   ${index + 1}. ${brand.brand_name}: ${brand.product_count} products`);
        });
        
        // 5. Data Quality Checks
        console.log('\n🔍 5. DATA QUALITY CHECKS');
        console.log('-'.repeat(50));
        
        const qualityChecks = await pool.query(`
            SELECT 
                COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as missing_names,
                COUNT(CASE WHEN brand_id IS NULL THEN 1 END) as missing_brands,
                COUNT(CASE WHEN main_category IS NULL OR main_category = '' THEN 1 END) as missing_main_category,
                COUNT(CASE WHEN LENGTH(description) < 10 THEN 1 END) as short_descriptions,
                COUNT(CASE WHEN product_url IS NULL OR product_url = '' THEN 1 END) as missing_urls,
                COUNT(CASE WHEN key_ingredients_csv IS NULL OR key_ingredients_csv = '' THEN 1 END) as missing_ingredients
            FROM products
        `);
        
        const quality = qualityChecks.rows[0];
        
        const qualityIssues = [
            { name: 'Missing Names', count: quality.missing_names },
            { name: 'Missing Brands', count: quality.missing_brands },
            { name: 'Missing Main Category', count: quality.missing_main_category },
            { name: 'Short Descriptions', count: quality.short_descriptions },
            { name: 'Missing URLs', count: quality.missing_urls },
            { name: 'Missing Ingredients', count: quality.missing_ingredients }
        ];
        
        qualityIssues.forEach(issue => {
            const status = issue.count === 0 ? '✅' : issue.count < 100 ? '⚠️' : '❌';
            console.log(`${status} ${issue.name}: ${issue.count} issues`);
        });
        
        // 6. API Endpoint Test
        console.log('\n🌐 6. API ENDPOINT TEST');
        console.log('-'.repeat(50));
        
        try {
            const fetch = require('node-fetch');
            const response = await fetch('http://localhost:5000/api/products?limit=1');
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                console.log('✅ API endpoint working');
                console.log(`✅ Sample product: ${data.data[0].name}`);
                console.log(`✅ Pagination working: ${data.pagination.total} total products`);
                
                // Check required fields in API response
                const product = data.data[0];
                const requiredFields = ['id', 'name', 'main_category', 'subcategory', 'Brand'];
                const missingFields = requiredFields.filter(field => !product.hasOwnProperty(field));
                
                if (missingFields.length === 0) {
                    console.log('✅ All required fields present in API response');
                } else {
                    console.log(`❌ Missing fields in API: ${missingFields.join(', ')}`);
                }
            } else {
                console.log('❌ API endpoint not responding correctly');
            }
        } catch (error) {
            console.log(`⚠️  API test failed: ${error.message}`);
            console.log('   (This is OK if server is not running)');
        }
        
        // 7. Ingredients Analysis
        console.log('\n🧪 7. INGREDIENTS ANALYSIS');
        console.log('-'.repeat(50));
        
        const ingredientStats = await pool.query(`
            SELECT 
                COUNT(CASE WHEN key_ingredients_csv IS NOT NULL AND key_ingredients_csv != '' THEN 1 END) as products_with_ingredients,
                COUNT(CASE WHEN alcohol_free = true THEN 1 END) as alcohol_free_products,
                COUNT(CASE WHEN fragrance_free = true THEN 1 END) as fragrance_free_products,
                COUNT(CASE WHEN paraben_free = true THEN 1 END) as paraben_free_products,
                COUNT(CASE WHEN sulfate_free = true THEN 1 END) as sulfate_free_products,
                COUNT(CASE WHEN silicone_free = true THEN 1 END) as silicone_free_products
            FROM products
        `);
        
        const ingredients = ingredientStats.rows[0];
        console.log(`✅ Products with ingredients: ${ingredients.products_with_ingredients}`);
        console.log(`✅ Alcohol-free products: ${ingredients.alcohol_free_products}`);
        console.log(`✅ Fragrance-free products: ${ingredients.fragrance_free_products}`);
        console.log(`✅ Paraben-free products: ${ingredients.paraben_free_products}`);
        console.log(`✅ Sulfate-free products: ${ingredients.sulfate_free_products}`);
        console.log(`✅ Silicone-free products: ${ingredients.silicone_free_products}`);
        
        // 8. Sample Data Preview
        console.log('\n🧪 8. SAMPLE DATA PREVIEW');
        console.log('-'.repeat(50));
        
        const sampleProducts = await pool.query(`
            SELECT 
                p.id,
                p.name,
                b.name as brand,
                p.main_category,
                p.subcategory,
                CASE 
                    WHEN LENGTH(p.description) > 100 
                    THEN LEFT(p.description, 100) || '...'
                    ELSE p.description 
                END as description_preview,
                p.alcohol_free,
                p.fragrance_free
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.main_category IS NOT NULL
            ORDER BY RANDOM()
            LIMIT 3
        `);
        
        console.log('Random Sample Products:');
        console.table(sampleProducts.rows);
        
        // 9. Overall Assessment
        console.log('\n🎯 9. OVERALL ASSESSMENT');
        console.log('═'.repeat(60));
        
        const overallScore = calculateOverallScore(comp, quality);
        
        console.log(`Database Completeness Score: ${overallScore.completeness}%`);
        console.log(`Data Quality Score: ${overallScore.quality}%`);
        console.log(`Overall Score: ${overallScore.overall}%`);
        
        if (overallScore.overall >= 90) {
            console.log('\n🎉 EXCELLENT: Database is ready for production!');
            console.log('✅ All systems go for development!');
        } else if (overallScore.overall >= 80) {
            console.log('\n✅ GOOD: Database is ready for development!');
            console.log('⚠️  Some minor improvements possible but good to proceed');
        } else if (overallScore.overall >= 70) {
            console.log('\n⚠️  FAIR: Database functional but needs improvement');
            console.log('Consider fixing major issues before proceeding');
        } else {
            console.log('\n❌ POOR: Database needs significant work');
            console.log('Fix critical issues before development');
        }
        
        // 10. Development Readiness
        console.log('\n🚀 10. DEVELOPMENT READINESS CHECK');
        console.log('-'.repeat(50));
        
        const readinessChecks = [
            { feature: 'Product Catalog', ready: comp.has_name > 0 && comp.has_brand > 0 },
            { feature: 'Category Filtering', ready: comp.has_main_category > comp.total * 0.8 },
            { feature: 'Brand Filtering', ready: comp.has_brand > comp.total * 0.9 },
            { feature: 'Product Search', ready: comp.has_name > 0 && comp.has_description > 0 },
            { feature: 'Ingredient Analysis', ready: comp.has_key_ingredients > comp.total * 0.5 },
            { feature: 'Skin Quiz System', ready: comp.has_main_category > 0 && ingredients.alcohol_free_products > 0 }
        ];
        
        readinessChecks.forEach(check => {
            const status = check.ready ? '✅ Ready' : '❌ Not Ready';
            console.log(`${status} ${check.feature}`);
        });
        
        return overallScore;
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
        return { overall: 0, completeness: 0, quality: 0 };
    } finally {
        await pool.end();
    }
}

function calculateOverallScore(completeness, quality) {
    // Completeness score (weighted average)
    const completenessScore = (
        completeness.name_percent * 0.25 +
        completeness.brand_percent * 0.25 +
        completeness.main_category_percent * 0.20 +
        completeness.subcategory_percent * 0.15 +
        completeness.description_percent * 0.10 +
        completeness.key_ingredients_percent * 0.05
    );
    
    // Quality score (inverse of issues)
    const totalProducts = parseInt(completeness.total);
    const qualityScore = 100 - (
        (quality.missing_names / totalProducts * 100) * 0.25 +
        (quality.missing_brands / totalProducts * 100) * 0.25 +
        (quality.missing_main_category / totalProducts * 100) * 0.20 +
        (quality.short_descriptions / totalProducts * 100) * 0.15 +
        (quality.missing_urls / totalProducts * 100) * 0.10 +
        (quality.missing_ingredients / totalProducts * 100) * 0.05
    );
    
    const overall = (completenessScore * 0.7 + qualityScore * 0.3);
    
    return {
        completeness: Math.round(completenessScore * 100) / 100,
        quality: Math.round(qualityScore * 100) / 100,
        overall: Math.round(overall * 100) / 100
    };
}

// Run the comprehensive check
if (require.main === module) {
    comprehensiveCheck()
        .then((score) => {
            console.log('\n✅ Comprehensive check completed');
            if (score.overall >= 80) {
                console.log('🎉 Database ready for development!');
                process.exit(0);
            } else {
                console.log('⚠️  Consider improvements before development');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('❌ Check failed:', error.message);
            process.exit(1);
        });
}

module.exports = { comprehensiveCheck };