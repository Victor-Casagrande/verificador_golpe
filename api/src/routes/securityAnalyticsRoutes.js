const express = require("express");
const router = express.Router();
const securityAnalyticsController = require("../controllers/securityAnalyticsController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

/**
 * @route GET /api/analytics/security/global
 * @desc Retorna volumetria geral de fraudes interceptadas e eficiência do cache
 */
router.get("/global", securityAnalyticsController.getGlobalSecurityOverview);

/**
 * @route GET /api/analytics/security/community
 * @desc Retorna o balanço de feedbacks e falsos positivos gerados pelas heurísticas
 */
router.get(
  "/community",
  securityAnalyticsController.getCommunityFeedbackOverview,
);

/**
 * @route GET /api/analytics/security/ranking/hosts
 * @desc Retorna o ranking de domínios perigosos com limite configurável via query (?limit=X)
 */
router.get(
  "/ranking/hosts",
  securityAnalyticsController.getDangerousHostsRanking,
);

module.exports = router;
