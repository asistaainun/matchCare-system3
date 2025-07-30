// backend/scripts/continue-population-batch.js
// Incremental batch processor untuk melanjutkan dari 200 ke semua products

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

class IncrementalBatchProcessor {
    constructor() {
        this.keyIngredientMappings = {
            // AHA Family
            'glycolic acid': 'aha',
            'lactic acid': 'aha', 
            'mandelic acid': 'aha',
            'malic acid': 'aha',
            'tartaric acid': 'aha',
            
            // BHA Family
            'salicylic acid': 'bha',
            'betaine salicylate': 'bha',
            'willow bark': 'bha',
            
            // PHA Family
            'gluconolactone': 'pha',
            'lactobionic acid': 'pha',
            'galactose': 'pha',
            
            // Hyaluronic Acid Family
            'hyaluronic acid': 'hyaluronic_acid',
            'sodium hyaluronate': 'hyaluronic_acid',
            'hydrolyzed hyaluronic acid': 'hyaluronic_acid',
            'cross-linked hyaluronic acid': 'hyaluronic_acid',
            
            // Retinoid Family
            'retinol': 'retinoid',
            'retinyl palmitate': 'retinoid',    
            'retinaldehyde': 'retinoid',
            'adapalene': 'retinoid',
            'tretinoin': 'retinoid',
            'retinyl acetate': 'retinoid',
            'hydroxypinacolone retinoate': 'retinoid',
            
            // Niacinamide
            'niacinamide': 'niacinamide',
            'nicotinamide': 'niacinamide',
            'vitamin b3': 'niacinamide',
            
            // Vitamin C Family
            'ascorbic acid': 'vitamin_c',
            'magnesium ascorbyl phosphate': 'vitamin_c',
            'sodium ascorbyl phosphate': 'vitamin_c',
            'ascorbyl glucoside': 'vitamin_c',
            'l-ascorbic acid': 'vitamin_c',
            'ethyl ascorbic acid': 'vitamin_c',
            '3-o-ethyl ascorbic acid': 'vitamin_c',
            
            // Vitamin E
            'tocopherol': 'vitamin_e',
            'tocopheryl acetate': 'vitamin_e',
            'vitamin e': 'vitamin_e',
            
            // Ceramides
            'ceramide': 'ceramides',
            'ceramide np': 'ceramides',
            'ceramide ap': 'ceramides',
            'ceramide eop': 'ceramides',
            'ceramide ns': 'ceramides',
            'phytosphingosine': 'ceramides',
            
            // Peptides
            'peptide': 'peptides',
            'palmitoyl pentapeptide': 'peptides',
            'copper peptide': 'peptides',
            'matrixyl': 'peptides',
            'argireline': 'peptides',
            'palmitoyl tripeptide': 'peptides',
            
            // Antioxidants
            'green tea extract': 'antioxidants',
            'resveratrol': 'antioxidants',
            'ferulic acid': 'antioxidants',
            'vitamin c': 'antioxidants',
            'vitamin e': 'antioxidants',
            
            // Chemical UV Filters
            'avobenzone': 'chemical_uv_filter',
            'octinoxate': 'chemical_uv_filter',
            'oxybenzone': 'chemical_uv_filter',
            'octisalate': 'chemical_uv_filter',
            'homosalate': 'chemical_uv_filter',
            
            // Mineral UV Filters  
            'zinc oxide': 'mineral_uv_filter',
            'titanium dioxide': 'mineral_uv_filter',
            
            // Panthenol
            'panthenol': 'panthenol',
            'pro-vitamin b5': 'panthenol',
            'dexpanthenol': 'panthenol',
            
            // Exfoliators (Physical)
            'jojoba beads': 'exfoliators',
            'pumice': 'exfoliators',
            'walnut shell': 'exfoliators',
            'microcrystalline cellulose': 'exfoliators'
        };
        
        this.BATCH_SIZE = 500; // Process 500 products per batch
    }

    async getProcessingStatus() {
        const client = await pool.connect();
        
        try {
            // Check total products
            const totalProductsResult = await client.query(`
                SELECT COUNT(*) as total 
                FROM products 
                WHERE ingredient_list IS NOT NULL 
                AND ingredient_list != ''
                AND is_active = true
            `);
            
            // Check already processed products
            const processedProductsResult = await client.query(`
                SELECT COUNT(DISTINCT product_id) as processed 
                FROM product_key_ingredients
            `);
            
            // Get unprocessed products count
            const unprocessedResult = await client.query(`
                SELECT COUNT(*) as unprocessed
                FROM products p
                WHERE p.ingredient_list IS NOT NULL 
                AND p.ingredient_list != ''
                AND p.is_active = true
                AND NOT EXISTS (
                    SELECT 1 FROM product_key_ingredients pki 
                    WHERE pki.product_id = p.id
                )
            `);
            
            const total = parseInt(totalProductsResult.rows[0].total);
            const processed = parseInt(processedProductsResult.rows[0].processed);
            const unprocessed = parseInt(unprocessedResult.rows[0].unprocessed);
            
            return { total, processed, unprocessed };
            
        } finally {
            client.release();
        }
    }

    async processBatch(offset, batchSize) {
        const client = await pool.connect();
        
        try {
            // Get unprocessed products in this batch
            const productsResult = await client.query(`
                SELECT p.id, p.name, p.ingredient_list
                FROM products p
                WHERE p.ingredient_list IS NOT NULL 
                AND p.ingredient_list != ''
                AND p.is_active = true
                AND NOT EXISTS (
                    SELECT 1 FROM product_key_ingredients pki 
                    WHERE pki.product_id = p.id
                )
                ORDER BY p.id
                LIMIT $1 OFFSET $2
            `, [batchSize, offset]);
            
            if (productsResult.rows.length === 0) {
                return { processed: 0, successful: 0, mappings: 0 };
            }
            
            console.log(`📦 Processing batch: ${productsResult.rows.length} products (offset: ${offset})`);
            
            // Get key ingredient types mapping
            const keyTypesResult = await client.query(`
                SELECT id, name, slug FROM key_ingredient_types
            `);
            
            const keyTypeMap = new Map();
            keyTypesResult.rows.forEach(kt => {
                keyTypeMap.set(kt.slug, kt.id);
                keyTypeMap.set(kt.name.toLowerCase(), kt.id);
            });
            
            let batchMappings = 0;
            let batchSuccessful = 0;
            
            // Process each product in batch
            for (const product of productsResult.rows) {
                try {
                    await client.query('BEGIN');
                    
                    const ingredientList = product.ingredient_list.toLowerCase();
                    const foundKeyIngredients = new Set();
                    
                    // Check each key ingredient mapping
                    for (const [ingredientName, keyTypeSlug] of Object.entries(this.keyIngredientMappings)) {
                        if (ingredientList.includes(ingredientName.toLowerCase())) {
                            const keyTypeId = keyTypeMap.get(keyTypeSlug);
                            if (keyTypeId) {
                                foundKeyIngredients.add(keyTypeId);
                            }
                        }
                    }
                    
                    // Insert mappings for this product
                    let productMappings = 0;
                    for (const keyTypeId of foundKeyIngredients) {
                        const insertResult = await client.query(`
                            INSERT INTO product_key_ingredients (product_id, key_type_id)
                            VALUES ($1, $2)
                            ON CONFLICT (product_id, key_type_id) DO NOTHING
                            RETURNING product_id
                        `, [product.id, keyTypeId]);
                        
                        if (insertResult.rows.length > 0) {
                            productMappings++;
                            batchMappings++;
                        }
                    }
                    
                    await client.query('COMMIT');
                    
                    if (productMappings > 0) {
                        batchSuccessful++;
                        if (batchSuccessful % 50 === 0) {
                            console.log(`  ✅ ${batchSuccessful} products processed in this batch...`);
                        }
                    }
                    
                } catch (error) {
                    await client.query('ROLLBACK');
                    console.warn(`  ⚠️ Failed to process product ${product.id}: ${error.message}`);
                }
            }
            
            return { 
                processed: productsResult.rows.length, 
                successful: batchSuccessful, 
                mappings: batchMappings 
            };
            
        } finally {
            client.release();
        }
    }

    async runIncrementalProcessing() {
        console.log('🚀 Starting Incremental Batch Processing...');
        
        // Get current status
        const status = await this.getProcessingStatus();
        console.log(`📊 Current Status:`);
        console.log(`   - Total products: ${status.total}`);
        console.log(`   - Already processed: ${status.processed}`);
        console.log(`   - Remaining: ${status.unprocessed}`);
        
        if (status.unprocessed === 0) {
            console.log('✅ All products already processed!');
            return;
        }
        
        let totalNewMappings = 0;
        let totalNewSuccessful = 0;
        let currentOffset = 0;
        let batchNumber = 1;
        
        console.log(`\n🎯 Will process ${status.unprocessed} remaining products in batches of ${this.BATCH_SIZE}`);
        
        while (currentOffset < status.unprocessed) {
            const startTime = Date.now();
            
            console.log(`\n📦 Batch ${batchNumber} (offset: ${currentOffset})`);
            
            const batchResult = await this.processBatch(currentOffset, this.BATCH_SIZE);
            
            if (batchResult.processed === 0) {
                console.log('✅ No more products to process');
                break;
            }
            
            totalNewMappings += batchResult.mappings;
            totalNewSuccessful += batchResult.successful;
            
            const batchTime = Date.now() - startTime;
            const successRate = ((batchResult.successful / batchResult.processed) * 100).toFixed(1);
            
            console.log(`  📊 Batch ${batchNumber} Results:`);
            console.log(`     - Processed: ${batchResult.processed} products`);
            console.log(`     - Successful: ${batchResult.successful} products (${successRate}%)`);
            console.log(`     - New mappings: ${batchResult.mappings}`);
            console.log(`     - Time: ${batchTime}ms`);
            
            currentOffset += this.BATCH_SIZE;
            batchNumber++;
            
            // Small pause between batches to avoid overwhelming database
            if (batchResult.processed === this.BATCH_SIZE) {
                console.log('  ⏳ Brief pause before next batch...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('\n🎉 Incremental Processing Complete!');
        console.log(`📊 Total New Results:`);
        console.log(`   - New successful products: ${totalNewSuccessful}`);
        console.log(`   - New mappings created: ${totalNewMappings}`);
        
        // Final status check
        const finalStatus = await this.getProcessingStatus();
        console.log(`\n📊 Final Status:`);
        console.log(`   - Total products: ${finalStatus.total}`);
        console.log(`   - Processed: ${finalStatus.processed}`);
        console.log(`   - Remaining: ${finalStatus.unprocessed}`);
        console.log(`   - Coverage: ${((finalStatus.processed / finalStatus.total) * 100).toFixed(1)}%`);
    }

    async updateAllProductsCSV() {
        console.log('\n🔄 Updating ALL products CSV fields...');
        
        const client = await pool.connect();
        
        try {
            const csvUpdateResult = await client.query(`
                UPDATE products 
                SET key_ingredients_csv = subquery.key_ingredients_text
                FROM (
                    SELECT 
                        p.id,
                        string_agg(kt.display_name, ', ') as key_ingredients_text
                    FROM products p
                    LEFT JOIN product_key_ingredients pki ON p.id = pki.product_id
                    LEFT JOIN key_ingredient_types kt ON pki.key_type_id = kt.id
                    WHERE p.is_active = true
                    GROUP BY p.id
                    HAVING COUNT(pki.key_type_id) > 0
                ) subquery
                WHERE products.id = subquery.id
            `);
            
            console.log(`✅ Updated ${csvUpdateResult.rowCount} products with key ingredients CSV`);
            
        } finally {
            client.release();
        }
    }

    async getFinalReport() {
        console.log('\n📈 Generating Final Report...');
        
        const client = await pool.connect();
        
        try {
            // Total mappings
            const totalMappings = await client.query(`
                SELECT COUNT(*) as total FROM product_key_ingredients
            `);
            
            // Distribution
            const distribution = await client.query(`
                SELECT 
                    kt.display_name as key_ingredient,
                    COUNT(pki.product_id) as product_count
                FROM key_ingredient_types kt
                LEFT JOIN product_key_ingredients pki ON kt.id = pki.key_type_id
                GROUP BY kt.id, kt.display_name
                ORDER BY product_count DESC
            `);
            
            console.log(`📊 Total mappings: ${totalMappings.rows[0].total}`);
            console.log('\n🏆 Top Key Ingredients:');
            distribution.rows.slice(0, 10).forEach(row => {
                if (row.product_count > 0) {
                    console.log(`   ${row.key_ingredient}: ${row.product_count} products`);
                }
            });
            
        } finally {
            client.release();
        }
    }
}

async function main() {
    try {
        const processor = new IncrementalBatchProcessor();
        
        console.log('🎯 MatchCare Incremental Key Ingredient Population');
        console.log('📋 This will continue from where you left off\n');
        
        // 1. Run incremental processing
        await processor.runIncrementalProcessing();
        
        // 2. Update CSV for all products
        await processor.updateAllProductsCSV();
        
        // 3. Generate final report
        await processor.getFinalReport();
        
        console.log('\n🎉 ALL DONE! Your database is now fully populated for ontology-based recommendations!');
        console.log('\n🚀 Next Steps:');
        console.log('1. Install hybrid recommendation engine');
        console.log('2. Test ontology-based recommendations');
        console.log('3. Start building advanced features');
        
    } catch (error) {
        console.error('❌ Incremental processing failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = IncrementalBatchProcessor;