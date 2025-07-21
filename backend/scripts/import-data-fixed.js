// backend/scripts/import-data-fixed.js - Complete Fix for Brands Issue
const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// Database connection
const pool = new Pool({
    user: 'postgres',
    database: 'matchcare_fresh_db',
    password: '90226628',
    host: 'localhost',
    port: 5432
});

class MatchCareImporter {
    constructor() {
        this.stats = {};
        this.dataPath = path.join(__dirname, '../data/csv/');
        this.errors = [];
    }

    getFilePath(filename) {
        return path.join(this.dataPath, filename);
    }

    // 1. Import Brands (FIXED: Better conflict handling)
    async importBrands() {
    console.log('📋 Importing brands...');
    
    return new Promise((resolve) => {
        const brands = [];
        const filePath = this.getFilePath('brands.csv');
        
        console.log(`🔍 Looking for brands.csv at: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  brands.csv not found - skipping`);
            resolve();
            return;
        }

        fs.createReadStream(filePath)
            .pipe(csv({
                skipEmptyLines: true,
                // Handle BOM and encoding issues
                mapHeaders: ({ header }) => {
                    // Remove BOM if present and clean header
                    return header.replace(/^\uFEFF/, '').trim();
                }
            }))
            .on('data', (row) => {
                // Debug: Show first few rows
                if (brands.length < 3) {
                    console.log(`📋 Sample row ${brands.length + 1}:`, JSON.stringify(row));
                }
                
                // SOLUTION: Use multiple access methods
                let brandName = row.name || 
                               row.Name || 
                               row.brand || 
                               row.Brand ||
                               row[Object.keys(row)[0]]; // Fallback to first value
                
                // Clean the brand name
                if (brandName && typeof brandName === 'string') {
                    brandName = brandName.replace(/^\uFEFF/, '').trim(); // Remove BOM
                    if (brandName) {
                        brands.push(brandName);
                        console.log(`✅ Added brand: ${brandName} (total: ${brands.length})`);
                    }
                }
            })
            .on('end', async () => {
                try {
                    console.log(`📊 Parsed ${brands.length} brands from CSV`);
                    console.log('🔝 First 5 brands:', brands.slice(0, 5));
                    
                    if (brands.length === 0) {
                        console.log('❌ No brands found in CSV!');
                        resolve();
                        return;
                    }
                    
                    let insertCount = 0;
                    let existingCount = 0;
                    
                    for (const brand of brands) {
                        try {
                            // Check if brand already exists
                            const existingBrand = await pool.query(
                                'SELECT id FROM brands WHERE name = $1',
                                [brand]
                            );
                            
                            if (existingBrand.rows.length > 0) {
                                existingCount++;
                            } else {
                                // Insert new brand
                                const result = await pool.query(
                                    'INSERT INTO brands (name) VALUES ($1) RETURNING id',
                                    [brand]
                                );
                                if (result.rows.length > 0) {
                                    insertCount++;
                                }
                            }
                        } catch (error) {
                            this.errors.push(`Brand insert error: ${brand} - ${error.message}`);
                        }
                    }
                    
                    this.stats.brands = insertCount;
                    this.stats.brandsExisting = existingCount;
                    console.log(`✅ Imported ${insertCount} new brands, ${existingCount} already existed (${brands.length} total processed)`);
                    
                    // Verify total brands in database
                    const totalBrands = await pool.query('SELECT COUNT(*) FROM brands');
                    console.log(`📈 Total brands in database: ${totalBrands.rows[0].count}`);
                    
                    resolve();
                } catch (error) {
                    console.error('Error importing brands:', error.message);
                    this.stats.brands = 0;
                    resolve();
                }
            })
            .on('error', (error) => {
                console.error('Error reading brands.csv:', error.message);
                this.stats.brands = 0;
                resolve();
            });
    });
}

    // 2. Import Products (Enhanced with better brand checking)
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

        fs.createReadStream(filePath)
            .pipe(csv({
                skipEmptyLines: true,
                mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim()
            }))
            .on('data', (row) => {
                // Use dynamic access with multiple fallbacks
                const productName = row['Product Name'] || 
                                   row['product name'] || 
                                   row['Product_Name'] ||
                                   row[Object.keys(row).find(k => k.toLowerCase().includes('product') && k.toLowerCase().includes('name'))];
                
                const brand = row['Brand'] || 
                             row['brand'] || 
                             row[Object.keys(row).find(k => k.toLowerCase().includes('brand'))];

                if (productName && brand && 
                    typeof productName === 'string' && typeof brand === 'string' && 
                    productName.trim() && brand.trim()) {
                    
                    products.push({
                        productUrl: row['Product URL'] || '',
                        name: productName.trim(),
                        brand: brand.trim(),
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
                        categorizationConfidence: parseInt(row['Categorization_Confidence']) || null
                    });
                }
            })
            .on('end', async () => {
                try {
                    console.log(`📊 Parsed ${products.length} products from CSV`);
                    
                    // Get existing brands ONCE and create a Map for fast lookup
                    const existingBrands = await pool.query('SELECT id, name FROM brands');
                    const brandMap = new Map();
                    existingBrands.rows.forEach(brand => {
                        brandMap.set(brand.name, brand.id);
                    });
                    console.log(`🏢 Available brands in database: ${brandMap.size}`);
                    
                    // Check what products already exist to avoid duplicates
                    const existingProducts = await pool.query('SELECT name, brand_id FROM products');
                    const existingProductsSet = new Set();
                    existingProducts.rows.forEach(product => {
                        existingProductsSet.add(`${product.name}|${product.brand_id}`);
                    });
                    console.log(`📦 Existing products in database: ${existingProducts.rows.length}`);
                    
                    // Identify missing brands first
                    const productBrands = new Set(products.map(p => p.brand));
                    const missingBrands = [...productBrands].filter(brand => !brandMap.has(brand));
                    
                    if (missingBrands.length > 0) {
                        console.log(`🔧 Found ${missingBrands.length} missing brands, creating them...`);
                        console.log(`📝 Missing brands: ${missingBrands.slice(0, 10).join(', ')}${missingBrands.length > 10 ? '...' : ''}`);
                        
                        // Create missing brands in batch
                        for (const brand of missingBrands) {
                            try {
                                const result = await pool.query(
                                    'INSERT INTO brands (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id',
                                    [brand]
                                );
                                if (result.rows.length > 0) {
                                    brandMap.set(brand, result.rows[0].id);
                                } else {
                                    // Brand already exists, get its ID
                                    const existingBrand = await pool.query('SELECT id FROM brands WHERE name = $1', [brand]);
                                    if (existingBrand.rows.length > 0) {
                                        brandMap.set(brand, existingBrand.rows[0].id);
                                    }
                                }
                            } catch (error) {
                                console.error(`❌ Error creating brand ${brand}:`, error.message);
                            }
                        }
                        console.log(`✅ Updated brand map, now has ${brandMap.size} brands`);
                    }
                    
                    // Process products in chunks to avoid memory/timeout issues
                    const CHUNK_SIZE = 50; // Smaller chunks for better error handling
                    let insertCount = 0;
                    let skipped = 0;
                    let duplicates = 0;
                    
                    console.log(`🔄 Processing ${products.length} products in chunks of ${CHUNK_SIZE}...`);
                    
                    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
                        const chunk = products.slice(i, i + CHUNK_SIZE);
                        console.log(`📦 Processing chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(products.length/CHUNK_SIZE)} (products ${i + 1}-${Math.min(i + CHUNK_SIZE, products.length)})`);
                        
                        // Process each product in the chunk
                        for (const product of chunk) {
                            try {
                                const brandId = brandMap.get(product.brand);

                                if (!brandId) {
                                    if (skipped < 10) { // Only log first 10 missing brands
                                        console.log(`⚠️  Brand not found in map: ${product.brand}`);
                                    }
                                    skipped++;
                                    continue;
                                }

                                // Check if product already exists
                                const productKey = `${product.name}|${brandId}`;
                                if (existingProductsSet.has(productKey)) {
                                    duplicates++;
                                    continue;
                                }

                                // ✅ FIXED: Remove ON CONFLICT clause completely
                                const result = await pool.query(`
                                    INSERT INTO products (
                                        product_url, name, brand_id, product_type, description,
                                        how_to_use, ingredient_list, local_image_path,
                                        bpom_number, main_category, subcategory, 
                                        alcohol_free, fragrance_free, paraben_free, 
                                        sulfate_free, silicone_free, is_active
                                    ) VALUES (
                                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                                        $11, $12, $13, $14, $15, $16, true
                                    ) RETURNING id
                                `, [
                                    product.productUrl, 
                                    product.name,                    
                                    brandId, 
                                    product.productType,
                                    product.description, 
                                    product.howToUse, 
                                    product.ingredientList,
                                    product.localImagePath,          
                                    product.bpomNumber,
                                    product.mainCategory,            
                                    product.subcategory,             
                                    product.alcoholFree, 
                                    product.fragranceFree,
                                    product.parabenFree, 
                                    product.sulfateFree, 
                                    product.siliconeFree
                                ]);

                                if (result.rows.length > 0) {
                                    insertCount++;
                                    // Add to existing set to prevent future duplicates in this session
                                    existingProductsSet.add(productKey);
                                }

                            } catch (error) {
                                if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
                                    duplicates++;
                                } else {
                                    if (skipped < 10) { // Only log first 10 errors
                                        console.error(`❌ Error inserting product ${product.name}:`, error.message);
                                    }
                                    skipped++;
                                }
                            }
                        }
                        
                        // Show progress after each chunk
                        console.log(`✅ Chunk completed. Progress: ${insertCount} inserted, ${duplicates} duplicates, ${skipped} errors`);
                        
                        // Small delay to prevent overwhelming the database
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    this.stats.products = insertCount;
                    this.stats.productsSkipped = skipped;
                    this.stats.productsDuplicates = duplicates;
                    
                    console.log(`✅ Imported ${insertCount} products (${duplicates} duplicates, ${skipped} errors, ${products.length} total processed)`);
                    
                    // Verify total products in database
                    const totalProducts = await pool.query('SELECT COUNT(*) FROM products');
                    console.log(`📈 Total products in database: ${totalProducts.rows[0].count}`);
                    
                    resolve();
                } catch (error) {
                    console.error('❌ Error importing products:', error.message);
                    console.error('❌ Stack trace:', error.stack);
                    this.stats.products = 0;
                    resolve();
                }
            })
            .on('error', (error) => {
                console.error('❌ Error reading products CSV:', error.message);
                this.stats.products = 0;
                resolve();
            });
    });
}


    // 3. Import Ingredients (Keep existing - already working)
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
                        });
                    }
                })
                .on('end', async () => {
                    console.log(`📊 Parsed ${ingredients.length} ingredients from CSV`);
                    
                    // Check if ingredients already exist
                    const existingIngredients = await pool.query('SELECT COUNT(*) FROM ingredients');
                    console.log(`🧪 Existing ingredients in database: ${existingIngredients.rows[0].count}`);
                    
                    if (existingIngredients.rows[0].count > 25000) {
                        console.log('⏭️  Ingredients already imported, skipping...');
                        this.stats.ingredients = parseInt(existingIngredients.rows[0].count);
                        this.stats.ingredientsSkipped = 0;
                        resolve();
                        return;
                    }
                    
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
                                
                                count++;
                            } catch (error) {
                                skipped++;
                            }
                        }
                        
                        if (i % 5000 === 0) {
                            console.log(`✅ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ingredients.length/batchSize)} (${count} processed)`);
                        }
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
            // Check if mappings already exist
            const existingMappings = await pool.query('SELECT COUNT(*) FROM product_ingredients');
            console.log(`🔗 Existing mappings: ${existingMappings.rows[0].count}`);
            
            if (existingMappings.rows[0].count > 10000) {
                console.log('⏭️  Mappings already created, skipping...');
                this.stats.mappings = parseInt(existingMappings.rows[0].count);
                return;
            }
            
            // Get products with ingredients
            const products = await pool.query(`
                SELECT id, ingredient_list, key_ingredients_csv, name
                FROM products 
                WHERE ingredient_list IS NOT NULL AND ingredient_list != ''
                ORDER BY id
                LIMIT 2000
            `);
            
            console.log(`🔄 Processing ${products.rows.length} products for ingredient mapping...`);
            
            let totalMappings = 0;
            
            for (let i = 0; i < products.rows.length; i++) {
                const product = products.rows[i];
                let productMappings = 0;
                
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
                                    false
                                ]);
                                
                                if (result.rows.length > 0) {
                                    productMappings++;
                                    totalMappings++;
                                }
                            }
                        } catch (error) {
                            // Skip individual mapping errors
                        }
                    }
                }
                
                // Progress indicator
                if (i % 100 === 0 && i > 0) {
                    console.log(`✅ Processed ${i}/${products.rows.length} products (${totalMappings} mappings created)`);
                }
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
        console.log('🚀 MatchCare CSV Data Import (Fixed Version)\n');
        console.log('📂 Reading CSV files from backend/data/csv/...');
        console.log('🔧 With enhanced error handling and conflict resolution\n');
        
        // Test connection first
        const connected = await this.testConnection();
        if (!connected) {
            console.error('❌ Import stopped - fix database connection first');
            return;
        }
        
        const startTime = Date.now();
        
        try {
            // Import in optimal order with better error handling
            await this.importBrands();           // Fixed brands import
            await this.importProducts();         // Enhanced products import  
            await this.importIngredients();      // Optimized ingredients import
            await this.createProductIngredientMappings(); // Enhanced mappings
            
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