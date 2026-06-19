import { useId } from "react";
import styles from "./TextField.module.css";

/**
 * Input com label flutuante sobre o topo, ideal para o tema escuro.
 * Encapsula label + input + slot opcional de erro.
 */
export default function TextField({
  label,
  type = "text",
  value,
  onChange,
  error,
  hint,
  autoComplete,
  required,
  placeholder,
  name,
  id,
  disabled,
  ...rest
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
          {required && <span className={styles.required}> *</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className={`${styles.input} ${error ? styles.inputError : ""}`}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className={styles.error}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
