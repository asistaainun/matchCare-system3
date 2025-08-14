// backend/scripts/inspect-csv-headers.js
// Script untuk debug header CSV yang sebenarnya

const fs = require('fs');
const csv = require('csv-parser');

class CSVHeaderInspector {
    async inspectCSV() {
        console.log('🔍 CSV Header Inspector');
        console.log('=======================\n');
        
        const csvPath = './data/csv/skincare_dataset_with_explanations_corrected_FULL.csv';
        
        if (!fs.existsSync(csvPath)) {
            console.error('❌ CSV file not found:', csvPath);
            return;
        }
        
        console.log('📂 Inspecting file:', csvPath);
        
        // Method 1: Read raw first line
        console.log('\n1️⃣ RAW FIRST LINE (Headers):');
        console.log('-'.repeat(50));
        const content = fs.readFileSync(csvPath, 'utf8');
        const firstLine = content.split('\n')[0];
        console.log('Raw line:', firstLine);
        console.log('Length:', firstLine.length);
        
        // Split by different delimiters
        console.log('\n📊 Column analysis:');
        const delimiters = [',', ';', '\t', '|'];
        delimiters.forEach(delim => {
            const cols = firstLine.split(delim);
            console.log(`${delim === '\t' ? 'TAB' : delim}: ${cols.length} columns`);
            if (cols.length > 10 && cols.length < 30) {
                console.log(`   First 5: [${cols.slice(0, 5).map(c => `"${c}"`).join(', ')}]`);
            }
        });
        
        // Method 2: CSV parser with different separators
        for (const separator of [',', ';', '\t']) {
            await this.testSeparator(csvPath, separator);
        }
    }
    
    async testSeparator(csvPath, separator) {
        const sepName = separator === '\t' ? 'TAB' : separator;
        console.log(`\n2️⃣ TESTING WITH ${sepName} SEPARATOR:`);
        console.log('-'.repeat(50));
        
        return new Promise((resolve) => {
            let headers = [];
            let firstRow = null;
            let rowCount = 0;
            
            fs.createReadStream(csvPath)
                .pipe(csv({ separator }))
                .on('headers', (headerList) => {
                    headers = headerList;
                    console.log(`📋 Headers found (${headers.length}):`, headers.map(h => `"${h}"`));
                })
                .on('data', (row) => {
                    rowCount++;
                    if (rowCount === 1) {
                        firstRow = row;
                        
                        // Look for name-like columns
                        const nameColumns = Object.keys(row).filter(key => 
                            key.toLowerCase().includes('name') || 
                            key.toLowerCase().includes('ingredient') ||
                            key === 'Name' || key === 'Ingredient'
                        );
                        
                        console.log(`🔍 Potential name columns:`, nameColumns);
                        
                        if (nameColumns.length > 0) {
                            nameColumns.forEach(col => {
                                console.log(`   "${col}": "${row[col]}"`);
                            });
                        }
                        
                        // Show first few columns with data
                        console.log(`📊 First row sample (first 5 columns with data):`);
                        let shownCount = 0;
                        Object.entries(row).forEach(([key, value]) => {
                            if (shownCount < 5 && value && value.toString().trim()) {
                                console.log(`   "${key}": "${value.toString().substring(0, 50)}${value.toString().length > 50 ? '...' : ''}"`);
                                shownCount++;
                            }
                        });
                        
                        // Check if this looks like the right separator
                        const hasData = Object.values(row).some(v => v && v.toString().trim());
                        const hasReasonableColumns = headers.length > 15 && headers.length < 30;
                        
                        if (hasData && hasReasonableColumns) {
                            console.log(`✅ ${sepName} separator looks GOOD!`);
                            
                            // Find the best name column
                            const possibleNameCols = [
                                'name', 'Name', 'ingredient_name', 'Ingredient_Name', 
                                'ingredient', 'Ingredient', headers[0]
                            ];
                            
                            let bestNameCol = null;
                            for (const col of possibleNameCols) {
                                if (row[col] && row[col].toString().trim()) {
                                    bestNameCol = col;
                                    break;
                                }
                            }
                            
                            if (bestNameCol) {
                                console.log(`🎯 RECOMMENDED name column: "${bestNameCol}"`);
                                console.log(`   Sample value: "${row[bestNameCol]}"`);
                            } else {
                                console.log(`❌ No clear name column found`);
                            }
                        } else {
                            console.log(`❌ ${sepName} separator doesn't look right`);
                        }
                    }
                    
                    if (rowCount >= 3) {
                        resolve();
                    }
                })
                .on('end', () => {
                    if (rowCount < 3) {
                        console.log(`📊 Total rows with ${sepName}: ${rowCount}`);
                        resolve();
                    }
                })
                .on('error', (err) => {
                    console.log(`❌ Error with ${sepName}:`, err.message);
                    resolve();
                });
        });
    }
}

// Generate fix code
function generateFixCode(separator, nameColumn) {
    console.log('\n🔧 QUICK FIX FOR selective-update-ingredients.js:');
    console.log('='.repeat(60));
    console.log(`
// In the processUpdates method, replace the csv() call:
.pipe(csv({ separator: '${separator}' }))

// And update the name field mapping:
if (row['${nameColumn}'] && row['${nameColumn}'].trim()) {
    const updateData = {
        name: row['${nameColumn}'].trim()
    };
    // ... rest of code
}
`);
}

// Main function
async function main() {
    const inspector = new CSVHeaderInspector();
    await inspector.inspectCSV();
    
    console.log('\n💡 NEXT STEPS:');
    console.log('================');
    console.log('1. Look at the output above');
    console.log('2. Find which separator works best (shows ✅)');
    console.log('3. Note the recommended name column');
    console.log('4. I\'ll create a fixed version of the update script');
}

if (require.main === module) {
    main();
}

module.exports = CSVHeaderInspector;