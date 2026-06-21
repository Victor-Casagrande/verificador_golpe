import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as authApi from "../api/auth.js";
import { setTokenGetter, ApiError } from "../api/client.js";

/**
 * AuthContext
 * ───────────
 * Gerencia o JWT, o usuário corrente e os fluxos de login (local + OAuth).
 *
 * Persistência: o token vive em localStorage sob VITE_AUTH_STORAGE_KEY.
 * Quando montamos o contexto, registramos o getter no cliente HTTP para
 * que `request({ auth: true })` consiga injetar o Authorization header sem
 * precisar passar o token por props em cascata.
 *
 * Fluxo OAuth:
 *   - O usuário clica em "Continuar com GitHub/Google" no LoginModal.
 *   - Abrimos `${API}/auth/oauth/<provider>` em uma popup (window.open).
 *   - O backend redireciona pelo provedor e, ao final, manda o navegador
 *     para `/auth/success?token=...`. Essa página é servida pelo próprio
 *     backend e faz `window.opener.postMessage({source:"sentinela-oauth",
 *     token, error}, "*")` antes de tentar fechar.
 *   - Escutamos esse postMessage aqui e completamos o login.
 */

const STORAGE_KEY = import.meta.env.VITE_AUTH_STORAGE_KEY || "sentinela.jwt";

const AuthContext = createContext(null);

/**
 * Decodifica o payload do JWT (sem validar assinatura — só leitura) para
 * derivar um usuário mínimo quando o backend não devolve o objeto `user`.
 * É o caso do OAuth, cujo callback redireciona apenas com `?token=...`.
 * Assim a saudação, o avatar e as chamadas autenticadas têm contexto do
 * usuário mesmo no login social.
 */
const decodeUserFromToken = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(json);
    if (!data?.sub && !data?.email) return null;
    return { id: data.sub, email: data.email || null };
  } catch {
    return null;
  }
};

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw);
    const token = typeof parsed?.token === "string" ? parsed.token : null;
    return {
      token,
      user: parsed?.user ?? (token ? decodeUserFromToken(token) : null),
    };
  } catch {
    return { token: null, user: null };
  }
};

const persistAuth = (token, user) => {
  try {
    if (!token) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  } catch {
    /* localStorage indisponível (modo privado etc.) — não bloqueia o fluxo */
  }
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [pendingProvider, setPendingProvider] = useState(null);
  const popupRef = useRef(null);
  const popupPollRef = useRef(null);

  // Injeta o getter de token no cliente HTTP UMA vez por montagem.
  useEffect(() => {
    setTokenGetter(() => auth.token);
  }, [auth.token]);

  const applyAuth = useCallback((nextToken, nextUser) => {
    // Se o backend não enviou o usuário (fluxo OAuth), derivamos do token.
    const resolvedUser = nextUser ?? (nextToken ? decodeUserFromToken(nextToken) : null);
    setAuth({ token: nextToken, user: resolvedUser });
    persistAuth(nextToken, resolvedUser);
  }, []);

  // Falha 3 — O AuthContext só escutava window.postMessage de popup
  // (window.opener). Quando o backend redireciona a aba diretamente para
  // ?token=..., não há popup nem opener, então o postMessage nunca chegava.
  //
  // Este useEffect lê o ?token= da URL na montagem inicial e persiste o JWT,
  // completando o login independente do canal de entrega usado pelo backend.
  // A URL é limpa com replaceState para o token não vazar no histórico.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (!urlToken || auth.token) return; // Já autenticado — não sobrescreve.

    applyAuth(urlToken, null);

    // Remove o ?token= da barra de endereços sem gerar nova entrada no histórico.
    const clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, clean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] = só na montagem. applyAuth é estável (useCallback sem deps).

  const logout = useCallback(() => {
    applyAuth(null, null);
    setPendingProvider(null);
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
  }, [applyAuth]);

  const loginLocal = useCallback(
    async ({ email, password }) => {
      const result = await authApi.login({ email, password });
      if (!result?.token) {
        throw new ApiError("Resposta sem token.", { status: 500, body: result });
      }
      applyAuth(result.token, result.user);
      return result;
    },
    [applyAuth],
  );

  const registerLocal = useCallback(
    async ({ name, email, password }) => {
      const result = await authApi.register({ name, email, password });
      if (!result?.token) {
        throw new ApiError("Resposta sem token.", { status: 500, body: result });
      }
      applyAuth(result.token, result.user);
      return result;
    },
    [applyAuth],
  );

  /**
   * Inicia o OAuth abrindo uma popup. O resto acontece via postMessage
   * (ver o useEffect logo abaixo).
   */
  const startOAuth = useCallback((provider) => {
    if (!["github", "google"].includes(provider)) {
      throw new Error(`Provedor não suportado: ${provider}`);
    }

    const url = authApi.getOAuthAuthorizeUrl(provider);
    const width = 520;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      url,
      "sentinela-oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`,
    );

    if (!popup) {
      // Pop-up bloqueado pelo navegador. Fallback: redirecionar a aba atual.
      window.location.href = url;
      return;
    }

    popupRef.current = popup;
    setPendingProvider(provider);

    // Detecta fechamento manual da popup para limpar o "loading".
    if (popupPollRef.current) clearInterval(popupPollRef.current);
    popupPollRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(popupPollRef.current);
        popupPollRef.current = null;
        setPendingProvider((prev) => (prev === provider ? null : prev));
      }
    }, 600);
  }, []);

  // Escuta a mensagem disparada pela página /auth/success do backend.
  useEffect(() => {
    const handler = (event) => {
      const data = event.data;
      if (!data || data.source !== "sentinela-oauth") return;
      if (popupPollRef.current) {
        clearInterval(popupPollRef.current);
        popupPollRef.current = null;
      }
      if (data.error) {
        console.warn("[Sentinela] OAuth retornou erro:", data.error);
        setPendingProvider(null);
        return;
      }
      if (data.token) {
        applyAuth(data.token, data.user || null);
      }
      setPendingProvider(null);
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [applyAuth]);

  // Cleanup geral ao desmontar.
  useEffect(() => {
    return () => {
      if (popupPollRef.current) clearInterval(popupPollRef.current);
    };
  }, []);

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      isAuthenticated: Boolean(auth.token),
      pendingProvider,
      loginLocal,
      registerLocal,
      startOAuth,
      logout,
    }),
    [auth, pendingProvider, loginLocal, registerLocal, startOAuth, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() precisa ser usado dentro de <AuthProvider>");
  }
  return ctx;
}
