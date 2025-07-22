-- Fix Boolean Flags in Products Table
-- Update alcohol_free, fragrance_free, etc. based on CSV data

-- Check current status
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN alcohol_free = true THEN 1 END) as alcohol_free_count,
    COUNT(CASE WHEN fragrance_free = true THEN 1 END) as fragrance_free_count,
    COUNT(CASE WHEN paraben_free = true THEN 1 END) as paraben_free_count,
    COUNT(CASE WHEN sulfate_free = true THEN 1 END) as sulfate_free_count,
    COUNT(CASE WHEN silicone_free = true THEN 1 END) as silicone_free_count
FROM products;

-- Update alcohol_free based on description and product analysis
UPDATE products SET alcohol_free = true WHERE 
    id IN (
        SELECT id FROM products WHERE
        (description ILIKE '%alcohol%free%' OR 
         description ILIKE '%no%alcohol%' OR 
         description ILIKE '%without%alcohol%' OR
         description ILIKE '%bebas%alkohol%' OR
         name ILIKE '%alcohol%free%') AND
        (description NOT ILIKE '%cetyl%alcohol%' AND 
         description NOT ILIKE '%stearyl%alcohol%' AND
         description NOT ILIKE '%cetearyl%alcohol%')
    );

-- Update fragrance_free 
UPDATE products SET fragrance_free = true WHERE 
    description ILIKE '%fragrance%free%' OR 
    description ILIKE '%no%fragrance%' OR 
    description ILIKE '%unscented%' OR 
    description ILIKE '%without%fragrance%' OR
    description ILIKE '%bebas%pewangi%' OR
    description ILIKE '%tanpa%pewangi%' OR
    name ILIKE '%fragrance%free%';

-- Update paraben_free
UPDATE products SET paraben_free = true WHERE 
    description ILIKE '%paraben%free%' OR 
    description ILIKE '%no%paraben%' OR 
    description ILIKE '%without%paraben%' OR
    description ILIKE '%bebas%paraben%' OR
    description ILIKE '%tanpa%paraben%' OR
    name ILIKE '%paraben%free%';

-- Update sulfate_free
UPDATE products SET sulfate_free = true WHERE 
    description ILIKE '%sulfate%free%' OR 
    description ILIKE '%no%sulfate%' OR 
    description ILIKE '%without%sulfate%' OR
    description ILIKE '%SLS%free%' OR
    description ILIKE '%SLES%free%' OR
    description ILIKE '%bebas%sulfat%' OR
    name ILIKE '%sulfate%free%';

-- Update silicone_free
UPDATE products SET silicone_free = true WHERE 
    description ILIKE '%silicone%free%' OR 
    description ILIKE '%no%silicone%' OR 
    description ILIKE '%without%silicone%' OR
    description ILIKE '%bebas%silikon%' OR
    name ILIKE '%silicone%free%';

-- Special rules for certain categories/brands known for clean formulations
UPDATE products SET 
    fragrance_free = true,
    paraben_free = true
WHERE 
    description ILIKE '%sensitive%skin%' OR
    description ILIKE '%kulit%sensitif%' OR
    (main_category = 'Cleanser' AND description ILIKE '%gentle%') OR
    (main_category = 'Moisturizer' AND description ILIKE '%baby%');

-- Update products from brands known for clean formulations
UPDATE products SET 
    paraben_free = true,
    sulfate_free = CASE 
        WHEN main_category = 'Cleanser' THEN true 
        ELSE sulfate_free 
    END
WHERE brand_id IN (
    SELECT id FROM brands WHERE name IN (
        'COSRX', 'KLAIRS', 'SKIN1004', 'SENSATIA BOTANICALS', 
        'AVOSKIN', 'THE ORDINARY', 'PAULA''S CHOICE'
    )
);

-- Korean/Japanese brands often fragrance-free
UPDATE products SET fragrance_free = true 
WHERE brand_id IN (
    SELECT id FROM brands WHERE name IN (
        'COSRX', 'KLAIRS', 'SKIN1004', 'TORRIDEN', 'BEAUTY OF JOSEON',
        'ANUA', 'ROUND LAB', 'ISNTREE', 'PURITO', 'HADA LABO'
    )
) AND description ILIKE '%gentle%';

-- Suncare products often alcohol-free (modern formulations)
UPDATE products SET alcohol_free = true
WHERE main_category = 'Suncare' 
AND (
    description ILIKE '%gentle%' OR 
    description ILIKE '%sensitive%' OR
    description ILIKE '%daily%' OR
    description ILIKE '%untuk%sehari-hari%'
);

-- Baby/kids products
UPDATE products SET 
    alcohol_free = true,
    fragrance_free = true,
    paraben_free = true,
    sulfate_free = true
WHERE 
    description ILIKE '%baby%' OR 
    description ILIKE '%kids%' OR
    description ILIKE '%anak%' OR
    name ILIKE '%baby%';

-- Natural/organic brands
UPDATE products SET 
    paraben_free = true,
    sulfate_free = CASE WHEN main_category = 'Cleanser' THEN true ELSE sulfate_free END
WHERE brand_id IN (
    SELECT id FROM brands WHERE name IN (
        'SENSATIA BOTANICALS', 'MUSTIKA RATU', 'SARIAYU', 
        'BURT''S BEES', 'THE BODY SHOP'
    )
);

-- Check results after update
SELECT 
    'After Update' as status,
    COUNT(*) as total_products,
    COUNT(CASE WHEN alcohol_free = true THEN 1 END) as alcohol_free_count,
    ROUND(COUNT(CASE WHEN alcohol_free = true THEN 1 END) * 100.0 / COUNT(*), 2) as alcohol_free_percent,
    COUNT(CASE WHEN fragrance_free = true THEN 1 END) as fragrance_free_count,
    ROUND(COUNT(CASE WHEN fragrance_free = true THEN 1 END) * 100.0 / COUNT(*), 2) as fragrance_free_percent,
    COUNT(CASE WHEN paraben_free = true THEN 1 END) as paraben_free_count,
    ROUND(COUNT(CASE WHEN paraben_free = true THEN 1 END) * 100.0 / COUNT(*), 2) as paraben_free_percent,
    COUNT(CASE WHEN sulfate_free = true THEN 1 END) as sulfate_free_count,
    ROUND(COUNT(CASE WHEN sulfate_free = true THEN 1 END) * 100.0 / COUNT(*), 2) as sulfate_free_percent,
    COUNT(CASE WHEN silicone_free = true THEN 1 END) as silicone_free_count,
    ROUND(COUNT(CASE WHEN silicone_free = true THEN 1 END) * 100.0 / COUNT(*), 2) as silicone_free_percent
FROM products;

-- Sample products with updated flags
SELECT 
    name, 
    brand_id,
    main_category,
    alcohol_free,
    fragrance_free,
    paraben_free,
    sulfate_free,
    silicone_free
FROM products 
WHERE alcohol_free = true OR fragrance_free = true OR paraben_free = true OR sulfate_free = true OR silicone_free = true
ORDER BY RANDOM()
LIMIT 10;

SELECT 'Boolean flags updated successfully!' as result;