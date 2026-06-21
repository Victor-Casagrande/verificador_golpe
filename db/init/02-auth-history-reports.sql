CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

ALTER TABLE url_analyses
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE url_analyses
    ADD COLUMN IF NOT EXISTS accessibility_score NUMERIC(7, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_url_analyses_user_id ON url_analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_url_analyses_accessibility_score ON url_analyses (accessibility_score DESC);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url_analysis_id INTEGER REFERENCES url_analyses(id) ON DELETE SET NULL,
    url VARCHAR(2048) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reports_type_check CHECK (
        report_type IN ('false_positive', 'confirmed_scam', 'accessibility_issue', 'other')
    )
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_url ON reports (url);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
