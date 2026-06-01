/**
 * Endpoints públicos de rankings de sites.
 */
import { get } from "./client.js";

const buildQs = (params) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
};

export const getWorstAccessibility = ({ limit = 10, minAnalyses = 1 } = {}) =>
  get(`/rankings/accessibility/worst${buildQs({ limit, min_analyses: minAnalyses })}`);

export const getBestAccessibility = ({ limit = 10, minAnalyses = 1 } = {}) =>
  get(`/rankings/accessibility/best${buildQs({ limit, min_analyses: minAnalyses })}`);

export const getMostReported = ({ limit = 10 } = {}) =>
  get(`/rankings/reports/most${buildQs({ limit })}`);
