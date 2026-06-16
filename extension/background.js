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
      const apiUrl = result.API_URL || "http://localhost:3000";
      const headers = { "Content-Type": "application/json" };
      
      if (result.jwtToken) {
        headers["Authorization"] = `Bearer ${result.jwtToken}`;
      }
      
      fetch(`${apiUrl}/urls/analyze`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ url: request.url }),
      })
      .then(async (response) => {
        if (!response.ok) {
          let errorMessage = `Erro HTTP: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.mensagem || errorData.error || errorMessage;
          } catch (e) {
            // Se não for JSON, ignora
          }
          throw new Error(errorMessage);
        }
        return response.json();
      })
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    });
    
    return true; // call sendResponse asynchronously
  }
});

chrome.runtime.onMessage.addListener(
  async (message) => {

    if (
      message?.source ===
      "sentinela-oauth"
    ) {

      await chrome.storage.local.set({
        jwtToken: message.token
      });
    }
  }
);