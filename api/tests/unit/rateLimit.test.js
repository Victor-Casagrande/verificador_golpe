const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const { authLimiter } = require("../../src/middlewares/rateLimitMiddleware");
const errorHandlerMiddleware = require("../../src/middlewares/errorHandlerMiddleware");

describe("Rate Limiting Middleware - IP Blocking", () => {
  it("Deve bloquear a 11ª requisição no authLimiter com 429 e X-RateLimit-Remaining: 0", async () => {
    const app = express();
    app.set('trust proxy', 1); // Confia no X-Forwarded-For para mockar IPs

    // Rota fake para testar o limiter
    app.post("/login", authLimiter, (req, res) => res.status(200).send("OK"));
    app.use(errorHandlerMiddleware);

    const testIP = "192.168.9.99";
    let res;

    // Dispara 10 requisições permitidas
    for (let i = 0; i < 10; i++) {
      res = await request(app)
        .post("/login")
        .set("X-Forwarded-For", testIP);
      
      assert.equal(res.status, 200, `A requisição ${i + 1} deveria passar, mas falhou.`);
      assert.ok(
        parseInt(res.headers["x-ratelimit-remaining"]) >= 0, 
        "Deve conter header indicando rate limit remaining"
      );
    }

    // 11ª requisição deve ser bloqueada
    res = await request(app)
      .post("/login")
      .set("X-Forwarded-For", testIP);

    assert.equal(res.status, 429, "A 11ª requisição deveria retornar 429 (Too Many Requests).");
    assert.equal(
      res.headers["x-ratelimit-remaining"], 
      "0", 
      "O header X-RateLimit-Remaining deveria ser igual a 0."
    );
    assert.ok(
      res.body.error.message.includes("Limite de tentativas de login excedido"),
      "Deve propagar a mensagem de erro customizada."
    );
  });
});
