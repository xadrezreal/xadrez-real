import React, { useState, useEffect, useContext, Suspense } from "react";
import { Helmet } from "react-helmet";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import Home from "./components/Home";
import Profile from "./components/Profile";
import ChessGame from "./components/ChessGame";
import TournamentView from "./components/TournamentView";
import Wallet from "./components/Wallet";
import PlayWithBot from "./components/PlayWithBot";
import Premium from "./components/Premium";
import HallOfFame from "./components/HallOfFame";
import WagerMatch from "./components/WagerMatch";
import Store from "./pages/Store";
import ProductDetailPage from "./pages/ProductDetailPage";
import Success from "./pages/Success";
import ShoppingCart from "./components/ShoppingCart";
import CreateTournament from "./components/CreateTournament";
import CustomTournamentRegistration from "./components/CustomTournamentRegistration";
import TournamentBracket from "./components/TournamentBracket";
import Deposit from "./components/Deposit";
import Matchmaking from "./components/Matchmaking";
import GameRoom from "./components/GameRoom";
import LanguageSwitcher from "./components/LanguageSwitcher";
import UpdatePassword from "./components/profile/UpdatePassword";
import {
  Home as HomeIcon,
  Trophy,
  Wallet as WalletIcon,
  Crown,
  DollarSign,
  Store as StoreIcon,
  ShoppingCart as ShoppingCartIcon,
  PlusCircle,
  Swords,
  User as UserIcon,
} from "lucide-react";
import { BoardThemeContext } from "./contexts/BoardThemeContext";
import { UserContext } from "./contexts/UserContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext"; // Nova importação
import { CartProvider, useCart } from "./hooks/useCart";
import { Button } from "./components/ui/button";
import { useTranslation } from "react-i18next";

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-slate-900 text-white">
    <div className="text-center">
      <h2 className="text-2xl font-bold">Carregando Xadrez Real...</h2>
      <p className="text-slate-400">Por favor, aguarde.</p>
    </div>
  </div>
);

const PaidRoute = ({ children }) => {
  const { user, setUser } = useContext(UserContext);
  const location = useLocation();
  const wager = location.state?.wager;

  React.useEffect(() => {
    if (wager && user.balance >= wager) {
      setUser((prevUser) => ({
        ...prevUser,
        balance: prevUser.balance - wager,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wager]);

  if (wager && user.balance < wager) {
    return (
      <Navigate
        to="/wallet"
        state={{
          from: location,
          error: "Saldo insuficiente para esta partida.",
        }}
        replace
      />
    );
  }

  return children;
};

const AppContent = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cartItems } = useCart();
  const { user: authUser, initialLoading, isAuthenticated } = useAuth(); // Usando nova auth
  const { user, setUser: setUserContext } = useContext(UserContext);
  const { t } = useTranslation();

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Atualizar contexto do usuário baseado na nova autenticação
  useEffect(() => {
    if (isAuthenticated && authUser) {
      setUserContext((prevUser) => ({
        ...prevUser,
        id: authUser.id,
        name: authUser.name || `Jogador-${authUser.id.substring(0, 4)}`,
        isPremium: authUser.role === "PREMIUM",
        balance: prevUser.balance, // Manter balance local por enquanto
        isRegistered: true,
        email: authUser.email,
        role: authUser.role,
      }));
    } else {
      setUserContext((prevUser) => ({
        ...prevUser,
        id: null,
        name: "Convidado",
        isPremium: false,
        isRegistered: false,
        email: null,
        role: "FREEMIUM",
      }));
    }
  }, [authUser, isAuthenticated, setUserContext]);

  // Sistema de presença online (pode ser adaptado depois)
  useEffect(() => {
    if (user.id && user.isRegistered) {
      const updatePresence = async () => {
        // Implementar sistema de presença com o novo backend
        // Por enquanto apenas um log
        console.log("User online:", user.name);
      };

      updatePresence();
      const interval = setInterval(updatePresence, 60000);

      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          updatePresence();
        }
      };

      window.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        clearInterval(interval);
        window.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, [user.id, user.name, user.status, user.currentGameId, user.isRegistered]);

  const navLinkClasses = ({ isActive }) =>
    `flex flex-col items-center justify-center text-center gap-1 px-2 py-2 rounded-lg transition-all duration-300 w-20 ${
      isActive
        ? "bg-cyan-500/20 text-cyan-300 shadow-inner"
        : "text-gray-400 hover:bg-slate-700/50 hover:text-white"
    }`;

  if (initialLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-white font-sans">
      <div className="flex flex-col h-screen">
        <header className="mb-6 px-2 sm:px-4 pt-2 sm:pt-4">
          <nav className="max-w-6xl mx-auto bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-2 flex justify-between sm:justify-center items-center gap-1 sm:gap-2 flex-wrap">
            <NavLink to="/" className={navLinkClasses}>
              <HomeIcon className="w-5 h-5" />
              <span className="text-xs">{t("nav.home")}</span>
            </NavLink>
            <NavLink to="/profile" className={navLinkClasses}>
              <UserIcon className="w-5 h-5" />
              <span className="text-xs">{t("nav.profile")}</span>
            </NavLink>
            <NavLink to="/matchmaking" className={navLinkClasses}>
              <Swords className="w-5 h-5" />
              <span className="text-xs">{t("nav.play_now")}</span>
            </NavLink>
            <NavLink to="/store" className={navLinkClasses}>
              <StoreIcon className="w-5 h-5" />
              <span className="text-xs">{t("nav.store")}</span>
            </NavLink>
            <NavLink to="/create-tournament" className={navLinkClasses}>
              <PlusCircle className="w-5 h-5" />
              <span className="text-xs">{t("nav.create_tournament")}</span>
            </NavLink>
            <NavLink to="/wager-match" className={navLinkClasses}>
              <DollarSign className="w-5 h-5" />
              <span className="text-xs">{t("nav.wager")}</span>
            </NavLink>
            <NavLink to="/tournament" className={navLinkClasses}>
              <Trophy className="w-5 h-5" />
              <span className="text-xs">{t("nav.tournaments")}</span>
            </NavLink>
            <NavLink to="/hall-of-fame" className={navLinkClasses}>
              <Crown className="w-5 h-5" />
              <span className="text-xs">{t("nav.champions")}</span>
            </NavLink>
            <NavLink to="/wallet" className={navLinkClasses}>
              <WalletIcon className="w-5 h-5" />
              <span className="text-xs">{t("nav.wallet")}</span>
            </NavLink>
            <div className="flex items-center ml-auto pl-4">
              <LanguageSwitcher />
              <Button
                onClick={() => setIsCartOpen(true)}
                variant="ghost"
                className="relative text-white hover:bg-white/10"
              >
                <ShoppingCartIcon className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </div>
          </nav>
        </header>
        <main className="flex-grow overflow-y-auto px-2 sm:px-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/store" element={<Store />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/success" element={<Success />} />
            <Route
              path="/game/:gameId"
              element={
                <PaidRoute>
                  <ChessGame />
                </PaidRoute>
              }
            />
            <Route path="/gameroom" element={<GameRoom />} />
            <Route
              path="/matchmaking"
              element={
                <PaidRoute>
                  <Matchmaking />
                </PaidRoute>
              }
            />
            <Route path="/wager-match" element={<WagerMatch />} />
            <Route path="/play-with-bot" element={<PlayWithBot />} />
            <Route path="/tournament" element={<TournamentView />} />
            <Route path="/create-tournament" element={<CreateTournament />} />
            <Route
              path="/tournament/:id"
              element={<CustomTournamentRegistration />}
            />
            <Route
              path="/tournament/:id/bracket"
              element={<TournamentBracket />}
            />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/hall-of-fame" element={<HallOfFame />} />
          </Routes>
        </main>
        <ShoppingCart isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />
        <Toaster />
      </div>
    </div>
  );
};

function App() {
  const [boardTheme, setBoardTheme] = useState(
    () => localStorage.getItem("boardTheme") || "modern"
  );

  const [user, setUser] = useState({
    id: null,
    name: "Convidado",
    isPremium: false,
    isChampion: false,
    balance: 0,
    titles: 0,
    isRegistered: false,
    status: "offline",
    currentGameId: null,
    email: null,
    role: "FREEMIUM",
  });

  const boardContextValue = { boardTheme, setBoardTheme };
  const userContextValue = { user, setUser };

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AuthProvider>
        {" "}
        {/* Novo provider */}
        <UserContext.Provider value={userContextValue}>
          <BoardThemeContext.Provider value={boardContextValue}>
            <CartProvider>
              <Router>
                <Helmet>
                  <title>Xadrez Real</title>
                  <meta
                    name="description"
                    content="Jogue xadrez online, participe de campeonatos e melhore sua pontuação."
                  />
                </Helmet>
                <AppContent />
              </Router>
            </CartProvider>
          </BoardThemeContext.Provider>
        </UserContext.Provider>
      </AuthProvider>
    </Suspense>
  );
}

export default App;
