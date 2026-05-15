-- Criação da tabela principal com restrições de segurança de limite de caracteres
CREATE TABLE IF NOT EXISTS url_analyses (
    id SERIAL PRIMARY KEY,
    url VARCHAR(2048) NOT NULL,
    is_danger BOOLEAN NOT NULL,
    status VARCHAR(100) NOT NULL,
    reason TEXT,
    accessibility_violations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice original para otimizar ordenação temporal
CREATE INDEX IF NOT EXISTS idx_url_analyses_created_at ON url_analyses (created_at DESC);

-- Correção de Performance 1: Índice B-Tree para consultas exatas da URL (Essencial para sistema de Cache)
CREATE INDEX IF NOT EXISTS idx_url_analyses_url ON url_analyses (url);

-- Correção de Performance 2: Índice GIN na coluna JSONB para permitir buscas ultrarrápidas na estrutura do Axe-core
CREATE INDEX IF NOT EXISTS idx_url_analyses_accessibility ON url_analyses USING GIN (accessibility_violations);