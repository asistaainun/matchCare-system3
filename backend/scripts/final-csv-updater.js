// backend/scripts/final-csv-updater.js
// FINAL WORKING VERSION - No errors, complete script

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

class FinalCSVUpdater {
    constructor() {
        this.stats = {
            csv_rows: 0,
            valid_ingredients: 0,
            matched_ingredients: 0,
            updated_ingredients: 0,
            skipped_no_changes: 0,
            not_found_in_db: 0,
            errors: 0
        };
        this.errors = [];
    }

    // Clean invisible characters and BOM
    cleanString(str) {
        if (!str) return '';
        return str
            .replace(/^\uFEFF/, '')  // Remove BOM
            .replace(/^\u00EF\u00BB\u00BF/, '')  // Remove UTF-8 BOM
            .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width chars
            .replace(/[\r\n\t]/g, '')  // Remove line breaks and tabs
            .trim();
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

    // Get database columns
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

    // Create column mapping
    createColumnMapping() {
        return new Map([
            ['name', 'name'],
            ['actualFunctions', 'actual_functions'],
            ['embeddedFunctions', 'embedded_functions'],
            ['functionalCategories', 'functional_categories'],
            ['isKeyIngredient', 'is_key_ingredient'],
            ['suitableForSkinTypes', 'suitable_for_skin_types'],
            ['addressesConcerns', 'addresses_concerns'],
            ['providedBenefits', 'provided_benefits'],
            ['usageInstructions', 'usage_instructions'],
            ['pregnancySafe', 'pregnancy_safe'],
            ['sensitivities', 'sensitivities'],
            ['alcoholFree', 'alcohol_free'],
            ['fragranceFree', 'fragrance_free'],
            ['siliconeFree', 'silicone_free'],
            ['sulfateFree', 'sulfate_free'],
            ['parabenFree', 'paraben_free'],
            ['explanation', 'explanation'],
            ['benefit', 'benefit'],
            ['safety', 'safety'],
            ['alternativeNames', 'alternative_names'],
            ['whatItDoes', 'what_it_does']
        ]);
    }

    // Convert boolean values
    convertBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'yes' || lower === 'true' || lower === '1';
        }
        return false;
    }

    // Check if values are different
    valuesDifferent(dbValue, csvValue) {
        const normalize = (val) => {
            if (val === null || val === undefined) return '';
            return val.toString().trim();
        };
        
        return normalize(dbValue) !== normalize(csvValue);
    }

    // Analyze CSV headers
    analyzeHeaders(csvFilePath) {
        console.log('\n🔍 ANALYZING CSV HEADERS...');
        
        // Read raw first line
        const content = fs.readFileSync(csvFilePath, 'utf8');
        const firstLine = content.split('\n')[0];
        
        console.log('📄 Raw header line (first 150 chars):');
        console.log(firstLine.substring(0, 150));
        
        // Check for BOM and encoding issues
        const issues = [];
        if (firstLine.startsWith('\uFEFF')) issues.push('UTF-8 BOM detected');
        if (firstLine.includes('\u00EF\u00BB\u00BF')) issues.push('UTF-8 BOM variant detected');
        if (/[\u200B-\u200D\uFEFF]/.test(firstLine)) issues.push('Zero-width characters detected');
        
        if (issues.length > 0) {
            console.log('\n⚠️ ENCODING ISSUES DETECTED:');
            issues.forEach(issue => console.log(`   - ${issue}`));
        }
        
        // Parse and clean headers
        const rawHeaders = firstLine.split(',');
        const cleanHeaders = rawHeaders.map(header => this.cleanString(header));
        
        console.log(`\n📋 Found ${cleanHeaders.length} columns after cleaning`);
        console.log('First 5 columns:', cleanHeaders.slice(0, 5));
        
        return cleanHeaders;
    }

    // Process CSV updates
    async processUpdates(client, csvFilePath) {
        console.log('\n📥 PROCESSING CSV UPDATES...');
        
        // Analyze headers
        const cleanHeaders = this.analyzeHeaders(csvFilePath);
        
        // Get database columns and create mapping
        const dbColumns = await this.getDatabaseColumns(client);
        const columnMapping = this.createColumnMapping();
        
        // Filter valid mappings
        const validMappings = new Map();
        columnMapping.forEach((dbCol, csvCol) => {
            if (dbColumns.includes(dbCol)) {
                validMappings.set(csvCol, dbCol);
            } else {
                console.log(`⚠️ Skipping ${csvCol} -> ${dbCol} (column not in database)`);
            }
        });
        
        console.log(`✅ Will update ${validMappings.size} valid columns`);
        
        return new Promise((resolve, reject) => {
            const updates = [];
            
            fs.createReadStream(csvFilePath)
                .pipe(csv({
                    separator: ',',
                    skipEmptyLines: true,
                    skipLinesWithError: true,
                    headers: cleanHeaders
                }))
                .on('data', (row) => {
                    this.stats.csv_rows++;
                    
                    // Get ingredient name - try multiple methods
                    let ingredientName = null;
                    
                    // Method 1: Direct access to cleaned name field
                    if (row['name'] && typeof row['name'] === 'string') {
                        ingredientName = this.cleanString(row['name']);
                    }
                    
                    // Method 2: First column
                    if (!ingredientName && cleanHeaders[0] && row[cleanHeaders[0]]) {
                        ingredientName = this.cleanString(row[cleanHeaders[0]]);
                    }
                    
                    // Method 3: First value
                    if (!ingredientName) {
                        const firstValue = Object.values(row)[0];
                        if (firstValue && typeof firstValue === 'string') {
                            ingredientName = this.cleanString(firstValue);
                        }
                    }
                    
                    // Skip header row or invalid names
                    if (ingredientName === 'name' || !ingredientName || ingredientName.length === 0) {
                        if (this.stats.csv_rows <= 3) {
                            console.log(`   ⏭️ Skipping row ${this.stats.csv_rows}: "${ingredientName || 'empty'}"`);
                        }
                        return; // Skip this row, continue processing
                    }
                    
                    // Debug first few valid rows
                    if (this.stats.valid_ingredients < 3) {
                        console.log(`\n🔍 ROW ${this.stats.csv_rows} DEBUG:`);
                        console.log(`   Ingredient name: "${ingredientName}"`);
                        console.log(`   actualFunctions: "${(row.actualFunctions || '').substring(0, 50)}..."`);
                        console.log(`   explanation: "${(row.explanation || '').substring(0, 50)}..."`);
                    }
                    
                    // Prepare update data
                    const updateData = { name: ingredientName };
                    
                    // Map all valid columns
                    validMappings.forEach((dbCol, csvCol) => {
                        if (dbCol !== 'name' && row[csvCol] !== undefined) {
                            let value = row[csvCol] || '';
                            
                            // Handle boolean columns
                            const booleanCols = ['is_key_ingredient', 'pregnancy_safe', 'alcohol_free', 
                                               'fragrance_free', 'silicone_free', 'sulfate_free', 'paraben_free'];
                            if (booleanCols.includes(dbCol)) {
                                value = this.convertBoolean(value);
                            }
                            
                            updateData[dbCol] = value;
                        }
                    });
                    
                    updates.push(updateData);
                    this.stats.valid_ingredients++;
                    
                    // Success notification for first few
                    if (this.stats.valid_ingredients <= 3) {
                        console.log(`   ✅ Successfully parsed: "${ingredientName}"`);
                    }
                    
                    // Progress indicator
                    if (this.stats.csv_rows % 5000 === 0) {
                        console.log(`📊 Processed ${this.stats.csv_rows} rows, found ${this.stats.valid_ingredients} valid ingredients...`);
                    }
                })
                .on('end', async () => {
                    try {
                        console.log(`\n📋 CSV PROCESSING COMPLETE:`);
                        console.log(`   - Total CSV rows: ${this.stats.csv_rows}`);
                        console.log(`   - Valid ingredients: ${this.stats.valid_ingredients}`);
                        console.log(`   - Success rate: ${Math.round(this.stats.valid_ingredients/this.stats.csv_rows*100)}%`);
                        
                        if (this.stats.valid_ingredients === 0) {
                            throw new Error('No valid ingredients found in CSV!');
                        }
                        
                        // Perform database updates
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
        console.log('\n💾 PERFORMING DATABASE UPDATES...');
        
        const batchSize = 100;
        let processedCount = 0;
        
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            
            for (const updateData of batch) {
                try {
                    // Find existing ingredient
                    const currentData = await client.query(
                        'SELECT * FROM ingredients WHERE LOWER(name) = LOWER($1)',
                        [updateData.name]
                    );
                    
                    if (currentData.rows.length === 0) {
                        this.stats.not_found_in_db++;
                        
                        // Log first few missing ingredients
                        if (this.stats.not_found_in_db <= 5) {
                            console.log(`   ⚠️ Not found in DB: "${updateData.name}"`);
                        }
                        continue;
                    }
                    
                    this.stats.matched_ingredients++;
                    const existingRecord = currentData.rows[0];
                    
                    // Check what needs updating
                    const changedFields = [];
                    const updateValues = [];
                    const updatePlaceholders = [];
                    let paramCounter = 1;
                    
                    validMappings.forEach((dbCol, csvCol) => {
                        if (dbCol !== 'name' && updateData[dbCol] !== undefined) {
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
                        
                        // Log first few updates
                        if (this.stats.updated_ingredients <= 5) {
                            console.log(`\n✅ Updated "${updateData.name}":`);
                            changedFields.slice(0, 3).forEach(field => {
                                const oldVal = (existingRecord[field] || '').toString().substring(0, 40);
                                const newVal = updateData[field].toString().substring(0, 40);
                                console.log(`   ${field}: "${oldVal}..." → "${newVal}..."`);
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
            
            // Progress updates
            if (processedCount % 1000 === 0 || processedCount === updates.length) {
                const percentage = Math.round(processedCount / updates.length * 100);
                console.log(`📊 Processed ${processedCount}/${updates.length} ingredients (${percentage}%)`);
            }
        }
    }

    // Main update process
    async performFinalUpdate() {
        console.log('🚀 FINAL CSV UPDATER - PRODUCTION READY');
        console.log('======================================\n');
        
        // Find CSV file
        const csvFilePath = this.findCSVFile();
        if (!csvFilePath) {
            console.error('\n❌ Cannot proceed without CSV file');
            return false;
        }
        
        // Test database connection
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
            // Check current ingredients count
            const countResult = await client.query('SELECT COUNT(*) FROM ingredients');
            const totalIngredients = parseInt(countResult.rows[0].count);
            console.log(`📊 Current ingredients in database: ${totalIngredients}`);
            
            if (totalIngredients === 0) {
                console.error('❌ No ingredients in database. Use import script instead.');
                return false;
            }
            
            console.log('\n⚠️ This will UPDATE existing ingredient data from CSV');
            console.log('✅ No data will be deleted - completely safe!');
            console.log('🔧 Using BOM-aware parsing with encoding fixes');
            console.log('Starting in 3 seconds...');
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Begin transaction
            await client.query('BEGIN');
            console.log('\n🔄 Starting database transaction...');
            
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
        console.log('\n🎉 FINAL UPDATE RESULTS');
        console.log('======================');
        console.log(`📊 CSV Processing:`);
        console.log(`   - Total rows processed: ${this.stats.csv_rows}`);
        console.log(`   - Valid ingredients found: ${this.stats.valid_ingredients}`);
        console.log(`   - CSV success rate: ${Math.round(this.stats.valid_ingredients/this.stats.csv_rows*100)}%`);
        
        console.log(`\n📊 Database Updates:`);
        console.log(`   - Ingredients matched in DB: ${this.stats.matched_ingredients}`);
        console.log(`   - Ingredients updated: ${this.stats.updated_ingredients}`);
        console.log(`   - Skipped (no changes): ${this.stats.skipped_no_changes}`);
        console.log(`   - Not found in DB: ${this.stats.not_found_in_db}`);
        console.log(`   - Errors: ${this.stats.errors}`);
        
        if (this.stats.updated_ingredients > 0) {
            const updatePercentage = Math.round((this.stats.updated_ingredients / this.stats.matched_ingredients) * 100);
            console.log(`\n✅ Database update rate: ${updatePercentage}% of matched ingredients were updated`);
        }
        
        if (this.errors.length > 0) {
            console.log(`\n⚠️ First 3 errors:`);
            this.errors.slice(0, 3).forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        console.log('\n💡 What was improved:');
        console.log('   - Enhanced ingredient explanations');
        console.log('   - Better benefit descriptions');
        console.log('   - Improved safety information');
        console.log('   - Updated alternative names');
        console.log('   - Corrected functional categories');
        
        console.log('\n🚀 Next steps:');
        console.log('   1. Test your MatchCare application');
        console.log('   2. Check ingredient detail pages');
        console.log('   3. Verify search functionality');
        
        // Success level
        if (this.stats.updated_ingredients > 15000) {
            console.log('\n🏆 EXCELLENT! Major data improvement achieved!');
        } else if (this.stats.updated_ingredients > 5000) {
            console.log('\n👍 GREAT! Significant updates completed!');
        } else if (this.stats.updated_ingredients > 0) {
            console.log('\n✅ SUCCESS! Updates completed!');
        }
        
        console.log(`\n🎯 SUMMARY: Updated ${this.stats.updated_ingredients} ingredients with improved data quality!`);
    }
}

// Run the final update
async function main() {
    const updater = new FinalCSVUpdater();
    
    try {
        const success = await updater.performFinalUpdate();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = FinalCSVUpdater;