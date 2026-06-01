import styles from "./ShowcaseRealtime.module.css";

/**
 * Segunda dobra: "Análises inteligentes em tempo real" + mock visual.
 * O placeholder simula um card de resultado da API (security + accessibility).
 */
export default function ShowcaseRealtime() {
  return (
    <section className={`${styles.wrapper} section`}>
      <div className={`container ${styles.inner}`}>
        <header className={styles.header}>
          <span className="eyebrow">Em tempo real</span>
          <h2 className={styles.title}>Análises inteligentes em tempo real</h2>
          <p className={styles.subtitle}>
            Cada URL passa por cache de 24h, Safe Browsing, heurísticas
            locais e auditoria axe-core — em uma única chamada à API.
          </p>
        </header>

        <div className={styles.preview} role="img" aria-label="Exemplo de resposta da API">
          <div className={styles.previewHeader}>
            <span className={styles.dotR} />
            <span className={styles.dotY} />
            <span className={styles.dotG} />
            <span className={styles.endpoint}>POST /urls/analyze</span>
          </div>

          <div className={styles.previewBody}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.badgeSafe}>SEGURO</span>
                <span className={styles.url}>https://exemplo.com/pagina</span>
              </div>
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>quality_rating</span>
                  <span className={styles.metricValue}>89<small>/100</small></span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>violations</span>
                  <span className={styles.metricValue}>2</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>axe_source</span>
                  <span className={styles.metricValue}>server</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>from_cache</span>
                  <span className={styles.metricValue}>false</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
