const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sentinela APL API",
      version: "1.0.0",
      description:
        "API do **Sentinela APL** — verificador de golpes e auditoria de acessibilidade web.\n\n" +
        "### Funcionalidades\n" +
        "- **Segurança:** Google Safe Browsing + heurísticas locais (7 regras estruturais) com cache de 24 h.\n" +
        "- **Acessibilidade:** auditoria axe-core via Puppeteer; nota `quality_rating` (0–100, maior = melhor) " +
        "e penalidade `accessibility_score` (maior = pior).\n" +
        "- **Contas:** autenticação local ou OAuth (GitHub, Google); contas com o mesmo e-mail são unificadas.\n" +
        "- **Comunidade:** histórico pessoal, denúncias, rankings públicos e analytics agregados.\n\n" +
        "### Peculiaridades\n" +
        "- `POST /urls/analyze` funciona **sem autenticação**; com JWT, vincula ao histórico do usuário.\n" +
        "- Se o banco estiver indisponível, a análise continua — apenas `persistence.persisted` será `false`.\n" +
        "- `dev_mode: true` inclui relatório detalhado axe (respostas grandes; usar só em desenvolvimento).\n\n" +
        "### Autores\n" +
        "Victor Casagrande · Lucas Duarte Lopes · Matheus Trombetta Degaraes · Willighan Tinelli de Souza\n\n" +
        "IFC — Desenvolvimento Web II, Engenharia de Software I, Projeto Aplicado I.\n\n" +
        "Licenciado sob **GNU GPL v3.0** — veja [LICENSE](https://github.com/Victor-Casagrande/verificador_golpe/blob/main/LICENSE).",
      contact: {
        name: "Grupo Sentinela APL — IFC",
        url: "https://github.com/Victor-Casagrande/verificador_golpe",
      },
      license: {
        name: "GPL-3.0-or-later",
        url: "https://www.gnu.org/licenses/gpl-3.0.html",
      },
    },
    servers: [
      { url: "http://localhost:3000", description: "Desenvolvimento local (Docker)" },
      {
        url: "https://sentinela-api.onrender.com",
        description: "Produção (Render — cold start após inatividade)",
      },
    ],
    tags: [
      {
        name: "Sistema",
        description: "Health check e índice da API",
      },
      {
        name: "Autenticação",
        description: "Registro e login com e-mail e senha",
      },
      {
        name: "OAuth",
        description:
          "Login social via GitHub ou Google. Contas com o mesmo e-mail são unificadas automaticamente.",
      },
      {
        name: "Verificação",
        description:
          "Análise de URL: segurança (Safe Browsing + heurísticas) e acessibilidade (axe-core). " +
          "Autenticação opcional.",
      },
      {
        name: "Histórico",
        description: "Consulta de análises anteriores — pessoal (autenticado) ou por URL (público)",
      },
      {
        name: "Denúncias",
        description: "Feedback comunitário sobre URLs analisadas",
      },
      {
        name: "Rankings",
        description: "Rankings públicos de acessibilidade e denúncias por host",
      },
      {
        name: "Analytics",
        description: "Agregações para dashboard — requer autenticação",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Token obtido via `/auth/login`, `/auth/register` ou callback OAuth",
        },
      },
      schemas: {
        AuthResponse: {
          type: "object",
          properties: {
            sucesso: { type: "boolean", example: true },
            token: { type: "string", description: "JWT de sessão" },
            user: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
                email: { type: "string", format: "email" },
                oauth_providers: {
                  type: "array",
                  items: { type: "string", enum: ["github", "google"] },
                  description: "Provedores OAuth vinculados à conta",
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
              description: "URL http(s) a analisar",
            },
            accessibility_report: {
              type: "array",
              items: { type: "object" },
              description:
                "Relatório axe enviado pela extensão; usado como fallback se a auditoria no servidor falhar",
            },
            dev_mode: {
              type: "boolean",
              default: false,
              description:
                "Inclui `accessibility.detailed_report` com violações completas (nós, HTML). Apenas para desenvolvimento.",
            },
          },
        },
        SecurityVerdict: {
          type: "object",
          properties: {
            is_danger: { type: "boolean", description: "true se a URL foi classificada como perigosa" },
            status: {
              type: "string",
              enum: [
                "GOLPE CONFIRMADO",
                "Aparência Suspeita (Heurística)",
                "Erro de Formato",
                "Seguro",
              ],
            },
            reason: { type: "string" },
            from_cache: {
              type: "boolean",
              description: "true se o veredito de segurança veio do cache de 24 h",
            },
          },
        },
        AccessibilityResult: {
          type: "object",
          properties: {
            report_received: { type: "boolean" },
            violations_count: { type: "integer" },
            passes_count: {
              type: "integer",
              description: "Regras axe que a página passou — influencia o cálculo da nota",
            },
            accessibility_score: {
              type: "number",
              format: "float",
              description: "Penalidade acumulada (maior = pior)",
            },
            quality_rating: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              description: "Nota de acessibilidade (maior = melhor)",
            },
            axe_source: {
              type: "string",
              enum: ["server", "client", "skipped"],
              description: "Origem da auditoria axe",
            },
            axe_error: {
              type: "string",
              nullable: true,
              description: "Mensagem de erro se a auditoria no servidor falhou",
            },
          },
        },
        UrlAnalyzeResponse: {
          type: "object",
          properties: {
            analysis_id: { type: "integer", nullable: true },
            security: { $ref: "#/components/schemas/SecurityVerdict" },
            accessibility: { $ref: "#/components/schemas/AccessibilityResult" },
            persistence: {
              type: "object",
              properties: {
                persisted: {
                  type: "boolean",
                  description: "false se o banco estava indisponível no momento da análise",
                },
                error: { type: "string", nullable: true },
              },
            },
            cached: {
              type: "boolean",
              description: "true se a acessibilidade veio do cache de 24 h",
            },
          },
        },
        ReportRequest: {
          type: "object",
          required: ["url", "report_type"],
          properties: {
            url: { type: "string", format: "uri" },
            analysis_id: {
              type: "integer",
              description: "ID da análise relacionada (opcional)",
            },
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
