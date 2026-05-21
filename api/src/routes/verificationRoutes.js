const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { validateVerificationRequest } = require('../middlewares/validationMiddleware');
const { optionalAuthenticate } = require('../middlewares/authMiddleware');

/** Análise de URL: segurança + acessibilidade (axe-core). Body opcional: dev_mode, accessibility_report */
router.post(
  '/',
  optionalAuthenticate,
  validateVerificationRequest,
  verificationController.verifyUrl
);

module.exports = router;