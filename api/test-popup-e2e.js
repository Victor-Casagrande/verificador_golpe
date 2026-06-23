const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const popupHtmlPath = "file://" + path.resolve(__dirname, "../extension/popup.html");
  const browser = await puppeteer.launch({ headless: "new", args: ["--disable-web-security"] });

  console.log("================= INICIANDO TESTES DO POPUP =================");

  // Cenário A
  console.log("\n--- Executando Cenário A: Usuário Deslogado ---");
  let page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    window.chrome = {
      storage: {
        local: {
          get: async () => ({}),
        },
      },
      tabs: {
        create: (opts) => {
          window.mockTabsCreateCalled = opts;
        },
      },
    };
  });

  await page.goto(popupHtmlPath);
  await page.waitForSelector("#login-view");

  // Checking flashing (assincronicidade)
  // Before the fetch finishes (or just after page load), login-view is NOT hidden.
  // Actually, wait for the JS to execute:
  await new Promise((r) => setTimeout(r, 200));

  const loginHiddenA = await page.$eval("#login-view", (el) => el.classList.contains("hidden"));
  const dashboardHiddenA = await page.$eval("#dashboard-view", (el) =>
    el.classList.contains("hidden"),
  );

  console.log("Login visível?", !loginHiddenA);
  console.log("Dashboard visível?", !dashboardHiddenA);

  await page.click("#btn-login");
  await new Promise((r) => setTimeout(r, 100));
  const tabsCreateOpts = await page.evaluate(() => window.mockTabsCreateCalled);
  console.log("Mock chrome.tabs.create interceptado com:", JSON.stringify(tabsCreateOpts));

  await page.close();

  // Cenário B
  console.log("\n--- Executando Cenário B: Usuário Logado e Renderização de Dados ---");
  page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/users/history")) {
      request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { url: "http://safe.com", status: "safe", created_at: "2023-10-01T12:30:00Z" },
          { url: "http://danger.com", status: "danger", created_at: "2023-10-02T15:45:00Z" },
        ]),
      });
    } else if (url.includes("/rankings")) {
      request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ domain: "bad.com", report_count: 5 }]),
      });
    } else {
      request.continue();
    }
  });

  await page.evaluateOnNewDocument(() => {
    window.chrome = {
      storage: {
        local: {
          get: async () => ({ jwtToken: "fake_jwt", API_URL: "http://localhost:3000" }),
        },
      },
    };
  });

  await page.goto(popupHtmlPath);

  // Wait for the UI update
  await new Promise((r) => setTimeout(r, 500));

  const loginHiddenB = await page.$eval("#login-view", (el) => el.classList.contains("hidden"));
  const dashboardHiddenB = await page.$eval("#dashboard-view", (el) =>
    el.classList.contains("hidden"),
  );

  console.log("Login visível?", !loginHiddenB);
  console.log("Dashboard visível?", !dashboardHiddenB);

  const historyItems = await page.$$eval("#history-list li", (lis) =>
    lis.map((li) => li.outerHTML),
  );
  console.log("DOM Injetado em ul#history-list:");
  historyItems.forEach((item, i) => {
    // Format HTML somewhat cleanly
    const cleanHTML = item.replace(/\n/g, "").replace(/\s{2,}/g, " ");
    console.log(`  [Item ${i + 1}] -> ${cleanHTML}`);
  });

  await browser.close();
  console.log("\n================= FIM DOS TESTES =================");
})();
