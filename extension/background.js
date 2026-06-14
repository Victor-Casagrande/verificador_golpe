chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["API_URL"], (result) => {
    if (!result.API_URL) {
      // Para produção, alterar apenas este valor via código ou painel de opções futuro
      chrome.storage.local.set({ API_URL: "http://localhost:3000" });
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && changeInfo.url.includes("/auth/success?token=")) {
    const url = new URL(changeInfo.url);
    const token = url.searchParams.get("token");

    if (token) {
      chrome.storage.local.set({ jwtToken: token }, () => {
        chrome.tabs.remove(tabId);
        console.info("Sentinela: Autenticação concluída e JWT armazenado.");
      });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
      .then(response => response.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    });
    
    // IMPORTANTE: Retorna 'true' para indicar que o 'sendResponse' será chamado de forma assíncrona.
    return true; 
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