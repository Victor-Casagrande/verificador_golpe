import Button from "../ui/Button.jsx";
import styles from "./ExtensionShowcase.module.css";

const BULLETS = [
  {
    title: "Análise automática",
    desc: "Em cada nova aba, o content script chama a API e processa a página.",
  },
  {
    title: "Overlay de alerta",
    desc: "URLs perigosas recebem um bloqueio fullscreen com opção de sair ou ignorar.",
  },
  {
    title: "Login com 1 clique",
    desc: "Reaproveita a mesma conta da plataforma — Google, GitHub ou e-mail/senha.",
  },
];

export default function ExtensionShowcase() {
  return (
    <section id="extensao" className={`${styles.section} section`}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <span className="eyebrow">Extensão Chrome</span>
          <h2 className={styles.title}>A extensão que transforma navegação em diagnóstico.</h2>
          <p className={styles.subtitle}>
            Instale uma vez e o Sentinela analisa cada página que você abrir. Tudo via Manifest V3,
            content script leve e service worker próprio.
          </p>

          <ul className={styles.bullets}>
            {BULLETS.map((b) => (
              <li key={b.title} className={styles.bullet}>
                <span className={styles.bulletIcon} aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12l5 5 9-11" />
                  </svg>
                </span>
                <div>
                  <strong className={styles.bulletTitle}>{b.title}</strong>
                  <p className={styles.bulletDesc}>{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.cta}>
            <Button
              variant="primary"
              as="a"
              onClick={() =>
                window.open(
                  "https://github.com/Victor-Casagrande/verificador_golpe",
                  "_blank",
                  "noopener",
                )
              }
            >
              Ver no GitHub
            </Button>
          </div>
        </div>

        <div className={styles.visual} aria-hidden="true">
          <div className={styles.browserFrame}>
            <div className={styles.browserBar}>
              <span className={styles.miniDot} />
              <span className={styles.miniDot} />
              <span className={styles.miniDot} />
              <div className={styles.addressBar}>https://site-suspeito.example</div>
            </div>
            <div className={styles.alertScreen}>
              <div className={styles.warnIcon}>!</div>
              <strong className={styles.warnTitle}>ALERTA DE SEGURANÇA</strong>
              <span className={styles.warnStatus}>GOLPE CONFIRMADO</span>
              <p className={styles.warnReason}>
                URL identificada como maliciosa pelo Google Safe Browsing.
              </p>
              <div className={styles.warnActions}>
                <span className={styles.warnBtn}>Sair desta página</span>
                <span className={styles.warnBtnGhost}>Ignorar aviso</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
