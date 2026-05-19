/**
 * @openapi
 * /api/status:
 *   get:
 *     tags: [Sistema]
 *     summary: Health check da API
 *     responses:
 *       200:
 *         description: API operacional
 *
 * /auth/register:
 *   post:
 *     tags: [Autenticação]
 *     summary: Registrar usuário com e-mail e senha
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, minLength: 2 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201:
 *         description: Usuário criado
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
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
 *     summary: Lista provedores OAuth configurados
 *     responses:
 *       200:
 *         description: GitHub e/ou Google disponíveis
 *
 * /auth/oauth/{provider}:
 *   get:
 *     tags: [OAuth]
 *     summary: Inicia fluxo OAuth (redireciona ao provedor)
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [github, google]
 *     responses:
 *       302:
 *         description: Redirecionamento para GitHub ou Google
 *       503:
 *         description: Provedor não configurado
 *
 * /auth/oauth/{provider}/callback:
 *   get:
 *     tags: [OAuth]
 *     summary: Callback OAuth — retorna JWT (JSON) ou redireciona com token
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
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Autenticação concluída (mesmo e-mail unifica contas)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */

module.exports = {};
