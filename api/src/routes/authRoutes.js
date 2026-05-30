const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const oauthRoutes = require("./oauthRoutes");
const {
  validateRegister,
  validateLogin,
} = require("../middlewares/authValidationMiddleware");

/**
 * Página de aterrissagem após o callback OAuth quando OAUTH_SUCCESS_REDIRECT
 * aponta para este endpoint. Responsabilidades:
 *
 *   1. Extrair `token` (JWT) e/ou `error` da query string.
 *   2. Exibir o token de forma copiável quando o usuário concluiu o login
 *      manualmente (fluxo navegador comum, sem extensão escutando).
 *   3. Notificar uma janela pai via `window.opener.postMessage(...)` para
 *      fluxos em popup (frontend SPA aguardando a resposta).
 *   4. Notificar a extensão Sentinela via `chrome.runtime.sendMessage` quando
 *      o `extension_id` for conhecido (passado por query string opcional).
 *   5. Em erro, exibir mensagem amigável em vez de página em branco.
 */
router.get("/success", (req, res) => {
  const token =
    typeof req.query.token === "string" ? req.query.token : "";
  const errorMsg =
    typeof req.query.error === "string" ? req.query.error : "";

  const safe = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Autenticação Sentinela</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; box-sizing: border-box; }
      .box { text-align: center; padding: 40px; border-radius: 12px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; max-width: 560px; width: 100%; }
      .icon { font-size: 48px; margin-bottom: 16px; display: block; }
      h2 { margin: 0 0 8px 0; color: #0f172a; }
      p { color: #64748b; margin: 0 0 16px 0; }
      .token-row { display: flex; gap: 8px; align-items: stretch; margin-top: 16px; }
      .token { flex: 1; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f1f5f9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
      button { padding: 10px 16px; border: none; border-radius: 8px; background: #2563eb; color: white; cursor: pointer; font-weight: 600; transition: background 120ms ease; min-width: 92px; }
      button:hover { background: #1d4ed8; }
      button.ok { background: #16a34a; }
      button.fail { background: #b91c1c; }
      .err { color: #b91c1c; }
    </style>
  </head>
  <body>
    <div class="box" id="root">
      ${
        errorMsg
          ? `<span class="icon">⚠️</span>
             <h2>Falha no login OAuth</h2>
             <p class="err">${safe(errorMsg)}</p>
             <p>Feche esta aba e tente novamente a partir da extensão.</p>`
          : `<span class="icon">✅</span>
             <h2>Autenticação concluída</h2>
             <p>Seu token de acesso foi gerado. A extensão deve recebê-lo
                automaticamente. Caso esteja testando manualmente, copie-o abaixo:</p>
             <div class="token-row">
               <div class="token" id="tok">${safe(token) || "(token ausente)"}</div>
               <button id="copyBtn" type="button" ${token ? "" : "disabled"}>Copiar</button>
             </div>`
      }
    </div>
    <script>
      // Botão de copiar JWT.
      // Implementado em <script> (e não como onclick inline) porque:
      //   1. Dentro de uma IIFE inline o objeto 'event' não existe, o que
      //      derrubava o feedback "Copiado!" silenciosamente.
      //   2. navigator.clipboard só funciona em contexto seguro (HTTPS ou
      //      localhost). Precisamos de fallback com execCommand para uso em
      //      ambiente local via IP ou HTTP plano.
      (function () {
        var btn = document.getElementById("copyBtn");
        var tokEl = document.getElementById("tok");
        if (!btn || !tokEl) return;

        var revertTimer = null;
        function flash(label, cls) {
          var original = "Copiar";
          btn.textContent = label;
          if (cls) btn.classList.add(cls);
          if (revertTimer) clearTimeout(revertTimer);
          revertTimer = setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove("ok", "fail");
          }, 1500);
        }

        // Fallback compatível com browsers antigos ou contexto não-seguro.
        function legacyCopy(text) {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "absolute";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          var ok = false;
          try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
          document.body.removeChild(ta);
          return ok;
        }

        btn.addEventListener("click", function () {
          var text = tokEl.textContent || "";
          if (!text || text === "(token ausente)") {
            flash("Sem token", "fail");
            return;
          }

          var done = function (ok) {
            flash(ok ? "Copiado!" : "Falha ao copiar", ok ? "ok" : "fail");
          };

          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(
              function () { done(true); },
              function () { done(legacyCopy(text)); }
            );
          } else {
            done(legacyCopy(text));
          }
        });
      })();

      // Propaga o resultado para qualquer escutador possível.
      // - window.opener.postMessage: popups SPA que abriram esta página
      // - chrome.runtime.sendMessage: extensão Sentinela (quando disponível)
      (function () {
        var payload = {
          source: "sentinela-oauth",
          token: ${JSON.stringify(token)},
          error: ${JSON.stringify(errorMsg)}
        };

        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, "*");
          }
        } catch (e) { /* janela pai inacessível, ignorar */ }

        try {
          if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(payload);
          }
        } catch (e) { /* extensão não instalada ou sem permissão, ignorar */ }

        // Fecha a aba automaticamente quando aberta como popup pela extensão.
        if (window.opener) {
          setTimeout(function () { window.close(); }, 2000);
        }
      })();
    </script>
  </body>
</html>`);
});

router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.use("/oauth", oauthRoutes);

module.exports = router;
