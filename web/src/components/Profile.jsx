import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseAuth } from "../contexts/SupabaseAuthContext";
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
  const { session, loading } = useSupabaseAuth();
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

  const renderContent = () => {
    if (session) {
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

  if (loading) return null;

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
        key={session ? "profile-view" : view}
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
