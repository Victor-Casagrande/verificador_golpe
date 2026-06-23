/**
 * Histórico pessoal de análises e timeline pública de notas por URL.
 */
const historyRepository = require("../repositories/historyRepository");
const AppError = require("../utils/AppError");
const { formatAnalysisRow } = require("../utils/formatAnalysis");
const { validateUrl } = require("../utils/validators");
const { normalizeAnalysisUrl } = require("../utils/urlNormalize");

const parsePagination = (queryValue, defaultValue, maxLimit = null) => {
  if (queryValue === undefined || queryValue === null) return defaultValue;

  const parsed = parseInt(queryValue, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new AppError(
      "Os parâmetros de paginação (limit/offset) devem ser números inteiros e positivos.",
      400,
    );
  }

  if (maxLimit && parsed > maxLimit) return maxLimit;
  return parsed;
};

const getUserHistory = async (req, res, next) => {
  try {
    const limit = parsePagination(req.query.limit, 20, 100);
    const offset = parsePagination(req.query.offset, 0);
    const urlFilter = req.query.url || null;

    if (urlFilter && !validateUrl(urlFilter)) {
      throw new AppError("O parâmetro de filtro de URL fornecido é inválido.", 400);
    }

    const normalizedFilter = urlFilter ? normalizeAnalysisUrl(urlFilter) : null;

    const [items, stats] = await Promise.all([
      historyRepository.findByUserId(req.user.id, {
        limit,
        offset,
        urlFilter: normalizedFilter,
      }),
      historyRepository.countStatsByUserId(req.user.id, normalizedFilter),
    ]);

    return res.status(200).json({
      sucesso: true,
      total: stats.total,
      safe: stats.safe,
      danger: stats.danger,
      limit,
      offset,
      items: items.map((row) =>
        formatAnalysisRow({
          ...row,
          violations_count: Array.isArray(row.accessibility_violations)
            ? row.accessibility_violations.length
            : 0,
        }),
      ),
    });
  } catch (error) {
    next(error);
  }
};

const getUrlScoreTimeline = async (req, res, next) => {
  try {
    const url = req.query.url;
    if (!url || !validateUrl(url)) {
      throw new AppError('O parâmetro "url" é obrigatório e deve conter um link válido.', 400);
    }

    const limit = parsePagination(req.query.limit, 30, 100);
    const normalizedUrl = normalizeAnalysisUrl(url);
    const timeline = await historyRepository.findUrlScoreTimeline(normalizedUrl, {
      limit,
    });

    return res.status(200).json({
      sucesso: true,
      url: normalizedUrl,
      total: timeline.length,
      timeline: timeline.map((row) => ({
        analysis_id: row.id,
        accessibility_score: row.accessibility_score,
        quality_rating: row.quality_rating,
        violations_count: row.violations_count,
        axe_source: row.axe_source,
        is_danger: row.is_danger,
        status: row.status,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const getGlobalHistory = async (req, res, next) => {
  try {
    const limit = parsePagination(req.query.limit, 20, 100);
    const offset = parsePagination(req.query.offset, 0);

    const [items, stats] = await Promise.all([
      historyRepository.findAllGlobal({ limit, offset }),
      historyRepository.countStatsGlobal(),
    ]);

    return res.status(200).json({
      sucesso: true,
      total: stats.total,
      safe: stats.safe,
      danger: stats.danger,
      limit,
      offset,
      items: items.map((row) =>
        formatAnalysisRow({
          ...row,
          violations_count: 0,
        }),
      ),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserHistory,
  getUrlScoreTimeline,
  getGlobalHistory,
};
