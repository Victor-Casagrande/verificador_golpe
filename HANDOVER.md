# Backend Handover: Integração, Segurança e Consumo da API

Este documento destina-se à equipe de **Frontend** e **Extensão**. A API deste projeto ("Verificador de Golpes") foi projetada com arquitetura de microsserviços e segurança estrita para operar como um SaaS.

Para consumir os dados corretamente e proporcionar a melhor experiência ao usuário (UX), é mandatório compreender as políticas de **CORS**, os limites de requisição (**Rate Limiting**) e o fluxo de **Autenticação**.

---

## 1. Política de CORS (Cross-Origin Resource Sharing)

A API possui uma "Lista VIP" (Whitelist) estrita. Qualquer requisição HTTP disparada de um navegador que não esteja nesta lista será sumariamente bloqueada pelo servidor, sem processar a lógica da rota.

- **Origens Permitidas (Whitelist):**
  - `http://localhost:5173` (Ambiente de desenvolvimento local do Vite/React).
  - `chrome-extension://*` (Qualquer requisição vinda do _background script_ ou _popup_ da extensão validada).
- **Credenciais:** A opção `credentials: true` está ativada. O frontend pode e deve enviar os cabeçalhos de autorização apropriados.
- **Ação Recomendada no Frontend:** Não tente realizar rotas de `fetch()` usando o IP direto da máquina hospedada ou domínios não autorizados em produção, pois o navegador lançará um `CORS Error`.

---

## 2. Rate Limiting (Limites de Requisição por IP)

Para proteger a infraestrutura contra ataques de negação de serviço (DDoS), força bruta e esgotamento de CPU, a API rastreia o IP de origem e aplica limites granulares dependendo do "peso" da rota consumida.

| Perfil de Limitador | Rotas Afetadas             | Limite                       | Penalidade | Motivo Arquitetural                                                          |
| :------------------ | :------------------------- | :--------------------------- | :--------- | :--------------------------------------------------------------------------- |
| **Global Limiter**  | Todas as rotas base        | 500 requisições / 15 minutos | HTTP 429   | Prevenção de spam generalizado na API.                                       |
| **Auth Limiter**    | `/auth/*` (Login/Registro) | 10 requisições / 15 minutos  | HTTP 429   | Mitigação de ataques de força bruta contra contas de usuários.               |
| **Analyze Limiter** | `/urls/analyze`            | 60 requisições / 1 minuto    | HTTP 429   | Prevenção de esgotamento de CPU pelos motores de heurística e do _Axe Core_. |

### Como o Frontend deve tratar o Rate Limiting:

Se o usuário exceder o limite, o servidor não travará, mas retornará imediatamente o status **`HTTP 429 Too Many Requests`**.

- **Ação Obrigatória:** O frontend/extensão **deve** interceptar o código `429`.
- **Experiência do Usuário (UX):** Em vez de exibir um erro genérico ("Erro de rede") ou falhar silenciosamente, apresente uma notificação clara: _"Você realizou muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente."_
- **Dica Técnica:** A API envia o cabeçalho `X-RateLimit-Remaining: 0` quando o bloqueio ocorre.

---

## 3. Autenticação (OAuth 2.0 e JWT)

O sistema opera de forma _stateless_. As rotas protegidas (como `/users/history`, `/reports` e o _Dashboard_) não utilizam sessões mantidas no servidor, mas sim tokens JWT.

### O Fluxo:

1. O usuário clica em "Login com Google" ou "Login com GitHub" no frontend.
2. O frontend redireciona o usuário para `/auth/google` ou `/auth/github`.
3. Após o sucesso no provedor, o backend redireciona o usuário de volta para uma rota de sucesso do frontend (ex: `/auth/success?token=eyJhbGci...`).
4. **O Frontend / Extensão** deve capturar esse token da URL e salvá-lo no `chrome.storage.local` (extensão) ou na gestão de estado do React.

### Consumo de Rotas Protegidas:

Todas as requisições subsequentes para rotas autenticadas exigem que o JWT seja injetado no cabeçalho da requisição HTTP exatamente no seguinte formato:

```javascript
// Exemplo de injeção no interceptador do Fetch ou Axios
const response = await fetch('[https://api.seusaas.com/users/history](https://api.seusaas.com/users/history)', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${seuTokenJwt}` // <-- OBRIGATÓRIO
  }
});
```

**Token Inválido ou Expirado:** A API retornará HTTP 401 Unauthorized. O frontend deve interceptar esse código, limpar o estado do usuário e redirecioná-lo automaticamente para a tela de login.

## 4. Estrutura de Respostas da API (Tratamento de Erros)

A API utiliza uma classe AppError centralizada. Sempre que houver uma falha lógica, de validação ou de regra de negócio, o backend enviará um JSON padronizado.

Exemplo de Resposta de Erro:

{
  "status": "error",
  "statusCode": 400,
  "message": "URL não fornecida ou formato inválido."
}

O frontend nunca deve depender de ler HTML ou stack traces. Leia sempre a chave message do objeto JSON de erro para exibir notificações (Toasts/Modals) informativas ao usuário final.
```
