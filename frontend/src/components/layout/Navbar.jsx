import { useEffect, useState } from "react";
import Brand from "./Brand.jsx";
import Button from "../ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import styles from "./Navbar.module.css";

/**
 * Links da nav. Cada item leva à âncora respectiva via scroll suave.
 * Para adicionar novas seções, basta acrescentar `{ id, label }` aqui
 * e garantir que existe um <section id="..."> na página.
 */
const NAV_LINKS = [
  { id: "recursos", label: "Recursos" },
  { id: "extensao", label: "Extensão" },
  { id: "depoimentos", label: "Depoimentos" },
  { id: "faq", label: "FAQ" },
];

export default function Navbar({ onLoginClick }) {
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Aplica efeito visual quando rola além do topo (sombra + bg mais opaco).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    setMobileOpen(false);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    }
  };

  const handleTopClick = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", window.location.pathname);
  };

  return (
    <header
      className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ""}`}
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

        <nav
          className={`${styles.nav} ${mobileOpen ? styles.navOpen : ""}`}
          aria-label="Navegação principal"
        >
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
          {isAuthenticated ? (
            <>
              <span className={styles.userBadge} title={user?.email || ""}>
                {user?.name?.split(" ")[0] || user?.email || "Conta"}
              </span>
              <Button variant="secondary" size="sm" onClick={logout}>
                Sair
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={onLoginClick}>
              Entrar
            </Button>
          )}

          <button
            type="button"
            className={styles.menuToggle}
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
