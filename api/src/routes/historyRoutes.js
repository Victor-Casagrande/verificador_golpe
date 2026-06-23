/**
 * Rotas autenticadas de histórico pessoal (GET /users/history).
 */
const express = require("express");
const router = express.Router();
const historyController = require("../controllers/historyController");
const { authenticate, isAdmin } = require("../middlewares/authMiddleware");

router.get("/", authenticate, historyController.getUserHistory);
router.get("/admin", authenticate, isAdmin, historyController.getGlobalHistory);

module.exports = router;
