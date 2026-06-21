/**
 * Rotas OAuth aninhadas em /auth/oauth (GitHub, Google).
 */
const express = require("express");
const router = express.Router();
const oauthController = require("../controllers/oauthController");
const AppError = require("../utils/AppError");
const { SUPPORTED_PROVIDERS } = require("../config/oauthProviders");

const ensureProvider = (req, res, next) => {
  if (!SUPPORTED_PROVIDERS.includes(req.params.provider)) {
    return next(new AppError("Provedor OAuth não suportado.", 404));
  }
  next();
};

router.get("/providers", oauthController.listProviders);
router.get("/:provider/callback", ensureProvider, oauthController.handleCallback);
router.get("/:provider", ensureProvider, oauthController.redirectToProvider);

module.exports = router;
