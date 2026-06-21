import { useEffect, useState } from "react";
import Modal from "../ui/Modal.jsx";
import LocalLoginForm from "./LocalLoginForm.jsx";
import OAuthButton from "./OAuthButton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listOAuthProviders } from "../../api/auth.js";
import styles from "./LoginModal.module.css";

/**
 * Modal único de autenticação com 3 opções (fiel ao Figma):
 *   - Tabs Entrar / Cadastrar (formulário local e-mail + senha)
 *   - Continuar com Google
 *   - Continuar com GitHub
 *
 * Verifica em /auth/oauth/providers quais provedores estão habilitados
 * no servidor para mostrar/ocultar os botões sociais.
 */
export default function LoginModal({ open, onClose }) {
  const { startOAuth, pendingProvider, isAuthenticated } = useAuth();
  const [tab, setTab] = useState("login");
  const [availableProviders, setAvailableProviders] = useState(["github", "google"]);
  const [providerError, setProviderError] = useState(null);

  // Quando o usuário concluir o login, fecha automaticamente.
  useEffect(() => {
    if (open && isAuthenticated) {
      onClose?.();
    }
  }, [open, isAuthenticated, onClose]);

  // Ao abrir, consulta os provedores OAuth realmente configurados.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await listOAuthProviders();
        if (cancelled) return;
        const ids = Array.isArray(res?.providers) ? res.providers.map((p) => p.id) : [];
        setAvailableProviders(ids);
        setProviderError(null);
      } catch (err) {
        if (cancelled) return;
        setProviderError(
          "Não foi possível confirmar quais provedores OAuth estão ativos. " +
            "Os botões abaixo podem falhar se as credenciais não estiverem no .env do backend.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleClose = () => {
    setTab("login");
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      ariaLabel={tab === "login" ? "Entrar na sua conta" : "Criar uma conta"}
    >
      <div className={styles.wrapper}>
        <div className={styles.tabs} role="tablist" aria-label="Modo de autenticação">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            className={`${styles.tab} ${tab === "login" ? styles.tabActive : ""}`}
            onClick={() => setTab("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "register"}
            className={`${styles.tab} ${tab === "register" ? styles.tabActive : ""}`}
            onClick={() => setTab("register")}
          >
            Cadastrar
          </button>
          <span className={styles.tabIndicator} data-mode={tab} aria-hidden="true" />
        </div>

        <LocalLoginForm mode={tab} onSuccess={handleClose} />

        <div className={styles.divider} aria-hidden="true">
          <span>ou continue com</span>
        </div>

        <div className={styles.oauthRow}>
          <OAuthButton
            provider="google"
            loading={pendingProvider === "google"}
            disabled={
              Boolean(pendingProvider) ||
              (availableProviders.length > 0 && !availableProviders.includes("google"))
            }
            onClick={() => startOAuth("google")}
          />
          <OAuthButton
            provider="github"
            loading={pendingProvider === "github"}
            disabled={
              Boolean(pendingProvider) ||
              (availableProviders.length > 0 && !availableProviders.includes("github"))
            }
            onClick={() => startOAuth("github")}
          />
        </div>

        {providerError && <p className={styles.providerWarn}>{providerError}</p>}

        <p className={styles.footnote}>
          {tab === "login" ? (
            <>
              Ainda não tem conta?{" "}
              <button type="button" className={styles.linkBtn} onClick={() => setTab("register")}>
                Cadastre-se aqui
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button type="button" className={styles.linkBtn} onClick={() => setTab("login")}>
                Entrar
              </button>
            </>
          )}
        </p>
      </div>
    </Modal>
  );
}
