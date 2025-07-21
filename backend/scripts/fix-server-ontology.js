const fs = require('fs');
const path = require('path');

function fixServerOntologyReferences() {
    const serverPath = path.join(__dirname, '../server.js');
    
    console.log('🔧 Fixing server.js ontology_uri references...');
    
    if (!fs.existsSync(serverPath)) {
        console.log('❌ server.js not found');
        return;
    }
    
    let content = fs.readFileSync(serverPath, 'utf8');
    let modified = false;
    
    // Fix 1: Remove ontology_uri from Brand attributes
    const brandAttributePattern = /attributes:\s*\[\s*['"](id|name)['"]\s*,\s*['"](name|id)['"]\s*,\s*['"]ontology_uri['"]\s*\]/g;
    if (content.match(brandAttributePattern)) {
        content = content.replace(brandAttributePattern, `attributes: ['id', 'name']`);
        modified = true;
        console.log('✅ Fixed Brand attributes (removed ontology_uri)');
    }
    
    // Fix 2: Remove ontology_uri from select attributes
    const selectPattern = /'ontology_uri'\s*,?/g;
    if (content.match(selectPattern)) {
        content = content.replace(selectPattern, '');
        modified = true;
        console.log('✅ Removed ontology_uri from select attributes');
    }
    
    // Fix 3: Clean up any orphaned commas
    content = content.replace(/,\s*,/g, ','); // Remove double commas
    content = content.replace(/\[\s*,/g, '['); // Remove comma at start of array
    content = content.replace(/,\s*\]/g, ']'); // Remove comma at end of array
    
    // Fix 4: Remove Product.brand if exists (should use brand_id relationship)
    const productBrandPattern = /['"]brand['"]:\s*product\.brand/g;
    if (content.match(productBrandPattern)) {
        content = content.replace(productBrandPattern, '// brand: via Brand relationship');
        modified = true;
        console.log('✅ Fixed Product.brand direct access');
    }
    
    if (modified) {
        // Backup original
        fs.writeFileSync(serverPath + '.pre-fix-backup', fs.readFileSync(serverPath));
        console.log('📝 Created backup: server.js.pre-fix-backup');
        
        // Write fixed version
        fs.writeFileSync(serverPath, content);
        console.log('✅ server.js fixed successfully!');
        
        console.log('\n🎯 Changes made:');
        console.log('   - Removed ontology_uri from Brand includes');
        console.log('   - Cleaned up attribute arrays');
        console.log('   - Fixed any direct brand column access');
        
    } else {
        console.log('ℹ️  No ontology_uri references found in server.js');
        console.log('   The error might be in controller or model');
    }
    
    // Show remaining issues if any
    const remainingOntology = content.match(/ontology_uri/g);
    if (remainingOntology) {
        console.log(`⚠️  Still found ${remainingOntology.length} ontology_uri references`);
        console.log('   Please manually review server.js');
    } else {
        console.log('✅ No more ontology_uri references found');
    }
}

// Run the fix
if (require.main === module) {
    fixServerOntologyReferences();
}

module.exports = fixServerOntologyReferences;
