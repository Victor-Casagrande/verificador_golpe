const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const extensionPath = path.resolve(__dirname, 'extension');

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    const targetUrl = 'https://meu-banco-falso.com/login';
    
    page.on('request', request => {
      if (request.url().includes('meu-banco-falso.com')) {
        request.respond({
          status: 200,
          contentType: 'text/html',
          body: '<html><body><h1>Banco Falso</h1></body></html>'
        });
      } else {
        request.continue();
      }
    });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    console.log("Aguardando inicialização da extensão...");
    const workerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker' && target.url().includes('background.js')
    );
    const worker = await workerTarget.worker();
    
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc4MDY5Mjk3MywiZXhwIjoxNzgxMjk3NzczfQ.bav2QYVdgjTCJre2pEPpddSh-FzPO0nCFP3l5vmANno";
    
    console.log("Injetando JWT no chrome.storage.local...");
    await worker.evaluate(async (jwt) => {
      await new Promise(resolve => chrome.storage.local.set({ jwtToken: jwt }, resolve));
    }, token);

    console.log("Navegando para URL...");
    await page.goto(targetUrl, { waitUntil: 'networkidle0' });

    console.log("Aguardando análise da extensão...");
    await new Promise(r => setTimeout(r, 10000));

    await browser.close();
    console.log("Teste concluído.");
  } catch (error) {
    console.error("Erro fatal durante simulação:", error);
  }
})();
