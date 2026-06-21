import { useId } from "react";
import styles from "./Toggle.module.css";

/**
 * Switch acessível (checkbox estilizado).
 *
 * Uso:
 *   <Toggle checked={devMode} onChange={setDevMode} label="Modo dev" />
 *
 * `onChange` recebe o novo booleano diretamente (não o evento), para casar
 * com o estilo dos demais controles do projeto.
 */
export default function Toggle({ checked = false, onChange, label, hint, disabled = false, id }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={styles.row}>
      <button
        type="button"
        id={inputId}
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === "string" ? label : undefined}
        disabled={disabled}
        className={`${styles.track} ${checked ? styles.on : ""}`}
        onClick={() => !disabled && onChange?.(!checked)}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
      {(label || hint) && (
        <label htmlFor={inputId} className={styles.text}>
          {label && <span className={styles.label}>{label}</span>}
          {hint && <span className={styles.hint}>{hint}</span>}
        </label>
      )}
    </div>
  );
}
