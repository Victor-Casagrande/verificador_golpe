#!/usr/bin/env node
const baseUrl = "http://localhost:3000";

const analyzeUrl = async (url, accessibilityReport = []) => {
  const payload = {
    url,
    accessibility_report: accessibilityReport,
  };
  
  try {
    const res = await fetch(`${baseUrl}/urls/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));
    console.log(JSON.stringify(body, null, 2));
    return { status: res.status, body };
  } catch (error) {
    console.error("Erro na requisição:", error.message);
  }
};

const main = async () => {
  console.log(`Verificando API em: ${baseUrl}`);
  try {
    const health = await fetch(`${baseUrl}/api/status`);
    if (!health.ok) {
      console.error("API não respondeu ao health check com sucesso.");
      process.exit(1);
    }
  } catch {
    console.error(`Não foi possível conectar em ${baseUrl}. Certifique-se que o docker-compose ou npm run dev está rodando.`);
    process.exit(1);
  }

  console.log("\n=== Cenário A: Phishing Crítico ===");
  // URL formatada para acionar as heurísticas estáticas negativas (uso de IP direto, excesso de hífens, palavras como 'secure-login' e 'update')
  await analyzeUrl("http://192.168.1.1/secure-login-update-account-info-admin-verify-secure-login");

  console.log("\n=== Cenário B: Acessibilidade Ruim ===");
  // URL simulada que retorne falhas graves de contraste e falta de atributos ARIA
  const badA11yReport = [
    {
      id: "color-contrast",
      impact: "critical",
      tags: ["cat.color", "wcag2aa", "wcag143"],
      description: "Elements must have sufficient color contrast",
      nodes: [
        { failureSummary: "Fix any of the following: Element has insufficient color contrast of 1.1 (foreground color: #ffffff, background color: #f0f0f0, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1" },
        { failureSummary: "Fix any of the following: Element has insufficient color contrast of 1.1 (foreground color: #ffffff, background color: #f0f0f0, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1" }
      ]
    },
    {
      id: "aria-roles",
      impact: "serious",
      tags: ["cat.aria", "wcag2a", "wcag412"],
      description: "ARIA roles used must conform to valid values",
      nodes: [
        { failureSummary: "Fix any of the following: ARIA role is not valid" }
      ]
    },
    {
      id: "button-name",
      impact: "critical",
      tags: ["cat.name-role-value", "wcag2a", "wcag412"],
      description: "Buttons must have discernible text",
      nodes: [
        { failureSummary: "Fix any of the following: Element does not have text that is visible to screen readers" }
      ]
    }
  ];
  await analyzeUrl("http://example.com/bad-a11y-test", badA11yReport);

  console.log("\n=== Cenário C: Seguro ===");
  // URL limpa e conhecida
  await analyzeUrl("https://github.com");
};

main().catch(console.error);
