const fs = require('fs');

function fixServerBrandColumns() {
    console.log('🔧 Fixing server.js brand column references...\n');
    
    if (!fs.existsSync('server.js')) {
        console.log('❌ server.js not found');
        return;
    }
    
    let content = fs.readFileSync('server.js', 'utf8');
    let modified = false;
    
    // Backup original
    fs.writeFileSync('server.js.brand-fix-backup', content);
    
    // Fix 1: Remove brand from search OR clause (line 78)
    const searchBrandPattern = /{\s*brand:\s*{\s*\[Op\.iLike\]:\s*`%\$\{search\}%`\s*}\s*}/;
    if (content.match(searchBrandPattern)) {
        content = content.replace(searchBrandPattern, '// brand search removed - use Brand relationship');
        modified = true;
        console.log('✅ Fixed brand search in whereClause[Op.or]');
    }
    
    // Fix 2: Remove brand filter (line 83)  
    const brandFilterPattern = /if\s*\(brand\)\s*whereClause\.brand\s*=\s*{\s*\[Op\.iLike\]:\s*`%\$\{brand\}%`\s*};/;
    if (content.match(brandFilterPattern)) {
        content = content.replace(brandFilterPattern, '// if (brand) - use Brand relationship with include');
        modified = true;
        console.log('✅ Fixed brand filter');
    }
    
    // Fix 3: Remove 'brand' from attributes array (line 102)
    const attributesBrandPattern = /(['"`])brand\1\s*,\s*/;
    if (content.match(attributesBrandPattern)) {
        content = content.replace(attributesBrandPattern, '');
        modified = true;
        console.log('✅ Fixed brand in attributes array');
    }
    
    // Clean up any orphaned commas
    content = content.replace(/,\s*,/g, ',');
    content = content.replace(/\[\s*,/g, '[');
    content = content.replace(/,\s*\]/g, ']');
    
    if (modified) {
        fs.writeFileSync('server.js', content);
        console.log('\n✅ server.js fixed successfully!');
        console.log('📁 Backup saved as: server.js.brand-fix-backup');
        
        console.log('\n🎯 Fixed issues:');
        console.log('   - Removed brand from search OR clause');
        console.log('   - Removed brand filter');
        console.log('   - Removed brand from select attributes');
        console.log('\n🚀 Now restart server and test!');
        
    } else {
        console.log('ℹ️  No brand column references found (maybe already fixed?)');
    }
}

// Run the fix
if (require.main === module) {
    fixServerBrandColumns();
}

module.exports = fixServerBrandColumns;