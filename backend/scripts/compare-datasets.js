// backend/scripts/compare-datasets.js
// Script untuk membandingkan dataset lama vs baru sebelum replacement

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

class DatasetComparator {
    constructor() {
        this.oldData = new Map();
        this.newData = new Map();
        this.comparison = {
            total_old: 0,
            total_new: 0,
            added: [],
            removed: [],
            modified: [],
            unchanged: 0
        };
    }

    // Find CSV files
    findFiles() {
        const oldFiles = [
            './matchcare_ultimate_cleaned.csv',
            '../matchcare_ultimate_cleaned.csv',
            './data/matchcare_ultimate_cleaned.csv',
            './data/csv/matchcare_ultimate_cleaned.csv'
        ];
        
        const newFiles = [
            './skincare_dataset_with_explanations_corrected_FULL.csv',
            '../skincare_dataset_with_explanations_corrected_FULL.csv',
            './data/skincare_dataset_with_explanations_corrected_FULL.csv',
            './data/csv/skincare_dataset_with_explanations_corrected_FULL.csv'
        ];
        
        let oldFile = null, newFile = null;
        
        for (const file of oldFiles) {
            if (fs.existsSync(file)) {
                oldFile = file;
                break;
            }
        }
        
        for (const file of newFiles) {
            if (fs.existsSync(file)) {
                newFile = file;
                break;
            }
        }
        
        return { oldFile, newFile };
    }

    // Load CSV data
    async loadCSVData(filePath) {
        return new Promise((resolve, reject) => {
            const data = new Map();
            let count = 0;
            
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    if (row.name && row.name.trim()) {
                        const key = row.name.trim().toLowerCase();
                        data.set(key, {
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
                        count++;
                    }
                })
                .on('end', () => {
                    console.log(`✅ Loaded ${count} ingredients from ${path.basename(filePath)}`);
                    resolve(data);
                })
                .on('error', reject);
        });
    }

    // Compare two ingredient objects
    compareIngredients(oldIng, newIng) {
        const differences = [];
        const fields = [
            'actualFunctions', 'embeddedFunctions', 'functionalCategories',
            'keyIngredientTypes', 'isKeyIngredient', 'suitableForSkinTypes',
            'addressesConcerns', 'providedBenefits', 'usageInstructions',
            'pregnancySafe', 'sensitivities', 'alcoholFree', 'fragranceFree',
            'siliconeFree', 'sulfateFree', 'parabenFree', 'explanation',
            'benefit', 'safety', 'alternativeNames', 'whatItDoes', 'url'
        ];
        
        for (const field of fields) {
            const oldVal = oldIng[field] || '';
            const newVal = newIng[field] || '';
            
            if (oldVal !== newVal) {
                differences.push({
                    field,
                    old: oldVal,
                    new: newVal,
                    type: oldVal === '' ? 'added' : newVal === '' ? 'removed' : 'modified'
                });
            }
        }
        
        return differences;
    }

    // Perform comparison
    async performComparison() {
        console.log('🔍 Dataset Comparison Analysis');
        console.log('=============================\n');
        
        // Find files
        const { oldFile, newFile } = this.findFiles();
        
        if (!oldFile) {
            console.error('❌ Old dataset (matchcare_ultimate_cleaned.csv) not found!');
            return false;
        }
        
        if (!newFile) {
            console.error('❌ New dataset (skincare_dataset_with_explanations_corrected_FULL.csv) not found!');
            return false;
        }
        
        console.log(`📂 Old dataset: ${oldFile}`);
        console.log(`📂 New dataset: ${newFile}\n`);
        
        // Load data
        console.log('📥 Loading datasets...');
        this.oldData = await this.loadCSVData(oldFile);
        this.newData = await this.loadCSVData(newFile);
        
        this.comparison.total_old = this.oldData.size;
        this.comparison.total_new = this.newData.size;
        
        console.log('\n📊 Basic Statistics:');
        console.log(`   Old dataset: ${this.comparison.total_old} ingredients`);
        console.log(`   New dataset: ${this.comparison.total_new} ingredients`);
        
        // Find added, removed, and modified ingredients
        console.log('\n🔍 Analyzing differences...');
        
        // Check for added ingredients (in new but not in old)
        for (const [key, newIng] of this.newData) {
            if (!this.oldData.has(key)) {
                this.comparison.added.push(newIng.name);
            }
        }
        
        // Check for removed ingredients (in old but not in new)
        for (const [key, oldIng] of this.oldData) {
            if (!this.newData.has(key)) {
                this.comparison.removed.push(oldIng.name);
            }
        }
        
        // Check for modified ingredients
        for (const [key, oldIng] of this.oldData) {
            if (this.newData.has(key)) {
                const newIng = this.newData.get(key);
                const differences = this.compareIngredients(oldIng, newIng);
                
                if (differences.length > 0) {
                    this.comparison.modified.push({
                        name: oldIng.name,
                        differences: differences
                    });
                } else {
                    this.comparison.unchanged++;
                }
            }
        }
        
        // Display results
        this.displayResults();
        
        return true;
    }

    // Display comparison results
    displayResults() {
        console.log('\n📋 COMPARISON RESULTS');
        console.log('====================\n');
        
        console.log(`📊 Summary:`);
        console.log(`   Total old ingredients: ${this.comparison.total_old}`);
        console.log(`   Total new ingredients: ${this.comparison.total_new}`);
        console.log(`   Added ingredients: ${this.comparison.added.length}`);
        console.log(`   Removed ingredients: ${this.comparison.removed.length}`);
        console.log(`   Modified ingredients: ${this.comparison.modified.length}`);
        console.log(`   Unchanged ingredients: ${this.comparison.unchanged}`);
        
        // Show added ingredients
        if (this.comparison.added.length > 0) {
            console.log(`\n➕ ADDED INGREDIENTS (${this.comparison.added.length}):`);
            this.comparison.added.slice(0, 10).forEach((name, index) => {
                console.log(`   ${index + 1}. ${name}`);
            });
            if (this.comparison.added.length > 10) {
                console.log(`   ... and ${this.comparison.added.length - 10} more`);
            }
        }
        
        // Show removed ingredients
        if (this.comparison.removed.length > 0) {
            console.log(`\n➖ REMOVED INGREDIENTS (${this.comparison.removed.length}):`);
            this.comparison.removed.slice(0, 10).forEach((name, index) => {
                console.log(`   ${index + 1}. ${name}`);
            });
            if (this.comparison.removed.length > 10) {
                console.log(`   ... and ${this.comparison.removed.length - 10} more`);
            }
        }
        
        // Show modified ingredients (most interesting)
        if (this.comparison.modified.length > 0) {
            console.log(`\n🔄 MODIFIED INGREDIENTS (${this.comparison.modified.length}):`);
            
            // Analyze types of modifications
            const modificationStats = {
                explanation_added: 0,
                benefit_added: 0,
                safety_added: 0,
                alternative_names_added: 0,
                other_changes: 0
            };
            
            this.comparison.modified.forEach(ingredient => {
                ingredient.differences.forEach(diff => {
                    if (diff.field === 'explanation' && diff.type === 'added') modificationStats.explanation_added++;
                    else if (diff.field === 'benefit' && diff.type === 'added') modificationStats.benefit_added++;
                    else if (diff.field === 'safety' && diff.type === 'added') modificationStats.safety_added++;
                    else if (diff.field === 'alternativeNames' && diff.type === 'added') modificationStats.alternative_names_added++;
                    else modificationStats.other_changes++;
                });
            });
            
            console.log(`\n   📈 Modification Statistics:`);
            console.log(`      - Explanation added: ${modificationStats.explanation_added} ingredients`);
            console.log(`      - Benefit added: ${modificationStats.benefit_added} ingredients`);
            console.log(`      - Safety info added: ${modificationStats.safety_added} ingredients`);
            console.log(`      - Alternative names added: ${modificationStats.alternative_names_added} ingredients`);
            console.log(`      - Other changes: ${modificationStats.other_changes} fields`);
            
            // Show sample modifications
            console.log(`\n   🔍 Sample modifications:`);
            this.comparison.modified.slice(0, 5).forEach((ingredient, index) => {
                console.log(`\n   ${index + 1}. ${ingredient.name}:`);
                ingredient.differences.slice(0, 3).forEach(diff => {
                    const oldText = diff.old.length > 50 ? diff.old.substring(0, 50) + '...' : diff.old;
                    const newText = diff.new.length > 50 ? diff.new.substring(0, 50) + '...' : diff.new;
                    
                    if (diff.type === 'added') {
                        console.log(`      + ${diff.field}: "${newText}"`);
                    } else if (diff.type === 'removed') {
                        console.log(`      - ${diff.field}: "${oldText}"`);
                    } else {
                        console.log(`      ~ ${diff.field}: "${oldText}" → "${newText}"`);
                    }
                });
                if (ingredient.differences.length > 3) {
                    console.log(`      ... and ${ingredient.differences.length - 3} more changes`);
                }
            });
        }
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('===================');
        
        if (this.comparison.total_new === this.comparison.total_old && 
            this.comparison.added.length === 0 && 
            this.comparison.removed.length === 0) {
            console.log('✅ SAFE TO PROCEED: Same number of ingredients, no additions/removals');
            console.log('   This appears to be a data quality improvement update');
        } else if (this.comparison.removed.length > 100) {
            console.log('⚠️ CAUTION: Many ingredients removed. Review before proceeding');
        } else if (this.comparison.added.length > 100) {
            console.log('✅ GOOD: Many new ingredients added');
        } else {
            console.log('✅ PROCEED: Changes look reasonable');
        }
        
        if (this.comparison.modified.length > 10000) {
            console.log('✅ EXCELLENT: Significant data improvements detected');
            console.log('   The new dataset contains enhanced information');
        }
        
        console.log('\n🚀 Next steps:');
        console.log('   1. Review the changes above');
        console.log('   2. Create database backup');
        console.log('   3. Run replacement script: node scripts/replace-ingredients-dataset.js');
    }

    // Export detailed comparison to JSON
    exportComparison() {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `dataset_comparison_${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify(this.comparison, null, 2));
        console.log(`\n💾 Detailed comparison exported to: ${filename}`);
    }
}

// Run comparison
async function main() {
    const comparator = new DatasetComparator();
    
    try {
        const success = await comparator.performComparison();
        
        if (success) {
            comparator.exportComparison();
            console.log('\n✅ Comparison completed successfully!');
        }
        
    } catch (error) {
        console.error('❌ Comparison failed:', error.message);
        console.error(error.stack);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = DatasetComparator;