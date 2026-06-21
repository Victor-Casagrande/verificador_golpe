/**
 * Endpoints de autenticação local + OAuth.
 *
 * Convenção: estas funções devolvem o JSON do backend cru
 * (ex.: `{ sucesso: true, token, user }`) — quem decide o que fazer com
 * o token é o AuthContext.
 */

import { API_BASE_URL, get, post } from "./client.js";

export const register = ({ name, email, password }) =>
  post("/auth/register", { name, email, password });

export const login = ({ email, password }) => post("/auth/login", { email, password });

export const listOAuthProviders = () => get("/auth/oauth/providers");

/**
 * URL absoluta que inicia o fluxo OAuth para um provedor.
 * Útil para abrir em popup / nova aba e capturar o token via postMessage.
 *
 * @param {"github"|"google"} provider
 */
export const getOAuthAuthorizeUrl = (provider) => `${API_BASE_URL}/auth/oauth/${provider}`;
