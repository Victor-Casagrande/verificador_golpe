/**
 * Timeline pública de notas de acessibilidade por URL (GET /urls/scores/history).
 */
const express = require("express");
const router = express.Router();
const historyController = require("../controllers/historyController");

router.get("/history", historyController.getUrlScoreTimeline);

module.exports = router;
