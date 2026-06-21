/**
 * Marca Sentinela — escudo + wordmark.
 * Inline SVG para herdar var(--color-accent) e dispensar arquivos PNG.
 */
import styles from "./Brand.module.css";

export default function Brand({ size = "md", showWordmark = true }) {
  const cls = `${styles.brand} ${styles[size] || ""}`.trim();
  return (
    <span className={cls} aria-label="Sentinela APL">
      <svg className={styles.shield} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="sentinelaShield" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <path
          d="M16 2.5 4.5 6.5v8.6c0 6.7 4.7 12.6 11.5 14.4 6.8-1.8 11.5-7.7 11.5-14.4V6.5L16 2.5Z"
          fill="url(#sentinelaShield)"
        />
        <path
          d="M10.5 16.2l3.8 3.8 7.2-8.2"
          stroke="#07090f"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && <span className={styles.wordmark}>SENTINELA</span>}
    </span>
  );
}
