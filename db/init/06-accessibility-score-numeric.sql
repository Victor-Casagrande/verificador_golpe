-- accessibility_score usa retornos decrescentes com 2 casas decimais (ver accessibilityScore.js).
-- Bancos criados antes desta migração tinham INTEGER e rejeitavam valores como 43.17.
ALTER TABLE url_analyses
    ALTER COLUMN accessibility_score TYPE NUMERIC(7, 2)
    USING accessibility_score::numeric;
