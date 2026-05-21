const historyRepository = require('../repositories/historyRepository');
const AppError = require('../utils/AppError');
const { formatAnalysisRow } = require('../utils/formatAnalysis');
const { validateUrl } = require('../utils/validators');

const parsePagination = (queryValue, defaultValue, maxLimit = null) => {
  if (queryValue === undefined || queryValue === null) return defaultValue;
  
  const parsed = parseInt(queryValue, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new AppError('Os parâmetros de paginação (limit/offset) devem ser números inteiros e positivos.', 400);
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
      throw new AppError('O parâmetro de filtro de URL fornecido é inválido.', 400);
    }

    const [items, total] = await Promise.all([
      historyRepository.findByUserId(req.user.id, { limit, offset, urlFilter }),
      historyRepository.countByUserId(req.user.id, urlFilter)
    ]);

    return res.status(200).json({
      sucesso: true,
      total,
      limit,
      offset,
      items: items.map((row) =>
        formatAnalysisRow({
          ...row,
          violations_count: Array.isArray(row.accessibility_violations)
            ? row.accessibility_violations.length
            : 0
        })
      )
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
    const timeline = await historyRepository.findUrlScoreTimeline(url, { limit });

    return res.status(200).json({
      sucesso: true,
      url,
      total: timeline.length,
      timeline: timeline.map((row) => ({
        analysis_id: row.id,
        accessibility_score: row.accessibility_score,
        quality_rating: row.quality_rating,
        violations_count: row.violations_count,
        axe_source: row.axe_source,
        is_danger: row.is_danger,
        status: row.status,
        created_at: row.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserHistory,
  getUrlScoreTimeline
};