import styles from "./Features.module.css";

/**
 * Grade 3x3 de diferenciais, como no Figma. Os ícones são SVG inline
 * para herdar o ciano dos tokens e evitar bibliotecas extras.
 */
const FEATURES = [
  {
    title: "Detecção em tempo real",
    desc: "Cada navegação dispara verificação via Google Safe Browsing e heurísticas locais.",
    icon: <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z" />,
  },
  {
    title: "Cache inteligente",
    desc: "Resultados de segurança ficam em cache por 24h — economia de API e respostas instantâneas.",
    icon: <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />,
  },
  {
    title: "Score de acessibilidade",
    desc: "axe-core rodando no servidor (Puppeteer) gera nota 0–100 por página visitada.",
    icon: <path d="M4 19h16M6 19V9l6-5 6 5v10M9 12h6M9 16h6" />,
  },
  {
    title: "Histórico por conta",
    desc: "Cada análise é vinculada à sua conta; revisite o que já foi checado e veja a evolução das notas.",
    icon: <path d="M4 4h16v6H4zM4 14h16v6H4zM8 7h4M8 17h4" />,
  },
  {
    title: "Denúncias da comunidade",
    desc: "Falso positivo? Golpe confirmado? Sua denúncia entra nos rankings e melhora as heurísticas.",
    icon: <path d="M5 21V5l4-2 6 2 4-2v14l-4 2-6-2-4 2z" />,
  },
  {
    title: "Rankings públicos",
    desc: "Top dos sites com piores e melhores notas de acessibilidade, e os mais denunciados.",
    icon: <path d="M4 21V8m6 13V3m6 18V11" />,
  },
  {
    title: "Login social",
    desc: "Cadastro com e-mail/senha ou OAuth Google e GitHub — o e-mail unifica as contas.",
    icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0" />,
  },
  {
    title: "API REST documentada",
    desc: "Swagger UI em /api/docs e OpenAPI 3 em /api/docs.json — tudo pronto para integrar.",
    icon: <path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" />,
  },
  {
    title: "Resiliente a falhas",
    desc: "Mesmo com PostgreSQL fora do ar, o alerta de segurança continua sendo entregue.",
    icon: <path d="M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6 4 4M5 19l4-4m6-6 4-4" />,
  },
];

export default function Features() {
  return (
    <section id="recursos" className={`${styles.section} section`}>
      <div className="container">
        <header className={styles.header}>
          <span className="eyebrow">Por quê?</span>
          <h2 className={styles.title}>Por que escolher o Sentinela?</h2>
          <p className={styles.subtitle}>
            Tudo o que você precisa para proteger usuários e auditar acessibilidade
            sem reinventar a roda — em uma única API.
          </p>
        </header>

        <div className={styles.grid}>
          {FEATURES.map((f) => (
            <article key={f.title} className={styles.card}>
              <div className={styles.iconWrap}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {f.icon}
                </svg>
              </div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
