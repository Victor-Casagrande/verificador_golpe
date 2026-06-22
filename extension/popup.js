document.addEventListener("DOMContentLoaded", async () => {
  const API_URL =
    "https://sentinela-api-114594031602.southamerica-east1.run.app";

  const storage = await chrome.storage.local.get(["jwtToken"]);
  let jwtToken = storage.jwtToken;

  // ---- VIEWS ----
  const loginView     = document.getElementById("login-view");
  const registerView  = document.getElementById("register-view");
  const dashboardView = document.getElementById("dashboard-view");

  // ---- UTILITY ----
  function showView(view) {
    [loginView, registerView, dashboardView].forEach(v => v.classList.add("hidden"));
    view.classList.remove("hidden");
  }

  function updateView() {
    if (jwtToken) {
      showView(dashboardView);
      loadStats();
      loadCurrentUrl();
    } else {
      showView(loginView);
    }
  }

  // ---- CARREGAR URL DA ABA ATIVA ----
  async function loadCurrentUrl() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const urlDisplay = document.getElementById("current-url-display");
      if (tab?.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
        urlDisplay.textContent = tab.url;
      } else {
        urlDisplay.textContent = "Nenhuma página externa detectada";
      }
    } catch {
      document.getElementById("current-url-display").textContent = "—";
    }
  }

  // ---- CARREGAR ESTATÍSTICAS ----
  async function loadStats() {
    try {
      const res = await fetch(`${API_URL}/users/history`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });

      if (res.status === 401) {
        await chrome.storage.local.remove("jwtToken");
        jwtToken = null;
        updateView();
        return;
      }

      if (!res.ok) return; // falha silenciosa — stats ficam em 0

      const data = await res.json();
      const total = data.length;
      const safe  = data.filter(i => i.status === "safe").length;

      document.getElementById("total-checks").textContent  = total;
      document.getElementById("safe-checks").textContent   = safe;
      document.getElementById("danger-checks").textContent = total - safe;
    } catch {
      // sem conexão ou erro — mantém 0 nos cards silenciosamente
    }
  }

  // ---- LINK PARA CADASTRO ----
  document.getElementById("link-to-login").addEventListener("click", () => {
    showView(loginView);
  });

  // ---- BOTÃO ENTRAR (link para cadastro na tela de login)
  // Nota: o Figma não tem aba de cadastro no popup; adicionamos view separada
  // acessível via link externo, mas mantemos o fluxo de login principal.

  // ---- AUTENTICAÇÃO: GOOGLE / GITHUB ----
  document.getElementById("btn-google").addEventListener("click", () => {
    chrome.tabs.create({ url: `${API_URL}/auth/oauth/google` });
  });

  document.getElementById("btn-github").addEventListener("click", () => {
    chrome.tabs.create({ url: `${API_URL}/auth/oauth/github` });
  });

  // ---- AUTENTICAÇÃO: LOGIN LOCAL ----
  document.getElementById("btn-login-local").addEventListener("click", async () => {
    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      alert("Preencha email e senha.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Credenciais inválidas");
        return;
      }
      await chrome.storage.local.set({ jwtToken: data.token });
      jwtToken = data.token;
      updateView();
    } catch (error) {
      console.error(error);
      alert("Erro ao realizar login. Verifique sua conexão.");
    }
  });

  // ---- AUTENTICAÇÃO: CADASTRO LOCAL ----
  document.getElementById("btn-register-local").addEventListener("click", async () => {
    const name     = document.getElementById("reg-name").value.trim();
    const email    = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!name || !email || !password) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Erro ao cadastrar.");
        return;
      }
      await chrome.storage.local.set({ jwtToken: data.token });
      jwtToken = data.token;
      updateView();
    } catch (error) {
      console.error(error);
      alert("Erro ao realizar cadastro. Verifique sua conexão.");
    }
  });

  // ---- LOGOUT ----
  document.getElementById("btn-logout").addEventListener("click", async () => {
    await chrome.storage.local.remove("jwtToken");
    jwtToken = null;
    updateView();
  });

  // ---- OAuth via postMessage ----
  window.addEventListener("message", async (event) => {
    let expectedOrigin;
    try { expectedOrigin = new URL(API_URL).origin; } catch { return; }
    if (event.origin !== expectedOrigin) return;

    if (event.data?.source === "sentinela-oauth") {
      const token = event.data.token;
      if (!token || typeof token !== "string") return;
      await chrome.storage.local.set({ jwtToken: token });
      jwtToken = token;
      updateView();
    }
  });

  // ---- AÇÃO: VERIFICAR URL ----
  document.getElementById("btn-verify").addEventListener("click", async () => {
    const resultEl = document.getElementById("verify-result");
    const a11yEl   = document.getElementById("a11y-result");

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || tab.url.startsWith("chrome://")) {
        resultEl.textContent = "⚠️ Esta página não pode ser analisada.";
        resultEl.className = "verify-result status-loading";
        resultEl.classList.remove("hidden");
        return;
      }

      resultEl.textContent = "⏳ Analisando a URL...";
      resultEl.className = "verify-result status-loading";
      resultEl.classList.remove("hidden");
      a11yEl.classList.add("hidden");

      chrome.runtime.sendMessage({ action: "analyzeUrl", url: tab.url }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          resultEl.textContent = `❌ Erro: ${response?.error || chrome.runtime.lastError?.message || "API inacessível"}`;
          resultEl.className = "verify-result status-danger";
          return;
        }

        const sec = response.data?.security;
        const acc = response.data?.accessibility;

        // --- Segurança ---
        if (sec?.status === "danger") {
          document.querySelector(".app-container").classList.add("hidden");
          document.getElementById("danger-overlay").classList.remove("hidden");
        } else {
          document.querySelector(".app-container").classList.remove("hidden");
          document.getElementById("danger-overlay").classList.add("hidden");

          if (sec?.status === "safe") {
            resultEl.textContent = "✅ URL segura — nenhuma ameaça detectada.";
            resultEl.className = "verify-result status-safe";
          } else {
            resultEl.textContent = "⚠️ Verificação concluída.";
            resultEl.className = "verify-result status-loading";
          }
        }

        // --- Acessibilidade ---
        if (acc) {
          const scoreEl   = document.getElementById("a11y-score-value");
          const labelEl   = document.getElementById("a11y-score-label");
          const listEl    = document.getElementById("accessibility-violations-list");

          const rating = Number(acc.quality_rating ?? "—");
          scoreEl.textContent = isNaN(rating) ? "—" : rating;
          scoreEl.style.color = rating >= 80 ? "var(--success)" : rating >= 50 ? "var(--warning)" : "var(--danger)";

          labelEl.textContent = acc.violations_count === 0
            ? "Sem violações ✔️"
            : `${acc.violations_count} violação(ões)`;

          listEl.innerHTML = "";
          const violations = acc.violations;
          if (!Array.isArray(violations) || violations.length === 0) {
            listEl.innerHTML = "<li class='violation-empty'>✅ Nenhuma violação detectada.</li>";
          } else {
            violations.forEach(v => {
              const li = document.createElement("li");
              li.className = `violation-card impact-${v.impact || "minor"}`;

              const header = document.createElement("div");
              header.className = "violation-header";
              const badge = document.createElement("span");
              badge.className = `impact-badge badge-${v.impact || "minor"}`;
              badge.textContent = v.impact_pt || v.impact || "—";
              const wcag = document.createElement("span");
              wcag.className = "violation-wcag";
              wcag.textContent = v.wcag_reference || "";
              header.appendChild(badge);
              header.appendChild(wcag);

              const title = document.createElement("div");
              title.className = "violation-title";
              title.textContent = v.human_title || v.id;

              const desc = document.createElement("div");
              desc.className = "violation-desc";
              desc.textContent = v.human_description || v.description || "";

              const tip = document.createElement("div");
              tip.className = "violation-tip";
              tip.textContent = `💡 ${v.human_tip || "Consulte a documentação."}`;

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

              li.appendChild(header);
              li.appendChild(title);
              li.appendChild(desc);
              li.appendChild(tip);
              li.appendChild(footer);
              listEl.appendChild(li);
            });

            // Botão para inspecionar na página (highlight visual)
            const btnInspect = document.createElement("button");
            btnInspect.id = "btn-a11y-inspect";
            btnInspect.textContent = "🔍 Inspecionar na página";
            btnInspect.style.cssText = [
              "margin-top:10px",
              "width:100%",
              "padding:9px",
              "border-radius:8px",
              "border:1px solid #30363d",
              "background:#0d1117",
              "color:#00d8ff",
              "font-weight:600",
              "font-size:12px",
              "cursor:pointer",
            ].join(";");

            btnInspect.addEventListener("click", async () => {
              try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) return;
                // Envia as violações completas (com nodes/seletores) para o content.js
                chrome.tabs.sendMessage(
                  tab.id,
                  { action: "highlightA11yViolations", violations },
                  (res) => {
                    if (chrome.runtime.lastError || !res?.success) {
                      btnInspect.textContent = "⚠️ Content script não disponível";
                    } else {
                      btnInspect.textContent = `✅ ${res.highlighted} elem. destacados na página`;
                      btnInspect.disabled = true;
                    }
                  }
                );
              } catch (err) {
                console.error(err);
              }
            });

            a11yEl.appendChild(btnInspect);
          }

          a11yEl.classList.remove("hidden");
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  // ---- AÇÃO: DENUNCIAR ----
  const reportModal       = document.getElementById("report-modal");
  const reportReasonInput = document.getElementById("report-reason");
  const reportDomainText  = document.getElementById("report-domain");
  let currentTabForReport = null;

  document.getElementById("btn-report").addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) return alert("Não foi possível identificar a URL desta aba.");
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
    if (!reason) { alert("Descreva o motivo da denúncia."); return; }

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
      } else {
        alert("Falha ao enviar denúncia. Verifique sua conexão.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar a denúncia.");
    }
  });

  // ---- OVERLAY DE PERIGO ----
  document.getElementById("btn-danger-leave").addEventListener("click", () => {
    chrome.tabs.update({ url: "https://verificador-golpe.vercel.app" });
  });

  document.getElementById("btn-danger-ignore").addEventListener("click", () => {
    document.getElementById("danger-overlay").classList.add("hidden");
    document.querySelector(".app-container").classList.remove("hidden");
  });

  // ---- INICIALIZA ----
  updateView();
});
