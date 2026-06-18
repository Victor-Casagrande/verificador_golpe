import styles from "./Badge.module.css";

/**
 * Pílula colorida por "tom" semântico.
 *
 * tone: "good" | "warn" | "bad" | "neutral" | "accent" | "critical" | "serious" | "moderate" | "minor"
 */
export default function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span className={`${styles.badge} ${styles[tone] || styles.neutral} ${className}`}>
      {children}
    </span>
  );
}
