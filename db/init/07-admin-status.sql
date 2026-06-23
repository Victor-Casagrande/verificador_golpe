-- Script de migração para o painel administrativo
-- Adiciona o status nas denúncias para gerenciamento
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'aguardando análise';

-- Cria um índice para consultas do painel de admin
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
