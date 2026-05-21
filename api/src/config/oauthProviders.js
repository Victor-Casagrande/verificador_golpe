const SUPPORTED_PROVIDERS = ["github", "google"];

const providerConfig = {
  github: {
    name: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "user:email"],
  },
  google: {
    name: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "profile"],
  },
};

const getProviderEnv = (provider) => {
  const prefix = provider.toUpperCase();
  return {
    clientId: process.env[`${prefix}_CLIENT_ID`],
    clientSecret: process.env[`${prefix}_CLIENT_SECRET`],
    callbackUrl: process.env[`${prefix}_CALLBACK_URL`],
  };
};

const isProviderConfigured = (provider) => {
  const { clientId, clientSecret, callbackUrl } = getProviderEnv(provider);
  return Boolean(clientId && clientSecret && callbackUrl);
};

const getConfiguredProviders = () =>
  SUPPORTED_PROVIDERS.filter(isProviderConfigured).map((id) => ({
    id,
    name: providerConfig[id].name,
    authorize_path: `/auth/oauth/${id}`,
  }));

module.exports = {
  SUPPORTED_PROVIDERS,
  providerConfig,
  getProviderEnv,
  isProviderConfigured,
  getConfiguredProviders,
};
