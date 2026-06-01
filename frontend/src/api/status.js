/**
 * Health check público da API.
 */
import { get } from "./client.js";

export const getApiStatus = () => get("/api/status");
