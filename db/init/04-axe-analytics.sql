-- Metadados para histórico temporal e rankings por site
ALTER TABLE url_analyses
    ADD COLUMN IF NOT EXISTS site_host VARCHAR(255);

ALTER TABLE url_analyses
    ADD COLUMN IF NOT EXISTS quality_rating INTEGER NOT NULL DEFAULT 100;

ALTER TABLE url_analyses
    ADD COLUMN IF NOT EXISTS axe_source VARCHAR(20) DEFAULT 'server';

ALTER TABLE url_analyses
    ADD COLUMN IF NOT EXISTS security_from_cache BOOLEAN DEFAULT FALSE;

UPDATE url_analyses
SET quality_rating = GREATEST(0, 100 - LEAST(100, accessibility_score))
WHERE quality_rating = 100 AND accessibility_score > 0;

UPDATE url_analyses
SET site_host = substring(url from '^https?://([^/]+)')
WHERE site_host IS NULL;

CREATE INDEX IF NOT EXISTS idx_url_analyses_site_host ON url_analyses (site_host);
CREATE INDEX IF NOT EXISTS idx_url_analyses_quality_rating ON url_analyses (quality_rating DESC);
CREATE INDEX IF NOT EXISTS idx_url_analyses_url_created ON url_analyses (url, created_at DESC);
