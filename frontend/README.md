# Sentinela — Frontend (React + Vite)

Camada web do projeto Sentinela. Hoje contém a **landing page** + o
**modal de autenticação** (Local, Google, GitHub) já plugados na API REST
do backend (`../api`).

## Stack

- **React 18** + **Vite 5** (sem framework adicional)
- **CSS Modules** com tokens em `src/styles/tokens.css` (tema escuro,
  accent ciano fiel ao protótipo Figma)
- Zero dependências extras de UI — botões, modal e inputs são próprios
- Integração HTTP via `fetch` + um pequeno cliente em `src/api/client.js`

## Pré-requisitos

- Node.js **20+**
- API Sentinela rodando em `http://localhost:3000` (`cd ../api && npm run
  dev`, ou `docker compose up` na raiz). Sem a API a landing carrega
  normalmente, mas o login e o OAuth falham.

## Como rodar

```bash
cd frontend
npm install
cp .env.example .env       # ajuste VITE_API_BASE_URL se necessário
npm run dev                # http://localhost:5173
```

Outros scripts:

| Comando | O que faz |
|---|---|
| `npm run dev` | Vite em modo desenvolvimento (HMR) |
| `npm run build` | Gera o bundle de produção em `dist/` |
| `npm run preview` | Serve o `dist/` para validar localmente |

## Variáveis de ambiente

Todas precisam do prefixo `VITE_` (regra do Vite) para chegarem ao bundle.

| Variável | Default | Descrição |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | URL base da API Sentinela |
| `VITE_AUTH_STORAGE_KEY` | `sentinela.jwt` | Chave do `localStorage` que guarda o JWT |

## Estrutura

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
└── src/
    ├── main.jsx                 # Bootstrap React + AuthProvider
    ├── App.jsx                  # Roteia para a Landing (sem react-router por enquanto)
    ├── styles/
    │   ├── tokens.css           # Cores, espaçamento, raios, tipografia
    │   └── global.css           # Reset + base + .container + .section + .eyebrow
    ├── api/                     # Camada HTTP — todas as rotas do backend
    │   ├── client.js            # fetch wrapper + ApiError + setTokenGetter
    │   ├── auth.js              # register, login, listOAuthProviders, getOAuthAuthorizeUrl
    │   ├── urls.js              # analyzeUrl, getUrlScoreTimeline
    │   ├── history.js           # getUserHistory
    │   ├── reports.js           # createReport + REPORT_TYPES
    │   ├── rankings.js          # worst / best acessibilidade + most reported
    │   ├── analytics.js         # /api/analytics/* (requer JWT)
    │   └── status.js            # /api/status
    ├── context/
    │   └── AuthContext.jsx      # JWT em localStorage + listener postMessage OAuth
    ├── components/
    │   ├── layout/
    │   │   ├── Brand.jsx        # Logo escudo (SVG inline) + wordmark SENTINELA
    │   │   ├── Navbar.jsx       # Sticky com scroll suave para âncoras
    │   │   └── Footer.jsx       # Multi-coluna com links de produto/devs/sobre
    │   ├── ui/
    │   │   ├── Button.jsx       # primary | secondary | ghost | social
    │   │   ├── Modal.jsx        # Portal + foco automático + ESC/backdrop
    │   │   └── TextField.jsx    # Input com label + estados de erro
    │   ├── auth/
    │   │   ├── LoginModal.jsx   # Tabs Entrar/Cadastrar + botões OAuth
    │   │   ├── LocalLoginForm.jsx
    │   │   └── OAuthButton.jsx  # Inclui ícones SVG inline de GitHub e Google
    │   └── landing/
    │       ├── Hero.jsx
    │       ├── ShowcaseRealtime.jsx
    │       ├── Features.jsx          # Grade 3x3 de diferenciais
    │       ├── ExtensionShowcase.jsx # Mock de browser bloqueado
    │       ├── Testimonials.jsx
    │       ├── FAQ.jsx
    │       └── FinalCTA.jsx
    └── pages/
        └── Landing.jsx
```

## Como funciona a autenticação

O `AuthContext` (`src/context/AuthContext.jsx`) é o ponto único de
verdade do JWT. Ele:

1. Hidrata o token de `localStorage[VITE_AUTH_STORAGE_KEY]` ao montar.
2. Registra um getter no cliente HTTP — qualquer chamada com
   `{ auth: true }` recebe o header `Authorization` automaticamente.
3. Expõe `loginLocal`, `registerLocal`, `startOAuth(provider)` e `logout`.
4. Para OAuth, abre uma popup em `<API>/auth/oauth/<provider>` e escuta
   a mensagem `{source:"sentinela-oauth", token, error}` que a página
   `/auth/success` do backend dispara via `window.opener.postMessage`.
5. Persiste `{ token, user }` em `localStorage` em formato JSON.

Para usar em qualquer componente:

```jsx
import { useAuth } from "../context/AuthContext.jsx";

const { isAuthenticated, user, loginLocal, startOAuth, logout } = useAuth();
```

## Como funciona a navegação

A `Navbar` define os links com `href="#secao"` e intercepta o clique
para usar `element.scrollIntoView({ behavior: "smooth" })`. Isso evita
o "snap" instantâneo do navegador e respeita o `scroll-padding-top`
definido em `global.css` (compensa a navbar fixa).

Para adicionar uma nova seção:

1. Crie o componente em `src/components/landing/`.
2. Renderize-o em `Landing.jsx` com `<section id="meu-id">`.
3. Adicione `{ id: "meu-id", label: "Meu rótulo" }` em `NAV_LINKS`
   dentro de `Navbar.jsx`.

## Próximos passos sugeridos

A estrutura já está pronta para expandir. Sugestões naturais:

- **Dashboard autenticado** (consumir `/users/history`, `/api/analytics/*`)
  — recriar as telas de stats que aparecem no Figma.
- **Modal de denúncia** ligado a `createReport` em `src/api/reports.js`.
- **Tela de análise pública** que aceita uma URL e dispara `analyzeUrl`,
  mostrando o resultado.
- **`react-router-dom`** para separar `/` (landing), `/app` (área logada)
  e `/auth/callback` (rota dedicada se quiser parar de depender da
  página `/auth/success` do backend).

## Convenções de código

- Componentes em PascalCase; cada um tem seu próprio `*.module.css`
  ao lado para isolar estilos.
- API: funções verbos (`get…`, `create…`, `list…`); sempre retornam o
  JSON cru do backend — quem decide o que fazer com isso é o consumer.
- Erros HTTP viram `ApiError` (status + body + message) — capture-os
  no componente para mostrar mensagens amigáveis.
