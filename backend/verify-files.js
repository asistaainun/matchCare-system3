// backend/verify-files.js
// Script untuk verify file contents dan detect String() wrapper

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFYING FILES FOR String() WRAPPER ISSUES...\n');

const filesToCheck = [
  {
    name: 'server.js',
    path: './server.js'
  },
  {
    name: 'ontologyBasedRecommendationEngine.js', 
    path: './services/ontologyBasedRecommendationEngine.js'
  }
];

let foundIssues = [];

filesToCheck.forEach(file => {
  try {
    if (fs.existsSync(file.path)) {
      const content = fs.readFileSync(file.path, 'utf8');
      const lines = content.split('\n');
      
      console.log(`📁 Checking ${file.name}...`);
      
      // Look for String() wrapper specifically
      let hasStringWrapper = false;
      let poolConfigLines = [];
      
      lines.forEach((line, index) => {
        // Check for String() wrapper in password config
        if (line.includes('password:') && line.includes('String(process.env.DB_PASSWORD')) {
          hasStringWrapper = true;
          foundIssues.push({
            file: file.name,
            line: index + 1,
            content: line.trim(),
            issue: 'String() wrapper found'
          });
        }
        
        // Collect all pool config lines for analysis
        if (line.includes('password:') && line.includes('process.env.DB_PASSWORD')) {
          poolConfigLines.push({
            line: index + 1,
            content: line.trim()
          });
        }
      });
      
      if (hasStringWrapper) {
        console.log(`❌ FOUND String() WRAPPER in ${file.name}`);
      } else if (poolConfigLines.length > 0) {
        console.log(`✅ Password config looks correct in ${file.name}`);
        poolConfigLines.forEach(config => {
          console.log(`   Line ${config.line}: ${config.content}`);
        });
      } else {
        console.log(`⚠️ No password config found in ${file.name}`);
      }
      
    } else {
      console.log(`❌ File not found: ${file.path}`);
      foundIssues.push({
        file: file.name,
        issue: 'File not found'
      });
    }
  } catch (error) {
    console.log(`❌ Error reading ${file.name}: ${error.message}`);
    foundIssues.push({
      file: file.name,
      issue: `Read error: ${error.message}`
    });
  }
  
  console.log('');
});

// Environment check
console.log('📋 Environment Variables:');
require('dotenv').config();
console.log(`   DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***SET*** (length: ' + process.env.DB_PASSWORD.length + ')' : 'NOT SET'}`);
console.log(`   DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);

// Final assessment
console.log('\n🎯 FINAL ASSESSMENT:');
if (foundIssues.length > 0) {
  console.log('❌ ISSUES FOUND:');
  foundIssues.forEach(issue => {
    console.log(`   - ${issue.file}: ${issue.issue}`);
    if (issue.content) {
      console.log(`     Content: ${issue.content}`);
    }
  });
  
  console.log('\n🛠️ REQUIRED ACTIONS:');
  console.log('1. Fix String() wrapper issues above');
  console.log('2. Save all files');
  console.log('3. Clear Node.js cache');
  console.log('4. Restart server completely');
} else {
  console.log('✅ Files look correct!');
  console.log('\n🔄 Try these steps to fix caching issues:');
  console.log('1. Stop server completely (Ctrl+C)');
  console.log('2. Clear Node cache: npm cache clean --force');
  console.log('3. Kill all Node processes');
  console.log('4. Restart server: npm start');
}

console.log('\n📝 Quick Test Database Connection:');
const { Pool } = require('pg');

const testPool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'matchcare_fresh_db',
  password: process.env.DB_PASSWORD,  // No String() wrapper
  port: parseInt(process.env.DB_PORT) || 5432,
});

testPool.query('SELECT NOW() as test_time')
  .then(result => {
    console.log(`✅ Direct connection test: SUCCESS`);
    console.log(`   Time: ${result.rows[0].test_time}`);
  })
  .catch(error => {
    console.log(`❌ Direct connection test: FAILED`);
    console.log(`   Error: ${error.message}`);
  })
  .finally(() => {
    testPool.end();
    process.exit(foundIssues.length > 0 ? 1 : 0);
  });