import { useCallback, useState } from "react";
import Navbar from "../components/layout/Navbar.jsx";
import Footer from "../components/layout/Footer.jsx";
import LoginModal from "../components/auth/LoginModal.jsx";
import Hero from "../components/landing/Hero.jsx";
import ShowcaseRealtime from "../components/landing/ShowcaseRealtime.jsx";
import Features from "../components/landing/Features.jsx";
import ExtensionShowcase from "../components/landing/ExtensionShowcase.jsx";
import Testimonials from "../components/landing/Testimonials.jsx";
import FAQ from "../components/landing/FAQ.jsx";
import FinalCTA from "../components/landing/FinalCTA.jsx";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Página inicial.
 *
 * Estratégia: a Landing é dona do estado do modal de login para que tanto a
 * Navbar quanto os CTAs ("Começar agora", "Criar conta") possam abri-lo.
 * O scroll suave é tratado pela própria Navbar (scrollIntoView) e pelo
 * scroll-behavior:smooth do CSS global.
 */
export default function Landing() {
  const [loginOpen, setLoginOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const openLogin = useCallback(() => {
    if (isAuthenticated) return;
    setLoginOpen(true);
  }, [isAuthenticated]);

  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const scrollToFeatures = useCallback(() => {
    const target = document.getElementById("recursos");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      <Navbar onLoginClick={openLogin} />

      <main>
        <Hero
          onPrimaryClick={openLogin}
          onSecondaryClick={scrollToFeatures}
        />
        <ShowcaseRealtime />
        <Features />
        <ExtensionShowcase />
        <Testimonials />
        <FAQ />
        <FinalCTA onPrimaryClick={openLogin} />
      </main>

      <Footer />

      <LoginModal open={loginOpen} onClose={closeLogin} />
    </>
  );
}
