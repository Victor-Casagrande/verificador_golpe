import Button from "../ui/Button.jsx";
import styles from "./Hero.module.css";

/**
 * Hero principal — título "Verifique" + subtítulo + 2 CTAs.
 * Fiel ao protótipo: eyebrow, headline grande, subtítulo curto e dois botões
 * (primário ciano + secundário outlined).
 */
export default function Hero({ onPrimaryClick, onSecondaryClick }) {
  return (
    <section id="topo" className={`${styles.hero} section`}>
      <div className={`container ${styles.inner}`}>
        <span className="eyebrow">Segurança e acessibilidade web</span>
        <h1 className={styles.title}>
          Verifique{" "}
          <span className={styles.titleAccent}>antes de clicar</span>
        </h1>
        <p className={styles.subtitle}>
          O Sentinela analisa a página em tempo real, cruza com a Google Safe
          Browsing, aplica heurísticas locais e ainda audita acessibilidade
          com axe-core — tudo enquanto você navega.
        </p>
        <div className={styles.actions}>
          <Button variant="primary" size="lg" onClick={onPrimaryClick}>
            Começar agora
          </Button>
          <Button variant="secondary" size="lg" onClick={onSecondaryClick}>
            Saiba mais
          </Button>
        </div>

        <ul className={styles.badges} aria-label="Diferenciais rápidos">
          <li><span className={styles.dot} /> API REST aberta</li>
          <li><span className={styles.dot} /> Extensão Chrome</li>
          <li><span className={styles.dot} /> Login Google &amp; GitHub</li>
        </ul>
      </div>
    </section>
  );
}
