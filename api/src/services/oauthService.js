const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");
const oauthRepository = require("../repositories/oauthRepository");
const AppError = require("../utils/AppError");
const { signToken } = require("../utils/jwt");
const {
  SUPPORTED_PROVIDERS,
  providerConfig,
  getProviderEnv,
  isProviderConfigured,
  getConfiguredProviders,
} = require("../config/oauthProviders");
const fetchGithubProfile = require("../oauth/fetchGithubProfile");
const fetchGoogleProfile = require("../oauth/fetchGoogleProfile");

/**
 * Tabela de profile-fetchers por provedor. Cada fetcher recebe o access_token
 * e devolve `{ providerUserId, email, name }` normalizado.
 */
const profileFetchers = {
  github: fetchGithubProfile,
  google: fetchGoogleProfile,
};

/**
 * Segredo usado para assinar o parâmetro `state` do OAuth (CSRF protection).
 * Reusa o `JWT_SECRET` para evitar mais uma variável de ambiente; o fallback
 * cobre apenas inicialização local sem `.env`.
 */
const getOAuthStateSecret = () => process.env.JWT_SECRET || "oauth-state-dev";

/**
 * Gera o parâmetro `state` que será enviado ao provedor e devolvido no callback.
 *
 * Estratégia: encodamos `{ purpose, provider, nonce }` em um JWT de curta
 * duração (10 min). O `nonce` aleatório é repassado também como `nonce` na
 * URL de autorização do Google (OpenID Connect) para que o ID Token retornado
 * possa ser correlacionado com esta sessão de login específica.
 */
const createOAuthState = (provider) => {
  const nonce = crypto.randomBytes(16).toString("hex");
  const token = jwt.sign(
    { purpose: "oauth", provider, nonce },
    getOAuthStateSecret(),
    { expiresIn: "10m" },
  );
  return { state: token, nonce };
};

/**
 * Verifica o `state` devolvido pelo provedor no callback.
 * Lança AppError 400 quando o JWT expirou, foi adulterado ou veio de outro provedor.
 */
const verifyOAuthState = (state, expectedProvider) => {
  try {
    const decoded = jwt.verify(state, getOAuthStateSecret());
    if (decoded.purpose !== "oauth" || decoded.provider !== expectedProvider) {
      throw new Error("State inválido");
    }
    return decoded;
  } catch {
    throw new AppError(
      "State OAuth inválido ou expirado. Por favor, tente autenticar novamente.",
      400,
    );
  }
};

/**
 * Constrói a URL para redirecionar o usuário ao provedor OAuth.
 *
 * Para o Google adicionamos parâmetros específicos:
 *   - `response_type=code`        — fluxo Authorization Code
 *   - `access_type=online`        — não precisamos de refresh token (login simples)
 *   - `prompt=select_account`     — força a tela de seleção de conta (UX)
 *   - `include_granted_scopes`    — reaproveita consentimentos prévios
 *   - `nonce`                     — correlação OpenID Connect (CSRF de ID Token)
 *
 * Para o GitHub a URL é mais simples e os defaults bastam.
 */
const buildAuthorizeUrl = (provider) => {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new AppError("Provedor OAuth não suportado.", 400);
  }

  if (!isProviderConfigured(provider)) {
    throw new AppError(
      `Provedor ${provider} não está configurado no servidor.`,
      503,
    );
  }

  const { clientId, callbackUrl } = getProviderEnv(provider);
  const config = providerConfig[provider];
  const { state, nonce } = createOAuthState(provider);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: config.scopes.join(" "),
    state,
  });

  if (provider === "google") {
    params.set("response_type", "code");
    params.set("access_type", "online");
    params.set("prompt", "select_account");
    params.set("include_granted_scopes", "true");
    params.set("nonce", nonce);
  }

  return `${config.authorizeUrl}?${params.toString()}`;
};

/**
 * Troca o `code` recebido no callback pelo `access_token` no token endpoint
 * do provedor (POST x-www-form-urlencoded). Devolve a string do token ou
 * lança AppError 502 com causa específica (rede, HTTP, body, error code).
 */
const exchangeCodeForToken = async (provider, code) => {
  const { clientId, clientSecret, callbackUrl } = getProviderEnv(provider);
  const config = providerConfig[provider];

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: callbackUrl,
    grant_type: "authorization_code",
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  let res;
  try {
    res = await fetch(config.tokenUrl, { method: "POST", headers, body });
  } catch (networkError) {
    throw new AppError(
      `Falha de rede ao comunicar com o servidor do provedor ${provider}.`,
      502,
    );
  }

  if (!res.ok) {
    throw new AppError(
      `Falha ao trocar código OAuth (${provider}). Servidor devolveu HTTP ${res.status}.`,
      502,
    );
  }

  let data;
  try {
    data = await res.json();
  } catch (parseError) {
    throw new AppError(`Resposta inválida do provedor ${provider}.`, 502);
  }

  if (data.error) {
    throw new AppError(data.error_description || data.error, 502);
  }

  if (!data.access_token) {
    throw new AppError(
      `Resposta do provedor ${provider} não contém access_token.`,
      502,
    );
  }

  return data.access_token;
};

/**
 * Resolve a identidade do usuário a partir do perfil OAuth recebido.
 *
 * Política de unificação por e-mail:
 *   1. Já existe vínculo (provider, providerUserId) → retorna o usuário ligado.
 *   2. Existe usuário com mesmo e-mail (login local prévio ou outro provedor) →
 *      cria o vínculo OAuth para essa conta (e-mail é a chave da identidade).
 *   3. Novo usuário → cria com `password_hash = null` e linka o provedor.
 *
 * O bloco try/catch trata a race condition de criação simultânea (mesma sessão
 * iniciando dois callbacks): se ocorrer violação de UNIQUE em `users.email`,
 * relemos pelo email para reaproveitar a linha criada pela outra requisição.
 */
const resolveOrCreateUser = async (provider, profile) => {
  const existingOAuth = await oauthRepository.findByProvider(
    provider,
    profile.providerUserId,
  );

  if (existingOAuth) {
    return {
      id: existingOAuth.user_id,
      name: existingOAuth.name,
      email: existingOAuth.email,
      created_at: existingOAuth.created_at,
    };
  }

  let user = await userRepository.findByEmail(profile.email);

  if (!user) {
    try {
      user = await userRepository.create({
        name: profile.name,
        email: profile.email,
        passwordHash: null,
      });
    } catch (error) {
      if (
        error.code === "23505" ||
        (error.message && error.message.includes("unique"))
      ) {
        user = await userRepository.findByEmail(profile.email);
        if (!user) {
          throw new AppError(
            "Falha interna ao resolver contenção de dados do utilizador OAuth.",
            500,
          );
        }
      } else {
        throw new AppError(
          "Falha ao registar o novo utilizador no banco de dados.",
          500,
        );
      }
    }
  }

  await oauthRepository.linkAccount(user.id, provider, profile.providerUserId);

  return user;
};

/**
 * Orquestra o callback OAuth ponta-a-ponta:
 *
 *   1. Valida o state (CSRF) emitido por `buildAuthorizeUrl`.
 *   2. Exige o `code` da query string.
 *   3. Troca o code por access_token no token endpoint do provedor.
 *   4. Busca o perfil normalizado via `profileFetchers[provider]`.
 *   5. Resolve/cria o usuário aplicando unificação por e-mail.
 *   6. Lista todos os provedores OAuth vinculados (para informar a UI).
 *   7. Assina um JWT da aplicação (Bearer) e devolve junto do usuário.
 *
 * Em qualquer erro, propaga AppError com status apropriado para o
 * errorHandlerMiddleware traduzir em resposta JSON estruturada.
 */
const handleCallback = async (provider, { code, state }) => {
  verifyOAuthState(state, provider);

  if (!code) {
    throw new AppError(
      "Código de autorização ausente na resposta do provedor.",
      400,
    );
  }

  const accessToken = await exchangeCodeForToken(provider, code);
  const fetchProfile = profileFetchers[provider];
  const profile = await fetchProfile(accessToken);

  const user = await resolveOrCreateUser(provider, profile);
  const linkedProviders = await oauthRepository.findProvidersByUserId(user.id);
  const token = signToken({ sub: user.id, email: user.email });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      oauth_providers: linkedProviders.map((p) => p.provider),
    },
  };
};

const formatAuthResponse = (result) => ({
  sucesso: true,
  ...result,
});

module.exports = {
  getConfiguredProviders,
  buildAuthorizeUrl,
  handleCallback,
  formatAuthResponse,
  createOAuthState,
  verifyOAuthState,
};
