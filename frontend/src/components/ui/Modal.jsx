import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

/**
 * Modal acessível.
 *
 * - Portal no <body> para evitar problemas de stacking context.
 * - Fecha com ESC e clique no backdrop (configurável).
 * - Trava o scroll do body enquanto aberto.
 * - Foca o primeiro elemento focável ao abrir.
 *
 * Visual: card flutuante no centro, com glow ciano sutil — fiel ao Figma.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  closeOnBackdrop = true,
  ariaLabel,
}) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);

    const t = setTimeout(() => {
      const focusable = dialogRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdrop = (e) => {
    if (!closeOnBackdrop) return;
    if (e.target === overlayRef.current) onClose?.();
  };

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      onMouseDown={handleBackdrop}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title || "Diálogo"}
        className={`${styles.dialog} ${styles[`size_${size}`] || ""}`}
      >
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6l-12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
