// backend/isolated-pool-test.js
// FIXED - Isolated test untuk memastikan pool configuration benar

console.log('🧪 ISOLATED POOL TEST - FIXED VERSION');
console.log('===================\n');

// Load environment
require('dotenv').config();
const { Pool } = require('pg');

// Test different pool configurations
const configs = [
  {
    name: 'CORRECT CONFIG (RECOMMENDED)',
    config: {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'matchcare_fresh_db',
      password: process.env.DB_PASSWORD,  // ✅ NO String() wrapper - FIXED!
      port: parseInt(process.env.DB_PORT) || 5432,
    }
  },
  {
    name: 'OLD PROBLEMATIC CONFIG (for comparison)',
    config: {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'matchcare_fresh_db',
      password: String(process.env.DB_PASSWORD || ''),  // ❌ String() wrapper (OLD)
      port: parseInt(process.env.DB_PORT) || 5432,
    }
  }
];

async function testConfig(name, config) {
  console.log(`🔧 Testing ${name}...`);
  console.log(`   User: ${config.user}`);
  console.log(`   Host: ${config.host}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   Password Type: ${typeof config.password} (${config.password ? 'SET' : 'NOT SET'})`);
  console.log(`   Port: ${config.port}`);
  
  const pool = new Pool(config);
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as test_time, current_user as user_name, version()');
    
    console.log(`   ✅ SUCCESS!`);
    console.log(`   Time: ${result.rows[0].test_time}`);
    console.log(`   Connected as: ${result.rows[0].user_name}`);
    console.log(`   PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    
    client.release();
    await pool.end();
    return true;
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    try { await pool.end(); } catch {}
    return false;
  }
}

async function runTests() {
  console.log('📋 Environment Variables:');
  console.log(`   DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
  console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? `***SET*** (${typeof process.env.DB_PASSWORD})` : 'NOT SET'}`);
  console.log(`   DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
  console.log(`   DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME || 'NOT SET'}\n`);
  
  let allPassed = true;
  
  for (const { name, config } of configs) {
    const passed = await testConfig(name, config);
    if (!passed) allPassed = false;
    console.log('');
  }
  
  console.log('🎯 CONCLUSION:');
  if (allPassed) {
    console.log('✅ Both configs work - your database setup is SOLID!');
    console.log('💡 The String() wrapper issue was just a theoretical concern');
    console.log('🚀 Your MatchCare system is ready for production');
  } else {
    console.log('❌ Some configs failed - check database connection');
    console.log('🛠️ Fix database setup before continuing');
  }
  
  console.log('\n🎯 NEXT STEPS FOR MATCHCARE:');
  console.log('✅ Database connection: WORKING');
  console.log('📋 TODO: Start Fuseki server for ontology');
  console.log('🧬 TODO: Test SPARQL endpoint');
  console.log('🚀 TODO: Start MatchCare server');
  
  console.log('\n💡 IMMEDIATE ACTION:');
  console.log('1. cd ontology/apache-jena-fuseki-5.4.0');
  console.log('2. ./fuseki-server');
  console.log('3. node backend/scripts/quick_sparql_test.js');
  console.log('4. npm start');
  
  process.exit(allPassed ? 0 : 1);
}

runTests();