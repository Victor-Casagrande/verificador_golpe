const express = require("express");
const router = express.Router();
const verificationController = require("../controllers/verificationController");
const {
  validateVerificationRequest,
} = require("../middlewares/validationMiddleware");
const { optionalAuthenticate } = require("../middlewares/authMiddleware");
const { analyzeLimiter } = require("../middlewares/rateLimitMiddleware");

router.post(
  "/",
  analyzeLimiter,
  optionalAuthenticate,
  validateVerificationRequest,
  verificationController.verifyUrl,
);

module.exports = router;
