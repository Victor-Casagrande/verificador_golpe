CREATE TABLE IF NOT EXISTS url_analyses (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    is_danger BOOLEAN NOT NULL,
    status VARCHAR(100) NOT NULL,
    reason TEXT,
    accessibility_violations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_url_analyses_created_at ON url_analyses (created_at DESC);
