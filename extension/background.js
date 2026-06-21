chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["API_URL"], (result) => {
    if (!result.API_URL) {
      chrome.storage.local.set({ API_URL: "http://localhost:3000" });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Trata o recebimento do token OAuth disparado pelo /auth/success (evitando ler a URL)
  if (request.source === "sentinela-oauth" && request.token) {
    chrome.storage.local.set({ jwtToken: request.token }, () => {
      console.info("Sentinela: Autenticação concluída e JWT armazenado via mensagem.");
    });
    return false; // Não é necessário sendResponse
  }

  // Trata a análise de URLs e os erros/rate limit
  if (request.action === "analyzeUrl") {
    chrome.storage.local.get(["API_URL", "jwtToken"], (result) => {
      // Bug #4 — Verifica erro do storage antes de prosseguir.
      // Sem isso, se o storage falhar silenciosamente, sendResponse nunca é
      // chamado e o canal do Service Worker fica aberto até o Chrome matá-lo,
      // causando o erro "message port closed before a response was received".
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: "Erro ao acessar o armazenamento local da extensão." });
        return;
      }

      const apiUrl = result.API_URL || "http://localhost:3000";
      const headers = { "Content-Type": "application/json" };

      if (result.jwtToken) {
        headers["Authorization"] = `Bearer ${result.jwtToken}`;
      }

      // Bug #4 — AbortController com timeout de 15 s.
      // Sem timeout, se a API travar, o SW fica bloqueado aguardando resposta
      // até ser encerrado pelo Chrome, deixando o canal pendurado.
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
              errorMessage = errorData.mensagem || errorData.error || errorMessage;
            } catch {
              // Se não for JSON, ignora
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

    return true; // Mantém o canal aberto para sendResponse assíncrono
  }
});
