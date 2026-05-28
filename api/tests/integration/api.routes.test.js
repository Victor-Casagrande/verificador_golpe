const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../helpers/testApp");

describe("API routes (integration)", () => {
  it("GET /api/status retorna 200 e inclui health do banco", async () => {
    const res = await request(app).get("/api/status");
    assert.equal(res.status, 200);
    assert.equal(res.body.sucesso, true);
    assert.ok(res.body.dependencies, "deve expor o bloco dependencies");
    assert.ok(
      res.body.dependencies.database,
      "deve expor health do banco em dependencies.database",
    );
    assert.equal(typeof res.body.dependencies.database.ok, "boolean");
  });

  it("GET /api/docs.json expõe especificação OpenAPI", async () => {
    const res = await request(app).get("/api/docs.json");
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, "3.0.0");
    assert.ok(res.body.paths["/urls/analyze"]);
  });

  it("GET /auth/oauth/providers retorna lista", async () => {
    const res = await request(app).get("/auth/oauth/providers");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.providers));
  });

  it("POST /auth/register valida campos obrigatórios", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "a@b.com" });
    assert.equal(res.status, 400);
  });

  it("POST /urls/analyze rejeita URL inválida", async () => {
    const res = await request(app)
      .post("/urls/analyze")
      .send({ url: "invalid-url" });
    assert.equal(res.status, 400);
  });

  it("POST /urls/analyze rejeita dev_mode inválido", async () => {
    const res = await request(app)
      .post("/urls/analyze")
      .send({ url: "https://www.example.com", dev_mode: "yes" });

    assert.equal(res.status, 400);
  });

  it("POST /urls/analyze aceita URL segura (heurística local)", async () => {
    const res = await request(app)
      .post("/urls/analyze")
      .send({ url: "https://www.example.com", accessibility_report: [] });

    assert.equal(res.status, 200);
    assert.ok(res.body.security);
    assert.equal(typeof res.body.security.is_danger, "boolean");
    assert.ok(res.body.accessibility);
    assert.equal(typeof res.body.accessibility.quality_rating, "number");
    assert.equal(res.body.cached, false);
    assert.ok(res.body.persistence, "deve incluir o bloco persistence");
    assert.equal(typeof res.body.persistence.persisted, "boolean");
  });

  it("GET /urls/scores/history exige url válida", async () => {
    const res = await request(app).get("/urls/scores/history");
    assert.equal(res.status, 400);
  });

  it("GET /rankings/accessibility/best retorna ranking", async () => {
    const res = await request(app).get("/rankings/accessibility/best");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.rankings));
  });

  it("GET /users/history exige autenticação", async () => {
    const res = await request(app).get("/users/history");
    assert.equal(res.status, 401);
  });
});
