const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validateCreateReport } = require('../middlewares/reportValidationMiddleware');

router.post('/', authenticate, validateCreateReport, reportController.createReport);

module.exports = router;
