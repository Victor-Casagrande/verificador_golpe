import Brand from "../layout/Brand.jsx";
import styles from "./Sidebar.module.css";

/**
 * Barra lateral de navegação do dashboard.
 *
 * - Topo: marca Sentinela + botão de recolher (hamburger).
 * - Meio: um botão por seção (Verificar, Histórico, Top 10, Denúncias).
 * - Base: "Voltar ao site" e um rodapé com a conta atual.
 *
 * Estado de layout (recolhida / drawer mobile) é controlado pelo Dashboard;
 * aqui só renderizamos e disparamos callbacks.
 */
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="5"
      y="11"
      width="14"
      height="9"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M8 11V8a4 4 0 0 1 8 0v3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default function Sidebar({
  sections,
  activeId,
  onSelect,
  onBackToSite,
  collapsed = false,
  onToggleCollapse,
  user,
  lockedIds = [],
}) {
  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
      aria-label="Navegação do painel"
    >
      <div className={styles.top}>
        <span className={styles.brand}>
          <Brand showWordmark={!collapsed} />
        </span>
        <button
          type="button"
          className={styles.toggle}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <nav className={styles.nav} aria-label="Seções">
        <ul className={styles.list}>
          {sections.map((section) => {
            const isActive = section.id === activeId;
            const isLocked = lockedIds.includes(section.id);
            return (
              <li key={section.id}>
                <button
                  type="button"
                  className={`${styles.item} ${isActive ? styles.itemActive : ""} ${
                    isLocked ? styles.itemLocked : ""
                  }`}
                  onClick={() => onSelect(section.id)}
                  aria-current={isActive ? "page" : undefined}
                  title={
                    isLocked
                      ? `${section.label} — requer login`
                      : collapsed
                        ? section.label
                        : undefined
                  }
                >
                  <span className={styles.itemIcon} aria-hidden="true">
                    {section.icon}
                  </span>
                  <span className={styles.itemLabel}>{section.label}</span>
                  {isLocked && (
                    <span className={styles.lock} aria-hidden="true">
                      <LockIcon />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.bottom}>
        <button type="button" className={styles.back} onClick={onBackToSite}>
          <span className={styles.itemIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className={styles.itemLabel}>Voltar ao site</span>
        </button>

        <div className={styles.footer}>
          <span className={styles.footerName}>
            {user?.name || user?.email || "Conta"}
          </span>
          <span className={styles.footerHint}>Sentinela APL</span>
        </div>
      </div>
    </aside>
  );
}
