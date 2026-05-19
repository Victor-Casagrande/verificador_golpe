const historyRepository = require('../repositories/historyRepository');
const AppError = require('../utils/AppError');
const { formatAnalysisRow } = require('../utils/formatAnalysis');
const { validateUrl } = require('../utils/validators');

const getUserHistory = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const urlFilter = req.query.url || null;

    if (Number.isNaN(limit) || Number.isNaN(offset)) {
      throw new AppError('Parâmetros limit e offset devem ser numéricos.', 400);
    }

    if (urlFilter && !validateUrl(urlFilter)) {
      throw new AppError('Parâmetro url inválido.', 400);
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
      throw new AppError('Query param url é obrigatório e deve ser válido.', 400);
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
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
