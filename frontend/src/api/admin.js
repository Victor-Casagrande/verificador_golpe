import { get, patch } from "./client.js";

const buildQs = (params) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
};

export const getAdminReports = ({ limit = 50, offset = 0 } = {}) =>
  get(`/reports/admin${buildQs({ limit, offset })}`, { auth: true });

export const updateAdminReportStatus = (id, status) =>
  patch(`/reports/admin/${id}/status`, { status }, { auth: true });

export const getAdminLogs = ({ limit = 50, offset = 0 } = {}) =>
  get(`/history/admin${buildQs({ limit, offset })}`, { auth: true });
