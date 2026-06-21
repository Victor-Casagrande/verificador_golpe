document.addEventListener("DOMContentLoaded", async () => {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");

  // URL de produção fixada + Obtenção apenas do Token
  const API_URL =
    "https://sentinela-api-114594031602.southamerica-east1.run.app";
  const storage = await chrome.storage.local.get(["jwtToken"]);
  let jwtToken = storage.jwtToken;

  function updateView() {
    if (jwtToken) {
      loginView.classList.add("hidden");
      dashboardView.classList.remove("hidden");
      loadHistory();
      loadRankings();
    } else {
      loginView.classList.remove("hidden");
      dashboardView.classList.add("hidden");
    }
  }

  // --- AUTENTICAÇÃO ---
  document.getElementById("btn-google").addEventListener("click", () => {
    // Abre a rota do backend que inicia o OAuth do Google
    chrome.tabs.create({ url: `${API_URL}/auth/oauth/google` });
  });

  document.getElementById("btn-github").addEventListener("click", () => {
    chrome.tabs.create({
      url: `${API_URL}/auth/oauth/github`,
    });
  });

  document
    .getElementById("btn-login-local")
    .addEventListener("click", loginLocal);

  document.getElementById("btn-logout").addEventListener("click", async () => {
    await chrome.storage.local.remove("jwtToken");
    jwtToken = null;
    updateView();
  });

  window.addEventListener("message", async (event) => {
    // Bug #7 — Valida a origem da mensagem antes de aceitar o token.
    // Sem isso, qualquer página aberta no navegador poderia injetar
    // um token falso e sequestrar a sessão da extensão (XSS via postMessage).
    let expectedOrigin;
    try {
      expectedOrigin = new URL(API_URL).origin;
    } catch {
      return; // API_URL inválida — não processa a mensagem
    }
    if (event.origin !== expectedOrigin) return;

    if (event.data?.source === "sentinela-oauth") {
      const token = event.data.token;

      if (!token || typeof token !== "string") return;

      await chrome.storage.local.set({
        jwtToken: token,
      });

      jwtToken = token;

      updateView();
    }
  });

  // --- NAVEGAÇÃO DAS ABAS ---
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.add("hidden"));

      e.target.classList.add("active");
      document
        .getElementById(e.target.dataset.target)
        .classList.remove("hidden");

      // Carrega a análise de acessibilidade quando a aba é selecionada.
      // Carregamento lazy: só dispara ao clicar, evitando requisições
      // desnecessárias quando o usuário nem chega a abrir esta aba.
      if (e.target.dataset.target === "accessibility-tab") {
        loadAccessibilityAnalysis();
      }
    });
  });

  // --- FETCH: HISTÓRICO ---
  async function loadHistory() {
    const list = document.getElementById("history-list");
    try {
      const res = await fetch(`${API_URL}/users/history`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Não autorizado");
        throw new Error("Erro de rede");
      }

      const data = await res.json();
      const total = data.length;

      const safe = data.filter((item) => item.status === "safe").length;

      const danger = total - safe;

      document.getElementById("total-checks").textContent = total;
      document.getElementById("safe-checks").textContent = safe;
      document.getElementById("danger-checks").textContent = danger;
      list.innerHTML = "";

      if (data.length === 0) {
        list.innerHTML = "<li>Nenhum histórico encontrado.</li>";
        return;
      }

      data.forEach((item) => {
        const li = document.createElement("li");
        const isSafe = item.status === "safe";

        // Formatação de data padronizada usando formato 24 horas
        const dateObj = new Date(item.created_at || new Date());
        const formattedDate = new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(dateObj);

        li.innerHTML = `
          <div class="item-title">${item.url}</div>
          <div class="item-meta">
            <span class="${isSafe ? "status-safe" : "status-danger"}">
              ${isSafe ? "Seguro" : "Suspeito"}
            </span>
            <span>${formattedDate}</span>
          </div>
        `;
        list.appendChild(li);
      });
    } catch (error) {
      if (error.message === "Não autorizado") {
        await chrome.storage.local.remove("jwtToken");
        jwtToken = null;
        updateView();
      } else {
        list.innerHTML = "<li>Erro ao carregar histórico.</li>";
      }
    }
  }

  // --- FETCH: RANKING ---
  async function loadRankings() {
    const list = document.getElementById("ranking-list");
    try {
      const res = await fetch(
        `${API_URL}/rankings/accessibility/worst?limit=10`,
      );
      if (!res.ok) throw new Error("Erro de rede");

      const data = await res.json();
      list.innerHTML = "";

      if (data.length === 0) {
        list.innerHTML = "<li>Nenhum ranking disponível.</li>";
        return;
      }

      data.forEach((item, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="item-title">#${index + 1} - ${item.domain}</div>
          <div class="item-meta">
            <span>Denúncias: ${item.report_count}</span>
          </div>
        `;
        list.appendChild(li);
      });
    } catch (error) {
      list.innerHTML = "<li>Erro ao carregar rankings.</li>";
    }
  }

  // --- FETCH: ACESSIBILIDADE DA PÁGINA ATUAL ---
  /**
   * Analisa a página ativa e exibe as violações de acessibilidade em
   * Linguagem Simples usando os campos human_title, human_description,
   * human_tip, impact_pt e wcag_reference retornados pelo backend.
   *
   * Fluxo:
   *   1. Obtém a URL da aba ativa
   *   2. Envia "analyzeUrl" ao background.js (que gerencia CORS e JWT)
   *   3. Renderiza o resultado via DOM seguro (sem innerHTML com dados externos)
   */
  async function loadAccessibilityAnalysis() {
    const list = document.getElementById("accessibility-violations-list");
    const scoreEl = document.getElementById("a11y-score-value");
    const labelEl = document.getElementById("a11y-score-label");
    const badgeEl = document.getElementById("a11y-cache-badge");

    // Estado de carregamento
    list.innerHTML =
      "<li class='violation-loading'>⏳ Analisando a página atual...</li>";
    if (scoreEl) {
      scoreEl.textContent = "—";
      scoreEl.className = "a11y-score-number";
    }
    if (badgeEl) badgeEl.classList.add("hidden");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Páginas internas do Chrome não podem ser analisadas
      if (
        !tab?.url ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("about:")
      ) {
        list.innerHTML =
          "<li class='violation-idle'>⚠️ Páginas internas do navegador não podem ser analisadas. Acesse um site externo.</li>";
        if (scoreEl) scoreEl.textContent = "N/A";
        return;
      }

      chrome.runtime.sendMessage(
        { action: "analyzeUrl", url: tab.url },
        (response) => {
          // Trata erros de runtime ou falha da API
          if (chrome.runtime.lastError || !response?.success) {
            const msg =
              response?.error ||
              chrome.runtime.lastError?.message ||
              "API inacessível";
            list.innerHTML = `<li class='violation-error'>❌ Erro ao analisar: ${msg}</li>`;
            return;
          }

          const acc = response.data?.accessibility;
          if (!acc) {
            list.innerHTML =
              "<li class='violation-error'>Dados de acessibilidade não disponíveis na resposta.</li>";
            return;
          }

          // --- Score ---
          if (scoreEl && acc.quality_rating !== undefined) {
            const rating = Number(acc.quality_rating);
            scoreEl.textContent = rating;
            scoreEl.className =
              "a11y-score-number " +
              (rating >= 80
                ? "score-good"
                : rating >= 50
                  ? "score-warn"
                  : "score-bad");
          }

          if (labelEl) {
            labelEl.textContent =
              acc.violations_count === 0
                ? "Nenhuma violação detectada ✔️"
                : `${acc.violations_count} violação(es) detectada(s)`;
          }

          // Badge de cache
          if (badgeEl && acc.from_cache) {
            badgeEl.classList.remove("hidden");
          }

          // --- Violations ---
          const violations = acc.violations;
          list.innerHTML = "";

          if (!Array.isArray(violations) || violations.length === 0) {
            list.innerHTML =
              "<li class='violation-empty'>✅ Parabéns! Nenhuma violação de acessibilidade detectada nesta página.</li>";
            return;
          }

          violations.forEach((v) => {
            const li = document.createElement("li");
            li.className = `violation-card impact-${v.impact || "minor"}`;

            // --- Cabeçalho: badge + referência WCAG ---
            const header = document.createElement("div");
            header.className = "violation-header";

            const badge = document.createElement("span");
            badge.className = `impact-badge badge-${v.impact || "minor"}`;
            badge.textContent = v.impact_pt || v.impact || "Desconhecido";

            const wcag = document.createElement("span");
            wcag.className = "violation-wcag";
            wcag.textContent = v.wcag_reference || "";

            header.appendChild(badge);
            header.appendChild(wcag);

            // --- Título ---
            const title = document.createElement("div");
            title.className = "violation-title";
            title.textContent = v.human_title || v.id;

            // --- Descrição ---
            const desc = document.createElement("div");
            desc.className = "violation-desc";
            desc.textContent = v.human_description || v.description || "";

            // --- Dica corretiva ---
            const tip = document.createElement("div");
            tip.className = "violation-tip";
            tip.textContent = `💡 ${v.human_tip || "Consulte a documentação para detalhes sobre esta regra."}`;

            // --- Rodapé: nós afetados + link de docs ---
            const footer = document.createElement("div");
            footer.className = "violation-footer";

            const nodes = document.createElement("span");
            nodes.className = "violation-nodes";
            nodes.textContent = `${v.nodes_count || 0} elemento(s) afetado(s)`;

            const link = document.createElement("a");
            link.className = "violation-link";
            link.href = v.helpUrl || "#";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Ver documentação";

            footer.appendChild(nodes);
            footer.appendChild(link);

            // Monta o card
            li.appendChild(header);
            li.appendChild(title);
            li.appendChild(desc);
            li.appendChild(tip);
            li.appendChild(footer);

            list.appendChild(li);
          });
        },
      );
    } catch (err) {
      list.innerHTML = `<li class='violation-error'>❌ Erro inesperado: ${err.message}</li>`;
    }
  }

  // --- AÇÃO: DENUNCIAR ---
  const reportModal = document.getElementById("report-modal");
  const reportReasonInput = document.getElementById("report-reason");
  const reportDomainText = document.getElementById("report-domain");
  let currentTabForReport = null;

  document.getElementById("btn-report").addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab || !tab.url)
        return alert("Não é possível identificar a URL desta aba.");

      currentTabForReport = tab;
      reportDomainText.textContent = "Domínio: " + new URL(tab.url).hostname;
      reportReasonInput.value = "";
      reportModal.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      alert("Erro ao identificar a aba para denúncia.");
    }
  });

  document.getElementById("btn-cancel-report").addEventListener("click", () => {
    reportModal.classList.add("hidden");
    currentTabForReport = null;
  });

  document
    .getElementById("btn-confirm-report")
    .addEventListener("click", async () => {
      if (!currentTabForReport) return;

      const reason = reportReasonInput.value.trim();
      if (!reason) {
        alert("Por favor, descreva o motivo da denúncia.");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/reports`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({
            url: currentTabForReport.url,
            report_type: "other",
            comment: reason,
          }),
        });

        if (res.ok) {
          alert("Página denunciada com sucesso!");
          reportModal.classList.add("hidden");
          loadRankings(); // Atualiza o ranking logo após a denúncia
        } else {
          alert("Falha ao enviar denúncia. Verifique sua conexão.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao processar a denúncia.");
      }
    });

  // Inicializa
  updateView();
});

async function loginLocal() {
  const API_URL =
    "https://sentinela-api-114594031602.southamerica-east1.run.app";
  const storage = await chrome.storage.local.get(["jwtToken"]);
  let jwtToken = storage.jwtToken;

  const email = document.getElementById("email").value;

  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Credenciais inválidas");

      return;
    }

    await chrome.storage.local.set({
      jwtToken: data.token,
    });

    // Bug #6 — window.location.reload() tem comportamento indefinido em popup
    // de extensão. Usa updateView() que foi criada exatamente para essa troca.
    jwtToken = data.token;
    updateView();
  } catch (error) {
    console.error(error);

    alert("Erro ao realizar login");
  }
}
