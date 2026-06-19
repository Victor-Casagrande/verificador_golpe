/**
 * Política CORS da API.
 *
 * Origens permitidas (qualquer uma basta):
 *   - CORS_ALLOWED_ORIGINS (lista separada por vírgula)
 *   - FRONTEND_URL
 *   - localhost / 127.0.0.1 em qualquer porta (quando CORS_ALLOW_LOCALHOST=true ou fora de produção)
 *   - chrome-extension:// (extensão Chrome)
 *   - *.vercel.app e *.onrender.com (previews de deploy)
 */

const logger = require("../utils/logger");

const normalizeOrigin = (value) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/$/, "");
};

const parseOriginList = (value) =>
  (value || "")
    .split(",")
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean);

const isLocalhostOrigin = (origin) => {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const isChromeExtension = (origin) => {
  const allowedExtension = process.env.EXTENSION_ID
    ? `chrome-extension://${process.env.EXTENSION_ID}`
    : null;

  if (allowedExtension && origin === allowedExtension) {
    return true;
  }

  if (!process.env.EXTENSION_ID && origin.startsWith("chrome-extension://")) {
    return true;
  }

  return false;
};

const isDeployPreviewHost = (origin) => {
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith(".vercel.app") || hostname.endsWith(".onrender.com");
  } catch {
    return false;
  }
};

const shouldAllowLocalhost = () => {
  if (process.env.CORS_ALLOW_LOCALHOST === "true") return true;
  if (process.env.CORS_ALLOW_LOCALHOST === "false") return false;
  return process.env.NODE_ENV !== "production";
};

const buildAllowedOrigins = () => {
  const origins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...parseOriginList(process.env.CORS_ALLOWED_ORIGINS),
  ]);

  const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL);
  if (frontendUrl) origins.add(frontendUrl);

  return origins;
};

const createCorsOptions = () => {
  const allowedOrigins = buildAllowedOrigins();
  const allowLocalhost = shouldAllowLocalhost();

  return {
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    optionsSuccessStatus: 204,
    origin(origin, callback) {
      // curl, Postman, Swagger same-origin, health checks
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      if (allowLocalhost && isLocalhostOrigin(origin)) {
        return callback(null, true);
      }

      if (isChromeExtension(origin)) {
        return callback(null, true);
      }

      if (isDeployPreviewHost(origin)) {
        return callback(null, true);
      }

      logger.warn(`[CORS] Origem bloqueada: ${origin}`);
      // false = nega sem lançar exceção (evita 500 no error handler)
      return callback(null, false);
    },
    credentials: true,
  };
};

module.exports = {
  createCorsOptions,
  buildAllowedOrigins,
  isLocalhostOrigin,
  isDeployPreviewHost,
  shouldAllowLocalhost,
  normalizeOrigin,
};
