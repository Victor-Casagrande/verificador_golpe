/**
 * Cliente HTTP central do frontend.
 *
 * Responsabilidades:
 *   - Concatena VITE_API_BASE_URL com o path da requisição.
 *   - Injeta `Authorization: Bearer <token>` automaticamente quando o
 *     getter `getToken` devolve um JWT.
 *   - Faz parse JSON de forma defensiva (corpo vazio ou HTML não quebram).
 *   - Em erro (>=400), lança um `ApiError` com `status`, `message` e `body`
 *     para que os componentes possam tratar de forma uniforme.
 *
 * O token NÃO é lido do localStorage aqui — é injetado pelo AuthContext,
 * para que este módulo continue trivialmente testável.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? 0;
    this.body = body ?? null;
  }
}

let tokenGetter = () => null;

export const setTokenGetter = (fn) => {
  tokenGetter = typeof fn === "function" ? fn : () => null;
};

const parseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const buildUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

/**
 * Função base — todas as helpers (get/post/...) delegam aqui.
 */
export const request = async (
  path,
  { method = "GET", body, headers = {}, auth = false, signal } = {},
) => {
  const finalHeaders = { Accept: "application/json", ...headers };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = tokenGetter();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      signal,
    });
  } catch (networkError) {
    throw new ApiError(
      `Falha de rede ao chamar ${path}: ${networkError.message}`,
      { status: 0 },
    );
  }

  const parsed = await parseBody(response);

  if (!response.ok) {
    const message =
      (parsed && typeof parsed === "object" && (parsed.error?.message || parsed.mensagem)) ||
      (typeof parsed === "string" && parsed) ||
      `Requisição ${method} ${path} falhou (HTTP ${response.status}).`;
    throw new ApiError(message, { status: response.status, body: parsed });
  }

  return parsed;
};

export const get = (path, options) => request(path, { ...options, method: "GET" });
export const post = (path, body, options) =>
  request(path, { ...options, method: "POST", body });
export const put = (path, body, options) =>
  request(path, { ...options, method: "PUT", body });
export const del = (path, options) =>
  request(path, { ...options, method: "DELETE" });
