import { useCallback, useEffect, useState } from "react";
import Panel from "../Panel.jsx";
import Badge from "../Badge.jsx";
import Button from "../../ui/Button.jsx";
import { getUserHistory } from "../../../api/history.js";
import { getMyReports, REPORT_TYPES } from "../../../api/reports.js";
import { ApiError } from "../../../api/client.js";
import {
  formatDateTime,
  ratingTone,
  shortenUrl,
  toNumber,
} from "../../../utils/format.js";
import common from "./common.module.css";
import styles from "./HistorySection.module.css";

const PAGE_SIZE = 10;

const reportLabel = (value) =>
  REPORT_TYPES.find((t) => t.value === value)?.label || value;

export default function HistorySection() {
  const [tab, setTab] = useState("evaluations");

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [reports, setReports] = useState([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsOffset, setReportsOffset] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  const [reportsLoaded, setReportsLoaded] = useState(false);

  const load = useCallback(async (nextOffset) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserHistory({ limit: PAGE_SIZE, offset: nextOffset });
      setItems(data.items || []);
      setTotal(toNumber(data.total));
      setOffset(nextOffset);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o histórico.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReports = useCallback(async (nextOffset) => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const data = await getMyReports({ limit: PAGE_SIZE, offset: nextOffset });
      setReports(data.items || []);
      setReportsTotal(toNumber(data.total));
      setReportsOffset(nextOffset);
      setReportsLoaded(true);
    } catch (err) {
      setReportsError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar suas denúncias.",
      );
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  // Carrega as denúncias na primeira vez que a aba é aberta.
  useEffect(() => {
    if (tab === "reports" && !reportsLoaded) {
      loadReports(0);
    }
  }, [tab, reportsLoaded, loadReports]);

  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;
  const reportsCanPrev = reportsOffset > 0;
  const reportsCanNext = reportsOffset + PAGE_SIZE < reportsTotal;

  return (
    <Panel
      eyebrow="Histórico"
      title="Suas avaliações e denúncias"
      subtitle="Tudo o que você já verificou e reportou, em um só lugar."
      actions={
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "evaluations"}
            className={`${styles.tab} ${tab === "evaluations" ? styles.tabActive : ""}`}
            onClick={() => setTab("evaluations")}
          >
            Avaliações
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "reports"}
            className={`${styles.tab} ${tab === "reports" ? styles.tabActive : ""}`}
            onClick={() => setTab("reports")}
          >
            Minhas denúncias
          </button>
        </div>
      }
    >
      {tab === "evaluations" ? (
        <>
          {loading && (
            <div className={common.state}>
              <span className={common.spinner} aria-hidden="true" /> Carregando…
            </div>
          )}
          {error && <div className={common.error}>{error}</div>}

          {!loading && !error && items.length === 0 && (
            <div className={common.state}>
              Você ainda não verificou nenhum site. Use a seção “Verificar”.
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              <div className={common.list}>
                {items.map((item) => (
                  <div className={common.row} key={item.id}>
                    <div className={common.rowMain}>
                      <div className={common.rowTitle} title={item.url}>
                        {shortenUrl(item.url)}
                      </div>
                      <div className={common.rowMeta}>
                        <span>{formatDateTime(item.created_at)}</span>
                        <span>{toNumber(item.violations_count)} violações</span>
                        {item.axe_source && <span>{item.axe_source}</span>}
                      </div>
                    </div>
                    <div className={common.rowAside}>
                      <Badge tone={ratingTone(item.quality_rating)}>
                        nota {toNumber(item.quality_rating)}
                      </Badge>
                      <Badge tone={item.is_danger ? "bad" : "good"}>
                        {item.is_danger ? "risco" : "seguro"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.pagination}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canPrev || loading}
                  onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
                >
                  ← Anteriores
                </Button>
                <span className={styles.pageInfo}>
                  {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canNext || loading}
                  onClick={() => load(offset + PAGE_SIZE)}
                >
                  Próximas →
                </Button>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {reportsLoading && (
            <div className={common.state}>
              <span className={common.spinner} aria-hidden="true" /> Carregando…
            </div>
          )}
          {reportsError && <div className={common.error}>{reportsError}</div>}

          {!reportsLoading && !reportsError && reports.length === 0 && (
            <div className={common.state}>
              Você ainda não enviou denúncias. Elas aparecem aqui após você
              reportar um site na seção “Verificar”.
            </div>
          )}

          {!reportsLoading && !reportsError && reports.length > 0 && (
            <>
              <div className={common.list}>
                {reports.map((r, i) => (
                  <div className={common.row} key={r.id || i}>
                    <div className={common.rowMain}>
                      <div className={common.rowTitle} title={r.url}>
                        {shortenUrl(r.url)}
                      </div>
                      <div className={common.rowMeta}>
                        <span>{formatDateTime(r.created_at)}</span>
                        {r.comment && <span>“{r.comment}”</span>}
                      </div>
                    </div>
                    <div className={common.rowAside}>
                      <Badge tone="accent">{reportLabel(r.report_type)}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.pagination}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!reportsCanPrev || reportsLoading}
                  onClick={() =>
                    loadReports(Math.max(0, reportsOffset - PAGE_SIZE))
                  }
                >
                  ← Anteriores
                </Button>
                <span className={styles.pageInfo}>
                  {reportsOffset + 1}–
                  {Math.min(reportsOffset + PAGE_SIZE, reportsTotal)} de{" "}
                  {reportsTotal}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!reportsCanNext || reportsLoading}
                  onClick={() => loadReports(reportsOffset + PAGE_SIZE)}
                >
                  Próximas →
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  );
}
