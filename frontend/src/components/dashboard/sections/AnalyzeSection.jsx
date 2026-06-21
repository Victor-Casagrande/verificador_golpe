import { useEffect, useState } from "react";
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
  impactLabel,
  impactTone,
  ratingTone,
  securityTone,
  toNumber,
} from "../../../utils/format.js";
import common from "./common.module.css";
import styles from "./AnalyzeSection.module.css";

const VERIFY_STEPS = [
  "Consultando Google Safe Browsing e heurísticas locais…",
  "Abrindo a página no navegador headless…",
  "Executando auditoria axe-core…",
  "Calculando nota de acessibilidade…",
];

const CHART_COLORS = {
  good: "#4ade80",
  warn: "#fbbf24",
  bad: "#f87171",
};

const IMPACT_CARD_CLASS = {
  critical: styles.violationCritical,
  serious: styles.violationSerious,
  moderate: styles.violationModerate,
  minor: styles.violationMinor,
};

/**
 * Gráfico de evolução da nota (0–100) com grade, rótulos e pontos coloridos.
 */
function ScoreHistoryChart({ points }) {
  if (!points || points.length < 2) return null;

  const values = points.map((p) => toNumber(p.quality_rating, 0));
  const latest = values[values.length - 1];
  const previous = values[values.length - 2];
  const delta = latest - previous;
  const minShown = Math.max(0, Math.min(...values) - 10);
  const maxShown = 100;
  const range = maxShown - minShown || 1;

  const w = 400;
  const h = 140;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const coords = values.map((v, i) => {
    const x = padL + (i / (values.length - 1)) * chartW;
    const y = padT + (1 - (v - minShown) / range) * chartH;
    return { x, y, v, tone: ratingTone(v), point: points[i] };
  });

  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${padL},${padT + chartH} ${line} ${padL + chartW},${padT + chartH}`;

  const gridLines = [0, 25, 50, 75, 100].filter((g) => g >= minShown && g <= maxShown);

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartStats}>
        <div className={styles.chartStat}>
          <span className={styles.chartStatLabel}>Última nota</span>
          <span className={`${styles.chartStatValue} ${styles[`chartTone_${ratingTone(latest)}`]}`}>
            {latest}
          </span>
        </div>
        {delta !== 0 && (
          <div className={styles.chartStat}>
            <span className={styles.chartStatLabel}>Variação</span>
            <span className={delta > 0 ? styles.deltaUp : styles.deltaDown}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} pts
            </span>
          </div>
        )}
        <div className={styles.chartStat}>
          <span className={styles.chartStatLabel}>Análises</span>
          <span className={styles.chartStatValue}>{points.length}</span>
        </div>
      </div>

      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Evolução da nota de acessibilidade: de ${values[0]} para ${latest}`}
      >
        <defs>
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0.28)" />
            <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
          </linearGradient>
          <linearGradient id="chartLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => {
          const y = padT + (1 - (g - minShown) / range) * chartH;
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={padL + chartW} y2={y} className={styles.chartGrid} />
              <text x={padL - 6} y={y + 4} className={styles.chartAxisLabel}>
                {g}
              </text>
            </g>
          );
        })}

        <polyline points={area} fill="url(#chartAreaGrad)" stroke="none" />
        <polyline
          points={line}
          fill="none"
          stroke="url(#chartLineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {coords.map((c, i) => {
          const isLast = i === coords.length - 1;
          const color = CHART_COLORS[c.tone] || CHART_COLORS.warn;
          return (
            <g key={i}>
              <circle
                cx={c.x}
                cy={c.y}
                r={isLast ? 6 : 4}
                fill={color}
                stroke="#07090f"
                strokeWidth={isLast ? 2 : 1.5}
              />
              {isLast && (
                <text x={c.x} y={c.y - 10} className={styles.chartPointLabel} textAnchor="middle">
                  {c.v}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className={styles.chartLegend}>
        <span>
          <i className={styles.legendDot} style={{ background: CHART_COLORS.good }} />≥ 80
        </span>
        <span>
          <i className={styles.legendDot} style={{ background: CHART_COLORS.warn }} />
          50–79
        </span>
        <span>
          <i className={styles.legendDot} style={{ background: CHART_COLORS.bad }} />
          &lt; 50
        </span>
      </div>
    </div>
  );
}

function VerifyingStatus({ stepIndex }) {
  return (
    <div className={styles.verifyingCard} role="status" aria-live="polite">
      <div className={styles.verifyingIconRing} aria-hidden="true">
        <div className={styles.verifyingIconPulse} />
        <svg className={styles.verifyingIcon} viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className={styles.verifyingText}>
        <h3 className={styles.verifyingTitle}>Verificando URL…</h3>
        <p className={styles.verifyingHint}>
          Isso pode levar alguns segundos — estamos analisando segurança e acessibilidade em
          paralelo.
        </p>
      </div>
      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressBar} />
      </div>
      <ol className={styles.verifySteps}>
        {VERIFY_STEPS.map((label, i) => (
          <li
            key={label}
            className={`${styles.verifyStep} ${
              i < stepIndex ? styles.verifyStepDone : i === stepIndex ? styles.verifyStepActive : ""
            }`}
          >
            <span className={styles.verifyStepDot} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function AnalyzeSection() {
  const { isAuthenticated } = useAuth();
  const [url, setUrl] = useState("");
  const [devMode, setDevMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyStep, setVerifyStep] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [timeline, setTimeline] = useState(null);

  const [reportType, setReportType] = useState(REPORT_TYPES[0].value);
  const [comment, setComment] = useState("");
  const [reportState, setReportState] = useState({ status: "idle", msg: null });

  useEffect(() => {
    if (!loading) {
      setVerifyStep(0);
      return undefined;
    }
    const id = setInterval(() => {
      setVerifyStep((i) => Math.min(i + 1, VERIFY_STEPS.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [loading]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Informe uma URL para verificar.");
      return;
    }
    setLoading(true);
    setVerifyStep(0);
    setError(null);
    setResult(null);
    setTimeline(null);
    setReportState({ status: "idle", msg: null });

    try {
      const data = await analyzeUrl({ url: trimmed, devMode });
      setResult(data);

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
        msg: err instanceof ApiError ? err.message : "Não foi possível enviar a denúncia.",
      });
    }
  };

  const security = result?.security;
  const accessibility = result?.accessibility;
  const chronological = timeline?.timeline ? [...timeline.timeline].reverse() : [];
  const hasEvolution = chronological.length >= 2;

  return (
    <div className={common.stack}>
      <Panel
        eyebrow="Verificação"
        title="Analisar um site"
        subtitle="Cole o link para checar segurança (golpe/phishing) e acessibilidade (axe-core)."
      >
        <form
          className={`${styles.form} ${loading ? styles.formLoading : ""}`}
          onSubmit={handleAnalyze}
        >
          <div className={styles.inputRow}>
            <TextField
              label="URL do site"
              type="url"
              name="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemplo.com/pagina"
              autoComplete="off"
              disabled={loading}
            />
          </div>

          <div className={styles.controls}>
            <Toggle
              checked={devMode}
              onChange={setDevMode}
              label="Modo dev"
              hint="Inclui o relatório detalhado das violações do axe-core."
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading || !url.trim()}
            >
              {loading ? "Verificando…" : "Verificar URL"}
            </Button>
          </div>

          {error && <div className={common.error}>{error}</div>}
        </form>

        {loading && <VerifyingStatus stepIndex={verifyStep} />}
      </Panel>

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
                <p className={styles.axeError}>Aviso do axe: {accessibility.axe_error}</p>
              )}
            </div>
          </div>

          {!result.persistence?.persisted && (
            <p className={common.warn} style={{ marginTop: "var(--space-4)" }}>
              {result.persistence?.error ||
                "Esta análise não foi gravada no histórico (banco indisponível)."}
            </p>
          )}

          {devMode &&
            Array.isArray(accessibility?.detailed_report) &&
            accessibility.detailed_report.length > 0 && (
              <div className={styles.detailed}>
                <h3 className={styles.detailedTitle}>Relatório detalhado (axe-core)</h3>
                <p className={styles.detailedHint}>
                  Cores por gravidade: crítico (peso 10) → grave (5) → moderado (2) → leve (1).
                </p>
                <ul className={styles.detailedList}>
                  {accessibility.detailed_report.map((v, i) => {
                    const impact = v.impact || "minor";
                    const cardClass = IMPACT_CARD_CLASS[impact] || styles.violationMinor;
                    return (
                      <li key={v.id || i} className={`${styles.violation} ${cardClass}`}>
                        <div className={styles.violationHead}>
                          <Badge tone={impactTone(impact)}>{impactLabel(impact)}</Badge>
                          <span className={styles.violationId}>{v.id}</span>
                        </div>
                        {v.description && <p className={styles.violationDesc}>{v.description}</p>}
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
                    );
                  })}
                </ul>
              </div>
            )}
        </Panel>
      )}

      {result && (
        <Panel
          eyebrow="Evolução"
          title="Análises anteriores deste site"
          subtitle="Histórico público de notas para acompanhar a evolução ao longo do tempo."
        >
          {!hasEvolution ? (
            <div className={common.state}>
              Ainda não há histórico suficiente para esta URL. Refaça a análise em outro momento
              para acompanhar a evolução.
            </div>
          ) : (
            <>
              <ScoreHistoryChart points={chronological} />
              <div className={common.list} style={{ marginTop: "var(--space-5)" }}>
                {[...chronological].reverse().map((p, i, arr) => {
                  const current = toNumber(p.quality_rating);
                  const olderIdx = i + 1;
                  const older =
                    olderIdx < arr.length ? toNumber(arr[olderIdx].quality_rating) : null;
                  const delta = older == null ? null : current - older;
                  return (
                    <div className={common.row} key={p.analysis_id || i}>
                      <div className={common.rowMain}>
                        <div className={common.rowTitle}>
                          Nota {current}
                          {delta != null && delta !== 0 && (
                            <span className={delta > 0 ? styles.deltaUp : styles.deltaDown}>
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
                        <Badge tone={ratingTone(current)}>{current}/100</Badge>
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

      {result && !isAuthenticated && (
        <Panel
          eyebrow="Denúncia"
          title="Reportar este site"
          subtitle="Discorda do veredicto ou quer sinalizar um problema?"
        >
          <div className={common.state}>Faça login para enviar uma denúncia sobre este site.</div>
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
              <Button type="submit" variant="secondary" loading={reportState.status === "loading"}>
                Enviar denúncia
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}
