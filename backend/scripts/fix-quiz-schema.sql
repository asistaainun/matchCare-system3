
-- Cek dan buat tabel yang diperlukan
CREATE TABLE IF NOT EXISTS guest_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS skin_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skin_concerns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allergen_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert basic data jika belum ada
INSERT INTO skin_types (name) VALUES 
    ('normal'), ('dry'), ('oily'), ('combination')
ON CONFLICT DO NOTHING;

INSERT INTO skin_concerns (name) VALUES 
    ('acne'), ('wrinkles'), ('dryness'), ('oiliness'), ('sensitivity'), ('dark_spots')
ON CONFLICT DO NOTHING;

INSERT INTO allergen_types (name) VALUES 
    ('fragrance'), ('alcohol'), ('paraben'), ('sulfate'), ('silicone')
ON CONFLICT DO NOTHING;

-- Buat tabel quiz_results yang benar
DROP TABLE IF EXISTS quiz_results CASCADE;
CREATE TABLE quiz_results (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES guest_sessions(session_id),
    skin_type_id INTEGER REFERENCES skin_types(id),
    concern_ids INTEGER[],
    fragrance_sensitivity BOOLEAN DEFAULT FALSE,
    alcohol_sensitivity BOOLEAN DEFAULT FALSE,
    silicone_sensitivity BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);