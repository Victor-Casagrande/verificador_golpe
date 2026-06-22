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


// ─── A11Y HIGHLIGHT — Realce visual de elementos com violações ───────────────
//
// Ao receber a mensagem "highlightA11yViolations" do popup, injeta contornos
// coloridos e tooltips nos elementos da página que reprovaram no axe-core.
// Completamente fail-safe: qualquer erro é capturado e logado sem quebrar a página.
// ─────────────────────────────────────────────────────────────────────────────

(function installA11yHighlight() {
  /** Mapeamento de impacto → cor do contorno */
  const IMPACT_COLORS = {
    critical: "#ef4444",  // vermelho
    serious:  "#f59e0b",  // amarelo-laranja
    moderate: "#eab308",  // amarelo
    minor:    "#8b949e",  // cinza
  };

  /** ID único para o painel de controle dos highlights */
  const PANEL_ID = "__sentinela_a11y_panel__";

  /** Classe aplicada em cada elemento realçado */
  const HIGHLIGHT_CLASS = "__sentinela_a11y_highlight__";

  /** Classe das tooltips injetadas */
  const TOOLTIP_CLASS = "__sentinela_a11y_tooltip__";

  /**
   * Injeta o CSS base dos highlights e tooltips no <head> da página.
   * Usa um ID para garantir que seja inserido apenas uma vez.
   */
  function injectStyles() {
    if (document.getElementById("__sentinela_a11y_styles__")) return;

    const style = document.createElement("style");
    style.id = "__sentinela_a11y_styles__";
    style.textContent = `
      .${HIGHLIGHT_CLASS} {
        outline: 3px dashed #ef4444 !important;
        outline-offset: 2px !important;
        position: relative !important;
      }
      .${TOOLTIP_CLASS} {
        position: absolute !important;
        top: -22px !important;
        left: 0 !important;
        z-index: 2147483647 !important;
        background: #1a1a2e !important;
        color: #00d8ff !important;
        font: bold 10px/1 monospace !important;
        padding: 3px 6px !important;
        border-radius: 4px !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        border: 1px solid #00d8ff !important;
        box-shadow: 0 2px 8px rgba(0,0,0,.5) !important;
      }
      #${PANEL_ID} {
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        z-index: 2147483647 !important;
        background: #0d1117 !important;
        border: 1px solid #30363d !important;
        border-radius: 10px !important;
        padding: 10px 14px !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 12px !important;
        color: #e6edf3 !important;
        box-shadow: 0 8px 24px rgba(0,0,0,.6) !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
      }
      #${PANEL_ID} button {
        background: #ef4444 !important;
        border: none !important;
        color: #fff !important;
        border-radius: 6px !important;
        padding: 5px 10px !important;
        font-size: 11px !important;
        font-weight: bold !important;
        cursor: pointer !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Remove todos os highlights e tooltips da página e destrói o painel.
   */
  function clearHighlights() {
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => {
      el.classList.remove(HIGHLIGHT_CLASS);
      // Remove a tooltip inline que pode ter sido adicionada
      const tooltip = el.querySelector(`.${TOOLTIP_CLASS}`);
      if (tooltip) tooltip.remove();
    });
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();
  }

  /**
   * Cria o painel flutuante com o contador de elementos realçados e botão
   * "Remover highlights".
   *
   * @param {number} count - Número de elementos realçados
   */
  function createControlPanel(count) {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    panel.innerHTML = `
      <span>🛡️ Sentinela: <strong>${count}</strong> elem. com violações</span>
      <button id="__sentinela_clear_btn__">✕ Remover</button>
    `;
    document.body.appendChild(panel);
    document.getElementById("__sentinela_clear_btn__").addEventListener("click", clearHighlights);
  }

  /**
   * Aplica os highlights e tooltips nos elementos identificados pelas violações.
   *
   * @param {Array} violations - Array de violações no formato do axe-core / API Sentinela
   */
  function applyHighlights(violations) {
    try {
      clearHighlights();
      injectStyles();

      let highlightedCount = 0;

      violations.forEach(violation => {
        const { id, impact, nodes } = violation;
        if (!Array.isArray(nodes) || nodes.length === 0) return;

        const color = IMPACT_COLORS[impact] || IMPACT_COLORS.minor;

        nodes.forEach(node => {
          // node pode ter target (array de seletores CSS) ou html (string)
          const selectors = Array.isArray(node.target) ? node.target : [];
          if (selectors.length === 0) return;

          selectors.forEach(selector => {
            let elements;
            try {
              elements = document.querySelectorAll(selector);
            } catch {
              return; // seletor inválido — pula silenciosamente
            }

            elements.forEach(el => {
              // Aplica a classe base e sobrescreve a cor do outline dinamicamente
              el.classList.add(HIGHLIGHT_CLASS);
              el.style.setProperty("outline-color", color, "important");

              // Tooltip com ID e impacto da violação
              if (!el.querySelector(`.${TOOLTIP_CLASS}`)) {
                // position:relative é necessário para o tooltip posicionar-se
                // corretamente — já definido no CSS, mas garantimos via JS para
                // elementos que possam ter position:static fixado inline.
                const computedPos = window.getComputedStyle(el).position;
                if (computedPos === "static") {
                  el.style.setProperty("position", "relative", "important");
                }

                const tooltip = document.createElement("span");
                tooltip.className = TOOLTIP_CLASS;
                tooltip.textContent = `${id} [${impact || "?"}]`;
                el.appendChild(tooltip);
              }

              highlightedCount++;
            });
          });
        });
      });

      if (highlightedCount > 0) {
        createControlPanel(highlightedCount);
      }
    } catch (err) {
      console.error("Sentinela [a11y-highlight]: erro ao aplicar highlights:", err);
    }
  }

  // Escuta mensagens do popup/background solicitando o realce
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "highlightA11yViolations") {
      try {
        const violations = message.violations ?? [];
        applyHighlights(violations);
        sendResponse({ success: true, highlighted: violations.length });
      } catch (err) {
        console.error("Sentinela [a11y-highlight]: falha no listener:", err);
        sendResponse({ success: false, error: err.message });
      }
      return false; // resposta síncrona
    }

    if (message.action === "clearA11yHighlights") {
      clearHighlights();
      sendResponse({ success: true });
      return false;
    }
  });
})();

// ─── Verificação de segurança automática ao carregar a página ────────────────

async function verifySiteAndAccessibility() {
  const currentUrl = window.location.href;

  try {
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

