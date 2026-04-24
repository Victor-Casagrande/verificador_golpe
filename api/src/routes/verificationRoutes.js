const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { validateVerificationRequest } = require('../middlewares/validationMiddleware');

// Define que quando houver um POST na raiz dessa rota, primeiro ele passa 
// pelo middleware de validação e, se aprovado, executa o controlador.
router.post('/', validateVerificationRequest, verificationController.verifyUrl);

module.exports = router;