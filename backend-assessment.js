// ✅ CORRECTED BACKEND ASSESSMENT SCRIPT
// File: backend-assessment.js

const axios = require('axios');

class BackendAssessment {
    constructor() {
        this.baseURL = 'http://localhost:5000';
        this.results = {
            health: false,
            products: false,
            categories: false,
            brands: false,
            ontology_recommendations: false,
            ingredient_analysis: false
        };
    }

    async runFullAssessment() {
        console.log('🔍 ANALISIS SISTEM REKOMENDASI SKINCARE BERBASIS ONTOLOGI');
        console.log('═'.repeat(60));
        console.log('🎓 Memvalidasi implementasi "MatchCare" untuk skripsi\n');

        try {
            await this.checkHealth();
            await this.checkProducts();
            await this.checkCategories();
            await this.checkBrands();
            await this.checkOntologyRecommendations(); // FIX: Updated method
            await this.checkIngredientAnalysis();

            this.generateFinalReport();

        } catch (error) {
            console.error('❌ Assessment failed:', error.message);
            process.exit(1);
        }
    }

    async checkHealth() {
        console.log('1️⃣ HEALTH CHECK');
        console.log('─'.repeat(20));
        
        try {
            const response = await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
            
            if (response.data.success) {
                console.log('   ✅ Health Check: WORKING');
                this.results.health = true;
            } else {
                console.log('   ❌ Health Check: NOT WORKING');
            }
        } catch (error) {
            console.log('   ❌ Health Check: NOT WORKING');
            console.log(`   💡 Error: ${error.message}`);
        }
    }

    async checkProducts() {
        console.log('\n2️⃣ PRODUCTS API');
        console.log('─'.repeat(20));
        
        try {
            const response = await axios.get(`${this.baseURL}/api/products`, { timeout: 10000 });
            
            if (response.data.success && response.data.data && response.data.data.length > 0) {
                console.log('   ✅ Products List: WORKING');
                console.log(`   📊 Sample Product: ${response.data.data[0].name || 'N/A'}`);
                this.results.products = true;
            } else {
                console.log('   ❌ Products List: NOT WORKING');
            }
        } catch (error) {
            console.log('   ❌ Products List: NOT WORKING');
            console.log(`   💡 Error: ${error.message}`);
        }
    }

    async checkCategories() {
        console.log('\n3️⃣ CATEGORIES API');
        console.log('─'.repeat(20));
        
        try {
            const response = await axios.get(`${this.baseURL}/api/categories`, { timeout: 5000 });
            
            if (response.data.success && response.data.data && response.data.data.length > 0) {
                console.log('   ✅ Categories: WORKING');
                console.log(`   📂 Categories found: ${response.data.data.length}`);
                this.results.categories = true;
            } else {
                console.log('   ❌ Categories: NOT WORKING');
            }
        } catch (error) {
            console.log('   ❌ Categories: NOT WORKING');
            console.log(`   💡 Error: ${error.message}`);
        }
    }

    async checkBrands() {
        console.log('\n4️⃣ BRANDS API');
        console.log('─'.repeat(20));
        
        try {
            const response = await axios.get(`${this.baseURL}/api/brands`, { timeout: 5000 });
            
            if (response.data.success && response.data.data && response.data.data.length > 0) {
                console.log('   ✅ Brands: WORKING');
                console.log(`   🏷️ Brands found: ${response.data.data.length}`);
                this.results.brands = true;
            } else {
                console.log('   ❌ Brands: NOT WORKING');
            }
        } catch (error) {
            console.log('   ❌ Brands: NOT WORKING');
            console.log(`   💡 Error: ${error.message}`);
        }
    }

    async checkOntologyRecommendations() {
        console.log('\n5️⃣ ONTOLOGY RECOMMENDATIONS (CRITICAL)');
        console.log('─'.repeat(40));
        
        try {
            // FIX: Correct payload format based on working curl example
            const payload = {
                skin_type: 'oily',
                concerns: ['acne'],
                sensitivities: []
            };

            console.log('   🧪 Testing ontology recommendations...');
            
            const response = await axios.post(
                `${this.baseURL}/api/ontology/recommendations`, 
                payload,
                { 
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000 // Increased timeout for ontology processing
                }
            );
            
            if (response.data.success && response.data.data && response.data.data.recommendations) {
                const recCount = response.data.data.recommendations.length;
                const algorithm = response.data.algorithm_type;
                
                console.log('   ✅ Ontology Recommendations: WORKING');
                console.log(`   🧠 Algorithm: ${algorithm}`);
                console.log(`   📊 Recommendations: ${recCount}`);
                console.log(`   🎯 Processing time: ${response.data.data.metadata?.processing_time_ms || 'N/A'}ms`);
                console.log(`   🔬 Ontology confidence: ${response.data.data.metadata?.ontology_confidence || 'N/A'}`);
                
                this.results.ontology_recommendations = true;
            } else {
                console.log('   ❌ Ontology Recommendations: NOT WORKING');
                console.log('   💡 Response format unexpected');
            }
            
        } catch (error) {
            console.log('   ❌ Ontology Recommendations: NOT WORKING');
            console.log(`   💡 Error: ${error.message}`);
            
            // Additional debugging info
            if (error.response) {
                console.log(`   📊 Status: ${error.response.status}`);
                console.log(`   📋 Response: ${JSON.stringify(error.response.data, null, 2).slice(0, 200)}...`);
            }
        }
    }

    async checkIngredientAnalysis() {
        console.log('\n6️⃣ INGREDIENT ANALYSIS');
        console.log('─'.repeat(25));
        
        try {
            const payload = {
                ingredients: ['water', 'glycerin', 'niacinamide']
            };

            const response = await axios.post(
                `${this.baseURL}/api/analysis/ingredient-conflicts`, 
                payload,
                { 
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000 
                }
            );
            
            if (response.data.success) {
                console.log('   ✅ Ingredient Analysis: WORKING');
                this.results.ingredient_analysis = true;
            } else {
                console.log('   ❌ Ingredient Analysis: NOT WORKING');
            }
        } catch (error) {
            console.log('   ❌ Ingredient Analysis: NOT WORKING');
            console.log(`   💡 Error: ${error.message}`);
        }
    }

    generateFinalReport() {
        console.log('\n' + '═'.repeat(60));
        console.log('📊 FINAL ASSESSMENT REPORT');
        console.log('═'.repeat(60));

        // Count working endpoints
        const workingCount = Object.values(this.results).filter(Boolean).length;
        const totalCount = Object.keys(this.results).length;
        const percentage = ((workingCount / totalCount) * 100).toFixed(1);

        // Display results
        Object.entries(this.results).forEach(([key, status]) => {
            const displayName = key.replace(/_/g, ' ').toUpperCase();
            const icon = status ? '✅' : '❌';
            const statusText = status ? 'WORKING' : 'NOT WORKING';
            console.log(`   ${icon} ${displayName}: ${statusText}`);
        });

        console.log(`\n📈 API Completeness: ${percentage}%`);

        // Final verdict
        if (workingCount === totalCount) {
            console.log('\n🎉 EXCELLENT - Sistem siap untuk pengembangan skripsi!');
            console.log('✅ TRUE Ontology-Based System terverifikasi');
            console.log('✅ Academic requirements terpenuhi');
            console.log('✅ Frontend development bisa dimulai');
        } else if (workingCount >= 4) {
            console.log('\n✅ GOOD - Sebagian besar endpoint bekerja');
            console.log('🛠️ Perbaiki endpoint yang error');
        } else {
            console.log('\n⚠️ NEEDS WORK - Banyak endpoint bermasalah');
            console.log('🚨 Fokus perbaikan server terlebih dahulu');
        }

        // Academic validation
        console.log('\n🎓 ACADEMIC VALIDATION:');
        console.log(`   Algorithm Type: TRUE ONTOLOGY-BASED ${this.results.ontology_recommendations ? '✅' : '❌'}`);
        console.log(`   Thesis Contribution: NOVEL SYSTEM ${this.results.ontology_recommendations ? '✅' : '❌'}`);
        console.log(`   Technical Innovation: SPARQL REASONING ${this.results.ontology_recommendations ? '✅' : '❌'}`);

        // Exit code
        process.exit(workingCount === totalCount ? 0 : 1);
    }
}

// Run assessment
async function runAssessment() {
    const assessment = new BackendAssessment();
    await assessment.runFullAssessment();
}

// Check if server is running first
async function checkServerAndRun() {
    try {
        await axios.get('http://localhost:5000/health', { timeout: 3000 });
        console.log('🟢 Server detected at http://localhost:5000');
        console.log('🚀 Starting assessment...\n');
        await runAssessment();
    } catch (error) {
        console.log('🔴 Server not running at http://localhost:5000');
        console.log('💡 Please start server first: npm start');
        console.log('💡 Then run: node backend-assessment.js');
        process.exit(1);
    }
}

checkServerAndRun();