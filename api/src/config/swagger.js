const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sentinela APL API",
      version: "1.0.0",
      description:
        "API do verificador de golpes e auditoria de acessibilidade. " +
        "Autenticação local (e-mail/senha) ou OAuth (GitHub, Google). " +
        "Contas com o mesmo e-mail são unificadas entre provedores.",
    },
    servers: [
      { url: "http://localhost:3000", description: "Desenvolvimento local" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        AuthResponse: {
          type: "object",
          properties: {
            sucesso: { type: "boolean", example: true },
            token: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
                email: { type: "string", format: "email" },
                oauth_providers: {
                  type: "array",
                  items: { type: "string", enum: ["github", "google"] },
                },
              },
            },
          },
        },
        UrlAnalyzeRequest: {
          type: "object",
          required: ["url"],
          properties: {
            url: {
              type: "string",
              format: "uri",
              example: "https://exemplo.com",
            },
            accessibility_report: { type: "array", items: { type: "object" } },
            dev_mode: {
              type: "boolean",
              default: false,
              description:
                "Quando true, inclui accessibility.detailed_report com exceções axe-core (nós, HTML, failureSummary)",
            },
          },
        },
        ReportRequest: {
          type: "object",
          required: ["url", "report_type"],
          properties: {
            url: { type: "string", format: "uri" },
            analysis_id: { type: "integer" },
            report_type: {
              type: "string",
              enum: [
                "false_positive",
                "confirmed_scam",
                "accessibility_issue",
                "other",
              ],
            },
            comment: { type: "string", maxLength: 2000 },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                message: { type: "string" },
                status: { type: "integer" },
                timestamp: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, "../docs/paths/*.js")],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
