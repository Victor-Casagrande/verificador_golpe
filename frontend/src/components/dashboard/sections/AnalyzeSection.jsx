import { useState } from "react";
import Panel from "../Panel.jsx";
import Badge from "../Badge.jsx";
import Button from "../../ui/Button.jsx";
import TextField from "../../ui/TextField.jsx";
import Toggle from "../../ui/Toggle.jsx";
import { analyzeUrl, getUrlScoreTimeline } from "../../../api/urls.js";
import { createReport, REPORT_TYPES } from "../../../api/reports.js";
import { ApiError } from "../../../api/client.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import {
  formatDateTime,
  ratingTone,
  securityTone,
  toNumber,
} from "../../../utils/format.js";
import common from "./common.module.css";
import styles from "./AnalyzeSection.module.css";

/**
 * Mini-gráfico de linha (sparkline) da nota de qualidade ao longo do tempo.
 * Recebe a timeline em ordem cronológica (mais antiga → mais nova).
 */
function ScoreSparkline({ points }) {
  if (!points || points.length < 2) return null;
  const w = 320;
  const h = 64;
  const pad = 6;
  const values = points.map((p) => toNumber(p.quality_rating, 0));
  const max = 100;
  const min = 0;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Evolução da nota de acessibilidade"
    >
      <polyline points={area} className={styles.sparkArea} />
      <polyline points={line} className={styles.sparkLine} />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" className={styles.sparkDot} />
      ))}
    </svg>
  );
}

export default function AnalyzeSection() {
  const { isAuthenticated } = useAuth();
  const [url, setUrl] = useState("");
  const [devMode, setDevMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [timeline, setTimeline] = useState(null);

  // Estado do formulário de denúncia.
  const [reportType, setReportType] = useState(REPORT_TYPES[0].value);
  const [comment, setComment] = useState("");
  const [reportState, setReportState] = useState({ status: "idle", msg: null });

  const handleAnalyze = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Informe uma URL para verificar.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setTimeline(null);
    setReportState({ status: "idle", msg: null });

    try {
      const data = await analyzeUrl({ url: trimmed, devMode });
      setResult(data);

      // Busca a evolução histórica dessa URL (timeline pública).
      try {
        const tl = await getUrlScoreTimeline({ url: trimmed, limit: 20 });
        setTimeline(tl);
      } catch {
        setTimeline({ timeline: [] });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível concluir a análise. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (e) => {
    e.preventDefault();
    if (!result) return;
    setReportState({ status: "loading", msg: null });
    try {
      await createReport({
        url: url.trim(),
        analysisId: result.analysis_id ?? null,
        reportType,
        comment: comment.trim() || undefined,
      });
      setReportState({
        status: "success",
        msg: "Denúncia registrada. Obrigado por contribuir!",
      });
      setComment("");
    } catch (err) {
      setReportState({
        status: "error",
        msg:
          err instanceof ApiError
            ? err.message
            : "Não foi possível enviar a denúncia.",
      });
    }
  };

  const security = result?.security;
  const accessibility = result?.accessibility;
  const chronological = timeline?.timeline
    ? [...timeline.timeline].reverse()
    : [];
  const hasEvolution = chronological.length >= 2;

  return (
    <div className={common.stack}>
      {/* ===== Formulário de verificação ===== */}
      <Panel
        eyebrow="Verificação"
        title="Analisar um site"
        subtitle="Cole o link para checar segurança (golpe/phishing) e acessibilidade (axe-core)."
      >
        <form className={styles.form} onSubmit={handleAnalyze}>
          <div className={styles.inputRow}>
            <TextField
              label="URL do site"
              type="url"
              name="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemplo.com/pagina"
              autoComplete="off"
            />
          </div>

          <div className={styles.controls}>
            <Toggle
              checked={devMode}
              onChange={setDevMode}
              label="Modo dev"
              hint="Inclui o relatório detalhado das violações do axe-core."
            />
            <Button type="submit" variant="primary" loading={loading}>
              Verificar
            </Button>
          </div>

          {error && <div className={common.error}>{error}</div>}
        </form>
      </Panel>

      {/* ===== Resultado ===== */}
      {result && (
        <Panel
          eyebrow="Resultado"
          title="Veredicto da análise"
          subtitle={url.trim()}
          actions={
            security?.from_cache ? (
              <Badge tone="neutral">cache</Badge>
            ) : (
              <Badge tone="accent">tempo real</Badge>
            )
          }
        >
          <div className={common.grid2}>
            {/* Segurança */}
            <div className={styles.verdict}>
              <div className={styles.verdictHead}>
                <span className={styles.verdictLabel}>Segurança</span>
                <Badge tone={securityTone(security?.is_danger)}>
                  {security?.is_danger ? "Risco detectado" : "Seguro"}
                </Badge>
              </div>
              <p className={styles.verdictStatus}>{security?.status}</p>
              <p className={styles.verdictReason}>{security?.reason}</p>
            </div>

            {/* Acessibilidade */}
            <div className={styles.verdict}>
              <div className={styles.verdictHead}>
                <span className={styles.verdictLabel}>Acessibilidade</span>
                <Badge tone={ratingTone(accessibility?.quality_rating)}>
                  nota {toNumber(accessibility?.quality_rating)}
                </Badge>
              </div>
              <div className={common.kpis}>
                <div className={common.kpi}>
                  <div className={`${common.kpiValue} ${common.accent}`}>
                    {toNumber(accessibility?.violations_count)}
                  </div>
                  <div className={common.kpiLabel}>Violações</div>
                </div>
                <div className={common.kpi}>
                  <div className={common.kpiValue}>
                    {toNumber(accessibility?.accessibility_score)}
                  </div>
                  <div className={common.kpiLabel}>Penalidade</div>
                </div>
                <div className={common.kpi}>
                  <div className={common.kpiValue} style={{ fontSize: "1rem" }}>
                    {accessibility?.axe_source || "—"}
                  </div>
                  <div className={common.kpiLabel}>Fonte</div>
                </div>
              </div>
              {accessibility?.axe_error && (
                <p className={styles.axeError}>
                  Aviso do axe: {accessibility.axe_error}
                </p>
              )}
            </div>
          </div>

          {!result.persistence?.persisted && (
            <p className={common.warn} style={{ marginTop: "var(--space-4)" }}>
              {result.persistence?.error ||
                "Esta análise não foi gravada no histórico (banco indisponível)."}
            </p>
          )}

          {/* Relatório detalhado (modo dev) */}
          {devMode &&
            Array.isArray(accessibility?.detailed_report) &&
            accessibility.detailed_report.length > 0 && (
              <div className={styles.detailed}>
                <h3 className={styles.detailedTitle}>
                  Relatório detalhado (axe-core)
                </h3>
                <ul className={styles.detailedList}>
                  {accessibility.detailed_report.map((v, i) => (
                    <li key={v.id || i} className={styles.violation}>
                      <div className={styles.violationHead}>
                        <Badge
                          tone={
                            v.impact === "critical" || v.impact === "serious"
                              ? "bad"
                              : v.impact === "moderate"
                                ? "warn"
                                : "neutral"
                          }
                        >
                          {v.impact || "n/d"}
                        </Badge>
                        <span className={styles.violationId}>{v.id}</span>
                      </div>
                      {v.description && (
                        <p className={styles.violationDesc}>{v.description}</p>
                      )}
                      {Array.isArray(v.nodes) && v.nodes.length > 0 && (
                        <p className={styles.violationNodes}>
                          {v.nodes.length} elemento(s) afetado(s)
                        </p>
                      )}
                      {v.helpUrl && (
                        <a
                          href={v.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.violationLink}
                        >
                          Como corrigir →
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </Panel>
      )}

      {/* ===== Evolução / análises anteriores ===== */}
      {result && (
        <Panel
          eyebrow="Evolução"
          title="Análises anteriores deste site"
          subtitle="Histórico público de notas para acompanhar a evolução ao longo do tempo."
        >
          {!hasEvolution ? (
            <div className={common.state}>
              Ainda não há histórico suficiente para esta URL. Refaça a análise
              em outro momento para acompanhar a evolução.
            </div>
          ) : (
            <>
              <ScoreSparkline points={chronological} />
              <div className={common.list} style={{ marginTop: "var(--space-4)" }}>
                {[...chronological].reverse().map((p, i, arr) => {
                  const current = toNumber(p.quality_rating);
                  const olderIdx = i + 1;
                  const older =
                    olderIdx < arr.length
                      ? toNumber(arr[olderIdx].quality_rating)
                      : null;
                  const delta = older == null ? null : current - older;
                  return (
                    <div className={common.row} key={p.analysis_id || i}>
                      <div className={common.rowMain}>
                        <div className={common.rowTitle}>
                          Nota {current}
                          {delta != null && delta !== 0 && (
                            <span
                              className={
                                delta > 0 ? styles.deltaUp : styles.deltaDown
                              }
                            >
                              {" "}
                              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
                            </span>
                          )}
                        </div>
                        <div className={common.rowMeta}>
                          <span>{formatDateTime(p.created_at)}</span>
                          <span>{toNumber(p.violations_count)} violações</span>
                          <span>{p.axe_source}</span>
                        </div>
                      </div>
                      <div className={common.rowAside}>
                        <Badge tone={p.is_danger ? "bad" : "good"}>
                          {p.is_danger ? "risco" : "ok"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Panel>
      )}

      {/* ===== Denúncia (somente logado) ===== */}
      {result && !isAuthenticated && (
        <Panel
          eyebrow="Denúncia"
          title="Reportar este site"
          subtitle="Discorda do veredicto ou quer sinalizar um problema?"
        >
          <div className={common.state}>
            Faça login para enviar uma denúncia sobre este site.
          </div>
        </Panel>
      )}

      {result && isAuthenticated && (
        <Panel
          eyebrow="Denúncia"
          title="Reportar este site"
          subtitle="Discorda do veredicto ou quer sinalizar um problema? Envie uma denúncia."
        >
          <form className={styles.reportForm} onSubmit={handleReport}>
            <label className={styles.selectField}>
              <span className={styles.selectLabel}>Tipo</span>
              <select
                className={styles.select}
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.selectField}>
              <span className={styles.selectLabel}>Comentário (opcional)</span>
              <textarea
                className={styles.textarea}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Descreva o que você observou…"
              />
            </label>

            {reportState.status === "success" && (
              <div className={styles.reportSuccess}>{reportState.msg}</div>
            )}
            {reportState.status === "error" && (
              <div className={common.error}>{reportState.msg}</div>
            )}

            <div>
              <Button
                type="submit"
                variant="secondary"
                loading={reportState.status === "loading"}
              >
                Enviar denúncia
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}
