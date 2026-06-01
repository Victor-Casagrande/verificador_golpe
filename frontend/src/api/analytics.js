/**
 * Endpoints /api/analytics/* — todos exigem JWT.
 */
import { get } from "./client.js";

export const getGlobalSecurityOverview = () =>
  get("/api/analytics/security/global", { auth: true });

export const getCommunityFeedbackOverview = () =>
  get("/api/analytics/security/community", { auth: true });

export const getDangerousHostsRanking = ({ limit = 10 } = {}) =>
  get(`/api/analytics/security/ranking/hosts?limit=${limit}`, { auth: true });

export const getGlobalAccessibilityOverview = () =>
  get("/api/analytics/accessibility/global", { auth: true });

export const getWorstAccessibilityHosts = ({ limit = 10 } = {}) =>
  get(`/api/analytics/accessibility/ranking/hosts?limit=${limit}`, { auth: true });
