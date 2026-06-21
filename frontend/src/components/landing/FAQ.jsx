import { useState } from "react";
import styles from "./FAQ.module.css";

const QUESTIONS = [
  {
    q: "O Sentinela é gratuito?",
    a: "Sim. O projeto é acadêmico, código-aberto e foi pensado para que qualquer pessoa possa rodar o backend, a extensão e o frontend localmente.",
  },
  {
    q: "Como meu dado é tratado?",
    a: "A API guarda apenas a URL analisada, o veredito, a nota de acessibilidade e, quando você está logado, o vínculo com seu usuário. Não há tracking publicitário nem envio para terceiros — só o que é necessário para o Google Safe Browsing checar a URL.",
  },
  {
    q: "Como posso contribuir?",
    a: "Abra issues e pull requests no GitHub do projeto. Ajustes em heurísticas, testes, UI e documentação são especialmente bem-vindos.",
  },
  {
    q: "Posso usar a API sem a extensão?",
    a: "Pode. A API expõe POST /urls/analyze publicamente. Basta enviar um JSON com a URL e você recebe o veredito de segurança + a nota de acessibilidade. Veja a documentação Swagger em /api/docs.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className={`${styles.section} section`}>
      <div className={`container ${styles.inner}`}>
        <header className={styles.header}>
          <span className="eyebrow">Perguntas frequentes</span>
          <h2 className={styles.title}>Perguntas Frequentes</h2>
        </header>

        <ul className={styles.list}>
          {QUESTIONS.map((item, i) => {
            const open = openIndex === i;
            return (
              <li key={item.q} className={`${styles.item} ${open ? styles.itemOpen : ""}`}>
                <button
                  type="button"
                  className={styles.itemHead}
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? -1 : i)}
                >
                  <span>{item.q}</span>
                  <span className={styles.chevron} aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
                <div className={styles.itemBody}>
                  <p>{item.a}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
