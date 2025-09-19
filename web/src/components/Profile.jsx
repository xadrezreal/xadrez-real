import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext"; // Mudança aqui
import ProfileView from "./profile/ProfileView";
import LoginForm from "./profile/LoginForm";
import SignUpForm from "./profile/SignUpForm";
import ForgotPasswordForm from "./profile/ForgotPasswordForm";
import { useToast } from "./ui/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";

const containerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
};

const Profile = () => {
  const { user, isAuthenticated, initialLoading } = useAuth(); // Mudança aqui
  const [view, setView] = useState("login");
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.needsConfirmation) {
      toast({
        title: "Confirme seu E-mail",
        description:
          "Enviamos um link de confirmação para sua caixa de entrada. Por favor, verifique para ativar sua conta.",
        duration: 9000,
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, toast, navigate]);

  // Mostrar mensagem se veio de uma rota protegida
  useEffect(() => {
    if (location.state?.message) {
      toast({
        title: "Acesso Restrito",
        description: location.state.message,
        variant: "destructive",
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, toast, navigate]);

  const renderContent = () => {
    if (isAuthenticated && user) {
      // Mudança aqui
      return <ProfileView />;
    }

    switch (view) {
      case "signup":
        return <SignUpForm setView={setView} />;
      case "forgotPassword":
        return <ForgotPasswordForm setView={setView} />;
      case "login":
      default:
        return <LoginForm setView={setView} />;
    }
  };

  if (initialLoading) {
    // Mudança aqui
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-slate-400 mt-2">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Perfil e Autenticação - Xadrez Real</title>
        <meta
          name="description"
          content="Acesse seu perfil, faça login ou crie uma conta para jogar no Xadrez Real."
        />
      </Helmet>
      <motion.div
        className="max-w-md mx-auto"
        key={isAuthenticated ? "profile-view" : view} // Mudança aqui
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </motion.div>
    </>
  );
};

export default Profile;
