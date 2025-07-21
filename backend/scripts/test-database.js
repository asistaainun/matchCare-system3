// backend/scripts/test-database.js
// Test script untuk verifikasi database MatchCare

const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
    user: 'postgres',
    database: 'matchcare_fresh_db',
    password: '90226628',
    host: 'localhost',
    port: 5432
});

class MatchCareDBTester {
    async testConnection() {
        console.log('🔌 Testing database connection...');
        try {
            const result = await pool.query('SELECT NOW(), version()');
            console.log('✅ Database connected successfully');
            console.log(`📊 PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`);
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
    }

    async testDataCounts() {
        console.log('\n📊 Testing data counts...');
        try {
            const queries = [
                { name: 'Brands', query: 'SELECT COUNT(*) as count FROM brands' },
                { name: 'Products', query: 'SELECT COUNT(*) as count FROM products' },
                { name: 'Ingredients', query: 'SELECT COUNT(*) as count FROM ingredients' },
                { name: 'Product-Ingredient Mappings', query: 'SELECT COUNT(*) as count FROM product_ingredients' }
            ];

            for (const { name, query } of queries) {
                const result = await pool.query(query);
                const count = parseInt(result.rows[0].count);
                console.log(`✅ ${name}: ${count.toLocaleString()} records`);
            }
        } catch (error) {
            console.error('❌ Error testing data counts:', error.message);
        }
    }

    async testBrands() {
        console.log('\n🏢 Testing brands...');
        try {
            // Get random 5 brands
            const result = await pool.query(`
                SELECT name 
                FROM brands 
                ORDER BY RANDOM() 
                LIMIT 5
            `);
            
            console.log('📋 Sample brands:');
            result.rows.forEach((brand, index) => {
                console.log(`  ${index + 1}. ${brand.name}`);
            });

            // Test specific brands
            const testBrands = ['SKINTIFIC', 'SOMETHINC', 'ANESSA', 'COSRX'];
            console.log('\n🔍 Testing specific brands:');
            
            for (const brandName of testBrands) {
                const brandResult = await pool.query('SELECT * FROM brands WHERE name = $1', [brandName]);
                if (brandResult.rows.length > 0) {
                    console.log(`✅ ${brandName}: Found (ID: ${brandResult.rows[0].id})`);
                } else {
                    console.log(`❌ ${brandName}: Not found`);
                }
            }
        } catch (error) {
            console.error('❌ Error testing brands:', error.message);
        }
    }

    async testProducts() {
        console.log('\n📦 Testing products...');
        try {
            // Get products with most ingredients
            const result = await pool.query(`
                SELECT 
                    p.name as product_name,
                    b.name as brand_name,
                    p.main_category,
                    COUNT(pi.ingredient_id) as ingredient_count
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN product_ingredients pi ON p.id = pi.product_id
                GROUP BY p.id, p.name, b.name, p.main_category
                ORDER BY ingredient_count DESC
                LIMIT 5
            `);
            
            console.log('🏆 Top 5 products by ingredient count:');
            result.rows.forEach((product, index) => {
                console.log(`  ${index + 1}. ${product.product_name} (${product.brand_name})`);
                console.log(`     Category: ${product.main_category || 'N/A'} | Ingredients: ${product.ingredient_count}`);
            });

            // Test products by category
            const categoryResult = await pool.query(`
                SELECT main_category, COUNT(*) as count 
                FROM products 
                WHERE main_category IS NOT NULL AND main_category != ''
                GROUP BY main_category 
                ORDER BY count DESC 
                LIMIT 5
            `);
            
            console.log('\n📊 Top 5 product categories:');
            categoryResult.rows.forEach((category, index) => {
                console.log(`  ${index + 1}. ${category.main_category}: ${category.count} products`);
            });

        } catch (error) {
            console.error('❌ Error testing products:', error.message);
        }
    }

    async testIngredients() {
        console.log('\n🧪 Testing ingredients...');
        try {
            // Get most common ingredients
            const result = await pool.query(`
                SELECT 
                    i.name,
                    COUNT(pi.product_id) as product_count,
                    i.is_key_ingredient
                FROM ingredients i
                LEFT JOIN product_ingredients pi ON i.id = pi.ingredient_id
                GROUP BY i.id, i.name, i.is_key_ingredient
                ORDER BY product_count DESC
                LIMIT 10
            `);
            
            console.log('🔬 Top 10 most used ingredients:');
            result.rows.forEach((ingredient, index) => {
                const keyBadge = ingredient.is_key_ingredient ? '⭐' : '';
                console.log(`  ${index + 1}. ${ingredient.name} ${keyBadge}`);
                console.log(`     Used in: ${ingredient.product_count} products`);
            });

            // Test key ingredients
            const keyResult = await pool.query(`
                SELECT COUNT(*) as count 
                FROM ingredients 
                WHERE is_key_ingredient = true
            `);
            console.log(`\n⭐ Key ingredients: ${keyResult.rows[0].count}`);

        } catch (error) {
            console.error('❌ Error testing ingredients:', error.message);
        }
    }

    async testProductSearch() {
        console.log('\n🔍 Testing product search functionality...');
        try {
            // Test search by brand
            const brandSearch = await pool.query(`
                SELECT p.name, b.name as brand
                FROM products p
                JOIN brands b ON p.brand_id = b.id
                WHERE b.name = 'SKINTIFIC'
                LIMIT 3
            `);
            
            console.log('🔍 SKINTIFIC products:');
            brandSearch.rows.forEach((product, index) => {
                console.log(`  ${index + 1}. ${product.name}`);
            });

            // Test search by ingredient
            const ingredientSearch = await pool.query(`
                SELECT DISTINCT p.name, b.name as brand
                FROM products p
                JOIN brands b ON p.brand_id = b.id
                JOIN product_ingredients pi ON p.id = pi.product_id
                JOIN ingredients i ON pi.ingredient_id = i.id
                WHERE i.name ILIKE '%niacinamide%'
                LIMIT 3
            `);
            
            console.log('\n🧪 Products with Niacinamide:');
            ingredientSearch.rows.forEach((product, index) => {
                console.log(`  ${index + 1}. ${product.name} (${product.brand})`);
            });

        } catch (error) {
            console.error('❌ Error testing product search:', error.message);
        }
    }

    async testRecommendationQueries() {
        console.log('\n🎯 Testing recommendation queries...');
        try {
            // Test products for specific skin concerns
            const oilyMattifyingProducts = await pool.query(`
                SELECT p.name, b.name as brand
                FROM products p
                JOIN brands b ON p.brand_id = b.id
                WHERE 
                    p.main_category = 'Moisturizer' AND
                    (p.description ILIKE '%oily%' OR 
                     p.description ILIKE '%mattifying%' OR
                     p.description ILIKE '%sebum%')
                LIMIT 3
            `);
            
            console.log('💧 Moisturizers for oily skin:');
            oilyMattifyingProducts.rows.forEach((product, index) => {
                console.log(`  ${index + 1}. ${product.name} (${product.brand})`);
            });

            // Test alcohol-free products
            const alcoholFreeProducts = await pool.query(`
                SELECT COUNT(*) as count
                FROM products
                WHERE alcohol_free = true
            `);
            console.log(`\n🚫 Alcohol-free products: ${alcoholFreeProducts.rows[0].count}`);

            // Test fragrance-free products
            const fragranceFreeProducts = await pool.query(`
                SELECT COUNT(*) as count
                FROM products
                WHERE fragrance_free = true
            `);
            console.log(`🌸 Fragrance-free products: ${fragranceFreeProducts.rows[0].count}`);

        } catch (error) {
            console.error('❌ Error testing recommendation queries:', error.message);
        }
    }

    async runAllTests() {
        console.log('🧪 MatchCare Database Test Suite');
        console.log('='.repeat(50));
        
        const connected = await this.testConnection();
        if (!connected) {
            console.log('❌ Cannot proceed with tests - database connection failed');
            return;
        }

        await this.testDataCounts();
        await this.testBrands();
        await this.testProducts();
        await this.testIngredients();
        await this.testProductSearch();
        await this.testRecommendationQueries();

        console.log('\n✅ All tests completed!');
        console.log('🎉 MatchCare database is ready for production!');
    }
}

// Run tests
if (require.main === module) {
    const tester = new MatchCareDBTester();
    tester.runAllTests()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = MatchCareDBTester;