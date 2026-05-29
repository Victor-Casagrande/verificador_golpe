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
  document.getElementById("btn-login").addEventListener("click", () => {
    // Abre a rota do backend que inicia o OAuth do Google
    chrome.tabs.create({ url: `${API_URL}/auth/google` });
  });

  document.getElementById("btn-logout").addEventListener("click", async () => {
    await chrome.storage.local.remove("jwtToken");
    jwtToken = null;
    updateView();
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
      const res = await fetch(`${API_URL}/rankings`);
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
  document.getElementById("btn-report").addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab || !tab.url)
        return alert("Não é possível identificar a URL desta aba.");

      const reason = prompt(
        "Descreva rapidamente o motivo da denúncia para o domínio: " +
          new URL(tab.url).hostname,
      );
      if (!reason) return;

      const res = await fetch(`${API_URL}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ url: tab.url, reason }),
      });

      if (res.ok) {
        alert("Página denunciada com sucesso!");
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