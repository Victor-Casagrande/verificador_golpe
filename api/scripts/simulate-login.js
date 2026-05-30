#!/usr/bin/env node
/**
 * Simulação ponta-a-ponta dos 3 fluxos de autenticação contra a API em
 * execução. Roda em um loop interativo de terminal: o usuário escolhe o
 * fluxo no menu, preenche os campos solicitados e o script executa todo o
 * processo (auth → token → validação contra GET /users/history).
 *
 * Fluxos suportados:
 *   [1] LOCAL    — e-mail + senha (com fallback de auto-registro)
 *   [2] GITHUB   — Authorization Code + state CSRF + troca por token + perfil
 *   [3] GOOGLE   — idem GitHub, com scopes OpenID Connect e validação de
 *                  verified_email no profile
 *
 * Modos de execução:
 *   Interativo (recomendado):
 *     npm run login:simulate
 *
 *   Não-interativo (CI / scripts), mantendo compat com a versão antiga:
 *     npm run login:simulate -- --flow=local --email=foo@bar.com --password=senha123 --name=Foo
 *     npm run login:simulate -- --flow=github
 *     npm run login:simulate -- --flow=google --no-open
 *
 * Flags adicionais:
 *   --base-url=http://outro:3000   API alvo (default: PORT do .env ou 3000)
 *   --no-open                      Não tenta abrir o navegador automaticamente
 *   --once                         Executa um fluxo e sai (sem loop de menu)
 */

// `dotenv` é opcional aqui: quando o script roda dentro de `api/` com
// node_modules instalado, ele carrega o .env. Fora disso (CI minimalista),
// o usuário pode exportar PORT/API_BASE_URL manualmente.
try {
  require("dotenv").config();
} catch {
  /* dotenv ausente — seguimos com process.env "puro" */
}

const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { spawn } = require("node:child_process");

/* ----------------------------- CLI helpers ------------------------------ */

const flag = (name) => {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
};

const has = (name) => process.argv.includes(`--${name}`);

const BASE_URL = (
  flag("base-url") ||
  process.env.API_BASE_URL ||
  `http://localhost:${process.env.PORT || 3000}`
).replace(/\/$/, "");

const NO_OPEN = has("no-open");
const ONCE = has("once");

/**
 * Lê uma linha simples do terminal (com eco normal).
 */
const ask = async (rl, label) => (await rl.question(label)).trim();

/**
 * Lê uma senha do terminal com máscara real usando o stdin em raw mode.
 * Funciona em Windows, macOS e Linux. Pressionar Ctrl+C aborta o processo.
 *
 * Fechamos temporariamente o readline para evitar concorrência por stdin
 * e o reativamos depois.
 */
const askPassword = (rl, label) =>
  new Promise((resolve, reject) => {
    rl.pause();
    process.stdout.write(label);
    const wasRaw = stdin.isRaw;
    try {
      stdin.setRawMode(true);
    } catch {
      /* terminais que não suportam raw mode (CI sem TTY) caem no fallback */
      stdin.resume();
      stdin.once("data", (data) => {
        const value = data.toString().replace(/\r?\n/g, "").trim();
        rl.resume();
        resolve(value);
      });
      return;
    }
    stdin.resume();
    stdin.setEncoding("utf8");
    let password = "";

    const onData = (char) => {
      const c = String(char);
      if (c === "\r" || c === "\n" || c === "\u0004") {
        stdin.removeListener("data", onData);
        try {
          stdin.setRawMode(wasRaw);
        } catch {
          /* ignore */
        }
        process.stdout.write("\n");
        rl.resume();
        resolve(password);
      } else if (c === "\u0003") {
        stdin.removeListener("data", onData);
        try {
          stdin.setRawMode(wasRaw);
        } catch {
          /* ignore */
        }
        process.stdout.write("\n^C\n");
        reject(new Error("Interrompido pelo usuário (Ctrl+C)."));
      } else if (c === "\u007f" || c === "\b") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else if (c >= " ") {
        password += c;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });

/**
 * Tenta abrir uma URL no navegador padrão do sistema.
 * Falha silenciosamente em ambientes sem GUI — o usuário sempre tem o link
 * impresso para copiar manualmente.
 */
const openInBrowser = (url) => {
  if (NO_OPEN) return false;
  try {
    const cmd =
      process.platform === "win32"
        ? "cmd"
        : process.platform === "darwin"
        ? "open"
        : "xdg-open";
    const args =
      process.platform === "win32" ? ["/c", "start", "", url] : [url];
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
    return true;
  } catch {
    return false;
  }
};

/* ------------------------------ HTTP layer ------------------------------ */

const post = async (path, body, token = null) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* HTML/erro inesperado */
  }
  return { status: res.status, body: json, raw: text };
};

const get = async (path, token = null) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, body: json, raw: text };
};

/* ---------------------------- Diagnósticos ------------------------------ */

const checkApiHealth = async () => {
  try {
    const { status, body } = await get("/api/status");
    if (status !== 200) {
      console.error(
        `API respondeu ${status}. Verifique se o servidor está rodando em ${BASE_URL}.`,
      );
      process.exit(1);
    }
    const dbOk = body?.dependencies?.database?.ok;
    if (dbOk === false) {
      console.warn(
        "[aviso] Banco em modo degradado — registro/login podem falhar.",
      );
    }
    return { dbOk: dbOk !== false };
  } catch (err) {
    console.error(
      `Não foi possível alcançar ${BASE_URL}. Execute 'npm run dev' antes.`,
    );
    console.error(`Detalhe: ${err.message}`);
    process.exit(1);
  }
};

/**
 * Consulta /auth/oauth/providers para descobrir quais provedores OAuth
 * estão configurados no servidor. Usado para exibir o estado no menu e
 * para falhar cedo quando o usuário escolhe um provedor sem credenciais.
 */
const fetchOAuthProviders = async () => {
  try {
    const { status, body } = await get("/auth/oauth/providers");
    if (status !== 200 || !Array.isArray(body?.providers)) return [];
    return body.providers.map((p) => p.id);
  } catch {
    return [];
  }
};

const validateToken = async (token) => {
  console.log("\n→ Validando token em GET /users/history?limit=1");
  const { status, body } = await get("/users/history?limit=1", token);
  if (status === 200) {
    console.log(`  OK — total no histórico do usuário: ${body?.total ?? "?"}`);
    return true;
  }
  console.warn(`  Falha (HTTP ${status}):`, body || "(sem corpo)");
  return false;
};

/* ----------------------------- Fluxos auth ------------------------------ */

/**
 * Tenta login local; se 401, oferece registrar imediatamente (no modo
 * interativo) ou cria automaticamente quando `--name` foi passado.
 */
const loginOrRegister = async (rl, { name, email, password, interactive }) => {
  console.log(`\n[1] POST ${BASE_URL}/auth/login`);
  let { status, body } = await post("/auth/login", { email, password });

  if (status === 200) {
    console.log("    ✓ Login bem-sucedido.");
    return body;
  }

  if (status !== 401 && status !== 404) {
    throw new Error(
      `Falha inesperada no login (HTTP ${status}): ${JSON.stringify(body || {})}`,
    );
  }

  // 401/404 → conta inexistente ou senha errada.
  if (interactive && !name) {
    const proceed = (
      await ask(rl, "    Conta não encontrada. Deseja registrar agora? [s/N] ")
    ).toLowerCase();
    if (proceed !== "s" && proceed !== "sim" && proceed !== "y") {
      throw new Error("Cancelado pelo usuário.");
    }
    name = await ask(rl, "    Nome completo: ");
    if (!name || name.length < 2) {
      throw new Error("Nome inválido (mínimo 2 caracteres).");
    }
  }

  if (!name) {
    throw new Error("Conta não existe e --name não foi informado.");
  }

  console.log(`\n[2] POST ${BASE_URL}/auth/register`);
  ({ status, body } = await post("/auth/register", { name, email, password }));

  if (status === 201) {
    console.log("    ✓ Usuário criado e autenticado.");
    return body;
  }
  throw new Error(
    `Registro falhou (HTTP ${status}): ${JSON.stringify(body || {})}`,
  );
};

const runLocalFlow = async (rl) => {
  console.log("\n──── Fluxo LOCAL (e-mail + senha) ────");
  let email = flag("email");
  let password = flag("password");
  let name = flag("name");
  const interactive = !email || !password;

  while (!email) {
    email = await ask(rl, "E-mail: ");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log("    E-mail inválido. Tente novamente.");
      email = null;
    }
  }
  while (!password) {
    password = await askPassword(rl, "Senha (oculta): ");
    if (password.length < 6) {
      console.log("    Senha deve ter pelo menos 6 caracteres.");
      password = null;
    }
  }

  const auth = await loginOrRegister(rl, {
    name,
    email,
    password,
    interactive,
  });

  if (!auth?.token) {
    throw new Error("Resposta sem token.");
  }

  console.log("\nToken JWT:");
  console.log(auth.token);
  console.log("\nUso:");
  console.log(`  Authorization: Bearer ${auth.token}`);

  await validateToken(auth.token);
};

/**
 * Conduz o fluxo OAuth (GitHub ou Google) ponta-a-ponta:
 *   1. Confirma que o provedor está configurado no servidor.
 *   2. Imprime/abre a URL de autorização.
 *   3. Aguarda o usuário colar a URL de callback final, o JSON da resposta
 *      ou apenas o token bruto.
 *   4. Extrai o JWT e valida contra /users/history.
 */
const runOAuthFlow = async (rl, provider) => {
  console.log(`\n──── Fluxo OAUTH ${provider.toUpperCase()} ────`);

  console.log(`\n[1] GET ${BASE_URL}/auth/oauth/providers — checando configuração`);
  const configured = await fetchOAuthProviders();
  if (!configured.includes(provider)) {
    throw new Error(
      `Provedor "${provider}" não está configurado. ` +
        `Defina ${provider.toUpperCase()}_CLIENT_ID, ${provider.toUpperCase()}_CLIENT_SECRET ` +
        `e ${provider.toUpperCase()}_CALLBACK_URL no .env raiz e reinicie a API.`,
    );
  }
  console.log(`    ✓ ${provider} configurado no servidor.`);

  const authorizeUrl = `${BASE_URL}/auth/oauth/${provider}`;
  console.log("\n[2] URL de autorização:");
  console.log(`    ${authorizeUrl}`);

  const opened = openInBrowser(authorizeUrl);
  if (opened) {
    console.log("    (tentei abrir o navegador automaticamente)");
  }

  console.log("\n[3] Faça o login no navegador. Quando o callback retornar:");
  console.log("    • Se OAUTH_SUCCESS_REDIRECT estiver ativo (default), você verá");
  console.log("      a página /auth/success com o JWT visível e botão 'Copiar'.");
  console.log("    • Caso contrário, o callback devolve um JSON com {token, user}.");
  console.log("\n    Cole abaixo: URL final, JSON completo, ou só o JWT.");

  const pasted = await ask(rl, "→ ");

  let token = null;
  if (pasted.startsWith("http")) {
    try {
      const u = new URL(pasted);
      token = u.searchParams.get("token");
    } catch {
      /* não era URL válida */
    }
  }
  if (!token && pasted.startsWith("{")) {
    try {
      token = JSON.parse(pasted).token;
    } catch {
      /* não era JSON válido */
    }
  }
  if (!token && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(pasted)) {
    token = pasted;
  }

  if (!token) {
    throw new Error(
      "Não consegui extrair o JWT do que foi colado. " +
        "Esperado: URL com ?token=..., JSON com {token: ...}, ou o JWT puro.",
    );
  }

  console.log("\n    ✓ Token extraído:");
  console.log(`    ${token}`);
  await validateToken(token);
};

/* ------------------------------ Menu loop ------------------------------- */

const renderMenu = (configuredProviders) => {
  const tag = (id) =>
    configuredProviders.includes(id) ? "configurado" : "NÃO configurado";
  console.log("");
  console.log("Sentinela — simulação de login");
  console.log(`  API alvo: ${BASE_URL}`);
  console.log("  ----------------------------------------------------------");
  console.log("  [1] LOCAL    — e-mail + senha (registra se não existir)");
  console.log(`  [2] GITHUB   — OAuth (${tag("github")})`);
  console.log(`  [3] GOOGLE   — OAuth (${tag("google")})`);
  console.log("  [0] Sair");
};

const promptMenuChoice = async (rl) => {
  while (true) {
    const choice = (await ask(rl, "Escolha [0-3]: ")).trim();
    switch (choice) {
      case "1":
        return "local";
      case "2":
        return "github";
      case "3":
        return "google";
      case "0":
      case "q":
      case "sair":
        return null;
      default:
        console.log("Opção inválida. Digite 0, 1, 2 ou 3.");
    }
  }
};

const resolveFlowFromFlag = () => {
  const f = (flag("flow") || flag("oauth") || "").toLowerCase();
  if (f === "local" || f === "github" || f === "google") return f;
  if (flag("oauth") === "github" || flag("oauth") === "google") {
    return flag("oauth");
  }
  return null;
};

/* --------------------------------- main --------------------------------- */

const main = async () => {
  console.log(`Sentinela — simulação de login (API: ${BASE_URL})`);
  await checkApiHealth();

  const initialFlow = resolveFlowFromFlag();

  // Sem TTY (pipe/CI) e sem --flow=... explícito, não há como mostrar menu
  // interativo. Abortamos com instrução clara em vez de erros opacos do readline.
  if (!stdin.isTTY && !initialFlow) {
    console.error(
      "\nstdin não é um TTY interativo. Use --flow=local|github|google " +
        "(opcionalmente com --email/--password/--name) para modo não-interativo.",
    );
    process.exit(2);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    do {
      const providers = await fetchOAuthProviders();
      let flow = initialFlow;

      if (!flow) {
        renderMenu(providers);
        flow = await promptMenuChoice(rl);
      }

      if (!flow) {
        console.log("\nAté mais.");
        return;
      }

      try {
        if (flow === "local") await runLocalFlow(rl);
        else await runOAuthFlow(rl, flow);
        console.log("\n✓ Fluxo concluído.");
      } catch (err) {
        console.error(`\n✗ Erro no fluxo "${flow}": ${err.message}`);
      }

      if (initialFlow || ONCE) return;

      const again = (
        await ask(rl, "\nExecutar outro fluxo? [S/n] ")
      ).toLowerCase();
      if (again === "n" || again === "nao" || again === "não") {
        console.log("\nAté mais.");
        return;
      }
    } while (true);
  } finally {
    rl.close();
  }
};

main().catch((err) => {
  console.error("\nErro fatal:", err.message);
  process.exit(1);
});
