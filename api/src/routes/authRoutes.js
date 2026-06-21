/**
 * Namespace /auth — registro/login local, OAuth e página ponte pós-callback.
 */
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const oauthRoutes = require("./oauthRoutes");
const { validateRegister, validateLogin } = require("../middlewares/authValidationMiddleware");
const { authLimiter } = require("../middlewares/rateLimitMiddleware");

/**
 * O fluxo OAuth abre estas rotas em um popup iniciado pelo frontend, que está
 * em outra origem (ex.: :5173 vs API :3000). A COOP padrão do helmet
 * (`same-origin`) isola o popup e zera `window.opener`, impedindo a entrega
 * do token via `postMessage` — daí o "redirecionando" que nunca completava.
 * Relaxamos a COOP apenas para o namespace /auth para preservar o opener.
 */
router.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  next();
});

/**
 * Página de aterrissagem (ponte) após o callback OAuth, usada quando
 * OAUTH_SUCCESS_REDIRECT aponta para este endpoint.
 *
 * Em produção esta página NÃO exibe o JWT: ela é apenas uma ponte invisível
 * que entrega o token a quem iniciou o login e se fecha sozinha.
 *
 *   1. Extrai `token` (JWT) e/ou `error` da query string.
 *   2. Entrega o resultado a quem abriu o popup via
 *      `window.opener.postMessage(...)` (frontend SPA) e à extensão via
 *      `chrome.runtime.sendMessage` (quando disponível). O app, ao receber,
 *      redireciona automaticamente para o dashboard.
 *   3. Fecha a janela automaticamente. Em erro, mostra uma mensagem curta.
 */
router.get("/success", (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const errorMsg = typeof req.query.error === "string" ? req.query.error : "";

  const safe = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // URL de destino final do frontend.
  // Falha 2 — O redirect não incluía o token, então o frontend recebia o
  // usuário sem autenticação. Agora o ?token= é anexado para que o
  // AuthContext possa ler via URLSearchParams como fallback.
  const frontendBase = process.env.FRONTEND_URL || "https://verificador-golpe.vercel.app";
  const frontendUrl = token
    ? `${frontendBase}?token=${encodeURIComponent(token)}`
    : frontendBase;

  // Falha 1 — chrome.runtime.sendMessage sem Extension ID é uma chamada
  // "interna" que falha silenciosamente em páginas externas. A sintaxe
  // correta para externally_connectable é sendMessage(extensionId, payload).
  // O EXTENSION_ID deve ser configurado no env.yaml do Cloud Run.
  const extensionId = process.env.EXTENSION_ID || "";

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Autenticação Sentinela</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; box-sizing: border-box; }
      .box { text-align: center; padding: 40px; border-radius: 12px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; max-width: 460px; width: 100%; }
      .icon { font-size: 44px; margin-bottom: 12px; display: block; }
      h2 { margin: 0 0 8px 0; color: #0f172a; }
      p { color: #64748b; margin: 0; }
      .err { color: #b91c1c; }
      .spinner { width: 26px; height: 26px; margin: 0 auto 16px; border: 3px solid #cbd5e1; border-right-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="box">
      ${
        errorMsg
          ? `<span class="icon">⚠️</span>
             <h2>Falha no login</h2>
             <p class="err">${safe(errorMsg)}</p>
             <p>Você já pode fechar esta janela e tentar novamente.</p>`
          : `<div class="spinner"></div>
             <h2>Login concluído</h2>
             <p>Redirecionando você para o painel…</p>`
      }
    </div>
    <script>
      // Oculta o token da URL no histórico imediatamente.
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      (function () {
        var token      = ${JSON.stringify(token)};
        var errorMsg   = ${JSON.stringify(errorMsg)};
        var extId      = ${JSON.stringify(extensionId)};
        var frontendUrl = ${JSON.stringify(frontendUrl)};

        var payload = {
          source: "sentinela-oauth",
          token:  token,
          error:  errorMsg,
        };

        // Canal 1 — popup aberto pelo frontend SPA (window.opener disponível).
        // Funciona quando o AuthContext fez window.open() e escuta postMessage.
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, "*");
          }
        } catch (e) { /* opener inacessível — ignorar */ }

        // Canal 2 — postMessage na aba atual para o content.js da extensão.
        // O content.js retransmite ao background.js via chrome.runtime.sendMessage.
        try {
          window.postMessage(payload, "*");
        } catch (e) { /* sem postMessage — ignorar */ }

        // Canal 3 — externally_connectable (canal direto página → extensão).
        // Falha 1 corrigida: sendMessage(extensionId, payload) com o ID injetado
        // pelo backend. Sem o ID a chamada era interna e falhava silenciosamente.
        try {
          if (extId && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(extId, payload);
          }
        } catch (e) { /* extensão ausente ou sem permissão — ignorar */ }

        // Fallback incondicional de saída.
        // Falha 2 corrigida: frontendUrl já carrega ?token= para que o
        // AuthContext do frontend possa ler e persistir o JWT mesmo sem popup.
        if (!errorMsg) {
          if (window.opener && !window.opener.closed) {
            // Cenário popup: fecha após os postMessages serem processados.
            setTimeout(function () { window.close(); }, 300);
          } else {
            // Cenário aba (extensão ou fallback): redireciona com token na URL.
            setTimeout(function () {
              window.location.href = frontendUrl;
            }, 1200);
          }
        }
      })();
    </script>
  </body>
</html>`);
});


router.post("/register", authLimiter, validateRegister, authController.register);
router.post("/login", authLimiter, validateLogin, authController.login);
router.use("/oauth", oauthRoutes);

module.exports = router;
