-- MATCHCARE COMPLETE DATABASE SCHEMA
-- Copy dan paste semua code ini ke file schema.sql

-- Enable PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ===== REFERENCE TABLES =====

-- 1. Brands Table
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    ontology_uri VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Product Categories Table
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    ontology_uri VARCHAR(255),
    parent_id INTEGER REFERENCES product_categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Allergen types table
CREATE TABLE allergen_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    ontology_uri VARCHAR(255),
    common_sources TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Formulation_trits table
CREATE TABLE formulation_traits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ontology_uri VARCHAR(255),
    excludes_allergen_type_id INTEGER REFERENCES allergen_types(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ingredient Functions (What It Does)
CREATE TABLE ingredient_functions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    ontology_uri VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ingredient Benefits
CREATE TABLE ingredient_benefits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    ontology_uri VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction tables for ingredients
CREATE TABLE ingredient_functions_map (
    id SERIAL PRIMARY KEY,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    function_id INTEGER REFERENCES ingredient_functions(id),
    UNIQUE(ingredient_id, function_id)
);

CREATE TABLE ingredient_benefits_map (
    id SERIAL PRIMARY KEY,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    benefit_id INTEGER REFERENCES ingredient_benefits(id),
    effectiveness_rating INTEGER,
    UNIQUE(ingredient_id, benefit_id)
);

-- 3. Skin Types Table (Fixed reference data)
CREATE TABLE skin_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    ontology_uri VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Skin Concerns Table
CREATE TABLE skin_concerns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    ontology_uri VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Key Ingredient Types table
CREATE TABLE key_ingredient_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    description TEXT,
    category VARCHAR(50),
    usage_notes TEXT,
    ontology_uri VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 

CREATE TABLE ingredient_key_types (
    ingredient_id INTEGER REFERENCES ingredients(id),
    key_type_id INTEGER REFERENCES key_ingredient_types(id),
    PRIMARY KEY (ingredient_id, key_type_id)
);

-- ===== MAIN TABLES =====

-- 6. Products Table (Main product data)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    ontology_uri VARCHAR(255),
    brand_id INTEGER REFERENCES brands(id),
    brand VARCHAR(255), 
    product_url TEXT,                    
    product_type VARCHAR(100),         
    key_ingredients_csv TEXT[],     
    main_category VARCHAR(100),        
    subcategory VARCHAR(100),
    main_category_id INTEGER REFERENCES product_categories(id),
    subcategory_id INTEGER REFERENCES product_categories(id), 
    description TEXT,
    how_to_use TEXT,
    ingredient_list TEXT, -- Raw ingredients string from CSV
    local_image_path TEXT,
    bpom_number VARCHAR(100),
    
    -- Safety flags (from CSV)
    alcohol_free BOOLEAN DEFAULT FALSE,
    fragrance_free BOOLEAN DEFAULT FALSE,
    paraben_free BOOLEAN DEFAULT FALSE,
    sulfate_free BOOLEAN DEFAULT FALSE,
    silicone_free BOOLEAN DEFAULT FALSE,

    -- Meta fields
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Ingredients Table (Comprehensive ingredient data)
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    ontology_uri VARCHAR(255),
    
  -- Formulation properties (from CSV)
    actual_functions TEXT,
    embedded_functions TEXT, -- JSON array
    functional_categories TEXT, -- JSON array
    is_key_ingredient BOOLEAN DEFAULT FALSE,
    
    -- Usage and safety (from CSV)
    usage_instructions TEXT,
    pregnancy_safe BOOLEAN,
    
    -- Formulation properties (from CSV)
    alcohol_free BOOLEAN,
    fragrance_free BOOLEAN,
    silicone_free BOOLEAN,
    sulfate_free BOOLEAN,
    paraben_free BOOLEAN,
    
    -- Detailed information (from CSV)
    explanation TEXT,
    benefit TEXT,
    safety TEXT,
    alternative_names TEXT, -- JSON array
    what_it_does TEXT,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Product-Ingredient relationship table
CREATE TABLE product_ingredients (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    position INTEGER, -- Position in ingredient list (1 = first)
    is_key_ingredient BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, ingredient_id)
);

-- 3. Junction: Product → Key Ingredient (hasKeyIngredient)  
CREATE TABLE product_key_ingredients (
    product_id INTEGER REFERENCES products(id),
    key_type_id INTEGER REFERENCES key_ingredient_types(id),
    PRIMARY KEY (product_id, key_type_id)
);

-- Untuk ontology reasoning (synergistic, incompatible)
CREATE TABLE ingredient_relationships (
    id SERIAL PRIMARY KEY,
    ingredient1_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    ingredient2_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- 'synergistic', 'incompatible', 'neutral'
    strength INTEGER DEFAULT 1, -- 1-5 scale
    source VARCHAR(100), -- 'ontology', 'research', 'expert'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ingredient1_id, ingredient2_id, relationship_type)
);

CREATE TABLE product_formulation_traits (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    trait_id INTEGER REFERENCES formulation_traits(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, trait_id)
);
-- ===== USER TABLES =====

-- Untuk authentication system
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. User Profiles Table (for skin quiz results)
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255), -- For guest users
    user_id INTEGER REFERENCES users(id), -- For registered users (future)
    
    -- Skin Quiz Results
    skin_type_id INTEGER NOT NULL REFERENCES skin_types(id),
    skin_concerns TEXT, -- JSON array
    
    -- Additional info
    age_range VARCHAR(20),
    gender VARCHAR(20),
    
    -- Preferences
    avoided_ingredients TEXT, -- JSON array of ingredient IDs
    liked_ingredients TEXT, -- JSON array of ingredient IDs
    
    -- Quiz metadata
    quiz_version VARCHAR(20),
    quiz_completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sensitivities (many-to-many)
CREATE TABLE user_sensitivities (
    id SERIAL PRIMARY KEY,
    user_profile_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
    allergen_type_id INTEGER REFERENCES allergen_types(id),
    severity VARCHAR(20) DEFAULT 'avoid',
    source VARCHAR(50) DEFAULT 'quiz',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_profile_id, allergen_type_id)
);

-- User Skin Concerns (many-to-many) 
CREATE TABLE user_skin_concerns (
    id SERIAL PRIMARY KEY,
    user_profile_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
    skin_concern_id INTEGER REFERENCES skin_concerns(id),
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_profile_id, skin_concern_id)
);

-- User Ingredient Preferences
CREATE TABLE user_ingredient_preferences (
    id SERIAL PRIMARY KEY,
    user_profile_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    preference_type VARCHAR(20) CHECK (preference_type IN ('avoid', 'like', 'neutral')),
    reason TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_profile_id, ingredient_id)
);

-- 10. User Favorites Table
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255), -- For guest users
    user_id INTEGER, -- For registered users
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(session_id, product_id),
    UNIQUE(user_id, product_id)
);

-- Guest Sessions (proper session management)
CREATE TABLE guest_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP,
    converted_to_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Match Scores (untuk caching rekomendasi)
CREATE TABLE product_match_scores (
    id SERIAL PRIMARY KEY,
    user_profile_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    match_score INTEGER, -- 0-100
    reasoning TEXT,
    calculation_method VARCHAR(50),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(user_profile_id, product_id)
);

-- ===== PERFORMANCE INDEXES =====

-- Products indexes
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_main_category_id ON products(main_category_id);
CREATE INDEX idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_brand_string ON products(brand);
CREATE INDEX idx_products_main_category_string ON products(main_category);
CREATE INDEX idx_products_subcategory_string ON products(subcategory);
CREATE INDEX idx_products_product_type ON products(product_type);

-- Full-text search indexes
CREATE INDEX idx_products_search ON products USING gin (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

CREATE INDEX idx_brands_search ON brands USING gin (
    to_tsvector('english', name)
);


-- Ingredients indexes
CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_key ON ingredients(is_key_ingredient);
CREATE INDEX idx_ingredients_active ON ingredients(is_active);
CREATE INDEX idx_ingredients_search ON ingredients USING gin (to_tsvector('english', 
    name || ' ' || COALESCE(what_it_does, '') || ' ' || COALESCE(benefit, '')));


-- Junction table indexes
CREATE INDEX idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX idx_product_ingredients_ingredient ON product_ingredients(ingredient_id);
CREATE INDEX idx_product_ingredients_key ON product_ingredients(is_key_ingredient);

-- Reference table indexes
CREATE INDEX idx_product_categories_parent ON product_categories(parent_id);
CREATE INDEX idx_formulation_traits_allergen ON formulation_traits(excludes_allergen_type_id);
CREATE INDEX idx_ingredient_functions_map_ingredient ON ingredient_functions_map(ingredient_id);
CREATE INDEX idx_ingredient_benefits_map_ingredient ON ingredient_benefits_map(ingredient_id);

-- User table indexes
CREATE INDEX idx_user_profiles_session ON user_profiles(session_id);
CREATE INDEX idx_user_profiles_skin_type ON user_profiles(skin_type_id);
CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_sensitivities_profile ON user_sensitivities(user_profile_id);
CREATE INDEX idx_user_skin_concerns_profile ON user_skin_concerns(user_profile_id);
CREATE INDEX idx_user_ingredient_preferences_profile ON user_ingredient_preferences(user_profile_id);
CREATE INDEX idx_guest_sessions_session_id ON guest_sessions(session_id);
CREATE INDEX idx_product_match_scores_profile ON product_match_scores(user_profile_id);

-- ===== TRIGGERS FOR AUTO-UPDATE =====

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at 
    BEFORE UPDATE ON ingredients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== SEED REFERENCE DATA =====

-- Insert fixed skin types
INSERT INTO allergen_types (name, ontology_uri, description) VALUES 
('fragrance', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Fragrance', 'Synthetic or natural fragrances'),
('alcohol', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Alcohol', 'Drying alcohols like ethanol'),
('paraben', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Paraben', 'Preservatives ending in -paraben'),
('silicone', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Silicone', 'Silicone-based ingredients'),
('sulfate', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Sulfate', 'Sulfate-based surfactants'),
('no_known_sensitivities', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/NoKnownSensitivities', 'No known allergies or sensitivities');

-- Insert skin types (FIXED: matches table schema)
INSERT INTO skin_types (name, ontology_uri) VALUES
('normal', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Normal'),
('dry', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Dry'),
('oily', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Oily'),
('combination', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Combination');

-- Insert common skin concerns
INSERT INTO skin_concerns (name, ontology_uri) VALUES
('acne', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Acne'),
('wrinkles', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Wrinkles'),
('fine_lines', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FineLines'),
('dark_spots', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/DarkSpots'),
('dryness', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Dryness'),
('oiliness', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Oiliness'),
('sensitivity', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Sensitivity'),
('redness', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Redness'),
('pores', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Pores'),
('dullness', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Dullness'),
('texture', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Texture'),
('dark_undereyes', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/DarkUndereyes'),
('fungal_acne', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FungalAcne'),
('eczema', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Eczema');

-- Seed formulation traits
INSERT INTO formulation_traits (name, ontology_uri, excludes_allergen_type_id) VALUES 
('fragrance_free', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FragranceFree', 1),
('alcohol_free', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/AlcoholFree', 2),
('paraben_free', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/ParabenFree', 3),
('silicone_free', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/SiliconeFree', 4),
('sulfate_free', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/SulfateFree', 5);

-- Seed ingredient benefits (from our discussion)
INSERT INTO ingredient_benefits (name, display_name, ontology_uri) VALUES 
('hydrating', 'Hydrating', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Hydrating'),
('barrier_repair', 'Barrier Repair', NULL),
('softening', 'Softening', NULL),
('acne_fighter', 'Acne Fighter', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/AcneFighter'),
('oil_control', 'Oil Control', NULL),
('pore_minimizing', 'Pore Minimizing', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/ReducesLargePores'),
('anti_aging', 'Anti-Aging', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/HelpsWithAntiAging'),
('texture_improvement', 'Texture Improvement', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/GoodForTexture'),
('brightening', 'Brightening', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Brightening'),
('helps_with_dark_spots', 'Fades Dark Spots', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/HelpsWithDarkSpots'),
('soothing', 'Soothing', NULL),
('reduce_redness', 'Reduces Redness', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/ReduceRedness'),
('reduces_irritation', 'Calms Irritation', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/ReducesIrritation'),
('cleansing', 'Cleansing', NULL),
('exfoliating', 'Exfoliating', NULL),
('protecting', 'Protection', NULL);

-- Insert key ingredient types
INSERT INTO key_ingredient_types (name, slug, display_name, description, category, usage_notes, ontology_uri) VALUES
('Alpha Hydroxy Acid', 'aha', 'AHA (Alpha Hydroxy Acids)', 'Water-soluble acids for surface exfoliation', 'acids', 'Use at night, follow with sunscreen', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/AlphaHydroxyAcid'),
('Beta Hydroxy Acid', 'bha', 'BHA (Beta Hydroxy Acids)', 'Oil-soluble acids that penetrate pores', 'acids', 'Good for oily, acne-prone skin', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/BetaHydroxyAcid'),
('Polyhydroxy Acid', 'pha', 'PHA (Polyhydroxy Acids)', 'Gentle acids for sensitive skin', 'acids', 'Suitable for sensitive skin', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/PolyhydroxyAcid'),
('Retinoid', 'retinoids', 'Retinoids', 'Vitamin A derivatives for anti-aging', 'actives', 'Start slowly, use at night', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Retinoid'),
('Vitamin C', 'vitamin-c', 'Vitamin C', 'Antioxidant for brightening', 'vitamins', 'Use in morning with sunscreen', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/VitaminC'),
('Vitamin E', 'vitamin-e', 'Vitamin E', 'Antioxidant and moisturizing', 'vitamins', 'Works well with Vitamin C', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/VitaminE'),
('Niacinamide', 'niacinamide', 'Niacinamide (Vitamin B3)', 'Vitamin B3 for oil control and pores', 'vitamins', 'Can be used morning and night', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Niacinamide'),
('Hyaluronic Acid', 'hyaluronic-acid', 'Hyaluronic Acid', 'Powerful humectant for hydration', 'moisturizers', 'Apply to damp skin', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/HyaluronicAcid'),
('Ceramides', 'ceramides', 'Ceramides', 'Lipids for barrier repair', 'moisturizers', 'Good for dry, damaged skin', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Ceramides'),
('Peptides', 'peptides', 'Peptides', 'Amino acid chains for anti-aging', 'actives', 'Helps with firmness and elasticity', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Peptides'),
('Chemical UV Filter', 'chemical-uv-filter', 'Chemical Sunscreen', 'Chemical sunscreen ingredients', 'sun_protection', 'Absorbs UV rays', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/ChemicalUVFilter'),
('Mineral UV Filter', 'mineral-uv-filter', 'Mineral Sunscreen', 'Physical sunscreen like zinc oxide', 'sun_protection', 'Reflects UV rays', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/MineralUVFilter'),
('Antioxidants', 'antioxidants', 'Antioxidants', 'Protective compounds against free radicals', 'actives', 'Helps prevent aging', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Antioxidants'),
('Exfoliators', 'exfoliators', 'Exfoliators', 'Ingredients that remove dead skin cells', 'actives', 'Improves skin texture', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Exfoliators'),
('Panthenol', 'panthenol', 'Panthenol (Pro-Vitamin B5)', 'Pro-Vitamin B5 for healing and hydration', 'vitamins', 'Soothing and moisturizing', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Panthenol');

-- ===== INSERT MAIN CATEGORIES (parent_id = NULL) =====
-- These will get auto-assigned IDs: 1, 2, 3, 4, 5, 6, 7, 8

INSERT INTO product_categories (name, ontology_uri) VALUES
('Cleanser', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Cleanser'),        -- ID = 1
('Eye Care', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/EyeCare'),         -- ID = 2  
('Lip Care', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/LipCare'),         -- ID = 3
('Moisturizer', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Moisturizer'),  -- ID = 4
('Other', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Other'),              -- ID = 5
('Set/Kit', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/SetKit'),           -- ID = 6
('Suncare', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Suncare'),          -- ID = 7
('Treatment', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Treatment');      -- ID = 8

-- ===== INSERT SUBCATEGORIES =====

-- Cleanser subcategories (parent_id = 1)
INSERT INTO product_categories (name, ontology_uri, parent_id) VALUES
('Cleansing Balm', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/CleansingBalm', 1),
('Cleansing Cream', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/CleansingCream', 1),
('Cleansing Oil', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/CleansingOil', 1),
('Cleansing Wipes', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/CleansingWipes', 1),
('Face Wash', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FaceWash', 1),
('Make Up Remover', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/MakeUpRemover', 1),
('Micellar Water', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/MicellarWater', 1);

-- Eye Care subcategories (parent_id = 2)  
INSERT INTO product_categories (name, ontology_uri, parent_id) VALUES
('Eye Cream', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/EyeCream', 2),
('Eye Mask', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/EyeMask', 2),
('Eye Serum', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/EyeSerum', 2),
('Eyelash Serum', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/EyelashSerum', 2);

-- Lip Care subcategories (parent_id = 3)
INSERT INTO product_categories (name, ontology_uri, parent_id) VALUES
('Lip Mask', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/LipMask', 3),
('Lip Balm', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/LipBalm', 3),
('Lip Scrub', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/LipScrub', 3),
('Lip Serum', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/LipSerum', 3);

-- Moisturizer subcategories (parent_id = 4)
INSERT INTO product_categories (name, ontology_uri, parent_id) VALUES
('Cream Or Lotion', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/CreamOrLotion', 4),
('Face Mist', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FaceMist', 4),
('Face Oil', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FaceOil', 4),
('Gel', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Gel', 4);

-- Treatment subcategories (parent_id = 8)
INSERT INTO product_categories (name, ontology_uri, parent_id) VALUES
('Acne Treatment', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/AcneTreatment', 8),
('Ampoules', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Ampoules', 8),
('Essence', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Essence', 8),
('Face Mask', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/FaceMask', 8),
('Peeling', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Peeling', 8),
('Scrub Or Exfoliator', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/ScrubOrExfoliator', 8),
('Serum', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Serum', 8),
('Toner', 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/Toner', 8);

-- Create views for easy querying
DROP VIEW IF EXISTS product_details;
CREATE VIEW product_details AS
SELECT 
    p.*,
    b.name as brand_full_name,
    pc_main.name as main_category_name,
    pc_sub.name as subcategory_name,
    p.main_category as csv_main_category,  -- Keep CSV version for reference
    p.subcategory as csv_subcategory,      -- Keep CSV version for reference
    (SELECT COUNT(*) FROM product_ingredients pi WHERE pi.product_id = p.id) as ingredient_count,
    (SELECT COUNT(*) FROM user_favorites uf WHERE uf.product_id = p.id) as favorite_count
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN product_categories pc_main ON p.main_category_id = pc_main.id  -- Use FK
LEFT JOIN product_categories pc_sub ON p.subcategory_id = pc_sub.id      -- Use FK  
WHERE p.is_active = TRUE;

CREATE VIEW ingredient_stats AS
SELECT 
    i.*,
    (SELECT COUNT(*) FROM product_ingredients pi WHERE pi.ingredient_id = i.id) as actual_product_count,
    (SELECT COUNT(*) FROM product_ingredients pi WHERE pi.ingredient_id = i.id AND pi.is_key_ingredient = TRUE) as key_ingredient_count
FROM ingredients i;

-- Success message
SELECT 'MatchCare Database Schema Created Successfully! ���' as status;

