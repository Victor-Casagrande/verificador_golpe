const SENTRY_CONFIG = {
  TIMEOUT_MS: 90000,
};

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
  const apiUrl = await getApiUrl();
  const endpoint = `${apiUrl}/urls/analyze`;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SENTRY_CONFIG.TIMEOUT_MS,
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentUrl }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        "Erro na comunicação com o servidor Sentinela. Código HTTP:",
        response.status,
      );
      return;
    }

    const data = await response.json();

    if (data.security && data.security.is_danger) {
      createAlertOverlay(data.security.status, data.security.reason);
    } else if (data.accessibility?.quality_rating !== undefined) {
      console.info(
        `Sentinela — nota de acessibilidade: ${data.accessibility.quality_rating}/100 ` +
          `(${data.accessibility.violations_count} violações, fonte: ${data.accessibility.axe_source})`,
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error(
        `Sentinela: Servidor demorou mais de ${SENTRY_CONFIG.TIMEOUT_MS / 1000}s. Cancelado.`,
      );
    } else {
      console.error("Sentinela: Falha na verificação de rede:", error);
    }
  }
}

window.addEventListener("load", () => {
  verifySiteAndAccessibility();
});
