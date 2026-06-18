import Button from "../ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { firstName, userInitial } from "../../utils/format.js";
import styles from "./Topbar.module.css";

export default function Topbar({ title, subtitle, onLogin, onMenuClick }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {onMenuClick && (
          <button
            type="button"
            className={styles.menuBtn}
            onClick={onMenuClick}
            aria-label="Abrir menu de navegação"
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        )}

        <div className={styles.headings}>
          <p className={styles.greeting}>
            {isAuthenticated ? `Olá, ${firstName(user)} 👋` : "Modo visitante"}
          </p>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>

      <div className={styles.right}>
        {isAuthenticated ? (
          <>
            <Button variant="ghost" size="sm" className={styles.logoutBtn} onClick={logout}>
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
