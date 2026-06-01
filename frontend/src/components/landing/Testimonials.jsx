import styles from "./Testimonials.module.css";

const TESTIMONIALS = [
  {
    quote:
      "A integração com a API foi rápida — em uma manhã liguei o front ao back e já estava recebendo análises completas com nota de acessibilidade.",
    name: "Diego Pereira",
    role: "Dev fullstack — IFC",
    stars: 5,
  },
  {
    quote:
      "Adoramos o cache de 24h. Caiu o custo de chamadas externas drasticamente sem perder atualidade dos veredictos.",
    name: "Marina Souza",
    role: "Engenharia de Software",
    stars: 5,
  },
  {
    quote:
      "A extensão bloqueou um phishing para mim em menos de 2 segundos. Foi a primeira vez que uma ferramenta acadêmica salvou meu dia.",
    name: "Tiago Ramos",
    role: "Estudante de SI",
    stars: 4,
  },
];

const Stars = ({ count }) => (
  <span aria-label={`${count} de 5 estrelas`} className={styles.stars}>
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        viewBox="0 0 24 24"
        fill={i < count ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </span>
);

export default function Testimonials() {
  return (
    <section id="depoimentos" className={`${styles.section} section`}>
      <div className="container">
        <header className={styles.header}>
          <span className="eyebrow">Depoimentos</span>
          <h2 className={styles.title}>O que nossos usuários estão dizendo</h2>
        </header>

        <div className={styles.grid}>
          {TESTIMONIALS.map((t) => (
            <article key={t.name} className={styles.card}>
              <Stars count={t.stars} />
              <blockquote className={styles.quote}>“{t.quote}”</blockquote>
              <footer className={styles.author}>
                <span className={styles.avatar} aria-hidden="true">
                  {t.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div>
                  <strong className={styles.authorName}>{t.name}</strong>
                  <span className={styles.authorRole}>{t.role}</span>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
