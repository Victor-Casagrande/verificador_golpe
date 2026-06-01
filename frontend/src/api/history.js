/**
 * GET /users/history — histórico do usuário autenticado.
 */
import { get } from "./client.js";

export const getUserHistory = ({ limit = 20, offset = 0, url } = {}) => {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  if (url) params.set("url", url);
  const qs = params.toString();
  return get(`/users/history${qs ? `?${qs}` : ""}`, { auth: true });
};
