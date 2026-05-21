const db = require("../config/database");

const getGlobalAccessibilityStats = async () => {
  const query = `
    SELECT 
      COUNT(id) AS total_audits,
      -- Calcula a média geral ignorando registos onde a auditoria falhou completamente
      ROUND(AVG(quality_rating), 2) AS avg_quality_rating,
      ROUND(AVG(accessibility_score), 2) AS avg_accessibility_score,
      
      -- Volumetria de execução do Axe-core
      SUM(CASE WHEN axe_source = 'server' THEN 1 ELSE 0 END) AS server_audits,
      SUM(CASE WHEN axe_source = 'client' THEN 1 ELSE 0 END) AS client_audits,
      SUM(CASE WHEN axe_source = 'skipped' THEN 1 ELSE 0 END) AS skipped_audits
    FROM url_analyses
    WHERE accessibility_score IS NOT NULL;
  `;

  try {
    const result = await db.query(query);
    const row = result.rows[0];

    return {
      total_audits: parseInt(row.total_audits || 0, 10),
      avg_quality_rating: parseFloat(row.avg_quality_rating || 100),
      avg_accessibility_score: parseFloat(row.avg_accessibility_score || 0),
      execution_sources: {
        server: parseInt(row.server_audits || 0, 10),
        client: parseInt(row.client_audits || 0, 10),
        skipped: parseInt(row.skipped_audits || 0, 10),
      },
    };
  } catch (error) {
    console.error(
      "[Analytics] Erro ao buscar estatísticas globais de acessibilidade:",
      error,
    );
    throw error;
  }
};

/**
 * Retorna o Ranking dos domínios com a PIOR média de acessibilidade.
 * Agrupa pela coluna site_host para consolidar diferentes URLs da mesma instituição/empresa.
 * * @param {number} limit - Quantidade de hosts a retornar (Top 10 por padrão)
 */
const getWorstAccessibilityHosts = async (limit = 10) => {
  const query = `
    SELECT 
      site_host,
      COUNT(id) AS pages_audited,
      ROUND(AVG(quality_rating), 2) AS avg_quality_rating,
      ROUND(AVG(accessibility_score), 2) AS avg_penalty_score
    FROM url_analyses
    -- Filtra apenas domínios válidos e exclui páginas onde o Axe-core não rodou
    WHERE site_host IS NOT NULL AND axe_source != 'skipped'
    GROUP BY site_host
    -- A ordenação ASCendente traz as menores notas de qualidade (piores sites) primeiro
    ORDER BY avg_quality_rating ASC, pages_audited DESC
    LIMIT $1;
  `;

  try {
    const result = await db.query(query, [limit]);

    return result.rows.map((row) => ({
      site_host: row.site_host,
      pages_audited: parseInt(row.pages_audited || 0, 10),
      avg_quality_rating: parseFloat(row.avg_quality_rating || 0),
      avg_penalty_score: parseFloat(row.avg_penalty_score || 0),
    }));
  } catch (error) {
    console.error(
      "[Analytics] Erro ao buscar ranking de hosts com pior acessibilidade:",
      error,
    );
    throw error;
  }
};

module.exports = {
  getGlobalAccessibilityStats,
  getWorstAccessibilityHosts,
};
