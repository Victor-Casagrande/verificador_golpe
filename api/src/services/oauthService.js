const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const oauthRepository = require('../repositories/oauthRepository');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');
const {
  SUPPORTED_PROVIDERS,
  providerConfig,
  getProviderEnv,
  isProviderConfigured,
  getConfiguredProviders
} = require('../config/oauthProviders');
const fetchGithubProfile = require('../oauth/fetchGithubProfile');
const fetchGoogleProfile = require('../oauth/fetchGoogleProfile');

const profileFetchers = {
  github: fetchGithubProfile,
  google: fetchGoogleProfile
};

const getOAuthStateSecret = () => process.env.JWT_SECRET || 'oauth-state-dev';

const createOAuthState = (provider) => {
  return jwt.sign({ purpose: 'oauth', provider }, getOAuthStateSecret(), { expiresIn: '10m' });
};

const verifyOAuthState = (state, expectedProvider) => {
  try {
    const decoded = jwt.verify(state, getOAuthStateSecret());
    if (decoded.purpose !== 'oauth' || decoded.provider !== expectedProvider) {
      throw new Error('State inválido');
    }
    return decoded;
  } catch {
    throw new AppError('State OAuth inválido ou expirado.', 400);
  }
};

const buildAuthorizeUrl = (provider) => {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new AppError('Provedor OAuth não suportado.', 400);
  }

  if (!isProviderConfigured(provider)) {
    throw new AppError(`Provedor ${provider} não configurado no servidor.`, 503);
  }

  const { clientId, callbackUrl } = getProviderEnv(provider);
  const config = providerConfig[provider];
  const state = createOAuthState(provider);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: config.scopes.join(' '),
    state
  });

  if (provider === 'google') {
    params.set('response_type', 'code');
    params.set('access_type', 'online');
    params.set('prompt', 'select_account');
  }

  return `${config.authorizeUrl}?${params.toString()}`;
};

const exchangeCodeForToken = async (provider, code) => {
  const { clientId, clientSecret, callbackUrl } = getProviderEnv(provider);
  const config = providerConfig[provider];

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code'
  });

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };

  const res = await fetch(config.tokenUrl, { method: 'POST', headers, body });

  if (!res.ok) {
    throw new AppError(`Falha ao trocar código OAuth (${provider}).`, 502);
  }

  const data = await res.json();

  if (data.error) {
    throw new AppError(data.error_description || data.error, 502);
  }

  return data.access_token;
};

const resolveOrCreateUser = async (provider, profile) => {
  const existingOAuth = await oauthRepository.findByProvider(provider, profile.providerUserId);

  if (existingOAuth) {
    return {
      id: existingOAuth.user_id,
      name: existingOAuth.name,
      email: existingOAuth.email,
      created_at: existingOAuth.created_at
    };
  }

  const existingByEmail = await userRepository.findByEmail(profile.email);

  if (existingByEmail) {
    await oauthRepository.linkAccount(existingByEmail.id, provider, profile.providerUserId);
    return {
      id: existingByEmail.id,
      name: existingByEmail.name,
      email: existingByEmail.email,
      created_at: existingByEmail.created_at
    };
  }

  const newUser = await userRepository.create({
    name: profile.name,
    email: profile.email,
    passwordHash: null
  });

  await oauthRepository.linkAccount(newUser.id, provider, profile.providerUserId);

  return newUser;
};

const handleCallback = async (provider, { code, state }) => {
  verifyOAuthState(state, provider);

  if (!code) {
    throw new AppError('Código de autorização ausente.', 400);
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
      oauth_providers: linkedProviders.map((p) => p.provider)
    }
  };
};

const formatAuthResponse = (result) => ({
  sucesso: true,
  ...result
});

module.exports = {
  getConfiguredProviders,
  buildAuthorizeUrl,
  handleCallback,
  formatAuthResponse,
  createOAuthState,
  verifyOAuthState
};
