# Auditoria de Prontidão para Produção (SaaS)

## 1. Dockerfile da API
**Status:** [CONCLUÍDO]
**Justificativa:** O arquivo `/api/Dockerfile` implementa corretamente o padrão Multi-stage build, possuindo o `Stage 1: builder` para instalação de dependências e compilação, e o `Stage 2: production` para a imagem de execução final. Além disso, ele define a variável `ENV NODE_ENV=production` e no final altera a permissão para um usuário não-privilegiado através da instrução `USER node`, seguindo as boas práticas de segurança para imagens Docker em produção.

## 2. Integração Contínua (CI/CD)
**Status:** [PENDENTE]
**Justificativa:** Não foram encontrados diretórios como `.github/workflows/` (GitHub Actions) ou arquivos como `.gitlab-ci.yml` (GitLab CI) na raiz do projeto. O projeto ainda carece de pipelines de automação para execução de testes (que já existem no repo), build das imagens Docker e deploy contínuo, etapas fundamentais para manter a qualidade de um SaaS em produção.

## 3. Variáveis de Ambiente (.env)
**Status:** [PARCIAL]
**Justificativa:** Os arquivos `.env.example` presentes na raiz e `/frontend/.env.example` mapeiam grande parte das chaves vitais, incluindo `JWT_SECRET`, credenciais OAuth (`GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`), chave do Google Safe Browsing e apontamentos como o `VITE_API_BASE_URL`. Para o banco de dados, as variáveis estão desmembradas (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, etc.). Embora funcional, em ambientes SaaS modernos frequentemente utiliza-se uma única connection string como `DATABASE_URL` para facilitar a injeção pela plataforma de cloud. O ambiente está minimamente configurado, mas poderia prever chaves específicas para as separações de dev/prod.

## 4. Extensão: URLs Hardcoded vs Dinâmicas
**Status:** [PARCIAL]
**Justificativa:** Ao analisar os scripts `/extension/background.js` e `/extension/content.js`, constata-se a presença de um mecanismo dinâmico base onde a extensão consulta a URL pelo `chrome.storage.local.get(["API_URL"])`. Contudo, os arquivos possuem fallbacks literais (hardcoded) para `"http://localhost:3000"`. Para estar pronto para produção, seria ideal haver um processo de build para a extensão injetando a URL do backend hospedado, eliminando os vestígios do `localhost` diretamente no código-fonte publicado na Chrome Web Store.

## 5. Documentação (CORS, Bearer Token e Rate Limiting)
**Status:** [PARCIAL]
**Justificativa:** O projeto conta com um excelente `README.md` que cobre o uso prático da API e documenta detalhadamente como passar a autenticação usando o header `Authorization: Bearer <jwt>`. Porém, em relação à construção do frontend e consumo externo em produção, os mecanismos de CORS e Rate Limiting são mencionados apenas no diagrama arquitetural ("Rate limit + Helmet + CORS"). Não existem instruções técnicas claras sobre a política de permissão de origens do CORS nem quais são as regras, limites por IP ou penalidades do Rate Limiting.
