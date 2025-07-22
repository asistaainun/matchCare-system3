-- MatchCare Quiz Database Schema
SELECT 'Creating quiz schema...' as status;

-- 1. Skin Types Reference Table
CREATE TABLE IF NOT EXISTS skin_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert skin types
INSERT INTO skin_types (name, description) VALUES
('normal', 'Balanced skin with moderate oil production'),
('dry', 'Low oil production, may feel tight or flaky'),
('oily', 'High oil production, shiny appearance'),
('combination', 'Mixed - oily T-zone, normal/dry cheeks'),
('sensitive', 'Easily irritated, reactive to products')
ON CONFLICT (name) DO NOTHING;

-- 2. Skin Concerns Reference Table
CREATE TABLE IF NOT EXISTS skin_concerns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert concerns
INSERT INTO skin_concerns (name, description) VALUES
('acne', 'Breakouts, blackheads, whiteheads'),
('wrinkles', 'Signs of aging, fine lines'),
('fine_lines', 'Early aging signs around eyes/mouth'),
('sensitivity', 'Easily irritated, reactive skin'),
('dryness', 'Lack of moisture, tight feeling'),
('oiliness', 'Excess sebum production'),
('redness', 'Inflammation, visible capillaries'),
('large_pores', 'Visible pores, rough texture'),
('dullness', 'Lack of radiance, uneven tone'),
('dark_spots', 'Hyperpigmentation, melasma')
ON CONFLICT (name) DO NOTHING;

-- 3. User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_data JSONB DEFAULT '{}',
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Quiz Results
CREATE TABLE IF NOT EXISTS quiz_results (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    skin_type_id INTEGER REFERENCES skin_types(id),
    concern_ids INTEGER[] DEFAULT '{}',
    fragrance_sensitivity BOOLEAN DEFAULT FALSE,
    alcohol_sensitivity BOOLEAN DEFAULT FALSE,
    silicone_sensitivity BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Recommendation Cache
CREATE TABLE IF NOT EXISTS recommendation_cache (
    id SERIAL PRIMARY KEY,
    quiz_result_id INTEGER REFERENCES quiz_results(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    match_score DECIMAL(3,2) DEFAULT 0.0,
    reason_codes TEXT[] DEFAULT '{}',
    rank_position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quiz_result_id, product_id)
);

-- 6. Update products for quiz compatibility
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'suitable_for_skin_types') THEN
        ALTER TABLE products ADD COLUMN suitable_for_skin_types TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'addresses_concerns') THEN
        ALTER TABLE products ADD COLUMN addresses_concerns TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 7. Populate skin type suitability
UPDATE products SET 
    suitable_for_skin_types = CASE 
        WHEN main_category = 'Moisturizer' THEN ARRAY['dry', 'normal', 'sensitive']
        WHEN main_category = 'Cleanser' AND description ILIKE '%oil%' THEN ARRAY['dry', 'normal']
        WHEN main_category = 'Cleanser' AND description ILIKE '%foam%' THEN ARRAY['oily', 'combination']
        WHEN main_category = 'Suncare' THEN ARRAY['normal', 'dry', 'oily', 'combination']
        WHEN main_category = 'Treatment' THEN ARRAY['oily', 'combination', 'normal']
        ELSE ARRAY['normal', 'combination', 'oily']
    END,
    addresses_concerns = CASE
        WHEN description ILIKE '%acne%' THEN ARRAY['acne']
        WHEN description ILIKE '%anti%aging%' OR description ILIKE '%wrinkle%' THEN ARRAY['wrinkles']
        WHEN description ILIKE '%sensitive%' THEN ARRAY['sensitivity']
        WHEN description ILIKE '%hydrat%' OR description ILIKE '%moistur%' THEN ARRAY['dryness']
        WHEN description ILIKE '%oil%control%' THEN ARRAY['oiliness']
        WHEN description ILIKE '%brighten%' THEN ARRAY['dullness']
        WHEN description ILIKE '%pore%' THEN ARRAY['large_pores']
        ELSE ARRAY[]::TEXT[]
    END
WHERE main_category IS NOT NULL AND suitable_for_skin_types = '{}';

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_results_session_id ON quiz_results(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_quiz_result ON recommendation_cache(quiz_result_id);

-- Verify setup
SELECT 'Quiz schema created!' as status;
SELECT COUNT(*) as skin_types_count FROM skin_types;
SELECT COUNT(*) as concerns_count FROM skin_concerns;
SELECT COUNT(*) as products_with_skin_types FROM products WHERE array_length(suitable_for_skin_types, 1) > 0;
