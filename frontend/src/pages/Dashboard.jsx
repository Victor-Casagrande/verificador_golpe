import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "../components/dashboard/Sidebar.jsx";
import Topbar from "../components/dashboard/Topbar.jsx";
import LoginModal from "../components/auth/LoginModal.jsx";
import AnalyzeSection from "../components/dashboard/sections/AnalyzeSection.jsx";
import HistorySection from "../components/dashboard/sections/HistorySection.jsx";
import RankingsSection from "../components/dashboard/sections/RankingsSection.jsx";
import ReportsSection from "../components/dashboard/sections/ReportsSection.jsx";
import styles from "./Dashboard.module.css";

const Icon = {
  analyze: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 20l-3.2-3.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  rankings: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M5 21V11M12 21V4M19 21v-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 9v4M12 17h.01M10.3 4l-7 12A2 2 0 0 0 5 19h14a2 2 0 0 0 1.7-3l-7-12a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const SECTIONS = [
  {
    id: "analyze",
    label: "Verificar",
    icon: Icon.analyze,
    title: "Verificar site",
    subtitle: "Segurança e acessibilidade de qualquer link.",
    requiresAuth: false,
    Component: AnalyzeSection,
  },
  {
    id: "history",
    label: "Histórico",
    icon: Icon.history,
    title: "Seu histórico",
    subtitle: "Avaliações e denúncias que você registrou.",
    requiresAuth: true,
    Component: HistorySection,
  },
  {
    id: "rankings",
    label: "Top 10",
    icon: Icon.rankings,
    title: "Rankings de acessibilidade",
    subtitle: "Os melhores e piores sites avaliados.",
    requiresAuth: true,
    Component: RankingsSection,
  },
  {
    id: "reports",
    label: "Denúncias",
    icon: Icon.reports,
    title: "Denúncias da comunidade",
    subtitle: "Sites mais reportados pelos usuários.",
    requiresAuth: true,
    Component: ReportsSection,
  },
];

export default function Dashboard({ onBackToSite }) {
  const { user, isAuthenticated } = useAuth();
  const [active, setActive] = useState("analyze");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const onChange = (e) => {
      if (!e.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileNavOpen]);

  const current = SECTIONS.find((s) => s.id === active) || SECTIONS[0];
  const ActiveSection = current.Component;

  const lockedIds = isAuthenticated
    ? []
    : SECTIONS.filter((s) => s.requiresAuth).map((s) => s.id);

  const handleSelect = (id) => {
    if (lockedIds.includes(id)) {
      setLoginOpen(true);
      return;
    }
    setActive(id);
    setMobileNavOpen(false);
  };

  const navItems = SECTIONS.map(({ id, label, icon }) => ({ id, label, icon }));

  return (
    <div className={styles.shell}>
      {mobileNavOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Fechar menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Sidebar
        sections={navItems}
        activeId={active}
        onSelect={handleSelect}
        onBackToSite={onBackToSite}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        user={user}
        lockedIds={lockedIds}
      />

      <main className={styles.main}>
        <div className={styles.content}>
          <Topbar
            title={current.title}
            subtitle={current.subtitle}
            onLogin={() => setLoginOpen(true)}
            onMenuClick={() => setMobileNavOpen(true)}
          />
          <ActiveSection />
        </div>
      </main>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
