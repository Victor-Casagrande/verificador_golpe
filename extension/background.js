chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    API_URL: "https://sentinela-api-114594031602.southamerica-east1.run.app",
  });
});

chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.source === "sentinela-oauth" && request.token) {
      chrome.storage.local.set({ jwtToken: request.token }, () => {
        console.info(
          "Sentinela: Token de produção armazenado com sucesso via canal externo!",
        );
      });
    }
  },
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.source === "sentinela-oauth" && request.token) {
    chrome.storage.local.set({ jwtToken: request.token }, () => {
      console.info(
        "Sentinela: Autenticação concluída e JWT armazenado via mensagem interna.",
      );
    });
    return false;
  }

  if (request.action === "analyzeUrl") {
    chrome.storage.local.get(["API_URL", "jwtToken"], (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          success: false,
          error: "Erro ao acessar o armazenamento local da extensão.",
        });
        return;
      }

      const apiUrl =
        result.API_URL ||
        "https://sentinela-api-114594031602.southamerica-east1.run.app";
      const headers = { "Content-Type": "application/json" };

      if (result.jwtToken) {
        headers["Authorization"] = `Bearer ${result.jwtToken}`;
      }

      // ── Retry automático com backoff ────────────────────────────────────────
      // Realiza até MAX_ATTEMPTS tentativas silenciosas antes de propagar o erro
      // para o popup. Cobre cold starts do Puppeteer/Cloud Run (~20-30s).
      // Timeout por tentativa: 20s | Pausa entre tentativas: 2s
      // Tempo máximo total: ~42s (imperceptível para análises que voltam rápido).
      const MAX_ATTEMPTS  = 2;
      const TIMEOUT_PER_ATTEMPT_MS = 20000;
      const RETRY_DELAY_MS = 2000;

      const body = JSON.stringify({ url: request.url });

      async function attemptFetch(attempt) {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(
            new DOMException(`Tentativa ${attempt}: tempo esgotado (${TIMEOUT_PER_ATTEMPT_MS / 1000}s)`, "TimeoutError")
          ),
          TIMEOUT_PER_ATTEMPT_MS
        );

        try {
          const response = await fetch(`${apiUrl}/urls/analyze`, {
            method: "POST",
            headers,
            body,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      }

      (async () => {
        let lastError = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            const response = await attemptFetch(attempt);

            if (!response.ok) {
              let errorMessage = `Erro HTTP: ${response.status} ${response.statusText}`;
              try {
                const errorData = await response.json();
                errorMessage = errorData.mensagem || errorData.error || errorMessage;
              } catch {
                // Ignora se não for JSON
              }
              throw new Error(errorMessage);
            }

            const data = await response.json();
            sendResponse({ success: true, data });
            return; // Sucesso — encerra o loop

          } catch (err) {
            lastError = err;

            const isRetryable = err.name === "TimeoutError" ||
                                err.name === "AbortError"   ||
                                /timeout|abort|signal|network/i.test(err.message);

            if (isRetryable && attempt < MAX_ATTEMPTS) {
              // Pausa breve antes da próxima tentativa
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
              continue; // Próxima tentativa
            }

            // Erro não recuperável ou última tentativa esgotada
            sendResponse({ success: false, error: lastError.message });
            return;
          }
        }
      })();
    });

    return true; // Mantém o canal de mensagem aberto para resposta assíncrona
  }
});
