import { useEffect, useState } from "react";
import Panel from "../Panel.jsx";
import Badge from "../Badge.jsx";
import { getMostReported } from "../../../api/rankings.js";
import { ApiError } from "../../../api/client.js";
import { shortenUrl, toNumber } from "../../../utils/format.js";
import common from "./common.module.css";

export default function ReportsSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMostReported({ limit: 10 });
        if (!cancelled) {
          setRows(data.rankings || []);
          setError(null);
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
  }, []);

  return (
    <Panel
      eyebrow="Comunidade"
      title="Sites com mais denúncias"
      subtitle="Ranking público dos endereços mais reportados pelos usuários."
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
            <div className={common.row} key={row.url || i}>
              <span className={common.rank}>{i + 1}</span>
              <div className={common.rowMain}>
                <div className={common.rowTitle} title={row.url}>
                  {shortenUrl(row.url)}
                </div>
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
              </div>
              <div className={common.rowAside}>
                <Badge tone="bad">{toNumber(row.report_count)} denúncias</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
