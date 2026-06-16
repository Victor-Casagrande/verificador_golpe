const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authenticate } = require("../middlewares/authMiddleware");
const { reportLimiter } = require("../middlewares/rateLimitMiddleware");
const {
  validateCreateReport,
} = require("../middlewares/reportValidationMiddleware");

router.post(
  "/",
  authenticate,
  reportLimiter,
  validateCreateReport,
  reportController.createReport,
);

router.get("/mine", authenticate, reportController.getMyReports);

module.exports = router;
