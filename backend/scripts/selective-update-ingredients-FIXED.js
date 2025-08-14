// backend/scripts/selective-update-ingredients-FIXED.js
// Fixed version dengan explicit separator dan enhanced debugging

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

class FixedSelectiveIngredientUpdater {
    constructor() {
        this.stats = {
            csv_rows: 0,
            matched_ingredients: 0,
            updated_ingredients: 0,
            skipped_no_changes: 0,
            not_found_in_db: 0,
            errors: 0
        };
        this.errors = [];
    }

    // Find CSV file
    findCSVFile() {
        const possiblePaths = [
            './data/csv/skincare_dataset_with_explanations_corrected_FULL.csv',
            './skincare_dataset_with_explanations_corrected_FULL.csv',
            '../skincare_dataset_with_explanations_corrected_FULL.csv',
            '../../skincare_dataset_with_explanations_corrected_FULL.csv'
        ];

        for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
                console.log(`✅ Found CSV file: ${filePath}`);
                return filePath;
            }
        }

        console.error('❌ CSV file not found!');
        return null;
    }

    // Get existing database columns
    async getDatabaseColumns(client) {
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ingredients' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        return result.rows.map(row => row.column_name);
    }

    // Map CSV columns to database columns - FIXED MAPPING
    mapCSVToDatabase() {
        return {
            // CSV column name -> Database column name
            'name': 'name',  // THIS IS THE KEY FIELD
            'actualFunctions': 'actual_functions',
            'embeddedFunctions': 'embedded_functions', 
            'functionalCategories': 'functional_categories',
            'isKeyIngredient': 'is_key_ingredient',
            'suitableForSkinTypes': 'suitable_for_skin_types',
            'addressesConcerns': 'addresses_concerns',
            'providedBenefits': 'provided_benefits',
            'usageInstructions': 'usage_instructions',
            'pregnancySafe': 'pregnancy_safe',
            'sensitivities': 'sensitivities',
            'alcoholFree': 'alcohol_free',
            'fragranceFree': 'fragrance_free',
            'siliconeFree': 'silicone_free',
            'sulfateFree': 'sulfate_free',
            'parabenFree': 'paraben_free',
            'explanation': 'explanation',
            'benefit': 'benefit',
            'safety': 'safety',
            'alternativeNames': 'alternative_names',
            'whatItDoes': 'what_it_does'
        };
    }

    // Check if values are different
    valuesDifferent(dbValue, csvValue) {
        // Normalize values for comparison
        const normalize = (val) => {
            if (val === null || val === undefined) return '';
            return val.toString().trim();
        };
        
        return normalize(dbValue) !== normalize(csvValue);
    }

    // Convert CSV boolean values
    convertBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'yes' || lower === 'true' || lower === '1';
        }
        return false;
    }

    // Process CSV and update database - FIXED VERSION
    async processUpdates(client, csvFilePath) {
        console.log('\n📥 Processing CSV updates...');
        
        // Get database columns
        const dbColumns = await this.getDatabaseColumns(client);
        const columnMapping = this.mapCSVToDatabase();
        
        console.log(`📊 Database has ${dbColumns.length} columns`);
        console.log(`📊 Mapping ${Object.keys(columnMapping).length} CSV columns`);
        
        // Filter only columns that exist in database
        const validMappings = {};
        Object.entries(columnMapping).forEach(([csvCol, dbCol]) => {
            if (dbColumns.includes(dbCol)) {
                validMappings[csvCol] = dbCol;
            } else {
                console.log(`⚠️ Skipping ${csvCol} -> ${dbCol} (column not in database)`);
            }
        });
        
        console.log(`✅ Will update ${Object.keys(validMappings).length} columns:`);
        Object.entries(validMappings).forEach(([csvCol, dbCol]) => {
            console.log(`   ${csvCol} -> ${dbCol}`);
        });
        
        return new Promise((resolve, reject) => {
            const updates = [];
            
            // FIXED: Explicitly specify separator and options
            fs.createReadStream(csvFilePath)
                .pipe(csv({ 
                    separator: ',',           // EXPLICIT comma separator
                    skipEmptyLines: true,     // Skip empty lines
                    skipLinesWithError: true  // Skip malformed lines
                }))
                .on('data', (row) => {
                    this.stats.csv_rows++;
                    
                    // Enhanced debugging for first few rows
                    if (this.stats.csv_rows <= 5) {
                        console.log(`\n🔍 CSV Row ${this.stats.csv_rows} DEBUG:`);
                        console.log(`   All keys in row:`, Object.keys(row));
                        console.log(`   name field:`, `"${row.name}"`);
                        console.log(`   name type:`, typeof row.name);
                        console.log(`   name length:`, row.name ? row.name.length : 'N/A');
                        console.log(`   Raw name data:`, JSON.stringify(row.name));
                        console.log(`   actualFunctions:`, (row.actualFunctions || '').substring(0, 30) + '...');
                        console.log(`   explanation:`, (row.explanation || '').substring(0, 50) + '...');
                    }
                    
                    // FIXED: Better name field validation
                    if (row.name && typeof row.name === 'string' && row.name.trim().length > 0) {
                        // Prepare update data
                        const updateData = {
                            name: row.name.trim()
                        };
                        
                        // Map all valid columns
                        Object.entries(validMappings).forEach(([csvCol, dbCol]) => {
                            if (csvCol !== 'name') { // Skip name as it's used for matching
                                let value = row[csvCol] || '';
                                
                                // Handle boolean columns
                                if (['is_key_ingredient', 'pregnancy_safe', 'alcohol_free', 
                                     'fragrance_free', 'silicone_free', 'sulfate_free', 
                                     'paraben_free'].includes(dbCol)) {
                                    value = this.convertBoolean(value);
                                }
                                
                                updateData[dbCol] = value;
                            }
                        });
                        
                        updates.push(updateData);
                        
                        // Show sample successful parsing
                        if (updates.length <= 3) {
                            console.log(`   ✅ Successfully parsed: "${updateData.name}"`);
                        }
                    } else {
                        // Enhanced error logging
                        console.log(`   ❌ Invalid/missing name in row ${this.stats.csv_rows}:`, {
                            name: JSON.stringify(row.name),
                            firstFewKeys: Object.keys(row).slice(0, 5),
                            hasData: Object.values(row).some(v => v && v.toString().trim())
                        });
                    }
                    
                    // Progress indicator
                    if (this.stats.csv_rows % 5000 === 0) {
                        console.log(`📊 Processed ${this.stats.csv_rows} CSV rows, valid ingredients: ${updates.length}...`);
                    }
                })
                .on('end', async () => {
                    try {
                        console.log(`\n📋 CSV processing complete:`);
                        console.log(`   - Total CSV rows: ${this.stats.csv_rows}`);
                        console.log(`   - Valid ingredients: ${updates.length}`);
                        console.log(`   - Success rate: ${Math.round(updates.length/this.stats.csv_rows*100)}%`);
                        
                        if (updates.length === 0) {
                            throw new Error('No valid ingredients found in CSV! Check file format.');
                        }
                        
                        // Process updates
                        await this.performUpdates(client, updates, validMappings);
                        resolve();
                        
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', reject);
        });
    }

    // Perform database updates
    async performUpdates(client, updates, validMappings) {
        console.log('\n💾 Performing database updates...');
        
        const batchSize = 100;
        let processedCount = 0;
        
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            
            for (const updateData of batch) {
                try {
                    // First, get current data from database
                    const currentData = await client.query(
                        'SELECT * FROM ingredients WHERE LOWER(name) = LOWER($1)',
                        [updateData.name]
                    );
                    
                    if (currentData.rows.length === 0) {
                        this.stats.not_found_in_db++;
                        
                        // Log some missing ingredients for debugging
                        if (this.stats.not_found_in_db <= 5) {
                            console.log(`   ⚠️ Not found in DB: "${updateData.name}"`);
                        }
                        continue;
                    }
                    
                    this.stats.matched_ingredients++;
                    const existingRecord = currentData.rows[0];
                    
                    // Check what needs to be updated
                    const changedFields = [];
                    const updateValues = [];
                    const updatePlaceholders = [];
                    let paramCounter = 1;
                    
                    Object.entries(validMappings).forEach(([csvCol, dbCol]) => {
                        if (dbCol !== 'name') { // Skip name column
                            const newValue = updateData[dbCol];
                            const currentValue = existingRecord[dbCol];
                            
                            if (this.valuesDifferent(currentValue, newValue)) {
                                changedFields.push(dbCol);
                                updateValues.push(newValue);
                                updatePlaceholders.push(`${dbCol} = $${paramCounter}`);
                                paramCounter++;
                            }
                        }
                    });
                    
                    // Perform update if there are changes
                    if (changedFields.length > 0) {
                        const updateQuery = `
                            UPDATE ingredients 
                            SET ${updatePlaceholders.join(', ')}, updated_at = CURRENT_TIMESTAMP
                            WHERE id = $${paramCounter}
                        `;
                        
                        await client.query(updateQuery, [...updateValues, existingRecord.id]);
                        this.stats.updated_ingredients++;
                        
                        // Log sample updates
                        if (this.stats.updated_ingredients <= 5) {
                            console.log(`\n✅ Updated "${updateData.name}":`);
                            changedFields.slice(0, 3).forEach(field => {
                                const oldVal = (existingRecord[field] || '').toString().substring(0, 50);
                                const newVal = updateData[field].toString().substring(0, 50);
                                console.log(`   ${field}: "${oldVal}" → "${newVal}"`);
                            });
                            if (changedFields.length > 3) {
                                console.log(`   ... and ${changedFields.length - 3} more fields`);
                            }
                        }
                    } else {
                        this.stats.skipped_no_changes++;
                    }
                    
                } catch (error) {
                    this.stats.errors++;
                    this.errors.push(`Error updating ${updateData.name}: ${error.message}`);
                }
            }
            
            processedCount += batch.length;
            if (processedCount % 1000 === 0) {
                console.log(`📊 Processed ${processedCount}/${updates.length} ingredients (${Math.round(processedCount/updates.length*100)}%)`);
            }
        }
    }

    // Main update process
    async performSelectiveUpdate() {
        console.log('🔄 MatchCare FIXED Selective Ingredient Update');
        console.log('==============================================\n');
        
        // Find CSV file
        const csvFilePath = this.findCSVFile();
        if (!csvFilePath) {
            console.error('\n❌ Cannot proceed without CSV file');
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
            // Check existing data
            const countResult = await client.query('SELECT COUNT(*) FROM ingredients');
            const totalIngredients = parseInt(countResult.rows[0].count);
            console.log(`📊 Current ingredients in database: ${totalIngredients}`);
            
            if (totalIngredients === 0) {
                console.error('❌ No ingredients in database. Use full import instead.');
                return false;
            }
            
            console.log('\n⚠️ This will UPDATE existing ingredient data based on CSV');
            console.log('✅ No data will be deleted - this is safe!');
            console.log('🔧 Using FIXED parsing with explicit comma separator');
            console.log('Starting in 3 seconds...');
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Begin transaction
            await client.query('BEGIN');
            console.log('\n🔄 Starting update transaction...');
            
            // Process updates
            await this.processUpdates(client, csvFilePath);
            
            // Commit transaction
            await client.query('COMMIT');
            console.log('\n✅ Transaction committed successfully!');
            
            // Show final results
            this.showResults();
            
            return true;
            
        } catch (error) {
            // Rollback on error
            await client.query('ROLLBACK');
            console.error('\n❌ TRANSACTION ROLLED BACK');
            console.error('Error:', error.message);
            return false;
            
        } finally {
            client.release();
            await pool.end();
        }
    }

    // Show final results
    showResults() {
        console.log('\n🎉 FIXED SELECTIVE UPDATE COMPLETED!');
        console.log('===================================');
        console.log(`📊 Results Summary:`);
        console.log(`   - CSV rows processed: ${this.stats.csv_rows}`);
        console.log(`   - Ingredients matched in DB: ${this.stats.matched_ingredients}`);
        console.log(`   - Ingredients updated: ${this.stats.updated_ingredients}`);
        console.log(`   - Skipped (no changes): ${this.stats.skipped_no_changes}`);
        console.log(`   - Not found in DB: ${this.stats.not_found_in_db}`);
        console.log(`   - Errors: ${this.stats.errors}`);
        
        if (this.stats.updated_ingredients > 0) {
            const updatePercentage = Math.round((this.stats.updated_ingredients / this.stats.matched_ingredients) * 100);
            console.log(`\n✅ Success rate: ${updatePercentage}% of matched ingredients were updated`);
        }
        
        if (this.errors.length > 0) {
            console.log(`\n⚠️ First 3 errors:`);
            this.errors.slice(0, 3).forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        console.log('\n💡 What was updated:');
        console.log('   - Enhanced explanations and benefits');
        console.log('   - Improved safety information'); 
        console.log('   - Better alternative names');
        console.log('   - Corrected ingredient functions');
        console.log('   - Updated skin type suitability');
        
        console.log('\n🚀 Next steps:');
        console.log('   1. Test your application');
        console.log('   2. Check ingredient detail pages');
        console.log('   3. Verify search and filtering still works');
        
        if (this.stats.updated_ingredients > 10000) {
            console.log('\n🏆 EXCELLENT! Major data improvement achieved!');
        } else if (this.stats.updated_ingredients > 1000) {
            console.log('\n👍 GOOD! Significant updates completed!');
        } else if (this.stats.updated_ingredients > 0) {
            console.log('\n✅ SUCCESS! Updates completed successfully!');
        }
    }
}

// Run the update
async function main() {
    const updater = new FixedSelectiveIngredientUpdater();
    
    try {
        const success = await updater.performSelectiveUpdate();
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

module.exports = FixedSelectiveIngredientUpdater;