import { useEffect, useState } from "react";
import Panel from "../Panel.jsx";
import Badge from "../Badge.jsx";
import { getBestAccessibility, getWorstAccessibility } from "../../../api/rankings.js";
import { ApiError } from "../../../api/client.js";
import { ratingTone, toNumber } from "../../../utils/format.js";
import common from "./common.module.css";

/**
 * Lista um ranking de sites por nota média de acessibilidade.
 */
function RankingList({ loading, error, rows, emptyText }) {
  if (loading) {
    return (
      <div className={common.state}>
        <span className={common.spinner} aria-hidden="true" /> Carregando…
      </div>
    );
  }
  if (error) return <div className={common.error}>{error}</div>;
  if (!rows || rows.length === 0) return <div className={common.state}>{emptyText}</div>;

  return (
    <div className={common.list}>
      {rows.map((row, i) => {
        const rating = toNumber(row.avg_quality_rating);
        return (
          <div className={common.row} key={row.site_host || i}>
            <span className={common.rank}>{i + 1}</span>
            <div className={common.rowMain}>
              <div className={common.rowTitle} title={row.site_host}>
                {row.site_host}
              </div>
              <div className={common.rowMeta}>
                <span>{toNumber(row.analysis_count)} análises</span>
                <span>{toNumber(row.urls_count)} URLs</span>
              </div>
            </div>
            <div className={common.rowAside}>
              <Badge tone={ratingTone(rating)}>nota {rating}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RankingsSection() {
  const [best, setBest] = useState({ loading: true, error: null, rows: [] });
  const [worst, setWorst] = useState({ loading: true, error: null, rows: [] });

  useEffect(() => {
    let cancelled = false;

    const fetchRanking = async (fn, setState) => {
      try {
        const data = await fn({ limit: 10 });
        if (!cancelled) setState({ loading: false, error: null, rows: data.rankings || [] });
      } catch (err) {
        if (!cancelled)
          setState({
            loading: false,
            error: err instanceof ApiError ? err.message : "Não foi possível carregar o ranking.",
            rows: [],
          });
      }
    };

    fetchRanking(getBestAccessibility, setBest);
    fetchRanking(getWorstAccessibility, setWorst);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={common.grid2}>
      <Panel
        eyebrow="Top 10 +"
        title="Melhores avaliados"
        subtitle="Maior nota média de acessibilidade."
      >
        <RankingList
          loading={best.loading}
          error={best.error}
          rows={best.rows}
          emptyText="Ainda não há dados suficientes para o ranking."
        />
      </Panel>

      <Panel
        eyebrow="Top 10 −"
        title="Piores avaliados"
        subtitle="Menor nota média de acessibilidade."
      >
        <RankingList
          loading={worst.loading}
          error={worst.error}
          rows={worst.rows}
          emptyText="Ainda não há dados suficientes para o ranking."
        />
      </Panel>
    </div>
  );
}
