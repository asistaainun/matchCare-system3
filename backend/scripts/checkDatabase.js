// scripts/checkDatabase.js
// Script untuk mengecek apakah database matchcare_fresh_db sesuai dengan CSV data

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function checkDatabaseCompatibility() {
  console.log('🔍 Checking MatchCare Database Compatibility...\n');
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // 1. Check required tables exist
    console.log('\n📋 Checking Required Tables:');
    const requiredTables = [
      'products',
      'ingredients', 
      'brands',
      'skin_types',
      'skin_concerns',
      'allergen_types',
      'user_profiles',
      'guest_sessions'
    ];
    
    const existingTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tableNames = existingTables.rows.map(r => r.table_name);
    
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(`✅ ${table} - EXISTS`);
      } else {
        console.log(`❌ ${table} - MISSING`);
      }
    }
    
    // 2. Check products table structure against CSV data
    console.log('\n📊 Checking Products Table Structure:');
    const productsColumns = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'products' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Products table columns:');
    productsColumns.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`  - ${col.column_name}: ${col.data_type}${length}`);
    });
    
    // Expected columns based on normalized DB structure
    const expectedProductCols = [
      'id', 'name', 'brand_id', 'product_type', 'description', 
      'how_to_use', 'local_image_path', 
      'bpom_number', 'key_ingredients_csv', 'alcohol_free',
      'fragrance_free', 'paraben_free', 'sulfate_free', 
      'silicone_free', 'main_category', 'subcategory'
    ];
    
    console.log('\n🔍 Checking for expected product columns (normalized structure):');
    const productColumnNames = productsColumns.rows.map(r => r.column_name);
    
    for (const col of expectedProductCols) {
      if (productColumnNames.includes(col)) {
        console.log(`✅ ${col} - EXISTS`);
      } else {
        console.log(`❌ ${col} - MISSING`);
      }
    }
    
    // Check foreign key relationships
    console.log('\n🔗 Checking Foreign Key Relationships:');
    const fkQuery = await client.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'products'
    `);
    
    console.log('Products table foreign keys:');
    fkQuery.rows.forEach(fk => {
      console.log(`  - ${fk.column_name} → ${fk.foreign_table_name}(${fk.foreign_column_name})`);
    });
    
    // 3. Check data counts
    console.log('\n📈 Checking Data Counts:');
    
    const dataCounts = await Promise.all([
      client.query('SELECT COUNT(*) FROM products'),
      client.query('SELECT COUNT(*) FROM ingredients'),
      client.query('SELECT COUNT(*) FROM brands'),
      client.query('SELECT COUNT(*) FROM skin_types'),
      client.query('SELECT COUNT(*) FROM skin_concerns')
    ]);
    
    console.log(`Products: ${dataCounts[0].rows[0].count}`);
    console.log(`Ingredients: ${dataCounts[1].rows[0].count}`);
    console.log(`Brands: ${dataCounts[2].rows[0].count}`);
    console.log(`Skin Types: ${dataCounts[3].rows[0].count}`);
    console.log(`Skin Concerns: ${dataCounts[4].rows[0].count}`);
    
    // 4. Sample data check (FIXED for normalized DB)
    console.log('\n🎯 Sample Data Check:');
    const sampleProducts = await client.query(`
      SELECT p.name, b.name as brand, p.main_category, p.alcohol_free, p.fragrance_free
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LIMIT 3
    `);
    
    console.log('Sample products:');
    sampleProducts.rows.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} by ${product.brand || 'Unknown Brand'}`);
      console.log(`   Category: ${product.main_category}`);
      console.log(`   Alcohol Free: ${product.alcohol_free}, Fragrance Free: ${product.fragrance_free}`);
    });
    
    // 5. Check skin types and concerns reference data
    console.log('\n🏷️ Reference Data Check:');
    
    const skinTypes = await client.query('SELECT name FROM skin_types ORDER BY name');
    console.log('Available Skin Types:', skinTypes.rows.map(r => r.name).join(', '));
    
    const concerns = await client.query('SELECT name FROM skin_concerns ORDER BY name LIMIT 10');
    console.log('Sample Skin Concerns:', concerns.rows.map(r => r.name).join(', '));
    
    // 6. Database compatibility summary (UPDATED for normalized structure)
    console.log('\n📋 COMPATIBILITY SUMMARY:');
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    const missingProductCols = expectedProductCols.filter(col => !productColumnNames.includes(col));
    
    // Check if we have proper normalization (brand_id instead of brand)
    const hasNormalizedBrands = productColumnNames.includes('brand_id');
    const hasBrandsTable = tableNames.includes('brands');
    
    if (missingTables.length === 0 && missingProductCols.length === 0 && hasNormalizedBrands && hasBrandsTable) {
      console.log('✅ DATABASE FULLY COMPATIBLE');
      console.log('   Your database uses proper normalized structure with foreign keys.');
      console.log('   This is BETTER than flat structure - great database design!');
      console.log('   You can proceed with the updated server setup.');
    } else if (missingTables.length === 0 && hasNormalizedBrands && hasBrandsTable) {
      console.log('✅ DATABASE MOSTLY COMPATIBLE');
      console.log('   Your database structure is properly normalized.');
      console.log('   Minor missing columns can be handled with updated queries.');
      
      if (missingProductCols.length > 0) {
        console.log(`   Optional missing columns: ${missingProductCols.join(', ')}`);
      }
    } else {
      console.log('⚠️ DATABASE NEEDS UPDATES:');
      
      if (missingTables.length > 0) {
        console.log(`   Missing tables: ${missingTables.join(', ')}`);
      }
      
      if (missingProductCols.length > 0) {
        console.log(`   Missing product columns: ${missingProductCols.join(', ')}`);
      }
      
      console.log('\n💡 RECOMMENDED ACTIONS:');
      console.log('   1. Run database migration scripts');
      console.log('   2. Import CSV data using proper mapping');
      console.log('   3. Re-run this compatibility check');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log('\n💡 DATABASE NOT FOUND - NEXT STEPS:');
      console.log('   1. Create database: createdb matchcare_fresh_db');
      console.log('   2. Run schema creation scripts');
      console.log('   3. Import your CSV data');
      console.log('   4. Re-run this check');
    }
  } finally {
    await pool.end();
  }
}

// Run the check
checkDatabaseCompatibility().catch(console.error);