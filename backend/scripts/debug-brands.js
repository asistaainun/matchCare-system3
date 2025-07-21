// backend/scripts/debug-brands.js - Debug CSV parsing issue
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function debugBrandsCSV() {
    console.log('🔍 Debug brands.csv parsing...\n');
    
    const filePath = path.join(__dirname, '../data/csv/brands.csv');
    
    // 1. Check file exists
    console.log('📁 File path:', filePath);
    console.log('📄 File exists:', fs.existsSync(filePath));
    
    if (!fs.existsSync(filePath)) {
        console.log('❌ File not found!');
        return;
    }
    
    // 2. Check file stats
    const stats = fs.statSync(filePath);
    console.log('📊 File size:', stats.size, 'bytes');
    console.log('📅 Last modified:', stats.mtime);
    
    // 3. Read raw content (first 500 chars)
    console.log('\n📝 Raw file content (first 500 chars):');
    const rawContent = fs.readFileSync(filePath, 'utf8');
    console.log('---START---');
    console.log(rawContent.substring(0, 500));
    console.log('---END---');
    
    // 4. Check line endings and encoding
    console.log('\n🔍 File analysis:');
    console.log('- Contains \\r\\n (Windows):', rawContent.includes('\r\n'));
    console.log('- Contains \\n (Unix):', rawContent.includes('\n'));
    console.log('- First line:', JSON.stringify(rawContent.split('\n')[0]));
    console.log('- Second line:', JSON.stringify(rawContent.split('\n')[1]));
    console.log('- Total lines:', rawContent.split('\n').length);
    
    // 5. Test CSV parsing
    console.log('\n🔄 Testing CSV parsing...');
    
    const brands = [];
    let rowCount = 0;
    
    return new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('headers', (headers) => {
                console.log('📋 CSV Headers detected:', headers);
            })
            .on('data', (row) => {
                rowCount++;
                console.log(`Row ${rowCount}:`, JSON.stringify(row));
                
                if (row.name && row.name.trim()) {
                    brands.push(row.name.trim());
                }
                
                // Only show first 5 rows
                if (rowCount >= 5) {
                    console.log('... (stopping after 5 rows for debug)');
                    return;
                }
            })
            .on('end', () => {
                console.log('\n📊 Parsing Results:');
                console.log('- Total rows processed:', rowCount);
                console.log('- Valid brands found:', brands.length);
                console.log('- First 5 brands:', brands.slice(0, 5));
                
                if (brands.length === 0) {
                    console.log('\n❌ No brands found! Possible issues:');
                    console.log('1. Header name mismatch');
                    console.log('2. Encoding issues');
                    console.log('3. Empty cells');
                    console.log('4. CSV parser configuration');
                }
                
                resolve();
            })
            .on('error', (error) => {
                console.error('❌ CSV parsing error:', error.message);
                resolve();
            });
    });
}

// Test with different CSV parser options
async function testDifferentParsers() {
    console.log('\n🧪 Testing different CSV parser options...\n');
    
    const filePath = path.join(__dirname, '../data/csv/brands.csv');
    
    // Option 1: Default parser
    console.log('1️⃣ Default csv-parser:');
    await testParser(filePath, {});
    
    // Option 2: Skip empty lines
    console.log('\n2️⃣ Skip empty lines:');
    await testParser(filePath, { skipEmptyLines: true });
    
    // Option 3: Custom separator
    console.log('\n3️⃣ Custom separator:');
    await testParser(filePath, { separator: ',' });
    
    // Option 4: Manual line split
    console.log('\n4️⃣ Manual parsing:');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    console.log('- Manual total lines:', lines.length);
    console.log('- Manual header:', lines[0]);
    console.log('- Manual first 3 brands:', lines.slice(1, 4));
}

async function testParser(filePath, options) {
    return new Promise((resolve) => {
        const brands = [];
        let count = 0;
        
        fs.createReadStream(filePath)
            .pipe(csv(options))
            .on('data', (row) => {
                count++;
                if (row.name && row.name.trim()) {
                    brands.push(row.name.trim());
                }
                if (count <= 3) {
                    console.log(`  Row ${count}:`, JSON.stringify(row));
                }
            })
            .on('end', () => {
                console.log(`  Result: ${brands.length} brands found`);
                resolve();
            })
            .on('error', (error) => {
                console.log(`  Error: ${error.message}`);
                resolve();
            });
    });
}

// Run debug
if (require.main === module) {
    debugBrandsCSV().then(() => {
        return testDifferentParsers();
    }).then(() => {
        console.log('\n✅ Debug completed!');
        process.exit(0);
    });
}

module.exports = debugBrandsCSV;