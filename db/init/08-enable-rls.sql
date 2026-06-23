-- Habilita Row Level Security (RLS) para todas as tabelas do sistema.
-- Como nossa aplicação acessa o banco diretamente via Node.js (com credenciais privilegiadas),
-- o RLS não afetará o funcionamento do Cloud Run. Porém, ele bloqueará qualquer acesso
-- anônimo (anon key) ou via Data API do Supabase, resolvendo os alertas de vulnerabilidade crítica.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jwt_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
