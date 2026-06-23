import { useEffect, useState } from "react";
import Panel from "../Panel.jsx";
import Badge from "../Badge.jsx";
import { getMostReported } from "../../../api/rankings.js";
import { getAdminReports, updateAdminReportStatus } from "../../../api/admin.js";
import { ApiError } from "../../../api/client.js";
import { shortenUrl, toNumber } from "../../../utils/format.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import common from "./common.module.css";

export default function ReportsSection() {
  const { isAdmin } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  
  const fetchAdminReports = async () => {
    try {
      setLoading(true);
      const data = await getAdminReports();
      setRows(data.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar denúncias.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateAdminReportStatus(id, newStatus);
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
    } catch (err) {
      alert("Erro ao atualizar status");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        if (isAdminMode) {
          const data = await getAdminReports();
          if (!cancelled) {
            setRows(data.items || []);
            setError(null);
          }
        } else {
          const data = await getMostReported({ limit: 10 });
          if (!cancelled) {
            setRows(data.rankings || []);
            setError(null);
          }
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof ApiError ? err.message : "Não foi possível carregar as denúncias.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdminMode]);

  return (
    <Panel
      eyebrow={isAdminMode ? "Admin" : "Comunidade"}
      title={isAdminMode ? "Gerenciar Denúncias" : "Sites com mais denúncias"}
      subtitle={isAdminMode ? "Painel administrativo de denúncias" : "Ranking público dos endereços mais reportados pelos usuários."}
      actions={
        isAdmin && (
          <button
            onClick={() => setIsAdminMode(!isAdminMode)}
            style={{ padding: "6px 12px", borderRadius: "6px", cursor: "pointer", background: "var(--color-primary)", color: "white", border: "none" }}
          >
            {isAdminMode ? "Ver Ranking Público" : "⚙️ Gerenciar Denúncias"}
          </button>
        )
      }
    >
      {loading && (
        <div className={common.state}>
          <span className={common.spinner} aria-hidden="true" /> Carregando…
        </div>
      )}
      {error && <div className={common.error}>{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className={common.state}>Nenhuma denúncia registrada ainda.</div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className={common.list}>
          {rows.map((row, i) => (
            <div className={common.row} key={row.id || row.url || i}>
              <span className={common.rank}>{i + 1}</span>
              <div className={common.rowMain}>
                <div className={common.rowTitle} title={row.url}>
                  {shortenUrl(row.url)}
                </div>
                {isAdminMode ? (
                  <div className={common.rowMeta} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                    <span><strong>Por:</strong> {row.user_name} ({row.user_email})</span>
                    <span><strong>Motivo:</strong> {row.report_type}</span>
                    {row.comment && <span><strong>Comentário:</strong> {row.comment}</span>}
                  </div>
                ) : (
                  <div className={common.rowMeta}>
                    {toNumber(row.scam_reports) > 0 && (
                      <span>{toNumber(row.scam_reports)} golpe</span>
                    )}
                    {toNumber(row.false_positive_reports) > 0 && (
                      <span>{toNumber(row.false_positive_reports)} falso-positivo</span>
                    )}
                    {toNumber(row.accessibility_reports) > 0 && (
                      <span>{toNumber(row.accessibility_reports)} acessibilidade</span>
                    )}
                  </div>
                )}
              </div>
              <div className={common.rowAside}>
                {isAdminMode ? (
                  <select
                    value={row.status || 'aguardando análise'}
                    onChange={(e) => handleStatusChange(row.id, e.target.value)}
                    style={{ padding: '4px', borderRadius: '4px', fontSize: '0.85rem' }}
                  >
                    <option value="aguardando análise">Aguardando Análise</option>
                    <option value="sendo analisada">Sendo Analisada</option>
                    <option value="analisada: scam">Analisada: Golpe</option>
                    <option value="analisada: seguro">Analisada: Seguro</option>
                  </select>
                ) : (
                  <Badge tone="bad">{toNumber(row.report_count)} denúncias</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
