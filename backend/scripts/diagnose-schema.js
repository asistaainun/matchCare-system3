const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function diagnoseSchema() {
    try {
        console.log('🔍 MatchCare Schema Diagnostic\n');
        
        // Check brands table columns
        const brandsColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'brands' 
            ORDER BY ordinal_position
        `);
        
        console.log('🏢 BRANDS TABLE COLUMNS:');
        console.table(brandsColumns.rows);
        
        // Check products table columns
        const productsColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'products' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📦 PRODUCTS TABLE COLUMNS:');
        console.table(productsColumns.rows);
        
        // Check specific problematic columns
        const brandOntologyExists = brandsColumns.rows.some(r => r.column_name === 'ontology_uri');
        const productBrandExists = productsColumns.rows.some(r => r.column_name === 'brand');
        const productIsActiveExists = productsColumns.rows.some(r => r.column_name === 'is_active');
        
        console.log('\n🎯 PROBLEM ANALYSIS:');
        console.log(`❌ brands.ontology_uri exists: ${brandOntologyExists}`);
        console.log(`❌ products.brand column exists: ${productBrandExists}`);  
        console.log(`✅ products.is_active exists: ${productIsActiveExists}`);
        
        if (!brandOntologyExists) {
            console.log('\n🚨 SOLUTION: Remove ontology_uri references from Brand includes');
        }
        
        if (productBrandExists) {
            console.log('⚠️  WARNING: products.brand column exists (redundant with brand_id)');
        }
        
        // Sample data check
        const sampleQuery = await pool.query(`
            SELECT p.id, p.name, p.brand_id, b.name as brand_name 
            FROM products p 
            LEFT JOIN brands b ON p.brand_id = b.id 
            LIMIT 3
        `);
        
        console.log('\n📊 SAMPLE DATA (Foreign Key Test):');
        console.table(sampleQuery.rows);
        
        if (sampleQuery.rows.length > 0 && sampleQuery.rows[0].brand_name) {
            console.log('✅ Foreign key relationship WORKING!');
        } else {
            console.log('❌ Foreign key relationship BROKEN!');
        }
        
    } catch (error) {
        console.error('❌ Diagnostic Error:', error.message);
    } finally {
        await pool.end();
    }
}

diagnoseSchema();