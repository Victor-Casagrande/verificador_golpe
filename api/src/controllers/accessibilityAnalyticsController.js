const accessibilityAnalyticsRepository = require("../repositories/accessibilityAnalyticsRepository");

const getGlobalAccessibilityOverview = async (req, res, next) => {
  try {
    const stats =
      await accessibilityAnalyticsRepository.getGlobalAccessibilityStats();

    return res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[Accessibility Analytics Controller] Erro em getGlobalAccessibilityOverview:",
      error,
    );
    next(error);
  }
};

const getWorstAccessibilityHosts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "O parâmetro limit deve ser um número inteiro positivo.",
      });
    }

    const ranking =
      await accessibilityAnalyticsRepository.getWorstAccessibilityHosts(limit);

    return res.status(200).json({
      success: true,
      count: ranking.length,
      data: ranking,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[Accessibility Analytics Controller] Erro em getWorstAccessibilityHosts:",
      error,
    );
    next(error);
  }
};

module.exports = {
  getGlobalAccessibilityOverview,
  getWorstAccessibilityHosts,
};
