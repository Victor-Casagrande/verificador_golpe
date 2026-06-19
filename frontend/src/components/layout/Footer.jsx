import Brand from "./Brand.jsx";
import { API_BASE_URL } from "../../api/client.js";
import styles from "./Footer.module.css";

const COLS = [
  {
    title: "Produto",
    links: [
      { label: "Recursos", href: "#recursos" },
      { label: "Extensão", href: "#extensao" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Para desenvolvedores",
    links: [
      { label: "Documentação da API", href: `${API_BASE_URL}/api/docs`, external: true },
      { label: "GitHub", href: "https://github.com/Victor-Casagrande/verificador_golpe", external: true },
      { label: "Status", href: `${API_BASE_URL}/api/status`, external: true },
    ],
  },
  {
    title: "Sobre",
    links: [
      { label: "IFC — Videira", href: "https://videira.ifc.edu.br/", external: true },
      { label: "Projeto integrador", href: "#topo" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brandCol}>
          <Brand size="lg" />
          <p className={styles.tagline}>
            Detecte golpes e audite acessibilidade web antes de clicar.
            Projeto integrador acadêmico — IFC.
          </p>
        </div>

        <div className={styles.grid}>
          {COLS.map((col) => (
            <div key={col.title} className={styles.col}>
              <h4 className={styles.colTitle}>{col.title}</h4>
              <ul className={styles.colList}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className={styles.colLink}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <span>
          © {new Date().getFullYear()} Sentinela APL —{" "}
          <a
            href="https://www.gnu.org/licenses/gpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.colLink}
          >
            GPL v3
          </a>
          .
        </span>
        <span className={styles.bottomRight}>
          Feito com React + Vite, consumindo a API Sentinela.
        </span>
      </div>
    </footer>
  );
}
