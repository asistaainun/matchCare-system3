// File: backend/scripts/debug-database.js
// Debug database connection issues

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🔍 DEBUGGING DATABASE CONNECTION');
console.log('=' + '='.repeat(40));

console.log('\n1️⃣ ENVIRONMENT VARIABLES CHECK');
console.log('-'.repeat(35));

const envVars = {
    DB_USER: process.env.DB_USER,
    DB_HOST: process.env.DB_HOST, 
    DB_NAME: process.env.DB_NAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_PORT: process.env.DB_PORT
};

Object.entries(envVars).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const displayValue = key === 'DB_PASSWORD' && value ? 
        `***SET*** (${typeof value}, length: ${value.length})` : 
        value || 'NOT SET';
    console.log(`   ${status} ${key}: ${displayValue}`);
});

console.log('\n2️⃣ CONNECTION CONFIG TEST');
console.log('-'.repeat(30));

// Test different configurations
const configs = [
    {
        name: 'Environment Variables',
        config: {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'matchcare_fresh_db',
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 5432,
        }
    },
    {
        name: 'Default Local Config',
        config: {
            user: 'postgres',
            host: 'localhost',
            database: 'matchcare_fresh_db',
            password: '90226628', // Common default
            port: 5432,
        }
    },
    {
        name: 'Empty Password Config',
        config: {
            user: 'postgres',
            host: 'localhost',
            database: 'matchcare_fresh_db',
            password: '90226628',
            port: 5432,
        }
    }
];

async function testConnection(name, config) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   Config: ${config.user}@${config.host}:${config.port}/${config.database}`);
    console.log(`   Password: ${config.password ? `***SET*** (${typeof config.password})` : 'NOT SET'}`);
    
    try {
        const pool = new Pool(config);
        
        // Test basic connection
        const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
        console.log(`   ✅ Connection: SUCCESS`);
        console.log(`   📅 Server time: ${result.rows[0].current_time}`);
        
        // Test products table
        try {
            const products = await pool.query('SELECT COUNT(*) FROM products');
            console.log(`   📦 Products count: ${products.rows[0].count}`);
        } catch (tableError) {
            console.log(`   ⚠️  Products table: ${tableError.message}`);
        }
        
        await pool.end();
        return true;
        
    } catch (error) {
        console.log(`   ❌ Connection: FAILED`);
        console.log(`   📝 Error: ${error.message}`);
        
        // Common error solutions
        if (error.message.includes('password must be a string')) {
            console.log('   💡 Solution: Set DB_PASSWORD as string in .env file');
        } else if (error.message.includes('database') && error.message.includes('does not exist')) {
            console.log('   💡 Solution: Create database or check DB_NAME');
        } else if (error.message.includes('authentication failed')) {
            console.log('   💡 Solution: Check username/password combination');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.log('   💡 Solution: Start PostgreSQL server');
        }
        
        return false;
    }
}

async function runTests() {
    console.log('\n3️⃣ CONNECTION TESTS');
    console.log('-'.repeat(25));
    
    let workingConfig = null;
    
    for (const { name, config } of configs) {
        const success = await testConnection(name, config);
        if (success && !workingConfig) {
            workingConfig = { name, config };
        }
    }
    
    console.log('\n🎯 RESULTS & RECOMMENDATIONS');
    console.log('=' + '='.repeat(35));
    
    if (workingConfig) {
        console.log(`✅ WORKING CONFIG FOUND: ${workingConfig.name}`);
        console.log('\n📝 Create/update your .env file with:');
        console.log(`DB_USER=${workingConfig.config.user}`);
        console.log(`DB_HOST=${workingConfig.config.host}`);
        console.log(`DB_NAME=${workingConfig.config.database}`);
        console.log(`DB_PASSWORD=${workingConfig.config.password}`);
        console.log(`DB_PORT=${workingConfig.config.port}`);
        
        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Update your .env file with working config above');
        console.log('2. Restart your backend server');
        console.log('3. Re-run system readiness check');
        
    } else {
        console.log('❌ NO WORKING CONFIG FOUND');
        console.log('\n🛠️  TROUBLESHOOTING STEPS:');
        console.log('1. Check if PostgreSQL is running:');
        console.log('   Windows: services.msc → PostgreSQL service');
        console.log('   Mac/Linux: brew services list | grep postgres');
        console.log('');
        console.log('2. Check PostgreSQL credentials:');
        console.log('   Try connecting with psql: psql -U postgres -h localhost');
        console.log('');
        console.log('3. Common default passwords:');
        console.log('   - password123');
        console.log('   - postgres'); 
        console.log('   - admin');
        console.log('   - (empty password)');
    }
}

runTests().catch(console.error);