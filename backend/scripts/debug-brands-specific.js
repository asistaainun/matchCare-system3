// backend/scripts/debug-brands-specific.js
// Debugging khusus untuk masalah brands tidak ke-parse

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

class BrandsDebugger {
    constructor() {
        this.dataPath = path.join(__dirname, '../data/csv/');
    }

    getFilePath(filename) {
        return path.join(this.dataPath, filename);
    }

    async debugBrandsParsing() {
        console.log('🔍 BRANDS PARSING DEBUG - Investigating why brands array stays empty\n');
        
        const filePath = this.getFilePath('brands.csv');
        const brands = [];
        let rowCount = 0;
        
        console.log(`📁 File path: ${filePath}`);
        console.log(`📄 File exists: ${fs.existsSync(filePath)}\n`);
        
        return new Promise((resolve) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('headers', (headers) => {
                    console.log('📋 Headers detected:', headers);
                    console.log('📋 Headers type:', typeof headers);
                    console.log('📋 Headers length:', headers.length);
                    console.log('📋 First header:', JSON.stringify(headers[0]));
                    console.log();
                })
                .on('data', (row) => {
                    rowCount++;
                    
                    console.log(`\n🔍 ROW ${rowCount} ANALYSIS:`);
                    console.log('- Raw row object:', JSON.stringify(row, null, 2));
                    console.log('- Object keys:', Object.keys(row));
                    console.log('- Object values:', Object.values(row));
                    
                    // Test different ways to access the name
                    console.log('\n🧪 Testing different access methods:');
                    console.log('- row.name:', JSON.stringify(row.name));
                    console.log('- row["name"]:', JSON.stringify(row["name"]));
                    console.log('- row[Object.keys(row)[0]]:', JSON.stringify(row[Object.keys(row)[0]]));
                    
                    // Check for hidden characters
                    if (row.name) {
                        console.log('\n🔬 Character analysis:');
                        console.log('- Length:', row.name.length);
                        console.log('- Char codes:', [...row.name].map(c => c.charCodeAt(0)));
                        console.log('- Has BOM:', row.name.charCodeAt(0) === 65279);
                        console.log('- Trimmed:', JSON.stringify(row.name.trim()));
                        console.log('- Trimmed length:', row.name.trim().length);
                    }
                    
                    // Test the exact condition from import script
                    console.log('\n✅ Condition tests:');
                    console.log('- row.name exists:', !!row.name);
                    console.log('- row.name.trim() exists:', !!(row.name && row.name.trim()));
                    console.log('- Condition result:', !!(row.name && row.name.trim()));
                    
                    // Try adding to array with different methods
                    if (row.name && row.name.trim()) {
                        const cleanName = row.name.trim();
                        brands.push(cleanName);
                        console.log('✅ ADDED to brands array:', cleanName);
                        console.log('- Current brands array length:', brands.length);
                    } else {
                        console.log('❌ NOT ADDED - condition failed');
                        
                        // Try alternative methods
                        const firstKey = Object.keys(row)[0];
                        const firstValue = row[firstKey];
                        if (firstValue && firstValue.trim()) {
                            console.log('🔄 Alternative: using first key/value pair');
                            console.log('- Key:', firstKey);
                            console.log('- Value:', firstValue);
                            brands.push(firstValue.trim());
                        }
                    }
                    
                    // Only debug first 3 rows
                    if (rowCount >= 3) {
                        console.log('\n⏭️ Stopping debug after 3 rows...');
                    }
                })
                .on('end', () => {
                    console.log('\n📊 FINAL RESULTS:');
                    console.log('- Total rows processed:', rowCount);
                    console.log('- Brands array length:', brands.length);
                    console.log('- Brands found:', brands);
                    
                    if (brands.length === 0) {
                        console.log('\n🚨 PROBLEM IDENTIFIED: Brands array is empty!');
                        console.log('Possible causes:');
                        console.log('1. BOM (Byte Order Mark) in CSV file');
                        console.log('2. Encoding issues (UTF-8 with BOM vs UTF-8)');
                        console.log('3. Hidden characters in column names');
                        console.log('4. CSV parser configuration issue');
                        
                        console.log('\n💡 SOLUTIONS TO TRY:');
                        console.log('1. Save CSV as UTF-8 without BOM');
                        console.log('2. Use alternative column access method');
                        console.log('3. Add BOM stripping in import script');
                    } else {
                        console.log('\n✅ SUCCESS: Brands parsing works in debug!');
                    }
                    
                    resolve();
                })
                .on('error', (error) => {
                    console.error('❌ Error:', error.message);
                    resolve();
                });
        });
    }

    // Test CSV file encoding and structure
    async testFileStructure() {
        console.log('\n📁 FILE STRUCTURE ANALYSIS\n');
        
        const filePath = this.getFilePath('brands.csv');
        const content = fs.readFileSync(filePath, 'utf8');
        
        console.log('📄 Raw file info:');
        console.log('- File size:', content.length, 'characters');
        console.log('- First 100 chars:', JSON.stringify(content.substring(0, 100)));
        console.log('- Has BOM:', content.charCodeAt(0) === 65279);
        console.log('- Line endings:', content.includes('\r\n') ? 'Windows (\\r\\n)' : 'Unix (\\n)');
        
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        console.log('- Total lines:', lines.length);
        console.log('- Header line:', JSON.stringify(lines[0]));
        console.log('- First data line:', JSON.stringify(lines[1]));
        
        // Character analysis of header
        const header = lines[0];
        console.log('\n🔍 Header character analysis:');
        console.log('- Header:', header);
        console.log('- Header length:', header.length);
        console.log('- Header char codes:', [...header].map(c => c.charCodeAt(0)));
        
        if (header.charCodeAt(0) === 65279) {
            console.log('🚨 BOM DETECTED! This is likely the problem.');
            console.log('💡 Solution: Remove BOM from CSV file or handle in script');
        }
    }
}

// Fixed import function with BOM handling
function createFixedImportFunction() {
    return `
// FIXED VERSION FOR import-data-fixed.js
// Add this to handle BOM and encoding issues

async importBrands() {
    console.log('📋 Importing brands...');
    
    return new Promise((resolve) => {
        const brands = [];
        const filePath = this.getFilePath('brands.csv');
        
        console.log(\`🔍 Looking for brands.csv at: \${filePath}\`);
        
        if (!fs.existsSync(filePath)) {
            console.log(\`⚠️  brands.csv not found - skipping\`);
            resolve();
            return;
        }

        fs.createReadStream(filePath)
            .pipe(csv({
                skipEmptyLines: true,
                // Handle BOM and encoding issues
                mapHeaders: ({ header }) => {
                    // Remove BOM if present
                    return header.replace(/^\\uFEFF/, '').trim();
                }
            }))
            .on('data', (row) => {
                // Debug: Show first few rows
                if (brands.length < 3) {
                    console.log(\`📋 Sample row \${brands.length + 1}:\`, JSON.stringify(row));
                }
                
                // Get the value - handle multiple possible column names
                let brandName = row.name || row.Name || row.brand || row.Brand;
                
                // Clean the brand name
                if (brandName && typeof brandName === 'string') {
                    brandName = brandName.replace(/^\\uFEFF/, '').trim(); // Remove BOM
                    if (brandName) {
                        brands.push(brandName);
                        console.log(\`✅ Added brand: \${brandName} (total: \${brands.length})\`);
                    }
                }
            })
            .on('end', async () => {
                try {
                    console.log(\`📊 Parsed \${brands.length} brands from CSV\`);
                    console.log('🔝 First 5 brands:', brands.slice(0, 5));
                    
                    if (brands.length === 0) {
                        console.log('❌ No brands found in CSV!');
                        resolve();
                        return;
                    }
                    
                    // Database insertion code here...
                    // ... rest of the function
                    
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
}`;
}

// Run the debug
if (require.main === module) {
    const brandsDebugger = new BrandsDebugger();
    
    brandsDebugger.testFileStructure()
        .then(() => brandsDebugger.debugBrandsParsing())
        .then(() => {
            console.log('\n🛠️ COPY THIS FIXED FUNCTION TO YOUR import-data-fixed.js:');
            console.log('='.repeat(60));
            console.log(createFixedImportFunction());
            console.log('='.repeat(60));
            console.log('\n✅ Debug completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Debug failed:', error);
            process.exit(1);
        });
}

module.exports = BrandsDebugger;