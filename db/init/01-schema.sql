CREATE TABLE IF NOT EXISTS url_analyses (
    id SERIAL PRIMARY KEY,
    url VARCHAR(2048) NOT NULL,
    is_danger BOOLEAN NOT NULL,
    status VARCHAR(100) NOT NULL,
    reason TEXT,
    accessibility_violations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_url_analyses_created_at ON url_analyses (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_url_analyses_url ON url_analyses (url);

CREATE INDEX IF NOT EXISTS idx_url_analyses_accessibility ON url_analyses USING GIN (accessibility_violations);