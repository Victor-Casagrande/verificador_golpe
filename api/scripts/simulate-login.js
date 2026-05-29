#!/usr/bin/env node
/**
 * Simulação ponta-a-ponta do fluxo de autenticação contra a API em execução.
 *
 * Fluxos suportados:
 *   1. Login local com e-mail + senha (registra automaticamente se ainda não existe).
 *   2. OAuth GitHub / Google: imprime a URL do provedor e aguarda o usuário colar
 *      a URL final do callback para extrair o token (ou, se OAUTH_SUCCESS_REDIRECT
 *      estiver configurado, o token vem direto na query string).
 *
 * Modos:
 *   - Interativo:  npm run login:simulate
 *   - Não-interativo:
 *       npm run login:simulate -- --email=foo@bar.com --password=senha123 --name="Foo"
 *   - OAuth:       npm run login:simulate -- --oauth=github
 *
 * Após o login, valida o token chamando GET /users/history.
 */

require("dotenv").config();
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

const BASE_URL = (
  process.argv.find((a) => a.startsWith("--base-url="))?.split("=")[1] ||
  process.env.API_BASE_URL ||
  `http://localhost:${process.env.PORT || 3000}`
).replace(/\/$/, "");

const flag = (name) => {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
};

const has = (name) => process.argv.includes(`--${name}`);

const askPrompt = async (rl, label, { mask = false } = {}) => {
  if (!mask) return (await rl.question(label)).trim();
  // Mascaramento simples (não tem suporte nativo no readline; mostramos asterisco apenas no fim)
  process.stdout.write(label);
  return new Promise((resolve) => {
    const onData = (data) => {
      const value = data.toString().replace(/\r?\n/g, "");
      stdin.removeListener("data", onData);
      resolve(value.trim());
    };
    stdin.once("data", onData);
  });
};

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

const checkApiHealth = async () => {
  try {
    const { status, body } = await get("/api/status");
    if (status !== 200) {
      console.error(`API respondeu ${status}. Verifique se o servidor está rodando em ${BASE_URL}.`);
      process.exit(1);
    }
    if (body?.dependencies?.database && !body.dependencies.database.ok) {
      console.warn("[aviso] Banco em modo degradado — registro/login podem falhar.");
    }
  } catch (err) {
    console.error(`Não foi possível alcançar ${BASE_URL}. Execute 'npm run dev' antes.`);
    console.error(`Detalhe: ${err.message}`);
    process.exit(1);
  }
};

const loginOrRegister = async ({ name, email, password, autoRegister }) => {
  console.log(`\n[1] Tentando login em ${BASE_URL}/auth/login`);
  let { status, body } = await post("/auth/login", { email, password });

  if (status === 200) {
    console.log("    ✓ Login bem-sucedido.");
    return body;
  }

  if (status !== 401 && status !== 404) {
    console.error(`    ✗ Falha inesperada (HTTP ${status}):`, body || "(sem corpo)");
    process.exit(1);
  }

  if (!autoRegister) {
    console.error("    ✗ Login falhou (credenciais inválidas ou usuário inexistente).");
    process.exit(1);
  }

  if (!name) {
    console.error("    ✗ Usuário não existe e --name não foi informado.");
    process.exit(1);
  }

  console.log("\n[2] Usuário inexistente — registrando via POST /auth/register");
  ({ status, body } = await post("/auth/register", { name, email, password }));

  if (status === 201) {
    console.log("    ✓ Usuário criado e autenticado.");
    return body;
  }

  console.error(`    ✗ Registro falhou (HTTP ${status}):`, body || "(sem corpo)");
  process.exit(1);
};

const validateToken = async (token) => {
  console.log("\n[3] Validando token em GET /users/history");
  const { status, body } = await get("/users/history?limit=1", token);
  if (status === 200) {
    console.log(`    ✓ Token aceito. total_no_historico=${body?.total ?? "?"}`);
  } else {
    console.warn(`    ⚠ /users/history respondeu ${status}:`, body || "(sem corpo)");
  }
};

const runLocalFlow = async (rl) => {
  let email = flag("email");
  let password = flag("password");
  let name = flag("name");
  const noRegister = has("no-register");

  if (!email) email = await askPrompt(rl, "E-mail: ");
  if (!password) password = await askPrompt(rl, "Senha:  ", { mask: true });

  const auth = await loginOrRegister({
    name,
    email,
    password,
    autoRegister: !noRegister && Boolean(name || !flag("email")),
  });

  if (!auth?.token) {
    console.error("\nResposta sem token. Abortando.");
    process.exit(1);
  }

  console.log("\nToken JWT:");
  console.log(auth.token);
  console.log("\nUso:");
  console.log(`  Authorization: Bearer ${auth.token}`);

  await validateToken(auth.token);
};

const runOAuthFlow = async (rl, provider) => {
  console.log(`\n[1] Verificando se ${provider} está configurado no servidor`);
  const { status, body } = await get("/auth/oauth/providers");
  if (status !== 200) {
    console.error(`    ✗ Não foi possível listar provedores (HTTP ${status}).`);
    process.exit(1);
  }
  const found = body?.providers?.find((p) => p.id === provider);
  if (!found) {
    console.error(`    ✗ Provedor ${provider} não está configurado. Defina ${provider.toUpperCase()}_CLIENT_ID/SECRET/CALLBACK_URL no .env.`);
    process.exit(1);
  }
  console.log(`    ✓ ${found.name} configurado.`);

  const authorizeUrl = `${BASE_URL}/auth/oauth/${provider}`;
  console.log("\n[2] Abra esta URL no navegador para iniciar o login:");
  console.log(`    ${authorizeUrl}`);
  console.log("\n[3] Após autorizar, o navegador será redirecionado para o callback.");
  console.log("    Sem OAUTH_SUCCESS_REDIRECT: a resposta vem em JSON na própria página.");
  console.log("    Com OAUTH_SUCCESS_REDIRECT: o token aparece na query string (?token=...).");

  const pasted = await askPrompt(
    rl,
    "\nCole aqui a URL final do callback OU o JSON de resposta OU apenas o token: ",
  );

  let token = null;
  if (pasted.startsWith("http")) {
    try {
      const u = new URL(pasted);
      token = u.searchParams.get("token");
    } catch {
      /* ignore */
    }
  }
  if (!token && pasted.startsWith("{")) {
    try {
      token = JSON.parse(pasted).token;
    } catch {
      /* ignore */
    }
  }
  if (!token && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(pasted)) {
    token = pasted;
  }

  if (!token) {
    console.error("\n    ✗ Não consegui extrair o token. Verifique o que foi colado.");
    process.exit(1);
  }

  console.log("\n    ✓ Token extraído:");
  console.log(`    ${token}`);
  await validateToken(token);
};

const main = async () => {
  console.log(`Sentinela — simulação de login\nAPI: ${BASE_URL}\n`);
  await checkApiHealth();

  const oauthProvider = flag("oauth");
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    if (oauthProvider) {
      await runOAuthFlow(rl, oauthProvider);
    } else {
      await runLocalFlow(rl);
    }
  } finally {
    rl.close();
  }

  console.log("\nConcluído.");
};

main().catch((err) => {
  console.error("\nErro:", err.message);
  process.exit(1);
});
