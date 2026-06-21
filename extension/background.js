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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      fetch(`${apiUrl}/urls/analyze`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ url: request.url }),
        signal: controller.signal,
      })
        .then(async (response) => {
          clearTimeout(timeoutId);
          if (!response.ok) {
            let errorMessage = `Erro HTTP: ${response.status} ${response.statusText}`;
            try {
              const errorData = await response.json();
              errorMessage =
                errorData.mensagem || errorData.error || errorMessage;
            } catch {
              // Ignora se não for JSON
            }
            throw new Error(errorMessage);
          }
          return response.json();
        })
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => {
          clearTimeout(timeoutId);
          sendResponse({ success: false, error: error.message });
        });
    });

    return true;
  }
});
