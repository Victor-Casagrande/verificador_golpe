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