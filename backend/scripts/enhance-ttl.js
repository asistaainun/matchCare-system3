// backend/scripts/enhance-ttl.js
// Node.js TTL Enhancer for MatchCare
// Enhance existing skincareOntology.ttl dengan 20 samples dari CSV

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class MatchCareTTLEnhancer {
    constructor() {
        this.projectRoot = this.findProjectRoot();
        this.ttlFile = path.join(this.projectRoot, 'skincareOntology.ttl');
        this.ingredientsCsv = path.join(this.projectRoot, 'backend/data/csv/matchcare_ultimate_cleaned.csv');
        this.productsCsv = path.join(this.projectRoot, 'backend/data/csv/new_final_corrected_matchcare_data.csv');

        this.baseUri = "http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/";
        this.selectedIngredients = [];
        this.selectedProducts = [];
    }

    findProjectRoot() {
        let current = process.cwd();
        while (current !== path.dirname(current)) {
            if (fs.existsSync(path.join(current, 'package.json')) && 
                fs.existsSync(path.join(current, 'backend'))) {
                return current;
            }
            current = path.dirname(current);
        }
        return process.cwd();
    }

    async validateFiles() {
        console.log('🔍 Validating files...');
        
        const requiredFiles = [
            { path: this.ttlFile, name: 'skincareOntology.ttl' },
            { path: this.ingredientsCsv, name: 'ingredients CSV' },
            { path: this.productsCsv, name: 'products CSV' }
        ];

        for (const file of requiredFiles) {
            if (fs.existsSync(file.path)) {
                console.log(`   ✅ ${file.name}: ${file.path}`);
            } else {
                console.log(`   ❌ ${file.name}: ${file.path} (NOT FOUND)`);
                return false;
            }
        }

        console.log('✅ All files found!');
        return true;
    }

    async loadCsvData(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => {
                    console.log(`📊 Loaded ${results.length} rows from ${path.basename(filePath)}`);
                    resolve(results);
                })
                .on('error', reject);
        });
    }

    cleanForUri(text) {
        return text.replace(/[^a-zA-Z0-9]/g, '');
    }

    escapeForTtl(text) {
        if (!text) return '""';
        return `"${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }

    isKeyIngredient(name) {
        const keyIngredients = [
            'niacinamide', 'hyaluronic acid', 'vitamin c', 'ascorbic acid',
            'retinol', 'retinoid', 'salicylic acid', 'bha', 'glycolic acid', 
            'aha', 'ceramide', 'peptide', 'panthenol'
        ];
        
        const nameLower = name.toLowerCase();
        return keyIngredients.some(key => nameLower.includes(key));
    }

    async selectCustomSamples() {
        console.log('🎯 CUSTOM SAMPLE SELECTION');
        console.log('='.repeat(50));

        // Load CSV data
        const ingredients = await this.loadCsvData(this.ingredientsCsv);
        const products = await this.loadCsvData(this.productsCsv);

        // Preview interesting candidates
        console.log('\n🧪 TOP INGREDIENT CANDIDATES:');
        const interestingIngredients = ingredients
            .filter(ing => ing.explanation && ing.actualFunctions && ing.name && ing.name.length > 3)
            .slice(0, 30);

        interestingIngredients.forEach((ing, i) => {
            const name = ing.name;
            const isKey = this.isKeyIngredient(name) ? '⭐ KEY' : '';
            const pregnancy = ing.pregnancySafe === 'true' ? '🤰 SAFE' : '';
            const functions = (ing.actualFunctions || '').substring(0, 40) + '...';
            
            console.log(`  ${i.toString().padStart(2)}. ${name.padEnd(25)} ${isKey.padEnd(8)} ${pregnancy.padEnd(8)} | ${functions}`);
        });

        console.log('\n🛍️  TOP PRODUCT CANDIDATES:');
        const interestingProducts = products
            .filter(prod => prod['Product Name'] && prod.Brand && prod.Description && prod['Key_Ingredients'])
            .slice(0, 20);

        interestingProducts.forEach((prod, i) => {
            const name = prod['Product Name'];
            const brand = prod.Brand || 'Unknown';
            const category = prod['Main_Category'] || 'Unknown';
            const keyIngs = (prod['Key_Ingredients'] || '').substring(0, 30) + '...';
            
            console.log(`  ${i.toString().padStart(2)}. ${name.padEnd(30)} | ${brand.padEnd(15)} | ${category.padEnd(12)} | ${keyIngs}`);
        });

        // Auto-select diverse samples (you can modify selection logic here)
        console.log('\n🤖 Auto-selecting 15 ingredients + 5 products...');
        
        // Select 15 diverse ingredients
        this.selectedIngredients = this.selectDiverseIngredients(interestingIngredients, 15);
        
        // Select 5 diverse products  
        this.selectedProducts = this.selectDiverseProducts(interestingProducts, 5);

        console.log(`\n✅ Selected ${this.selectedIngredients.length} ingredients + ${this.selectedProducts.length} products`);
        
        // Show selection summary
        console.log('\n📋 SELECTED INGREDIENTS:');
        this.selectedIngredients.forEach((ing, i) => {
            const isKey = this.isKeyIngredient(ing.name) ? '⭐' : '📋';
            console.log(`   ${i+1}. ${isKey} ${ing.name}`);
        });

        console.log('\n📋 SELECTED PRODUCTS:');
        this.selectedProducts.forEach((prod, i) => {
            console.log(`   ${i+1}. 🛍️  ${prod['Product Name']} (${prod.Brand})`);
        });
    }

    selectDiverseIngredients(ingredients, count) {
        // Group by function type for diversity
        const functionGroups = {
            humectant: [],
            antioxidant: [],
            emollient: [],
            exfoliant: [],
            conditioning: [],
            other: []
        };

        ingredients.forEach(ing => {
            const functions = (ing.actualFunctions || '').toLowerCase();
            if (functions.includes('humectant')) {
                functionGroups.humectant.push(ing);
            } else if (functions.includes('antioxidant')) {
                functionGroups.antioxidant.push(ing);
            } else if (functions.includes('emollient')) {
                functionGroups.emollient.push(ing);
            } else if (functions.includes('exfoliant')) {
                functionGroups.exfoliant.push(ing);
            } else if (functions.includes('conditioning')) {
                functionGroups.conditioning.push(ing);
            } else {
                functionGroups.other.push(ing);
            }
        });

        // Sample from each group
        const selected = [];
        const perGroup = Math.floor(count / Object.keys(functionGroups).length);
        
        Object.entries(functionGroups).forEach(([groupName, groupIngredients]) => {
            const groupSample = groupIngredients.slice(0, Math.max(1, perGroup));
            selected.push(...groupSample);
            console.log(`     🧪 ${groupName}: ${groupSample.length} ingredients`);
        });

        return selected.slice(0, count);
    }

    selectDiverseProducts(products, count) {
        // Diversify by category and brand
        const selected = [];
        const usedCategories = new Set();
        const usedBrands = new Set();

        for (const product of products) {
            if (selected.length >= count) break;

            const category = product['Main_Category'] || 'Unknown';
            const brand = product.Brand || 'Unknown';

            // Prefer new categories and brands
            if (!usedCategories.has(category) || !usedBrands.has(brand)) {
                selected.push(product);
                usedCategories.add(category);
                usedBrands.add(brand);
            }
        }

        // Fill remaining slots
        const remaining = products.filter(p => !selected.includes(p));
        selected.push(...remaining.slice(0, count - selected.length));

        console.log(`     🛍️  Selected from ${usedCategories.size} categories, ${usedBrands.size} brands`);
        
        return selected.slice(0, count);
    }

    generateIngredientTtl(ingredient) {
        const name = ingredient.name;
        const uriName = this.cleanForUri(name);
        
        let ttl = `# ${name}\n`;
        ttl += `sc:${uriName} rdf:type sc:Ingredient ;\n`;

        // Add properties from CSV
        if (ingredient.actualFunctions) {
            ttl += `    sc:ActualFunctions ${this.escapeForTtl(ingredient.actualFunctions)} ;\n`;
        }

        if (ingredient.explanation) {
            const explanation = ingredient.explanation.substring(0, 200) + '...';
            ttl += `    sc:explanation ${this.escapeForTtl(explanation)} ;\n`;
        }

        // Boolean properties
        const boolProps = ['pregnancySafe', 'alcoholFree', 'fragranceFree', 'parabenFree', 'sulfateFree', 'siliconeFree'];
        boolProps.forEach(prop => {
            if (ingredient[prop]) {
                const value = ['true', '1', 'yes'].includes(ingredient[prop].toLowerCase()) ? 'true' : 'false';
                ttl += `    sc:${prop} "${value}"^^xsd:boolean ;\n`;
            }
        });

        // Skin type recommendations
        if (ingredient.suitableForSkinTypes) {
            const skinTypes = ingredient.suitableForSkinTypes.toLowerCase();
            if (skinTypes.includes('oily')) ttl += `    sc:recommendedFor sc:Oily ;\n`;
            if (skinTypes.includes('dry')) ttl += `    sc:recommendedFor sc:Dry ;\n`;
            if (skinTypes.includes('normal')) ttl += `    sc:recommendedFor sc:Normal ;\n`;
            if (skinTypes.includes('combination')) ttl += `    sc:recommendedFor sc:Combination ;\n`;
        }

        ttl += `    rdfs:label ${this.escapeForTtl(name)} .\n\n`;
        return ttl;
    }

    generateProductTtl(product) {
        const name = product['Product Name'];
        const uriName = this.cleanForUri(name);
        
        let ttl = `# ${name}\n`;
        ttl += `sc:${uriName} rdf:type sc:Product ;\n`;
        ttl += `    sc:ProductName ${this.escapeForTtl(name)} ;\n`;

        if (product.Brand) {
            ttl += `    sc:brand ${this.escapeForTtl(product.Brand)} ;\n`;
        }

        if (product.Description) {
            const desc = product.Description.substring(0, 300) + '...';
            ttl += `    sc:ProductDescription ${this.escapeForTtl(desc)} ;\n`;
        }

        if (product['How to Use']) {
            const howTo = product['How to Use'].substring(0, 200) + '...';
            ttl += `    sc:HowToUse ${this.escapeForTtl(howTo)} ;\n`;
        }

        // Category
        if (product['Main_Category']) {
            const categoryUri = this.cleanForUri(product['Main_Category']);
            ttl += `    sc:belongsToCategory sc:${categoryUri} ;\n`;
        }

        // Boolean formulation properties  
        const boolProps = ['alcohol_free', 'fragrance_free', 'paraben_free', 'sulfate_free', 'silicone_free'];
        boolProps.forEach(prop => {
            if (product[prop]) {
                const value = ['true', '1', 'yes'].includes(product[prop].toLowerCase()) ? 'true' : 'false';
                ttl += `    sc:${prop} "${value}"^^xsd:boolean ;\n`;
            }
        });

        ttl += `    rdfs:label ${this.escapeForTtl(name)} .\n\n`;
        return ttl;
    }

    async generateEnhancedTtl() {
        console.log('⚡ Generating enhanced TTL...');

        // Load existing TTL
        const existingTtl = fs.readFileSync(this.ttlFile, 'utf8');
        
        // Generate enhancement section
        let enhancement = '\n\n';
        enhancement += '# ================================\n';
        enhancement += '# ENHANCED SAMPLE DATA\n';
        enhancement += '# Generated from MatchCare CSV data\n';
        enhancement += `# ${this.selectedIngredients.length} ingredients + ${this.selectedProducts.length} products\n`;
        enhancement += '# ================================\n\n';

        // Generate ingredient individuals
        enhancement += '# ===== SAMPLE INGREDIENT INDIVIDUALS =====\n\n';
        this.selectedIngredients.forEach(ingredient => {
            enhancement += this.generateIngredientTtl(ingredient);
        });

        // Generate product individuals
        enhancement += '# ===== SAMPLE PRODUCT INDIVIDUALS =====\n\n';
        this.selectedProducts.forEach(product => {
            enhancement += this.generateProductTtl(product);
        });

        // Combine with existing
        const enhancedTtl = existingTtl + enhancement;

        // Save enhanced version
        const outputFile = path.join(this.projectRoot, 'skincareOntology_enhanced.ttl');
        fs.writeFileSync(outputFile, enhancedTtl, 'utf8');

        console.log(`✅ Enhanced TTL saved: ${outputFile}`);
        console.log(`📊 Total size: ${(enhancedTtl.length / 1024).toFixed(1)}KB`);
        console.log(`📈 Added: ${this.selectedIngredients.length} ingredients + ${this.selectedProducts.length} products`);

        return outputFile;
    }

    async run() {
        console.log('🚀 MatchCare TTL Enhancer');
        console.log('='.repeat(50));
        console.log(`📁 Project root: ${this.projectRoot}`);

        // Validate files
        if (!await this.validateFiles()) {
            console.log('❌ Missing required files. Please check file paths.');
            return;
        }

        // Select samples
        await this.selectCustomSamples();

        // Generate enhanced TTL
        const outputFile = await this.generateEnhancedTtl();

        console.log('\n✅ ENHANCEMENT COMPLETE!');
        console.log('🔧 Next steps:');
        console.log('1. Review the enhanced TTL file');
        console.log('2. Load in Protégé for validation');
        console.log('3. Test SPARQL queries'); 
        console.log('4. Integrate with MatchCare backend');
        
        console.log('\n📋 Integration example:');
        console.log(`const ontology = fs.readFileSync('${path.basename(outputFile)}', 'utf8');`);
    }
}

// Run the enhancer
if (require.main === module) {
    const enhancer = new MatchCareTTLEnhancer();
    enhancer.run().catch(console.error);
}

module.exports = MatchCareTTLEnhancer;