const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const oauthRoutes = require("./oauthRoutes");
const {
  validateRegister,
  validateLogin,
} = require("../middlewares/authValidationMiddleware");

router.get("/success", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Autenticação Sentinela</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8fafc; color: #1e293b; margin: 0; }
          .box { text-align: center; padding: 40px; border-radius: 12px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          .icon { font-size: 48px; margin-bottom: 16px; display: block; }
          h2 { margin: 0 0 8px 0; color: #0f172a; }
          p { color: #64748b; margin-bottom: 0; }
        </style>
      </head>
      <body>
        <div class="box">
          <span class="icon">✅</span>
          <h2>Autenticação Concluída</h2>
          <p>Você já pode fechar esta aba e voltar para a extensão.</p>
          <script>
            // Tenta fechar a aba automaticamente se a extensão não o fizer instantaneamente
            setTimeout(() => window.close(), 1500);
          </script>
        </div>
      </body>
    </html>
  `);
});

router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);
router.use("/oauth", oauthRoutes);

module.exports = router;
