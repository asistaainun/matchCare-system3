
-- Drop quiz_results jika ada
DROP TABLE IF EXISTS quiz_results CASCADE;

-- Buat quiz_results dengan VARCHAR session_id (sesuai guest_sessions)
CREATE TABLE quiz_results (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES guest_sessions(session_id),
    skin_type_id INTEGER REFERENCES skin_types(id),
    concern_ids INTEGER[],
    fragrance_sensitivity BOOLEAN DEFAULT FALSE,
    alcohol_sensitivity BOOLEAN DEFAULT FALSE,
    silicone_sensitivity BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Verify table created
SELECT 'Quiz results table created successfully!' as status;
\d quiz_results