/**
 * Consultas SQL agregadas para analytics de segurança (dashboard autenticado).
 */
const db = require("../config/database");

const getGlobalSecurityStats = async () => {
  const query = `
    SELECT 
      COUNT(id) AS total_analyses,
      SUM(CASE WHEN is_danger = true THEN 1 ELSE 0 END) AS total_threats,
      SUM(CASE WHEN is_danger = false THEN 1 ELSE 0 END) AS total_safe,
      -- Métrica de Motor: Confirma a eficiência do nosso motor vs Google
      SUM(CASE WHEN is_danger = true AND status = 'GOLPE CONFIRMADO' THEN 1 ELSE 0 END) AS threats_caught_by_google,
      SUM(CASE WHEN is_danger = true AND status LIKE '%Heurística%' THEN 1 ELSE 0 END) AS threats_caught_by_heuristics,
      -- Métrica de Infraestrutura: Economia de processamento
      SUM(CASE WHEN security_from_cache = true THEN 1 ELSE 0 END) AS total_cache_hits
    FROM url_analyses;
  `;

  try {
    const result = await db.query(query);
    const row = result.rows[0];
    return {
      total_analyses: parseInt(row.total_analyses || 0, 10),
      total_threats: parseInt(row.total_threats || 0, 10),
      total_safe: parseInt(row.total_safe || 0, 10),
      threats_caught_by_google: parseInt(row.threats_caught_by_google || 0, 10),
      threats_caught_by_heuristics: parseInt(row.threats_caught_by_heuristics || 0, 10),
      total_cache_hits: parseInt(row.total_cache_hits || 0, 10),
    };
  } catch (error) {
    console.error("[Analytics] Erro ao buscar estatísticas globais de segurança:", error);
    throw error;
  }
};

const getCommunityFeedbackStats = async () => {
  const query = `
    SELECT 
      r.report_type,
      COUNT(r.id) AS total_reports,
      -- Agrega de onde veio a análise original para mapear falsos positivos
      SUM(CASE WHEN ua.status LIKE '%Heurística%' THEN 1 ELSE 0 END) AS related_to_heuristics,
      SUM(CASE WHEN ua.status = 'GOLPE CONFIRMADO' THEN 1 ELSE 0 END) AS related_to_google
    FROM reports r
    -- O LEFT JOIN garante que ainda contemos relatórios órfãos, 
    -- mas conectemos dados da análise caso ela exista
    LEFT JOIN url_analyses ua ON r.url_analysis_id = ua.id
    GROUP BY r.report_type
    ORDER BY total_reports DESC;
  `;

  try {
    const result = await db.query(query);
    return result.rows.map((row) => ({
      report_type: row.report_type,
      total_reports: parseInt(row.total_reports || 0, 10),
      related_to_heuristics: parseInt(row.related_to_heuristics || 0, 10),
      related_to_google: parseInt(row.related_to_google || 0, 10),
    }));
  } catch (error) {
    console.error("[Analytics] Erro ao buscar estatísticas de feedback da comunidade:", error);
    throw error;
  }
};

/**
 * Retorna o Ranking dos domínios mais perigosos analisados.
 * Agrupa pela coluna site_host para consolidar diferentes URLs do mesmo atacante.
 * @param {number} limit - Quantidade de hosts a retornar (Top 10 por padrão)
 */
const getMostDangerousHosts = async (limit = 10) => {
  const query = `
    SELECT 
      site_host,
      COUNT(id) AS threat_count,
      MAX(created_at) AS last_threat_seen
    FROM url_analyses
    WHERE is_danger = true AND site_host IS NOT NULL
    GROUP BY site_host
    ORDER BY threat_count DESC, last_threat_seen DESC
    LIMIT $1;
  `;

  try {
    const result = await db.query(query, [limit]);
    return result.rows.map((row) => ({
      site_host: row.site_host,
      threat_count: parseInt(row.threat_count || 0, 10),
      last_threat_seen: row.last_threat_seen,
    }));
  } catch (error) {
    console.error("[Analytics] Erro ao buscar ranking de hosts perigosos:", error);
    throw error;
  }
};

module.exports = {
  getGlobalSecurityStats,
  getCommunityFeedbackStats,
  getMostDangerousHosts,
};
