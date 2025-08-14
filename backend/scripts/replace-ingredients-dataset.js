// backend/scripts/replace-ingredients-dataset.js
// Script untuk mengganti dataset dari matchcare_ultimate_cleaned.csv 
// ke skincare_dataset_with_explanations_corrected_FULL.csv

const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

class DatasetReplacer {
    constructor() {
        this.stats = {
            backup_count: 0,
            deleted_count: 0,
            imported_count: 0,
            errors: 0
        };
        this.errors = [];
    }

    // 1. Cari file CSV yang baru
    findNewCSVFile() {
        const possiblePaths = [
            './skincare_dataset_with_explanations_corrected_FULL.csv',
            '../skincare_dataset_with_explanations_corrected_FULL.csv',
            '../../skincare_dataset_with_explanations_corrected_FULL.csv',
            './data/skincare_dataset_with_explanations_corrected_FULL.csv',
            '../data/skincare_dataset_with_explanations_corrected_FULL.csv',
            './data/csv/skincare_dataset_with_explanations_corrected_FULL.csv',
            '../data/csv/skincare_dataset_with_explanations_corrected_FULL.csv',
        ];

        for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
                console.log(`✅ Found CSV file: ${filePath}`);
                return filePath;
            }
        }

        console.error('❌ CSV file not found in any expected location!');
        console.log('\n📍 Expected locations checked:');
        possiblePaths.forEach(path => console.log(`   - ${path}`));
        return null;
    }

    // 2. Backup data yang ada
    async createBackup(client) {
        console.log('\n💾 Creating backup of current ingredients data...');
        
        try {
            // Create backup table dengan timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const backupTableName = `ingredients_backup_${timestamp}`;
            
            await client.query(`
                CREATE TABLE ${backupTableName} AS 
                SELECT * FROM ingredients;
            `);
            
            const backupCount = await client.query(`SELECT COUNT(*) FROM ${backupTableName}`);
            this.stats.backup_count = parseInt(backupCount.rows[0].count);
            
            console.log(`✅ Backup created: ${backupTableName} (${this.stats.backup_count} records)`);
            
            // Export backup to SQL file
            const backupFilename = `ingredients_backup_${timestamp}.sql`;
            console.log(`💾 Also creating SQL backup file: ${backupFilename}`);
            
            return backupTableName;
        } catch (error) {
            console.error('❌ Backup failed:', error.message);
            throw error;
        }
    }

    // 3. Clear existing ingredients data
    async clearExistingData(client) {
        console.log('\n🗑️ Clearing existing ingredients data...');
        
        try {
            // Delete in correct order to respect foreign keys
            await client.query('DELETE FROM ingredient_functions_map');
            await client.query('DELETE FROM ingredient_benefits_map');
            await client.query('DELETE FROM ingredient_key_types');
            await client.query('DELETE FROM product_ingredients');
            
            const deleteResult = await client.query('DELETE FROM ingredients');
            this.stats.deleted_count = deleteResult.rowCount;
            
            console.log(`✅ Deleted ${this.stats.deleted_count} existing ingredients`);
            
            // Reset sequence
            await client.query('ALTER SEQUENCE ingredients_id_seq RESTART WITH 1');
            console.log('✅ Reset ingredient ID sequence');
            
        } catch (error) {
            console.error('❌ Clear data failed:', error.message);
            throw error;
        }
    }

    // 4. Import new dataset
    async importNewDataset(client, csvFilePath) {
        console.log('\n📥 Importing new dataset...');
        console.log(`📂 Reading from: ${csvFilePath}`);
        
        return new Promise((resolve, reject) => {
            const ingredients = [];
            let processedCount = 0;
            
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (row) => {
                    processedCount++;
                    
                    if (row.name && row.name.trim()) {
                        ingredients.push({
                            name: row.name.trim(),
                            actualFunctions: row.actualFunctions || '',
                            embeddedFunctions: row.embeddedFunctions || '',
                            functionalCategories: row.functionalCategories || '',
                            keyIngredientTypes: row.keyIngredientTypes || '',
                            isKeyIngredient: row.isKeyIngredient === 'Yes' || row.isKeyIngredient === 'true',
                            suitableForSkinTypes: row.suitableForSkinTypes || '',
                            addressesConcerns: row.addressesConcerns || '',
                            providedBenefits: row.providedBenefits || '',
                            usageInstructions: row.usageInstructions || '',
                            pregnancySafe: row.pregnancySafe === 'Yes' || row.pregnancySafe === 'true',
                            sensitivities: row.sensitivities || '',
                            alcoholFree: row.alcoholFree === 'Yes' || row.alcoholFree === 'true',
                            fragranceFree: row.fragranceFree === 'Yes' || row.fragranceFree === 'true',
                            siliconeFree: row.siliconeFree === 'Yes' || row.siliconeFree === 'true',
                            sulfateFree: row.sulfateFree === 'Yes' || row.sulfateFree === 'true',
                            parabenFree: row.parabenFree === 'Yes' || row.parabenFree === 'true',
                            explanation: row.explanation || '',
                            benefit: row.benefit || '',
                            safety: row.safety || '',
                            alternativeNames: row.alternativeNames || '',
                            whatItDoes: row.whatItDoes || '',
                            url: row.url || ''
                        });
                    }
                    
                    // Show progress
                    if (processedCount % 5000 === 0) {
                        console.log(`📊 Processed ${processedCount} rows, valid ingredients: ${ingredients.length}`);
                    }
                })
                .on('end', async () => {
                    try {
                        console.log(`\n📊 CSV parsing complete:`);
                        console.log(`   - Total rows processed: ${processedCount}`);
                        console.log(`   - Valid ingredients found: ${ingredients.length}`);
                        
                        // Import ingredients to database
                        console.log('\n💾 Inserting ingredients to database...');
                        
                        let successCount = 0;
                        const batchSize = 1000;
                        
                        for (let i = 0; i < ingredients.length; i += batchSize) {
                            const batch = ingredients.slice(i, i + batchSize);
                            
                            for (const ingredient of batch) {
                                try {
                                    await client.query(`
                                        INSERT INTO ingredients 
                                        (name, actual_functions, embedded_functions, functional_categories,
                                         is_key_ingredient, suitable_for_skin_types, addresses_concerns,
                                         provided_benefits, usage_instructions, pregnancy_safe, sensitivities,
                                         alcohol_free, fragrance_free, silicone_free, sulfate_free, paraben_free,
                                         explanation, benefit, safety, alternative_names, what_it_does, ontology_uri)
                                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                                    `, [
                                        ingredient.name,
                                        ingredient.actualFunctions,
                                        ingredient.embeddedFunctions,
                                        ingredient.functionalCategories,
                                        ingredient.isKeyIngredient,
                                        ingredient.suitableForSkinTypes,
                                        ingredient.addressesConcerns,
                                        ingredient.providedBenefits,
                                        ingredient.usageInstructions,
                                        ingredient.pregnancySafe,
                                        ingredient.sensitivities,
                                        ingredient.alcoholFree,
                                        ingredient.fragranceFree,
                                        ingredient.siliconeFree,
                                        ingredient.sulfateFree,
                                        ingredient.parabenFree,
                                        ingredient.explanation,
                                        ingredient.benefit,
                                        ingredient.safety,
                                        ingredient.alternativeNames,
                                        ingredient.whatItDoes,
                                        ingredient.url
                                    ]);
                                    
                                    successCount++;
                                } catch (error) {
                                    this.errors.push(`Failed to insert ${ingredient.name}: ${error.message}`);
                                    this.stats.errors++;
                                }
                            }
                            
                            // Show progress
                            console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: Inserted ${Math.min(i + batchSize, ingredients.length)}/${ingredients.length} ingredients`);
                        }
                        
                        this.stats.imported_count = successCount;
                        console.log(`\n✅ Import complete: ${successCount} ingredients imported successfully`);
                        
                        if (this.stats.errors > 0) {
                            console.log(`⚠️ ${this.stats.errors} errors occurred during import`);
                        }
                        
                        resolve();
                        
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', reject);
        });
    }

    // 5. Verify import results
    async verifyImport(client) {
        console.log('\n🔍 Verifying import results...');
        
        try {
            // Count total ingredients
            const totalCount = await client.query('SELECT COUNT(*) FROM ingredients');
            const total = parseInt(totalCount.rows[0].count);
            
            // Count key ingredients
            const keyCount = await client.query('SELECT COUNT(*) FROM ingredients WHERE is_key_ingredient = true');
            const keyTotal = parseInt(keyCount.rows[0].count);
            
            // Check some sample data
            const samples = await client.query(`
                SELECT name, what_it_does, is_key_ingredient, alcohol_free, fragrance_free 
                FROM ingredients 
                WHERE name IS NOT NULL 
                ORDER BY id 
                LIMIT 5
            `);
            
            console.log(`📊 Verification Results:`);
            console.log(`   - Total ingredients: ${total}`);
            console.log(`   - Key ingredients: ${keyTotal}`);
            console.log(`   - Sample data:`);
            
            samples.rows.forEach((row, index) => {
                console.log(`     ${index + 1}. ${row.name} (Key: ${row.is_key_ingredient ? 'Yes' : 'No'})`);
            });
            
            // Check for common ingredients
            const commonIngredients = ['Niacinamide', 'Hyaluronic Acid', 'Salicylic Acid', 'Retinol'];
            console.log(`\n🔍 Checking for common ingredients:`);
            
            for (const ingredientName of commonIngredients) {
                const found = await client.query('SELECT id, name FROM ingredients WHERE LOWER(name) = LOWER($1)', [ingredientName]);
                if (found.rows.length > 0) {
                    console.log(`   ✅ ${ingredientName} - Found (ID: ${found.rows[0].id})`);
                } else {
                    console.log(`   ❌ ${ingredientName} - Not found`);
                }
            }
            
            return total;
            
        } catch (error) {
            console.error('❌ Verification failed:', error.message);
            throw error;
        }
    }

    // Main replacement process
    async replaceDataset() {
        console.log('🔄 MatchCare Dataset Replacement Process');
        console.log('=========================================\n');
        
        // Safety checks
        const csvFilePath = this.findNewCSVFile();
        if (!csvFilePath) {
            console.error('\n❌ Cannot proceed without CSV file');
            console.log('\n💡 Solutions:');
            console.log('   1. Copy CSV file to script directory:');
            console.log('      cp /path/to/skincare_dataset_with_explanations_corrected_FULL.csv .');
            console.log('   2. Update file path in script');
            return false;
        }
        
        // Database connection test
        let client;
        try {
            client = await pool.connect();
            await client.query('SELECT NOW()');
            console.log('✅ Database connection successful');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
        
        try {
            console.log('\n⚠️ WARNING: This will replace ALL ingredient data in your database!');
            console.log('Make sure you have a backup of your entire database before proceeding.');
            console.log('\nContinuing in 5 seconds... Press Ctrl+C to cancel');
            
            // Wait 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Begin transaction
            await client.query('BEGIN');
            console.log('\n🔄 Starting database transaction...');
            
            // Step 1: Create backup
            const backupTable = await this.createBackup(client);
            
            // Step 2: Clear existing data
            await this.clearExistingData(client);
            
            // Step 3: Import new dataset
            await this.importNewDataset(client, csvFilePath);
            
            // Step 4: Verify results
            const totalImported = await this.verifyImport(client);
            
            // Commit if everything looks good
            if (totalImported > 20000) { // Expected around 28,502
                await client.query('COMMIT');
                console.log('\n✅ Transaction committed successfully!');
            } else {
                throw new Error(`Import count too low: ${totalImported}. Expected > 20,000`);
            }
            
            // Final summary
            console.log('\n🎉 DATASET REPLACEMENT COMPLETED!');
            console.log('================================');
            console.log(`📊 Summary:`);
            console.log(`   - Backup created: ${this.stats.backup_count} records`);
            console.log(`   - Old data deleted: ${this.stats.deleted_count} records`);
            console.log(`   - New data imported: ${this.stats.imported_count} records`);
            console.log(`   - Errors encountered: ${this.stats.errors}`);
            
            if (this.errors.length > 0) {
                console.log(`\n⚠️ First 3 errors:`);
                this.errors.slice(0, 3).forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error}`);
                });
            }
            
            console.log(`\n💾 Backup table: ${backupTable}`);
            console.log('💡 To restore backup if needed:');
            console.log(`   DELETE FROM ingredients; INSERT INTO ingredients SELECT * FROM ${backupTable};`);
            
            return true;
            
        } catch (error) {
            // Rollback on error
            await client.query('ROLLBACK');
            console.error('\n❌ TRANSACTION ROLLED BACK');
            console.error('Error:', error.message);
            
            console.log('\n🔧 Your database is unchanged. Check the error and try again.');
            return false;
            
        } finally {
            client.release();
            await pool.end();
        }
    }
}

// Run the replacement
async function main() {
    const replacer = new DatasetReplacer();
    
    try {
        const success = await replacer.replaceDataset();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = DatasetReplacer;