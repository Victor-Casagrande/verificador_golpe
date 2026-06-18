import Button from "../ui/Button.jsx";
import { API_BASE_URL } from "../../api/client.js";
import styles from "./FinalCTA.module.css";

export default function FinalCTA({ onPrimaryClick }) {
  return (
    <section className={`${styles.section} section`}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.card}>
          <h2 className={styles.title}>Desenvolva com mais confiança</h2>
          <p className={styles.subtitle}>
            Crie sua conta gratuita e comece a verificar URLs e auditar
            acessibilidade em segundos.
          </p>
          <div className={styles.actions}>
            <Button variant="primary" size="lg" onClick={onPrimaryClick}>
              Criar conta
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() =>
                window.open(`${API_BASE_URL}/api/docs`, "_blank", "noopener")
              }
            >
              Ver a API
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
