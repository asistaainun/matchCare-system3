
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matchcare_fresh_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function fixCategoryRelations() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🔧 Fixing Category Relations...\n');
        
        // 1. Check if product_categories table exists
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'product_categories'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('📋 Creating product_categories table...');
            
            await client.query(`
                CREATE TABLE product_categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    ontology_uri VARCHAR(255),
                    parent_id INTEGER REFERENCES product_categories(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            console.log('✅ Product_categories table created');
            
            // Seed main categories
            console.log('🌱 Seeding main categories...');
            await client.query(`
                INSERT INTO product_categories (name, ontology_uri) VALUES
                ('Cleanser', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Cleanser'),
                ('Eye Care', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/EyeCare'),
                ('Lip Care', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/LipCare'),
                ('Moisturizer', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Moisturizer'),
                ('Other', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Other'),
                ('Set/Kit', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/SetKit'),
                ('Suncare', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Suncare'),
                ('Treatment', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Treatment')
            `);
            
            // Seed subcategories dengan data yang benar
            console.log('🌱 Seeding subcategories...');
            await client.query(`
                INSERT INTO product_categories (name, ontology_uri, parent_id) VALUES
                -- Cleanser subcategories (parent_id = 1)
                ('Cleansing Balm', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/CleansingBalm', 1),
                ('Cleansing Cream', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/CleansingCream', 1),
                ('Cleansing Oil', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/CleansingOil', 1),
                ('Cleansing Wipes', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/CleansingWipes', 1),
                ('Face Wash', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FaceWash', 1),
                ('Make Up Remover', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/MakeUpRemover', 1),
                ('Micellar Water', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/MicellarWater', 1),
                
                -- Eye Care subcategories (parent_id = 2)
                ('Eye Cream', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/EyeCream', 2),
                ('Eye Mask', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/EyeMask', 2),
                ('Eye Serum', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/EyeSerum', 2),
                ('Eyelash Serum', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/EyelashSerum', 2),
                
                -- Lip Care subcategories (parent_id = 3)
                ('Lip Mask', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/LipMask', 3),
                ('Lip Balm', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/LipBalm', 3),
                ('Lip Scrub', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/LipScrub', 3),
                ('Lip Serum', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/LipSerum', 3),
                
                -- Moisturizer subcategories (parent_id = 4)
                ('Cream Or Lotion', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/CreamOrLotion', 4),
                ('Face Mist', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FaceMist', 4),
                ('Face Oil', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FaceOil', 4),
                ('Gel', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Gel', 4),
                
                -- Treatment subcategories (parent_id = 8)
                ('Acne Treatment', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/AcneTreatment', 8),
                ('Ampoules', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Ampoules', 8),
                ('Essence', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Essence', 8),
                ('Face Mask', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FaceMask', 8),
                ('Peeling', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Peeling', 8),
                ('Scrub Or Exfoliator', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/ScrubOrExfoliator', 8),
                ('Serum', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Serum', 8),
                ('Toner', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Toner', 8)
            `);
            
            console.log('✅ Categories seeded successfully');
        } else {
            console.log('✅ Product_categories table already exists');
        }
        
        // 2. Check if products table has relational columns
        const columnsExist = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'products' 
            AND column_name IN ('main_category_id', 'subcategory_id')
        `);
        
        if (columnsExist.rows.length < 2) {
            console.log('📋 Adding relational columns to products table...');
            
            // Add columns if they don't exist
            if (!columnsExist.rows.find(col => col.column_name === 'main_category_id')) {
                await client.query(`
                    ALTER TABLE products 
                    ADD COLUMN main_category_id INTEGER REFERENCES product_categories(id)
                `);
                console.log('✅ Added main_category_id column');
            }
            
            if (!columnsExist.rows.find(col => col.column_name === 'subcategory_id')) {
                await client.query(`
                    ALTER TABLE products 
                    ADD COLUMN subcategory_id INTEGER REFERENCES product_categories(id)
                `);
                console.log('✅ Added subcategory_id column');
            }
        } else {
            console.log('✅ Relational columns already exist');
        }
        
        // 3. Migrate existing string data to relational IDs
        console.log('🔄 Migrating existing category data...');
        
        // Get all unique main categories from products
        const existingCategories = await client.query(`
            SELECT DISTINCT main_category 
            FROM products 
            WHERE main_category IS NOT NULL 
            AND main_category != ''
        `);
        
        console.log(`📊 Found ${existingCategories.rows.length} unique main categories to migrate`);
        
        // Update main_category_id based on string values
        for (const row of existingCategories.rows) {
            const categoryName = row.main_category;
            
            // Find matching category ID (case-insensitive)
            const categoryResult = await client.query(`
                SELECT id FROM product_categories 
                WHERE LOWER(name) = LOWER($1) 
                AND parent_id IS NULL
            `, [categoryName]);
            
            if (categoryResult.rows.length > 0) {
                const categoryId = categoryResult.rows[0].id;
                
                // Update products with this category
                const updateResult = await client.query(`
                    UPDATE products 
                    SET main_category_id = $1 
                    WHERE main_category = $2
                    AND main_category_id IS NULL
                `, [categoryId, categoryName]);
                
                console.log(`✅ Updated ${updateResult.rowCount} products for category: ${categoryName}`);
            } else {
                console.log(`⚠️  No matching category found for: ${categoryName}`);
                
                // Create missing category
                const insertResult = await client.query(`
                    INSERT INTO product_categories (name) 
                    VALUES ($1) 
                    RETURNING id
                `, [categoryName]);
                
                const newCategoryId = insertResult.rows[0].id;
                
                // Update products with new category
                await client.query(`
                    UPDATE products 
                    SET main_category_id = $1 
                    WHERE main_category = $2
                `, [newCategoryId, categoryName]);
                
                console.log(`✅ Created new category and updated products for: ${categoryName}`);
            }
        }
        
        // 4. Migrate subcategory data
        console.log('🔄 Migrating subcategory data...');
        
        const existingSubcategories = await client.query(`
            SELECT DISTINCT subcategory, main_category 
            FROM products 
            WHERE subcategory IS NOT NULL 
            AND subcategory != ''
            AND main_category IS NOT NULL
        `);
        
        console.log(`📊 Found ${existingSubcategories.rows.length} unique subcategories to migrate`);
        
        for (const row of existingSubcategories.rows) {
            const subcategoryName = row.subcategory;
            const mainCategoryName = row.main_category;
            
            // Find parent category ID
            const parentResult = await client.query(`
                SELECT id FROM product_categories 
                WHERE LOWER(name) = LOWER($1) 
                AND parent_id IS NULL
            `, [mainCategoryName]);
            
            if (parentResult.rows.length > 0) {
                const parentId = parentResult.rows[0].id;
                
                // Find matching subcategory
                const subcategoryResult = await client.query(`
                    SELECT id FROM product_categories 
                    WHERE LOWER(name) = LOWER($1) 
                    AND parent_id = $2
                `, [subcategoryName, parentId]);
                
                if (subcategoryResult.rows.length > 0) {
                    const subcategoryId = subcategoryResult.rows[0].id;
                    
                    // Update products with this subcategory
                    const updateResult = await client.query(`
                        UPDATE products 
                        SET subcategory_id = $1 
                        WHERE subcategory = $2 
                        AND main_category = $3
                        AND subcategory_id IS NULL
                    `, [subcategoryId, subcategoryName, mainCategoryName]);
                    
                    console.log(`✅ Updated ${updateResult.rowCount} products for subcategory: ${subcategoryName}`);
                } else {
                    console.log(`⚠️  No matching subcategory found for: ${subcategoryName} under ${mainCategoryName}`);
                    
                    // Create missing subcategory
                    const insertResult = await client.query(`
                        INSERT INTO product_categories (name, parent_id) 
                        VALUES ($1, $2) 
                        RETURNING id
                    `, [subcategoryName, parentId]);
                    
                    const newSubcategoryId = insertResult.rows[0].id;
                    
                    // Update products with new subcategory
                    await client.query(`
                        UPDATE products 
                        SET subcategory_id = $1 
                        WHERE subcategory = $2 
                        AND main_category = $3
                    `, [newSubcategoryId, subcategoryName, mainCategoryName]);
                    
                    console.log(`✅ Created new subcategory and updated products for: ${subcategoryName}`);
                }
            }
        }
        
        // 5. Create indexes for better performance
        console.log('🔧 Creating indexes...');
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_main_category_id 
            ON products(main_category_id)
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_subcategory_id 
            ON products(subcategory_id)
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id 
            ON product_categories(parent_id)
        `);
        
        console.log('✅ Indexes created');
        
        // 6. Generate migration summary
        console.log('\n📊 Migration Summary:');
        console.log('═'.repeat(50));
        
        const stats = await Promise.all([
            client.query('SELECT COUNT(*) as total FROM product_categories WHERE parent_id IS NULL'),
            client.query('SELECT COUNT(*) as total FROM product_categories WHERE parent_id IS NOT NULL'),
            client.query('SELECT COUNT(*) as total FROM products WHERE main_category_id IS NOT NULL'),
            client.query('SELECT COUNT(*) as total FROM products WHERE subcategory_id IS NOT NULL'),
            client.query('SELECT COUNT(*) as total FROM products WHERE is_active = true')
        ]);
        
        console.log(`Main categories: ${stats[0].rows[0].total}`);
        console.log(`Subcategories: ${stats[1].rows[0].total}`);
        console.log(`Products with main category: ${stats[2].rows[0].total}`);
        console.log(`Products with subcategory: ${stats[3].rows[0].total}`);
        console.log(`Total active products: ${stats[4].rows[0].total}`);
        
        // 7. Show category distribution
        console.log('\n📈 Category Distribution:');
        console.log('═'.repeat(50));
        
        const distribution = await client.query(`
            SELECT 
                pc.name as category_name,
                COUNT(p.id) as product_count
            FROM product_categories pc
            LEFT JOIN products p ON pc.id = p.main_category_id
            WHERE pc.parent_id IS NULL
            GROUP BY pc.id, pc.name
            ORDER BY product_count DESC
        `);
        
        distribution.rows.forEach(row => {
            console.log(`${row.category_name}: ${row.product_count} products`);
        });
        
        console.log('\n🔍 Validating migration results...');
        console.log('═'.repeat(50));
        
        const validationResults = await client.query(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(main_category_id) as products_with_main_category,
                COUNT(subcategory_id) as products_with_subcategory,
                COUNT(CASE WHEN main_category IS NOT NULL AND main_category_id IS NULL THEN 1 END) as unmapped_main_categories,
                COUNT(CASE WHEN subcategory IS NOT NULL AND subcategory_id IS NULL THEN 1 END) as unmapped_subcategories
            FROM products 
            WHERE is_active = true
        `);
        
        const validation = validationResults.rows[0];
        
        console.log(`✅ Total products: ${validation.total_products}`);
        console.log(`✅ Products with main category ID: ${validation.products_with_main_category}`);
        console.log(`✅ Products with subcategory ID: ${validation.products_with_subcategory}`);
        
        if (parseInt(validation.unmapped_main_categories) > 0) {
            console.log(`⚠️  Unmapped main categories: ${validation.unmapped_main_categories}`);
        }
        
        if (parseInt(validation.unmapped_subcategories) > 0) {
            console.log(`⚠️  Unmapped subcategories: ${validation.unmapped_subcategories}`);
        }
        
        // 9. Check for orphaned categories
        const orphanedCategories = await client.query(`
            SELECT name FROM product_categories 
            WHERE parent_id IS NULL 
            AND id NOT IN (SELECT DISTINCT main_category_id FROM products WHERE main_category_id IS NOT NULL)
        `);
        
        if (orphanedCategories.rows.length > 0) {
            console.log(`⚠️  Orphaned main categories: ${orphanedCategories.rows.map(r => r.name).join(', ')}`);
        }

        await client.query('COMMIT');
        console.log('\n🎉 Category relations fixed successfully!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error fixing category relations:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Execute the function
async function main() {
    try {
        await fixCategoryRelations();
        console.log('\n✅ All operations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { fixCategoryRelations };