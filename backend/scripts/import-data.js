// backend/scripts/import-data.js - Optimized for Clean CSV Structure
const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// Database connection
const pool = new Pool({
    user: 'postgres',
    database: 'matchcare_fresh_db',
    password: '90226628', // ← EDIT INI
    host: 'localhost',
    port: 5432
});

class MatchCareImporter {
    constructor() {
        this.stats = {};
        this.dataPath = path.join(__dirname, '../data/csv/'); // Root project path
        this.errors = [];
    }

    getFilePath(filename) {
        return path.join(this.dataPath, filename);
    }

    // 1. Import Brands (Perfect for single-column CSV)
    async importBrands() {
        console.log('📋 Importing brands...');
        
        return new Promise((resolve) => {
            const brands = [];
            const filePath = this.getFilePath('brands.csv');
            
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  brands.csv not found - skipping`);
                resolve();
                return;
            }

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    // Perfect: CSV now has single 'name' column
                    if (row.name && row.name.trim()) {
                        brands.push(row.name.trim());
                    }
                })
                .on('end', async () => {
                    try {
                        let insertCount = 0;
                        console.log(`Processing ${brands.length} brands...`);
                        
                        for (const brand of brands) {
                            try {
                                const result = await pool.query(
                                    'INSERT INTO brands (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id',
                                    [brand]
                                );
                                if (result.rows.length > 0) insertCount++;
                            } catch (error) {
                                this.errors.push(`Brand insert error: ${brand} - ${error.message}`);
                            }
                        }
                        
                        this.stats.brands = insertCount;
                        console.log(`✅ Imported ${insertCount} brands (${brands.length} total processed)`);
                        resolve();
                    } catch (error) {
                        console.error('Error importing brands:', error.message);
                        resolve();
                    }
                })
                .on('error', (error) => {
                    console.error('Error reading brands.csv:', error.message);
                    resolve();
                });
        });
    }

    // 2. Import Products (No changes needed)
    async importProducts() {
        console.log('📋 Importing products (this may take a while)...');
        
        return new Promise((resolve) => {
            const products = [];
            const filePath = this.getFilePath('new_final_corrected_matchcare_data.csv');
            
            if (!fs.existsSync(filePath)) {
                console.log(`❌ new_final_corrected_matchcare_data.csv not found!`);
                resolve();
                return;
            }

            let count = 0;
            let skipped = 0;
            
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    if (row['Product Name'] && row['Brand']) {
                        products.push({
                            productUrl: row['Product URL'] || '',
                            name: row['Product Name'].trim(),
                            brand: row['Brand'].trim(),
                            productType: row['Product Type'] || '',
                            description: row['Description'] || '',
                            howToUse: row['How to Use'] || '',
                            ingredientList: row['IngredientList'] || '',
                            imageUrls: row['Image URLs'] || '',
                            localImagePath: row['Local Image Path'] || '',
                            bpomNumber: row['BPOM Number'] || '',
                            keyIngredients: row['Key_Ingredients'] || '',
                            alcoholFree: row['alcohol_free'] === 'true',
                            fragranceFree: row['fragrance_free'] === 'true',
                            parabenFree: row['paraben_free'] === 'true',
                            sulfateFree: row['sulfate_free'] === 'true',
                            siliconeFree: row['silicone_free'] === 'true',
                            mainCategory: row['Main_Category'] || '',
                            subcategory: row['Subcategory'] || '',
                            categorizationConfidence: row['Categorization_Confidence'] || null
                        });
                    }
                })
                .on('end', async () => {
                    console.log(`Processing ${products.length} products...`);
                    
                    for (let i = 0; i < products.length; i++) {
                        const product = products[i];
                        try {
                            // Find brand_id
                            const brandResult = await pool.query(
                                'SELECT id FROM brands WHERE name = $1',
                                [product.brand]
                            );
                            const brandId = brandResult.rows[0]?.id;

                            if (!brandId) {
                                this.errors.push(`Brand not found: ${product.brand} for product: ${product.name}`);
                                skipped++;
                                continue;
                            }

                            // Find category_id from existing product_categories
                            let categoryId = null;
                            if (product.mainCategory) {
                                const categoryResult = await pool.query(
                                    'SELECT id FROM product_categories WHERE name = $1',
                                    [product.mainCategory]
                                );
                                categoryId = categoryResult.rows[0]?.id;
                            }

                            const result = await pool.query(`
                                INSERT INTO products 
                                (product_url, name, brand_id, brand, product_type, description, how_to_use,
                                 ingredient_list, local_image_path, bpom_number, key_ingredients_csv,
                                 alcohol_free, fragrance_free, paraben_free, sulfate_free,
                                 silicone_free, main_category, subcategory, main_category_id)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                                ON CONFLICT (name, brand_id) DO NOTHING RETURNING id
                            `, [
                                product.productUrl, product.name, brandId, product.brand,
                                product.productType, product.description, product.howToUse,
                                product.ingredientList, product.localImagePath, product.bpomNumber,
                                product.keyIngredients ? `{${product.keyIngredients}}` : null,
                                product.alcoholFree, product.fragranceFree,
                                product.parabenFree, product.sulfateFree, product.siliconeFree,
                                product.mainCategory, product.subcategory, categoryId
                            ]);
                            
                            if (result.rows.length > 0) count++;

                            // Progress indicator
                            if (i % 500 === 0 && i > 0) {
                                console.log(`✅ Processed ${i}/${products.length} products... (${count} inserted, ${skipped} skipped)`);
                            }
                        } catch (error) {
                            this.errors.push(`Product insert error: ${product.name} - ${error.message}`);
                            skipped++;
                        }
                    }
                    
                    this.stats.products = count;
                    this.stats.productsSkipped = skipped;
                    console.log(`✅ Imported ${count} products (${skipped} skipped, ${products.length} total processed)`);
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error reading products CSV:', error.message);
                    resolve();
                });
        });
    }

    // 3. Import Ingredients (Perfect for cleaned 23-column CSV)
    async importIngredients() {
        console.log('📋 Importing ingredients (this will take several minutes)...');
        
        return new Promise((resolve) => {
            const ingredients = [];
            const filePath = this.getFilePath('matchcare_ultimate_cleaned.csv');
            
            if (!fs.existsSync(filePath)) {
                console.log(`❌ matchcare_ultimate_cleaned.csv not found!`);
                resolve();
                return;
            }

            let count = 0;
            let skipped = 0;
            
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    if (row.name && row.name.trim()) {
                        ingredients.push({
                            name: row.name.trim(),
                            actualFunctions: row.actualFunctions || '',
                            embeddedFunctions: row.embeddedFunctions || '',
                            functionalCategories: row.functionalCategories || '',
                            keyIngredientTypes: row.keyIngredientTypes || '',
                            isKeyIngredient: row.isKeyIngredient === 'Yes',
                            suitableForSkinTypes: row.suitableForSkinTypes || '',
                            addressesConcerns: row.addressesConcerns || '',
                            providedBenefits: row.providedBenefits || '',
                            usageInstructions: row.usageInstructions || '',
                            pregnancySafe: row.pregnancySafe === 'Yes',
                            sensitivities: row.sensitivities || '',
                            alcoholFree: row.alcoholFree === 'Yes',
                            fragranceFree: row.fragranceFree === 'Yes',
                            siliconeFree: row.siliconeFree === 'Yes',
                            sulfateFree: row.sulfateFree === 'Yes',
                            parabenFree: row.parabenFree === 'Yes',
                            explanation: row.explanation || '',
                            benefit: row.benefit || '',
                            safety: row.safety || '',
                            alternativeNames: row.alternativeNames || '',
                            whatItDoes: row.whatItDoes || '',
                            url: row.url || ''
                            // Perfect: No extra columns to filter out!
                        });
                    }
                })
                .on('end', async () => {
                    console.log(`Processing ${ingredients.length} ingredients...`);
                    
                    // Process in batches for better performance
                    const batchSize = 1000;
                    for (let i = 0; i < ingredients.length; i += batchSize) {
                        const batch = ingredients.slice(i, i + batchSize);
                        
                        for (const ingredient of batch) {
                            try {
                                const result = await pool.query(`
                                    INSERT INTO ingredients 
                                    (name, actual_functions, embedded_functions, functional_categories,
                                     is_key_ingredient, usage_instructions, pregnancy_safe,
                                     alcohol_free, fragrance_free, silicone_free, sulfate_free, paraben_free,
                                     explanation, benefit, safety, alternative_names, what_it_does, ontology_uri)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                                    ON CONFLICT (name) DO UPDATE SET
                                    is_key_ingredient = EXCLUDED.is_key_ingredient,
                                    what_it_does = EXCLUDED.what_it_does,
                                    updated_at = CURRENT_TIMESTAMP
                                    RETURNING id
                                `, [
                                    ingredient.name, ingredient.actualFunctions, ingredient.embeddedFunctions,
                                    ingredient.functionalCategories, ingredient.isKeyIngredient,
                                    ingredient.usageInstructions, ingredient.pregnancySafe,
                                    ingredient.alcoholFree, ingredient.fragranceFree, ingredient.siliconeFree,
                                    ingredient.sulfateFree, ingredient.parabenFree, ingredient.explanation,
                                    ingredient.benefit, ingredient.safety, ingredient.alternativeNames,
                                    ingredient.whatItDoes, ingredient.url
                                ]);
                                
                                if (result.rows.length > 0) count++;
                            } catch (error) {
                                this.errors.push(`Ingredient insert error: ${ingredient.name} - ${error.message}`);
                                skipped++;
                            }
                        }
                        
                        console.log(`✅ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ingredients.length/batchSize)} (${count} inserted, ${skipped} skipped)`);
                    }
                    
                    this.stats.ingredients = count;
                    this.stats.ingredientsSkipped = skipped;
                    console.log(`✅ Imported ${count} ingredients (${skipped} skipped, ${ingredients.length} total processed)`);
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error reading ingredients CSV:', error.message);
                    resolve();
                });
        });
    }

    // 4. Create Product-Ingredient Mappings (Enhanced)
    async createProductIngredientMappings() {
        console.log('📋 Creating product-ingredient mappings...');
        
        try {
            // Process in batches to avoid memory issues
            const batchSize = 1000;
            let offset = 0;
            let totalMappings = 0;
            
            while (true) {
                const products = await pool.query(`
                    SELECT id, ingredient_list, key_ingredients_csv 
                    FROM products 
                    WHERE ingredient_list IS NOT NULL AND ingredient_list != ''
                    ORDER BY id
                    LIMIT $1 OFFSET $2
                `, [batchSize, offset]);
                
                if (products.rows.length === 0) break;
                
                let batchMappings = 0;
                
                for (const product of products.rows) {
                    if (product.ingredient_list) {
                        // Improved ingredient parsing
                        const ingredientNames = product.ingredient_list
                            .toLowerCase()
                            .replace(/[()[\]]/g, '') // Remove brackets
                            .split(/[,;]/) // Split on comma or semicolon
                            .map(name => name.trim())
                            .filter(name => 
                                name.length > 2 && 
                                !name.includes('http') && 
                                !name.includes('www') &&
                                !/^\d+$/.test(name) // Filter out pure numbers
                            )
                            .slice(0, 30); // Limit to first 30 ingredients per product
                        
                        for (const ingredientName of ingredientNames) {
                            try {
                                const ingredient = await pool.query(
                                    'SELECT id FROM ingredients WHERE LOWER(name) = $1 LIMIT 1',
                                    [ingredientName]
                                );
                                
                                if (ingredient.rows.length > 0) {
                                    const result = await pool.query(`
                                        INSERT INTO product_ingredients (product_id, ingredient_id, is_key_ingredient)
                                        VALUES ($1, $2, $3)
                                        ON CONFLICT (product_id, ingredient_id) DO NOTHING
                                        RETURNING id
                                    `, [
                                        product.id, 
                                        ingredient.rows[0].id,
                                        false // Will be updated later if needed
                                    ]);
                                    
                                    if (result.rows.length > 0) {
                                        batchMappings++;
                                        totalMappings++;
                                    }
                                }
                            } catch (error) {
                                // Skip individual mapping errors
                            }
                        }
                    }
                }
                
                offset += batchSize;
                console.log(`✅ Processed batch ${Math.floor(offset/batchSize)}: ${batchMappings} mappings created`);
            }
            
            this.stats.mappings = totalMappings;
            console.log(`✅ Created ${totalMappings} product-ingredient mappings total`);
            
        } catch (error) {
            console.error('Error creating mappings:', error.message);
            this.stats.mappings = 0;
        }
    }

    // Test database connection
    async testConnection() {
        try {
            const result = await pool.query('SELECT NOW(), version()');
            console.log('✅ Database connected successfully');
            console.log(`📊 PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`);
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            console.error('Check: PostgreSQL running, credentials correct');
            return false;
        }
    }

    // Main import function
    async importAll() {
        console.log('🚀 MatchCare CSV Data Import (Optimized for Clean CSV)\n');
        console.log('📂 Reading CSV files from project root...');
        console.log('✨ CSV structure: brands(1 col), ingredients(23 cols), products(19 cols)\n');
        
        // Test connection first
        const connected = await this.testConnection();
        if (!connected) {
            console.error('❌ Import stopped - fix database connection first');
            return;
        }
        
        const startTime = Date.now();
        
        try {
            // Import in optimal order
            await this.importBrands();           // From clean brands.csv
            await this.importProducts();         // From new_final_corrected_matchcare_data.csv
            await this.importIngredients();      // From clean matchcare_ultimate_cleaned.csv
            await this.createProductIngredientMappings(); // Create relationships
            
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000 / 60 * 10) / 10; // minutes
            
            console.log('\n🎉 Import completed successfully!');
            console.log(`⏱️  Total time: ${duration} minutes`);
            console.log('\n📊 Import Statistics:');
            console.table(this.stats);
            
            // Show errors summary
            if (this.errors.length > 0) {
                console.log(`\n⚠️  ${this.errors.length} errors occurred during import`);
                console.log('First 5 errors:');
                this.errors.slice(0, 5).forEach((error, index) => {
                    console.log(`${index + 1}. ${error}`);
                });
            } else {
                console.log('\n✅ No errors during import!');
            }
            
            await this.verifyImport();
            
        } catch (error) {
            console.error('❌ Import failed:', error.message);
        } finally {
            await pool.end();
        }
    }

    // Enhanced verification
    async verifyImport() {
        console.log('\n🔍 Verifying import...');
        
        try {
            // Check table counts
            const verification = await pool.query(`
                SELECT 
                    'brands' as table_name, 
                    COUNT(*) as count,
                    'Expected: ~238' as expected
                FROM brands
                UNION ALL
                SELECT 
                    'products', 
                    COUNT(*),
                    'Expected: ~3940'
                FROM products
                UNION ALL
                SELECT 
                    'ingredients', 
                    COUNT(*),
                    'Expected: ~28502'
                FROM ingredients
                UNION ALL
                SELECT 
                    'product_ingredients', 
                    COUNT(*),
                    'Expected: 10000+'
                FROM product_ingredients
                ORDER BY table_name
            `);
            
            console.log('\n📈 Final Database Counts:');
            console.table(verification.rows);
            
            // Data quality checks
            const qualityChecks = await pool.query(`
                SELECT 
                    'Products with brands' as check_name,
                    COUNT(*) as count,
                    'Should be close to total products' as note
                FROM products WHERE brand_id IS NOT NULL
                UNION ALL
                SELECT 
                    'Key ingredients',
                    COUNT(*),
                    'Ingredients marked as key'
                FROM ingredients WHERE is_key_ingredient = true
                UNION ALL
                SELECT 
                    'Products with mappings',
                    COUNT(DISTINCT product_id),
                    'Products that have ingredient mappings'
                FROM product_ingredients
            `);
            
            console.log('\n🔍 Data Quality Checks:');
            console.table(qualityChecks.rows);
            
            // Sample data
            const sampleProducts = await pool.query(`
                SELECT 
                    p.name as product, 
                    b.name as brand, 
                    p.main_category,
                    COUNT(pi.ingredient_id) as ingredient_count
                FROM products p 
                LEFT JOIN brands b ON p.brand_id = b.id 
                LEFT JOIN product_ingredients pi ON p.id = pi.product_id
                GROUP BY p.id, p.name, b.name, p.main_category
                ORDER BY ingredient_count DESC
                LIMIT 5
            `);
            
            console.log('\n🧪 Sample Products (with most ingredients):');
            console.table(sampleProducts.rows);
            
        } catch (error) {
            console.error('Error during verification:', error.message);
        }
    }
}

// Run import
if (require.main === module) {
    const importer = new MatchCareImporter();
    importer.importAll();
}

module.exports = MatchCareImporter;