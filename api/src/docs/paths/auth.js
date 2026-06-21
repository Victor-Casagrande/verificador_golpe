/**
 * @openapi
 * /api/status:
 *   get:
 *     tags: [Sistema]
 *     summary: Status da API
 *     description: Verifica se a API está operacional. Sempre retorna HTTP 200; o corpo indica o estado das dependências.
 *     responses:
 *       200:
 *         description: API operacional
 *
 * /auth/register:
 *   post:
 *     tags: [Autenticação]
 *     summary: Criar conta com e-mail e senha
 *     description: Registra um novo usuário e retorna JWT de sessão. Contas OAuth com o mesmo e-mail serão unificadas posteriormente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, minLength: 2, example: "João Silva" }
 *               email: { type: string, format: email, example: "joao@exemplo.com" }
 *               password: { type: string, minLength: 6, format: password }
 *     responses:
 *       201:
 *         description: Conta criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       409:
 *         description: E-mail já cadastrado
 *
 * /auth/login:
 *   post:
 *     tags: [Autenticação]
 *     summary: Login com e-mail e senha
 *     description: Autentica usuário local e retorna JWT. Contas criadas exclusivamente via OAuth (sem senha) não podem usar este endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Credenciais inválidas
 *
 * /auth/oauth/providers:
 *   get:
 *     tags: [OAuth]
 *     summary: Provedores OAuth disponíveis
 *     description: Lista quais provedores (GitHub, Google) estão configurados no servidor.
 *     responses:
 *       200:
 *         description: Lista de provedores habilitados
 *
 * /auth/oauth/{provider}:
 *   get:
 *     tags: [OAuth]
 *     summary: Iniciar login social
 *     description: Redireciona o navegador para a tela de autorização do provedor (GitHub ou Google).
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [github, google]
 *     responses:
 *       302:
 *         description: Redirecionamento para o provedor OAuth
 *       503:
 *         description: Provedor não configurado neste ambiente
 *
 * /auth/oauth/{provider}/callback:
 *   get:
 *     tags: [OAuth]
 *     summary: Callback OAuth
 *     description: |
 *       Recebe o código de autorização do provedor e emite JWT.
 *
 *       - Contas com o **mesmo e-mail** em provedores diferentes são unificadas automaticamente.
 *       - Resposta em JSON ou redirecionamento para `OAUTH_SUCCESS_REDIRECT?token=...` conforme configuração.
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [github, google]
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *         description: Código de autorização do provedor
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *         description: Token CSRF assinado (validade de 10 minutos)
 *     responses:
 *       200:
 *         description: Autenticação concluída
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: State inválido ou expirado
 *       502:
 *         description: Falha na comunicação com o provedor OAuth
 */

module.exports = {};
