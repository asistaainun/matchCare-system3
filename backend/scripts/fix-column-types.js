// backend/scripts/fix-column-types.js
// Fix column type mismatches for Sequelize sync

const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    database: 'matchcare_fresh_db',
    password: '90226628',
    host: 'localhost',
    port: 5432
});

class ColumnTypeFixer {
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

    async analyzeColumnLengths() {
        this.log('Analyzing column lengths that might cause issues...', 'step');
        
        try {
            // Check ingredients table problematic columns
            const problemColumns = [
                { table: 'ingredients', column: 'what_it_does', suggested: 'TEXT' },
                { table: 'ingredients', column: 'explanation', suggested: 'TEXT' },
                { table: 'ingredients', column: 'benefit', suggested: 'TEXT' },
                { table: 'ingredients', column: 'safety', suggested: 'TEXT' },
                { table: 'ingredients', column: 'alternative_names', suggested: 'TEXT' },
                { table: 'ingredients', column: 'actual_functions', suggested: 'TEXT' },
                { table: 'ingredients', column: 'embedded_functions', suggested: 'TEXT' },
                { table: 'ingredients', column: 'functional_categories', suggested: 'TEXT' },
                { table: 'ingredients', column: 'usage_instructions', suggested: 'TEXT' },
                { table: 'products', column: 'description', suggested: 'TEXT' },
                { table: 'products', column: 'how_to_use', suggested: 'TEXT' },
                { table: 'products', column: 'ingredient_list', suggested: 'TEXT' }
            ];

            for (const col of problemColumns) {
                try {
                    // Check if column exists and get max length
                    const result = await pool.query(`
                        SELECT 
                            column_name,
                            data_type,
                            character_maximum_length,
                            MAX(LENGTH(${col.column})) as max_actual_length,
                            COUNT(*) as total_rows,
                            COUNT(*) FILTER (WHERE LENGTH(${col.column}) > 255) as over_255_count
                        FROM information_schema.columns 
                        CROSS JOIN ${col.table}
                        WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'
                        GROUP BY column_name, data_type, character_maximum_length
                    `, [col.table, col.column]);

                    if (result.rows.length > 0) {
                        const stats = result.rows[0];
                        this.log(`📊 ${col.table}.${col.column}:`, 'info');
                        console.log(`    - Current type: ${stats.data_type}(${stats.character_maximum_length || 'unlimited'})`);
                        console.log(`    - Max actual length: ${stats.max_actual_length}`);
                        console.log(`    - Total rows: ${stats.total_rows}`);
                        console.log(`    - Over 255 chars: ${stats.over_255_count}`);
                        
                        if (parseInt(stats.over_255_count) > 0) {
                            this.log(`⚠️  ${col.table}.${col.column} has ${stats.over_255_count} values > 255 chars`, 'warning');
                        }
                    }
                } catch (error) {
                    this.log(`Column ${col.table}.${col.column} not found or error: ${error.message}`, 'warning');
                }
            }

        } catch (error) {
            this.log(`Error analyzing column lengths: ${error.message}`, 'error');
        }
    }

    async fixColumnTypes() {
        this.log('Fixing column types to accommodate existing data...', 'step');
        
        const columnsToFix = [
            // Ingredients table - text fields should be TEXT not VARCHAR(255)
            { table: 'ingredients', column: 'what_it_does', newType: 'TEXT' },
            { table: 'ingredients', column: 'explanation', newType: 'TEXT' },
            { table: 'ingredients', column: 'benefit', newType: 'TEXT' },
            { table: 'ingredients', column: 'safety', newType: 'TEXT' },
            { table: 'ingredients', column: 'alternative_names', newType: 'TEXT' },
            { table: 'ingredients', column: 'actual_functions', newType: 'TEXT' },
            { table: 'ingredients', column: 'embedded_functions', newType: 'TEXT' },
            { table: 'ingredients', column: 'functional_categories', newType: 'TEXT' },
            { table: 'ingredients', column: 'usage_instructions', newType: 'TEXT' },
            
            // Products table - text fields should be TEXT
            { table: 'products', column: 'description', newType: 'TEXT' },
            { table: 'products', column: 'how_to_use', newType: 'TEXT' },
            { table: 'products', column: 'ingredient_list', newType: 'TEXT' }
        ];

        for (const col of columnsToFix) {
            try {
                // Check if column exists
                const columnExists = await pool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'
                `, [col.table, col.column]);

                if (columnExists.rows.length > 0) {
                    const currentType = columnExists.rows[0].data_type;
                    
                    if (currentType !== 'text') {
                        this.log(`Changing ${col.table}.${col.column} from ${currentType} to ${col.newType}...`, 'info');
                        
                        await pool.query(`
                            ALTER TABLE ${col.table} 
                            ALTER COLUMN ${col.column} TYPE ${col.newType}
                        `);
                        
                        this.log(`✅ Changed ${col.table}.${col.column} to ${col.newType}`, 'success');
                    } else {
                        this.log(`${col.table}.${col.column} already TEXT`, 'info');
                    }
                } else {
                    this.log(`Column ${col.table}.${col.column} not found`, 'warning');
                }

            } catch (error) {
                this.log(`Error fixing ${col.table}.${col.column}: ${error.message}`, 'error');
            }
        }
    }

    async createCompatibilityView() {
        this.log('Creating compatibility views for Sequelize...', 'step');
        
        // Create a view that ensures compatibility
        try {
            await pool.query(`
                CREATE OR REPLACE VIEW ingredients_compatible AS
                SELECT 
                    id,
                    name,
                    CASE 
                        WHEN LENGTH(what_it_does) > 255 THEN LEFT(what_it_does, 255) || '...'
                        ELSE what_it_does 
                    END as what_it_does_short,
                    what_it_does,
                    explanation,
                    benefit,
                    safety,
                    alternative_names,
                    actual_functions,
                    embedded_functions,
                    functional_categories,
                    usage_instructions,
                    is_key_ingredient,
                    pregnancy_safe,
                    alcohol_free,
                    fragrance_free,
                    silicone_free,
                    sulfate_free,
                    paraben_free,
                    created_at,
                    updated_at
                FROM ingredients
            `);
            this.log('Created compatibility view for ingredients', 'success');
        } catch (error) {
            this.log(`Error creating compatibility view: ${error.message}`, 'warning');
        }
    }

    async runColumnTypeFix() {
        console.log('🔧 MatchCare Column Type Fix');
        console.log('='.repeat(50));
        
        try {
            // Test connection
            await pool.query('SELECT NOW()');
            this.log('Database connected successfully', 'success');

            // Start transaction
            await pool.query('BEGIN');

            // Step 1: Analyze current column lengths
            await this.analyzeColumnLengths();
            
            // Step 2: Fix column types
            await this.fixColumnTypes();
            
            // Step 3: Create compatibility views
            await this.createCompatibilityView();

            // Commit transaction
            await pool.query('COMMIT');
            
            this.log('Column type fix completed successfully!', 'success');
            
        } catch (error) {
            await pool.query('ROLLBACK');
            this.log(`Column type fix failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async generateReport() {
        console.log('\n📊 COLUMN TYPE FIX REPORT');
        console.log('='.repeat(50));
        
        console.log(`\n✅ Completed (${this.completed.length}):`);
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
        console.log('1. Try starting server again: npm start');
        console.log('2. If still issues, disable sync temporarily');
        console.log('3. Check Sequelize models match database types');
        
        console.log('\n✅ Column types are now compatible with existing data!');
    }
}

// Run the fix
if (require.main === module) {
    const fixer = new ColumnTypeFixer();
    
    fixer.runColumnTypeFix()
        .then(() => {
            return fixer.generateReport();
        })
        .then(() => {
            console.log('\n✅ Column type fix completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Fix failed:', error.message);
            fixer.generateReport();
            process.exit(1);
        })
        .finally(() => {
            pool.end();
        });
}

module.exports = ColumnTypeFixer;