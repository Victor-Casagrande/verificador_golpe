document.addEventListener("DOMContentLoaded", async () => {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");

  // Obter URL Base e Token do Storage
  const storage = await chrome.storage.local.get(["API_URL", "jwtToken"]);
  const API_URL = storage.API_URL || "http://localhost:3000";
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
    chrome.tabs.create({ url: `${API_URL}/auth/oauth/google`,});
  });

  document.getElementById("btn-github").addEventListener("click", () => {
  chrome.tabs.create({
    url: `${API_URL}/auth/oauth/github`,
  });
});

  document.getElementById("btn-login-local").addEventListener("click", loginLocal);

  document.getElementById("btn-logout").addEventListener("click", async () => {
    await chrome.storage.local.remove("jwtToken");
    jwtToken = null;
    updateView();
  });

  window.addEventListener(
  "message",
  async (event) => {

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

    if (
      event.data?.source ===
      "sentinela-oauth"
    ) {

      const token =
        event.data.token;

      if (!token || typeof token !== "string") return;

      await chrome.storage.local.set({
        jwtToken: token
      });

      jwtToken = token;

      updateView();
    }
  }
);

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

      const safe = data.filter(
        item => item.status === "safe"
      ).length;

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
      const res = await fetch(`${API_URL}/rankings/accessibility/worst?limit=10`);
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

  document.getElementById("btn-confirm-report").addEventListener("click", async () => {
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
        body: JSON.stringify({ url: currentTabForReport.url, report_type: "other", comment: reason }),
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
  const storage = await chrome.storage.local.get("API_URL");
  const API_URL = storage.API_URL || "http://localhost:3000";

  const email =
    document.getElementById("email").value;

  const password =
    document.getElementById("password").value;

  try {

    const response =
      await fetch(`${API_URL}/auth/login`, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email,
          password
        })
      });

    const data =
      await response.json();

    if (!response.ok) {

      alert(
        data.message ||
        "Credenciais inválidas"
      );

      return;
    }

    await chrome.storage.local.set({
      jwtToken: data.token
    });

    // Bug #6 — window.location.reload() tem comportamento indefinido em popup
    // de extensão. Usa updateView() que foi criada exatamente para essa troca.
    jwtToken = data.token;
    updateView();

  } catch (error) {

    console.error(error);

    alert(
      "Erro ao realizar login"
    );
  }
}