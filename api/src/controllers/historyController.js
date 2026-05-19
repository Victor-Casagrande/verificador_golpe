const historyRepository = require('../repositories/historyRepository');
const AppError = require('../utils/AppError');

const getUserHistory = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    if (Number.isNaN(limit) || Number.isNaN(offset)) {
      throw new AppError('Parâmetros limit e offset devem ser numéricos.', 400);
    }

    const [items, total] = await Promise.all([
      historyRepository.findByUserId(req.user.id, { limit, offset }),
      historyRepository.countByUserId(req.user.id)
    ]);

    return res.status(200).json({
      sucesso: true,
      total,
      limit,
      offset,
      items: items.map((row) => ({
        id: row.id,
        url: row.url,
        is_danger: row.is_danger,
        status: row.status,
        reason: row.reason,
        accessibility_score: row.accessibility_score,
        violations_count: Array.isArray(row.accessibility_violations)
          ? row.accessibility_violations.length
          : 0,
        created_at: row.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserHistory
};
