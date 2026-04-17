chrome.runtime.onInstalled.addListener(() => {
  console.log("Extensão Verificar Golpe instalada com sucesso.");
  chrome.storage.local.set({
    statusSeguranca: "Pendente",
    statusAcessibilidade: "Pendente",
  });
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.acao === "analisarAcessibilidade") {
    console.log("Requisição de análise recebida do popup.");
    sendResponse({
      resultado:
        "Motor Axe-core ainda não integrado, mas comunicação estabelecida no Background.",
    });
  }
  return true;
});
