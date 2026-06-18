import { useEffect, useState } from "react";
import Brand from "./Brand.jsx";
import Button from "../ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import styles from "./Navbar.module.css";

const NAV_LINKS = [
  { id: "recursos", label: "Recursos" },
  { id: "extensao", label: "Extensão" },
  { id: "depoimentos", label: "Depoimentos" },
  { id: "faq", label: "FAQ" },
];

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.linkChevron}>
    <path
      d="M9 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Navbar({ onLoginClick, onEnterDashboard, onGuestAccess }) {
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    closeMobile();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    }
  };

  const handleTopClick = (e) => {
    e.preventDefault();
    closeMobile();
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", window.location.pathname);
  };

  const authActionsDesktop = isAuthenticated ? (
    <>
      <span className={styles.userBadge} title={user?.email || ""}>
        {user?.name?.split(" ")[0] || user?.email || "Conta"}
      </span>
      {onEnterDashboard && (
        <Button variant="primary" size="sm" onClick={onEnterDashboard}>
          Painel
        </Button>
      )}
      <Button variant="secondary" size="sm" onClick={logout}>
        Sair
      </Button>
    </>
  ) : (
    <>
      {onGuestAccess && (
        <Button variant="ghost" size="sm" onClick={onGuestAccess}>
          Verificar URL
        </Button>
      )}
      <Button variant="primary" size="sm" onClick={onLoginClick}>
        Entrar
      </Button>
    </>
  );

  return (
    <>
    <header
      className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ""} ${
        mobileOpen ? styles.navbarMenuOpen : ""
      }`}
    >
      <div className={`container ${styles.inner}`}>
        <a
          href="#topo"
          className={styles.brandLink}
          onClick={handleTopClick}
          aria-label="Sentinela — voltar ao topo"
        >
          <Brand />
        </a>

        <nav className={styles.navDesktop} aria-label="Navegação principal">
          <ul className={styles.list}>
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  className={styles.link}
                  onClick={(e) => handleNavClick(e, link.id)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <div className={styles.desktopActions}>{authActionsDesktop}</div>

          <button
            type="button"
            className={`${styles.menuToggle} ${mobileOpen ? styles.menuToggleOpen : ""}`}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu-panel"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className={styles.menuToggleLines} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>
    </header>

      {mobileOpen && (
        <>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Fechar menu"
            onClick={closeMobile}
          />

          <div
            id="mobile-menu-panel"
            className={styles.mobilePanel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
          >
            <div className={styles.mobilePanelHeader}>
              <Brand size="sm" />
              <button
                type="button"
                className={styles.mobileClose}
                onClick={closeMobile}
                aria-label="Fechar menu"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Fechar</span>
              </button>
            </div>

            <div className={styles.mobilePanelBody}>
              <p className={styles.mobileSectionLabel}>Navegação</p>
              <ul className={styles.mobileList}>
                {NAV_LINKS.map((link) => (
                  <li key={link.id}>
                    <a
                      href={`#${link.id}`}
                      className={styles.mobileLink}
                      onClick={(e) => handleNavClick(e, link.id)}
                    >
                      <span>{link.label}</span>
                      <ChevronIcon />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.mobilePanelFooter}>
              <p className={styles.mobileSectionLabel}>
                {isAuthenticated ? "Sua conta" : "Acesso"}
              </p>

              {isAuthenticated && (
                <div className={styles.mobileUserCard}>
                  <span className={styles.mobileUserName}>
                    {user?.name || "Usuário"}
                  </span>
                  {user?.email && (
                    <span className={styles.mobileUserEmail}>{user.email}</span>
                  )}
                </div>
              )}

              <div className={styles.mobileCtas}>
                {isAuthenticated ? (
                  <>
                    {onEnterDashboard && (
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={() => {
                          closeMobile();
                          onEnterDashboard();
                        }}
                      >
                        Abrir painel
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="lg"
                      fullWidth
                      onClick={() => {
                        closeMobile();
                        logout();
                      }}
                    >
                      Sair da conta
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={() => {
                        closeMobile();
                        onLoginClick();
                      }}
                    >
                      Entrar ou criar conta
                    </Button>
                    {onGuestAccess && (
                      <Button
                        variant="secondary"
                        size="lg"
                        fullWidth
                        onClick={() => {
                          closeMobile();
                          onGuestAccess();
                        }}
                      >
                        Verificar URL sem login
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
