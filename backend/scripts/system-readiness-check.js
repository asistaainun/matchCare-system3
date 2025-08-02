// File: scripts/system-readiness-check.js
// MatchCare System Readiness Checker untuk Thesis Development

const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class MatchCareReadinessChecker {
    constructor() {
        this.results = {
            database: false,
            backend_apis: false,
            ontology: false,
            frontend: false,
            data_quality: 0,
            overall_score: 0
        };
    }

    async runFullCheck() {
        console.log('🔬 MATCHCARE SYSTEM READINESS CHECK');
        console.log('='.repeat(50));
        console.log('📋 Checking sistem untuk thesis development...\n');

        // 1. Database Check
        await this.checkDatabase();
        
        // 2. Backend API Check  
        await this.checkBackendAPIs();
        
        // 3. Ontology System Check
        await this.checkOntologySystem();
        
        // 4. Frontend Check
        await this.checkFrontend();
        
        // 5. Generate Report
        this.generateReport();
        
        // 6. Action Plan
        this.generateActionPlan();
    }

    async checkDatabase() {
        console.log('1️⃣ DATABASE READINESS CHECK');
        console.log('-'.repeat(30));
        
        try {
            const pool = new Pool({
                user: process.env.DB_USER || 'postgres',
                host: process.env.DB_HOST || 'localhost',
                database: process.env.DB_NAME || 'matchcare_fresh_db',
                password: process.env.DB_PASSWORD,
                port: process.env.DB_PORT || 5432,
            });

            // Test connection
            await pool.query('SELECT NOW()');
            console.log('   ✅ Database connection: WORKING');

            // Check products table
            const productCount = await pool.query('SELECT COUNT(*) FROM products');
            const products = parseInt(productCount.rows[0].count);
            console.log(`   📦 Products available: ${products}`);

            // Check data quality  
            const quality = await pool.query(`
                SELECT 
                    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) * 100.0 / COUNT(*) as name_quality,
                    COUNT(CASE WHEN brand_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as brand_quality,
                    COUNT(CASE WHEN main_category IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as category_quality
                FROM products
            `);
            
            const avgQuality = (
                parseFloat(quality.rows[0].name_quality) +
                parseFloat(quality.rows[0].brand_quality) + 
                parseFloat(quality.rows[0].category_quality)
            ) / 3;

            console.log(`   📊 Data quality: ${avgQuality.toFixed(1)}%`);
            
            this.results.database = products > 1000 && avgQuality > 80;
            this.results.data_quality = avgQuality;
            
            await pool.end();
            
        } catch (error) {
            console.log(`   ❌ Database check failed: ${error.message}`);
            this.results.database = false;
        }
        
        console.log('');
    }

    async checkBackendAPIs() {
        console.log('2️⃣ BACKEND API READINESS CHECK');
        console.log('-'.repeat(35));
        
        const requiredEndpoints = [
            { path: '/api/health', method: 'GET', critical: true },
            { path: '/api/products', method: 'GET', critical: true },
            { path: '/api/ontology/recommendations', method: 'POST', critical: true },
            { path: '/api/quiz/submit', method: 'POST', critical: false },
            { path: '/api/ingredients', method: 'GET', critical: false }
        ];

        let workingEndpoints = 0;
        let criticalEndpoints = 0;

        for (const endpoint of requiredEndpoints) {
            try {
                const url = `http://localhost:5000${endpoint.path}`;
                let response;
                
                if (endpoint.method === 'GET') {
                    response = await axios.get(url, { timeout: 5000 });
                } else {
                    response = await axios.post(url, {
                        skin_type: 'oily',
                        concerns: ['acne']
                    }, { timeout: 5000 });
                }
                
                const status = response.status === 200 ? '✅' : '⚠️';
                console.log(`   ${status} ${endpoint.method} ${endpoint.path}`);
                
                workingEndpoints++;
                if (endpoint.critical) criticalEndpoints++;
                
            } catch (error) {
                const status = endpoint.critical ? '❌' : '⚠️';
                console.log(`   ${status} ${endpoint.method} ${endpoint.path} - ${error.message.slice(0, 30)}...`);
            }
        }

        console.log(`   📊 API Status: ${workingEndpoints}/${requiredEndpoints.length} endpoints working`);
        this.results.backend_apis = criticalEndpoints >= 2; // At least health + products/recommendations
        
        console.log('');
    }

    async checkOntologySystem() {
        console.log('3️⃣ ONTOLOGY SYSTEM CHECK');
        console.log('-'.repeat(30));
        
        try {
            // Check Fuseki server
            const fusekiResponse = await axios.get('http://localhost:3030', { timeout: 5000 });
            console.log('   ✅ Fuseki server: RUNNING');
            
            // Check dataset  
            const sparqlEndpoint = 'http://localhost:3030/skincare-db/sparql';
            const query = 'SELECT (COUNT(*) as ?count) WHERE { ?s ?p ?o }';
            
            const sparqlResponse = await axios.post(sparqlEndpoint, 
                new URLSearchParams({ query }), 
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            
            const triples = sparqlResponse.data?.results?.bindings[0]?.count?.value || '0';
            console.log(`   📊 Ontology triples: ${triples}`);
            
            // Check ontology service integration
            const ontologyStatus = await axios.get('http://localhost:5000/api/analysis/ontology-status');
            const status = ontologyStatus.data?.status || 'unknown';
            console.log(`   🧠 Integration status: ${status}`);
            
            this.results.ontology = parseInt(triples) > 0 && status === 'FULLY_OPERATIONAL';
            
        } catch (error) {
            console.log(`   ❌ Ontology check failed: ${error.message.slice(0, 50)}...`);
            this.results.ontology = false;
        }
        
        console.log('');
    }

    async checkFrontend() {
        console.log('4️⃣ FRONTEND READINESS CHECK');
        console.log('-'.repeat(30));
        
        const frontendPath = path.join(__dirname, '../frontend');
        
        // Check if frontend exists
        if (!fs.existsSync(frontendPath)) {
            console.log('   ❌ Frontend directory not found');
            this.results.frontend = false;
            return;
        }

        // Check package.json
        const packagePath = path.join(frontendPath, 'package.json');
        if (fs.existsSync(packagePath)) {
            console.log('   ✅ Frontend project structure: EXISTS');
            
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const deps = Object.keys(packageJson.dependencies || {});
            
            const requiredDeps = ['react', 'react-router-dom', 'tailwindcss'];
            const hasRequiredDeps = requiredDeps.every(dep => 
                deps.some(d => d.includes(dep))
            );
            
            console.log(`   📦 Required dependencies: ${hasRequiredDeps ? 'INSTALLED' : 'MISSING'}`);
            
            // Check key components
            const componentsPath = path.join(frontendPath, 'src/components');
            const pagesPath = path.join(frontendPath, 'src/pages');
            
            const hasComponents = fs.existsSync(componentsPath);
            const hasPages = fs.existsSync(pagesPath);
            
            console.log(`   🧩 Components structure: ${hasComponents ? 'EXISTS' : 'MISSING'}`);
            console.log(`   📄 Pages structure: ${hasPages ? 'EXISTS' : 'MISSING'}`);
            
            this.results.frontend = hasRequiredDeps && hasComponents && hasPages;
        } else {
            console.log('   ❌ Frontend package.json not found');
            this.results.frontend = false;
        }
        
        console.log('');
    }

    generateReport() {
        console.log('📊 SYSTEM READINESS REPORT');
        console.log('='.repeat(40));
        
        const scores = {
            database: this.results.database ? 25 : 0,
            apis: this.results.backend_apis ? 25 : 0,
            ontology: this.results.ontology ? 30 : 0,
            frontend: this.results.frontend ? 20 : 0
        };
        
        this.results.overall_score = Object.values(scores).reduce((a, b) => a + b, 0);
        
        console.log(`📊 Database: ${this.results.database ? '✅' : '❌'} (${scores.database}/25 points)`);
        console.log(`🔗 Backend APIs: ${this.results.backend_apis ? '✅' : '❌'} (${scores.apis}/25 points)`);
        console.log(`🧠 Ontology: ${this.results.ontology ? '✅' : '❌'} (${scores.ontology}/30 points)`);
        console.log(`💻 Frontend: ${this.results.frontend ? '✅' : '❌'} (${scores.frontend}/20 points)`);
        
        console.log(`\n🎯 OVERALL SCORE: ${this.results.overall_score}/100`);
        
        if (this.results.overall_score >= 80) {
            console.log('🎉 STATUS: EXCELLENT - Ready for thesis development!');
        } else if (this.results.overall_score >= 60) {
            console.log('✅ STATUS: GOOD - Ready with minor improvements needed');
        } else if (this.results.overall_score >= 40) {
            console.log('⚠️ STATUS: FAIR - Needs significant work');
        } else {
            console.log('❌ STATUS: POOR - Major issues need to be resolved');
        }
        
        console.log('');
    }

    generateActionPlan() {
        console.log('🚀 IMMEDIATE ACTION PLAN');
        console.log('='.repeat(35));
        
        if (!this.results.database) {
            console.log('🔴 CRITICAL: Fix database connection');
            console.log('   → Check environment variables');
            console.log('   → Run: node backend/isolated-pool-test.js');
            console.log('');
        }
        
        if (!this.results.backend_apis) {
            console.log('🔴 CRITICAL: Start backend server');
            console.log('   → cd backend && npm start');
            console.log('   → Implement missing API endpoints');
            console.log('');
        }
        
        if (!this.results.ontology) {
            console.log('🟡 IMPORTANT: Setup ontology system');
            console.log('   → cd ontology/apache-jena-fuseki-5.4.0');
            console.log('   → ./fuseki-server');
            console.log('   → Import TTL data');
            console.log('');
        }
        
        if (!this.results.frontend) {
            console.log('🟡 IMPORTANT: Setup frontend development');
            console.log('   → cd frontend && npm install');
            console.log('   → Implement core components');
            console.log('   → Start with ProductList component');
            console.log('');
        }
        
        // Success scenario
        if (this.results.overall_score >= 60) {
            console.log('✅ READY TO START DEVELOPMENT');
            console.log('📋 Recommended next steps:');
            console.log('   1. Week 1: Implement missing API endpoints');
            console.log('   2. Week 1: Build ProductList + ProductCard components');
            console.log('   3. Week 2: Skin quiz implementation');
            console.log('   4. Week 3: Product detail pages');
            console.log('   5. Week 4: Full ontology integration');
            console.log('');
            console.log('🎯 Target: Working demo dalam 2 minggu');
        }
        
        console.log('📞 Need help? Check development plan document');
    }
}

// Export for use in other scripts
module.exports = MatchCareReadinessChecker;

// Run if called directly
if (require.main === module) {
    const checker = new MatchCareReadinessChecker();
    checker.runFullCheck().catch(console.error);
}