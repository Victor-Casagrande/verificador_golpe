-- Contas OAuth podem não ter senha local
ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

-- Vínculo provedor ↔ usuário (mesmo e-mail = mesma conta)
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT oauth_provider_user_unique
        UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id
    ON oauth_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider
    ON oauth_accounts (
        provider,
        provider_user_id
    );

-- ========================================
-- Usuários de teste
-- Senha para todos: 123456
-- ========================================

INSERT INTO users (
    name,
    email,
    password_hash
)
VALUES
(
    'Administrador',
    'admin@test.com',
    '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36L6L2JrVN6M8GN28AL/fSO'
),
(
    'João Silva',
    'joao@test.com',
    '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36L6L2JrVN6M8GN28AL/fSO'
),
(
    'Maria Souza',
    'maria@test.com',
    '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36L6L2JrVN6M8GN28AL/fSO'
),
(
    'OAuth Test',
    'oauth@test.com',
    NULL
)
ON CONFLICT (email) DO NOTHING;