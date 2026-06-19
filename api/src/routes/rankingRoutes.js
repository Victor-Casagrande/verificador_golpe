/**
 * Rankings públicos de acessibilidade e sites mais denunciados.
 */
const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

router.get("/accessibility/worst", reportController.getWorstAccessibilityRankings);
router.get("/accessibility/best", reportController.getBestAccessibilityRankings);
router.get("/reports/most", reportController.getMostReportedSites);

module.exports = router;
