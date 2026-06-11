import styles from "./Panel.module.css";

/**
 * Card/painel base do dashboard. Padroniza fundo, borda, glow e o cabeçalho
 * (eyebrow opcional + título + subtítulo + slot de ações à direita).
 */
export default function Panel({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  className = "",
  id,
}) {
  return (
    <section id={id} className={`${styles.panel} ${className}`}>
      {(title || actions || eyebrow) && (
        <header className={styles.header}>
          <div className={styles.heading}>
            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
