import { useEffect, useState } from "react";
import Panel from "../Panel.jsx";
import Badge from "../Badge.jsx";
import { getAdminLogs } from "../../../api/admin.js";
import { ApiError } from "../../../api/client.js";
import { shortenUrl } from "../../../utils/format.js";
import common from "./common.module.css";
import { useAuth } from "../../../context/AuthContext.jsx";

export default function AdminLogsSection() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isAdmin) return;
        const data = await getAdminLogs();
        if (!cancelled) {
          setLogs(data.items || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : "Não foi possível carregar os logs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Acesso restrito.</div>;
  }

  return (
    <Panel
      eyebrow="Admin"
      title="Informações Administrativas em tempo real"
      subtitle="Visualizar logs de todas as verificações do sistema"
    >
      {loading && (
        <div className={common.state}>
          <span className={common.spinner} aria-hidden="true" /> Carregando…
        </div>
      )}
      {error && <div className={common.error}>{error}</div>}

      {!loading && !error && logs.length === 0 && (
        <div className={common.state}>Nenhum log registrado ainda.</div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className={common.list}>
          {logs.map((log) => (
            <div className={common.row} key={log.id}>
              <div className={common.rowMain}>
                <div className={common.rowTitle} title={log.url}>
                  {shortenUrl(log.url)}
                </div>
                <div className={common.rowMeta} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span>
                    <strong>Data:</strong> {new Date(log.created_at).toLocaleString()}
                  </span>
                  <span>
                    <strong>Usuário:</strong> {log.user_name || "Anônimo"} ({log.user_email || "N/A"})
                  </span>
                  {log.is_danger ? (
                    <span style={{ color: "var(--color-danger)" }}>⚠️ {log.reason}</span>
                  ) : (
                    <span>Acessibilidade: {log.accessibility_score} / Qualidade: {log.quality_rating}</span>
                  )}
                </div>
              </div>
              <div className={common.rowAside}>
                <Badge tone={log.is_danger ? "bad" : "good"}>
                  {log.status === "safe" ? "Seguro" : "Perigo"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
