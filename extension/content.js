// ─── Canal 2: receptor do postMessage da página /auth/success ────────────────
//
// Falha 4 — O backend dispara window.postMessage na página /auth/success mas
// o content.js não tinha nenhum listener para capturá-lo e repassar ao
// background.js. Sem isso, o token nunca chegava à extensão quando o fluxo
// era redirecionamento de aba (sem popup/opener).
//
// Segurança: só aceitamos mensagens cuja origem seja o mesmo host da API
// (Cloud Run). Fontes desconhecidas são ignoradas silenciosamente.
(function installOAuthListener() {
  var TRUSTED_ORIGIN = "https://sentinela-api-114594031602.southamerica-east1.run.app";

  window.addEventListener("message", function (event) {
    // Rejeita mensagens de origens não confiáveis.
    if (event.origin !== TRUSTED_ORIGIN) return;

    var data = event.data;
    if (!data || data.source !== "sentinela-oauth") return;
    if (!data.token || typeof data.token !== "string") return;

    // Retransmite para o background.js via canal interno da extensão.
    try {
      chrome.runtime.sendMessage({
        source: "sentinela-oauth",
        token: data.token,
      });
    } catch (e) {
      // Extensão em contexto que não permite sendMessage — ignorar.
    }
  });
})();
// ─────────────────────────────────────────────────────────────────────────────

async function getApiUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["API_URL"], (result) => {
      resolve(result.API_URL || "http://localhost:3000");
    });
  });
}

function createAlertOverlay(status, reason) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "rgba(220, 38, 38, 0.95)";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.color = "#ffffff";
  overlay.style.fontFamily = "Arial, sans-serif";
  overlay.style.textAlign = "center";
  overlay.style.padding = "20px";
  overlay.style.zIndex = "999999";

  overlay.innerHTML = `
        <h1 style="font-size: 3rem; margin-bottom: 10px;">⚠️ ALERTA DE SEGURANÇA</h1>
        <h2 id="sentry-status-text" style="font-size: 2rem; margin-bottom: 20px;"></h2>
        <p style="font-size: 1.2rem; margin-bottom: 40px; max-width: 600px;">
            O Sentinela bloqueou esta página pelo seguinte motivo:<br>
            <strong id="sentry-reason-text"></strong>
        </p>
        <button id="btn-voltar" style="padding: 15px 30px; font-size: 1.2rem; background-color: #ffffff; color: #dc2626; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 15px; font-weight: bold;">
            Sair desta página (Recomendado)
        </button>
        <button id="btn-ignorar" style="padding: 10px 20px; font-size: 1rem; background-color: transparent; color: #ffffff; border: 1px solid #ffffff; border-radius: 8px; cursor: pointer;">
            Ignorar aviso e continuar (Inseguro)
        </button>
    `;

  document.body.appendChild(overlay);

  document.getElementById("sentry-status-text").textContent = status;
  document.getElementById("sentry-reason-text").textContent = reason;

  document.getElementById("btn-voltar").addEventListener("click", () => {
    window.history.back();
  });

  document.getElementById("btn-ignorar").addEventListener("click", () => {
    overlay.remove();
  });
}

async function verifySiteAndAccessibility() {
  const currentUrl = window.location.href;

  try {
    // Delega a requisição para o background worker evitar bloqueios de CORS e CSP
    chrome.runtime.sendMessage(
      { action: "analyzeUrl", url: currentUrl },
      (response) => {
        if (!response || !response.success) {
          console.error("Sentinela: Erro de comunicação com a extensão/API.", response?.error);
          return;
        }

        const data = response.data;

        if (data.security && data.security.is_danger) {
          createAlertOverlay(data.security.status, data.security.reason);
        } else if (data.accessibility?.quality_rating !== undefined) {
          console.info(
            `Sentinela — nota de acessibilidade: ${data.accessibility.quality_rating}/100 ` +
            `(${data.accessibility.violations_count} violações)`
          );
        }
      }
    );
  } catch (error) {
    console.error("Sentinela: Falha na comunicação das mensagens:", error);
  }
}

window.addEventListener("load", () => {
  verifySiteAndAccessibility();
});
