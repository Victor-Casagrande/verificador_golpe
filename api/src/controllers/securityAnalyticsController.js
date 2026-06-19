/**
 * Analytics agregados de segurança (autenticado) — volumetria e hosts perigosos.
 */
const securityAnalyticsRepository = require("../repositories/securityAnalyticsRepository");

const getGlobalSecurityOverview = async (req, res, next) => {
  try {
    const stats = await securityAnalyticsRepository.getGlobalSecurityStats();

    return res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Security Analytics Controller] Erro em getGlobalSecurityOverview:", error);
    next(error);
  }
};

const getCommunityFeedbackOverview = async (req, res, next) => {
  try {
    const feedbackStats = await securityAnalyticsRepository.getCommunityFeedbackStats();

    return res.status(200).json({
      success: true,
      data: feedbackStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Security Analytics Controller] Erro em getCommunityFeedbackOverview:", error);
    next(error);
  }
};

const getDangerousHostsRanking = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "O parâmetro limit deve ser um número inteiro positivo.",
      });
    }

    const ranking = await securityAnalyticsRepository.getMostDangerousHosts(limit);

    return res.status(200).json({
      success: true,
      count: ranking.length,
      data: ranking,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Security Analytics Controller] Erro em getDangerousHostsRanking:", error);
    next(error);
  }
};

module.exports = {
  getGlobalSecurityOverview,
  getCommunityFeedbackOverview,
  getDangerousHostsRanking,
};
