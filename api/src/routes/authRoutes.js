const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const oauthRoutes = require("./oauthRoutes");
const {
  validateRegister,
  validateLogin,
} = require("../middlewares/authValidationMiddleware");

router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.use("/oauth", oauthRoutes);

module.exports = router;
