import styles from "./Button.module.css";

/**
 * Button polimórfico.
 *
 * variant:
 *   - "primary"  → ciano sólido (CTA principal)
 *   - "secondary"→ outlined (CTA secundário)
 *   - "ghost"    → sem borda, hover sutil (links no menu, ações terciárias)
 *   - "social"   → para botões "Continuar com Google/GitHub"
 *
 * size: "sm" | "md" | "lg"
 * fullWidth: estica para 100% (útil em formulários)
 *
 * Aceita qualquer prop nativa de <button>.
 */
export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  leadingIcon = null,
  trailingIcon = null,
  loading = false,
  className = "",
  children,
  ...rest
}) {
  const classNames = [
    styles.btn,
    styles[`v_${variant}`],
    styles[`s_${size}`],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classNames}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        leadingIcon && <span className={styles.icon}>{leadingIcon}</span>
      )}
      <span className={styles.label}>{children}</span>
      {trailingIcon && !loading && (
        <span className={styles.icon}>{trailingIcon}</span>
      )}
    </button>
  );
}
