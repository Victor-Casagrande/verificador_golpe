const SENTRY_CONFIG = {
  API_URL: "http://localhost:3000",
  TIMEOUT_MS: 90000,
};

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

  overlay.innerHTML = `
        <h1 style="font-size: 3rem; margin-bottom: 10px;">⚠️ ALERTA DE SEGURANÇA</h1>
        <h2 style="font-size: 2rem; margin-bottom: 20px;">${status}</h2>
        <p style="font-size: 1.2rem; margin-bottom: 40px; max-width: 600px;">
            O Sentinela bloqueou esta página pelo seguinte motivo:<br>
            <strong>${reason}</strong>
        </p>
        <button id="btn-voltar" style="padding: 15px 30px; font-size: 1.2rem; background-color: #ffffff; color: #dc2626; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 15px; font-weight: bold;">
            Sair desta página (Recomendado)
        </button>
        <button id="btn-ignorar" style="padding: 10px 20px; font-size: 1rem; background-color: transparent; color: #ffffff; border: 1px solid #ffffff; border-radius: 8px; cursor: pointer;">
            Ignorar aviso e continuar (Inseguro)
        </button>
    `;

  overlay.querySelector("#sentry-status-text").textContent = status;
  overlay.querySelector("#sentry-reason-text").textContent = reason;

  document.body.appendChild(overlay);

  document.getElementById("btn-voltar").addEventListener("click", () => {
    window.history.back();
  });

  document.getElementById("btn-ignorar").addEventListener("click", () => {
    overlay.remove();
  });
}

async function verifySiteAndAccessibility() {
  const currentUrl = window.location.href;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SENTRY_CONFIG.TIMEOUT_MS,
  );

  try {
    const endpoint = `${SENTRY_CONFIG.API_URL}/urls/analyze`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: currentUrl }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        "Erro na comunicação com o servidor SentryVZN. Código HTTP:",
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
        `SentryVZN: O servidor demorou mais de ${SENTRY_CONFIG.TIMEOUT_MS / 1000} segundos a responder. Pedido cancelado para não bloquear o navegador.`,
      );
    } else {
      console.error(
        "SentryVZN: Falha ao tentar verificar a URL e a acessibilidade na rede:",
        error,
      );
    }
  }
}

window.addEventListener("load", () => {
  verifySiteAndAccessibility();
});
