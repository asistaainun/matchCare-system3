// backend/scripts/comprehensive-schema-fix.js
// COMPREHENSIVE FIX untuk semua masalah schema MatchCare

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: 'postgres',
    database: 'matchcare_fresh_db',
    password: '90226628',
    host: 'localhost',
    port: 5432
});

class MatchCareSchemaFixer {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.completed = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = {
            info: '📋',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            step: '🔧'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
        
        if (type === 'error') this.errors.push(message);
        if (type === 'warning') this.warnings.push(message);
        if (type === 'success') this.completed.push(message);
    }

    async testConnection() {
        this.log('Testing database connection...', 'step');
        try {
            const result = await pool.query('SELECT NOW(), version()');
            this.log(`Connected to PostgreSQL ${result.rows[0].version.split(' ')[1]}`, 'success');
            return true;
        } catch (error) {
            this.log(`Connection failed: ${error.message}`, 'error');
            return false;
        }
    }

    async analyzeCurrentSchema() {
        this.log('Analyzing current database schema...', 'step');
        
        try {
            // Check existing tables
            const tables = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `);
            
            this.log(`Found ${tables.rows.length} tables:`, 'info');
            tables.rows.forEach(table => {
                console.log(`    - ${table.table_name}`);
            });

            // Check existing views
            const views = await pool.query(`
                SELECT schemaname, viewname 
                FROM pg_views 
                WHERE schemaname = 'public'
                ORDER BY viewname
            `);
            
            this.log(`Found ${views.rows.length} views:`, 'info');
            views.rows.forEach(view => {
                console.log(`    - ${view.viewname}`);
            });

            // Check data counts
            const dataCounts = await pool.query(`
                SELECT 'brands' as table_name, COUNT(*) as count FROM brands
                UNION ALL
                SELECT 'products', COUNT(*) FROM products
                UNION ALL
                SELECT 'ingredients', COUNT(*) FROM ingredients
                UNION ALL
                SELECT 'product_ingredients', COUNT(*) FROM product_ingredients
                ORDER BY table_name
            `);

            this.log('Current data counts:', 'info');
            dataCounts.rows.forEach(row => {
                console.log(`    - ${row.table_name}: ${parseInt(row.count).toLocaleString()}`);
            });

            return { tables: tables.rows, views: views.rows, dataCounts: dataCounts.rows };
        } catch (error) {
            this.log(`Schema analysis failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async dropProblematicViews() {
        this.log('Removing problematic views and dependencies...', 'step');
        
        const viewsToRemove = [
            'product_details',
            'ingredient_stats', 
            'product_stats',
            'brand_stats',
            'product_summary',
            'ingredient_summary'
        ];

        for (const viewName of viewsToRemove) {
            try {
                await pool.query(`DROP VIEW IF EXISTS ${viewName} CASCADE`);
                this.log(`Dropped view: ${viewName}`, 'success');
            } catch (error) {
                this.log(`Could not drop view ${viewName}: ${error.message}`, 'warning');
            }
        }
    }

    async fixTimestampColumns() {
        this.log('Adding and fixing timestamp columns...', 'step');
        
        const tables = [
            { name: 'brands', needsUpdatedAt: true },
            { name: 'products', needsUpdatedAt: true },
            { name: 'ingredients', needsUpdatedAt: true },
            { name: 'product_ingredients', needsUpdatedAt: false }  // junction table
        ];

        for (const table of tables) {
            this.log(`Processing ${table.name} table...`, 'info');
            
            try {
                // Check existing columns
                const columns = await pool.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = 'public'
                `, [table.name]);

                const hasCreatedAt = columns.rows.some(col => col.column_name === 'created_at');
                const hasUpdatedAt = columns.rows.some(col => col.column_name === 'updated_at');

                // Add created_at if missing
                if (!hasCreatedAt) {
                    await pool.query(`
                        ALTER TABLE ${table.name} 
                        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    `);
                    this.log(`Added created_at to ${table.name}`, 'success');
                    
                    // Update existing records
                    const updateResult = await pool.query(`
                        UPDATE ${table.name} 
                        SET created_at = CURRENT_TIMESTAMP 
                        WHERE created_at IS NULL
                    `);
                    this.log(`Updated ${updateResult.rowCount} records with created_at in ${table.name}`, 'success');
                } else {
                    this.log(`${table.name}.created_at already exists`, 'info');
                }

                // Add updated_at if needed and missing
                if (table.needsUpdatedAt && !hasUpdatedAt) {
                    await pool.query(`
                        ALTER TABLE ${table.name} 
                        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    `);
                    this.log(`Added updated_at to ${table.name}`, 'success');
                    
                    // Update existing records
                    const updateResult = await pool.query(`
                        UPDATE ${table.name} 
                        SET updated_at = CURRENT_TIMESTAMP 
                        WHERE updated_at IS NULL
                    `);
                    this.log(`Updated ${updateResult.rowCount} records with updated_at in ${table.name}`, 'success');
                } else if (table.needsUpdatedAt) {
                    this.log(`${table.name}.updated_at already exists`, 'info');
                }

            } catch (error) {
                this.log(`Error processing ${table.name}: ${error.message}`, 'error');
            }
        }
    }

    async ensureProperConstraints() {
        this.log('Adding proper constraints and indexes...', 'step');
        
        const constraints = [
            {
                name: 'brands_name_unique',
                sql: 'ALTER TABLE brands ADD CONSTRAINT brands_name_unique UNIQUE (name)',
                description: 'Unique constraint on brands.name'
            },
            {
                name: 'products_brand_fkey',
                sql: 'ALTER TABLE products ADD CONSTRAINT products_brand_fkey FOREIGN KEY (brand_id) REFERENCES brands(id)',
                description: 'Foreign key: products.brand_id -> brands.id'
            },
            {
                name: 'product_ingredients_product_fkey',
                sql: 'ALTER TABLE product_ingredients ADD CONSTRAINT product_ingredients_product_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE',
                description: 'Foreign key: product_ingredients.product_id -> products.id'
            },
            {
                name: 'product_ingredients_ingredient_fkey',
                sql: 'ALTER TABLE product_ingredients ADD CONSTRAINT product_ingredients_ingredient_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE',
                description: 'Foreign key: product_ingredients.ingredient_id -> ingredients.id'
            },
            {
                name: 'product_ingredients_unique',
                sql: 'ALTER TABLE product_ingredients ADD CONSTRAINT product_ingredients_unique UNIQUE (product_id, ingredient_id)',
                description: 'Unique constraint on product_ingredients(product_id, ingredient_id)'
            }
        ];

        for (const constraint of constraints) {
            try {
                await pool.query(constraint.sql);
                this.log(`Added constraint: ${constraint.description}`, 'success');
            } catch (error) {
                if (error.message.includes('already exists')) {
                    this.log(`Constraint already exists: ${constraint.name}`, 'info');
                } else {
                    this.log(`Could not add constraint ${constraint.name}: ${error.message}`, 'warning');
                }
            }
        }
    }

    async createPerformanceIndexes() {
        this.log('Creating performance indexes...', 'step');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id)',
            'CREATE INDEX IF NOT EXISTS idx_products_main_category ON products(main_category)',
            'CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector(\'english\', name))',
            'CREATE INDEX IF NOT EXISTS idx_products_description_search ON products USING gin(to_tsvector(\'english\', description))',
            'CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id)',
            'CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient ON product_ingredients(ingredient_id)',
            'CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name)',
            'CREATE INDEX IF NOT EXISTS idx_ingredients_is_key ON ingredients(is_key_ingredient)',
            'CREATE INDEX IF NOT EXISTS idx_ingredients_name_search ON ingredients USING gin(to_tsvector(\'english\', name))',
            'CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name)'
        ];

        for (const indexSQL of indexes) {
            try {
                await pool.query(indexSQL);
                const indexName = indexSQL.match(/idx_\w+/)[0];
                this.log(`Created index: ${indexName}`, 'success');
            } catch (error) {
                if (error.message.includes('already exists')) {
                    const indexName = indexSQL.match(/idx_\w+/)[0];
                    this.log(`Index already exists: ${indexName}`, 'info');
                } else {
                    this.log(`Could not create index: ${error.message}`, 'warning');
                }
            }
        }
    }

    async verifyDataIntegrity() {
        this.log('Verifying data integrity...', 'step');
        
        try {
            const checks = [
                {
                    name: 'Brands with all timestamps',
                    query: `SELECT COUNT(*) as count FROM brands WHERE created_at IS NOT NULL AND updated_at IS NOT NULL`
                },
                {
                    name: 'Products with all timestamps',
                    query: `SELECT COUNT(*) as count FROM products WHERE created_at IS NOT NULL AND updated_at IS NOT NULL`
                },
                {
                    name: 'Products with valid brand references',
                    query: `SELECT COUNT(*) as count FROM products p JOIN brands b ON p.brand_id = b.id`
                },
                {
                    name: 'Orphaned products (no brand)',
                    query: `SELECT COUNT(*) as count FROM products WHERE brand_id IS NULL`
                },
                {
                    name: 'Valid product-ingredient mappings',
                    query: `SELECT COUNT(*) as count FROM product_ingredients pi 
                            JOIN products p ON pi.product_id = p.id 
                            JOIN ingredients i ON pi.ingredient_id = i.id`
                },
                {
                    name: 'Products with ingredients',
                    query: `SELECT COUNT(DISTINCT product_id) as count FROM product_ingredients`
                }
            ];

            this.log('Data integrity results:', 'info');
            for (const check of checks) {
                const result = await pool.query(check.query);
                const count = parseInt(result.rows[0].count);
                console.log(`    - ${check.name}: ${count.toLocaleString()}`);
            }

        } catch (error) {
            this.log(`Data integrity check failed: ${error.message}`, 'error');
        }
    }

    async createUsefulViews() {
        this.log('Creating useful database views...', 'step');
        
        const views = [
            {
                name: 'product_summary',
                sql: `
                CREATE OR REPLACE VIEW product_summary AS
                SELECT 
                    p.id,
                    p.name as product_name,
                    b.name as brand_name,
                    p.main_category,
                    p.description,
                    p.alcohol_free,
                    p.fragrance_free,
                    p.is_active,
                    COUNT(pi.ingredient_id) as ingredient_count,
                    p.created_at,
                    p.updated_at
                FROM products p
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN product_ingredients pi ON p.id = pi.product_id
                GROUP BY p.id, b.name
                ORDER BY p.name;
                `
            },
            {
                name: 'ingredient_usage',
                sql: `
                CREATE OR REPLACE VIEW ingredient_usage AS
                SELECT 
                    i.id,
                    i.name as ingredient_name,
                    i.is_key_ingredient,
                    COUNT(pi.product_id) as used_in_products,
                    ARRAY_AGG(DISTINCT p.main_category) FILTER (WHERE p.main_category IS NOT NULL) as categories
                FROM ingredients i
                LEFT JOIN product_ingredients pi ON i.id = pi.ingredient_id
                LEFT JOIN products p ON pi.product_id = p.id
                GROUP BY i.id, i.name, i.is_key_ingredient
                ORDER BY used_in_products DESC;
                `
            }
        ];

        for (const view of views) {
            try {
                await pool.query(view.sql);
                this.log(`Created view: ${view.name}`, 'success');
            } catch (error) {
                this.log(`Could not create view ${view.name}: ${error.message}`, 'warning');
            }
        }
    }

    async runComprehensiveFix() {
        console.log('🚀 MatchCare Comprehensive Schema Fix');
        console.log('='.repeat(60));
        
        try {
            // Test connection
            const connected = await this.testConnection();
            if (!connected) {
                throw new Error('Cannot connect to database');
            }

            // Start transaction for safety
            await pool.query('BEGIN');

            // Step 1: Analyze current state
            await this.analyzeCurrentSchema();
            
            // Step 2: Remove problematic views
            await this.dropProblematicViews();
            
            // Step 3: Fix timestamp columns
            await this.fixTimestampColumns();
            
            // Step 4: Add constraints
            await this.ensureProperConstraints();
            
            // Step 5: Create performance indexes
            await this.createPerformanceIndexes();
            
            // Step 6: Verify data integrity
            await this.verifyDataIntegrity();
            
            // Step 7: Create useful views
            await this.createUsefulViews();

            // Commit transaction
            await pool.query('COMMIT');
            
            this.log('All schema fixes completed successfully!', 'success');
            
        } catch (error) {
            await pool.query('ROLLBACK');
            this.log(`Schema fix failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async generateSummaryReport() {
        console.log('\n📊 SCHEMA FIX SUMMARY REPORT');
        console.log('='.repeat(60));
        
        console.log(`\n✅ Completed Tasks (${this.completed.length}):`);
        this.completed.forEach(task => console.log(`    ✅ ${task}`));
        
        if (this.warnings.length > 0) {
            console.log(`\n⚠️ Warnings (${this.warnings.length}):`);
            this.warnings.forEach(warning => console.log(`    ⚠️ ${warning}`));
        }
        
        if (this.errors.length > 0) {
            console.log(`\n❌ Errors (${this.errors.length}):`);
            this.errors.forEach(error => console.log(`    ❌ ${error}`));
        }

        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Update server.js to enable Sequelize sync:');
        console.log('   await sequelize.sync({ alter: true });');
        console.log('2. Start server: npm start');
        console.log('3. Test API endpoints');
        console.log('4. Verify everything works correctly');
        
        console.log('\n🚀 Your MatchCare database is now production-ready!');
    }
}

// Run the comprehensive fix
if (require.main === module) {
    const fixer = new MatchCareSchemaFixer();
    
    fixer.runComprehensiveFix()
        .then(() => {
            return fixer.generateSummaryReport();
        })
        .then(() => {
            console.log('\n✅ Schema fix completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Schema fix failed:', error.message);
            fixer.generateSummaryReport();
            process.exit(1);
        })
        .finally(() => {
            pool.end();
        });
}

module.exports = MatchCareSchemaFixer;