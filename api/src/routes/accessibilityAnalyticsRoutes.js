const express = require('express');
const router = express.Router();
const accessibilityAnalyticsController = require('../controllers/accessibilityAnalyticsController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

/**
 * @route GET /api/analytics/accessibility/global
 * @desc Retorna volumetria geral e médias de notas de acessibilidade
 */
router.get('/global', accessibilityAnalyticsController.getGlobalAccessibilityOverview);

/**
 * @route GET /api/analytics/accessibility/ranking/hosts
 * @desc Retorna o ranking de domínios com piores notas de acessibilidade com limite configurável (?limit=X)
 */
router.get('/ranking/hosts', accessibilityAnalyticsController.getWorstAccessibilityHosts);

module.exports = router;