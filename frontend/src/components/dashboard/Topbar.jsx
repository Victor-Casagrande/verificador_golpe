import Button from "../ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { firstName, userInitial } from "../../utils/format.js";
import styles from "./Topbar.module.css";

/**
 * Barra superior do dashboard: saudação + título da seção ativa à esquerda.
 * À direita, mostra a conta (logado) ou um botão "Entrar" (modo visitante).
 */
export default function Topbar({ title, subtitle, onLogin }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className={styles.topbar}>
      <div className={styles.headings}>
        <p className={styles.greeting}>
          {isAuthenticated ? `Olá, ${firstName(user)} 👋` : "Modo visitante"}
        </p>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.right}>
        {isAuthenticated ? (
          <>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sair
            </Button>
            <span
              className={styles.avatar}
              title={user?.email || user?.name || "Conta"}
              aria-label={`Conta de ${user?.name || user?.email || "usuário"}`}
            >
              {userInitial(user)}
            </span>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={onLogin}>
            Entrar
          </Button>
        )}
      </div>
    </header>
  );
}
