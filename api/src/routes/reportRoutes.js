/**
 * Rotas de denúncias comunitárias (POST /reports, GET /reports/mine).
 */
const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authenticate, isAdmin } = require("../middlewares/authMiddleware");
const { reportLimiter } = require("../middlewares/rateLimitMiddleware");
const { validateCreateReport } = require("../middlewares/reportValidationMiddleware");

router.post("/", authenticate, reportLimiter, validateCreateReport, reportController.createReport);

router.get("/mine", authenticate, reportController.getMyReports);

// Rotas Administrativas
router.get("/admin", authenticate, isAdmin, reportController.getAllAdminReports);
router.patch("/admin/:id/status", authenticate, isAdmin, reportController.updateReportStatus);

module.exports = router;
