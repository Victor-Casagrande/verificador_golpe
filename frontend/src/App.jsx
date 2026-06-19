import { useEffect, useState } from "react";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { useAuth } from "./context/AuthContext.jsx";

/**
 * Roteamento mínimo sem react-router:
 *   - Autenticado          → Dashboard completo (a menos que tenha clicado
 *                            "Voltar ao site").
 *   - Visitante (sem login) → pode entrar no Dashboard em "modo visitante"
 *                            (só a seção de verificação de URLs, cuja auth é
 *                            opcional na API); as demais seções pedem login.
 *   - Caso contrário        → Landing.
 */
export default function App() {
  const { isAuthenticated } = useAuth();
  const [showLanding, setShowLanding] = useState(false);
  const [guest, setGuest] = useState(false);

  // Ao deslogar, volta o estado para o início (landing).
  useEffect(() => {
    if (!isAuthenticated) setShowLanding(false);
  }, [isAuthenticated]);

  // Ao logar (inclusive a partir do modo visitante), encerra o modo visitante
  // para liberar o dashboard completo.
  useEffect(() => {
    if (isAuthenticated) setGuest(false);
  }, [isAuthenticated]);

  const inDashboard = (isAuthenticated && !showLanding) || (!isAuthenticated && guest);

  if (inDashboard) {
    return (
      <Dashboard
        onBackToSite={() => {
          setShowLanding(true);
          setGuest(false);
        }}
      />
    );
  }

  return (
    <Landing
      onEnterDashboard={isAuthenticated ? () => setShowLanding(false) : undefined}
      onGuestAccess={!isAuthenticated ? () => setGuest(true) : undefined}
    />
  );
}
