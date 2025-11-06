import React, { useState, useContext, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "../ui/use-toast";
import { UserCheck, Crown, Settings, Shield } from "lucide-react";
import { UserContext } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const ProfileView = () => {
  const {
    user: authUser,
    signOut,
    loading: authLoading,
    updateUser,
    isPremium,
  } = useAuth();
  const { user, setUser } = useContext(UserContext);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const isAdmin = authUser?.role === "ADMIN";

  useEffect(() => {
    if (authUser) {
      setName(authUser.name || "");
      setEmail(authUser.email || "");
    }
  }, [authUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("upgraded") === "true") {
      toast({
        title: "🎉 Bem-vindo ao Premium!",
        description:
          "Seu upgrade foi concluído com sucesso! Aproveite todos os benefícios.",
        duration: 5000,
      });
      window.history.replaceState({}, "", "/profile");
    }

    if (params.get("cancelled") === "true") {
      toast({
        title: "Checkout cancelado",
        description: "Você pode tentar novamente quando quiser.",
        variant: "default",
      });
      window.history.replaceState({}, "", "/profile");
    }
  }, [toast]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    const updateData = {
      name: name.trim(),
    };

    const { error } = await updateUser(updateData);

    if (!error) {
      setUser((prev) => ({
        ...prev,
        name: name.trim(),
      }));
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getRoleDisplay = () => {
    if (isAdmin) {
      return {
        text: "Administrador",
        color: "text-red-400",
        bgColor: "bg-red-400/20",
        icon: Shield,
      };
    }
    if (isPremium) {
      return {
        text: "Premium",
        color: "text-yellow-400",
        bgColor: "bg-yellow-400/20",
        icon: Crown,
      };
    }
    return {
      text: "Freemium",
      color: "text-slate-400",
      bgColor: "bg-slate-400/20",
      icon: null,
    };
  };

  const roleDisplay = getRoleDisplay();
  const RoleIcon = roleDisplay.icon;

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-6"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <Card className="bg-slate-800/50 border-slate-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl text-cyan-300">
            <UserCheck className="w-8 h-8" />
            Bem-vindo, {authUser?.name}
            {isAdmin && <Shield className="w-6 h-6 text-green-400 ml-2" />}
            {!isAdmin && isPremium && (
              <Crown className="w-6 h-6 text-yellow-400 ml-2" />
            )}
          </CardTitle>
          <CardDescription className="text-slate-400 pt-2">
            Gerencie suas informações de perfil aqui.
            {isAdmin && (
              <span className="block text-green-400 font-medium mt-1">
                🛡️ Administrador do Sistema
              </span>
            )}
            {!isAdmin && isPremium && (
              <span className="block text-yellow-400 font-medium mt-1">
                ✨ Usuário Premium
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="email-profile">Email</Label>
              <Input
                id="email-profile"
                type="email"
                value={email}
                disabled
                className="bg-slate-700/50"
              />
              <p className="text-xs text-slate-400">
                O email não pode ser alterado por segurança
              </p>
            </motion.div>

            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </motion.div>

            <motion.div className="space-y-2" variants={itemVariants}>
              <Label>Status da Conta</Label>
              <div
                className={`flex items-center gap-2 p-3 ${roleDisplay.bgColor} rounded-md`}
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    isAdmin
                      ? "bg-red-400"
                      : isPremium
                      ? "bg-yellow-400"
                      : "bg-slate-400"
                  }`}
                ></div>
                {RoleIcon && (
                  <RoleIcon className={`w-5 h-5 ${roleDisplay.color}`} />
                )}
                <span className={`font-medium ${roleDisplay.color}`}>
                  {roleDisplay.text}
                </span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-4 space-y-2">
              <Button
                type="submit"
                disabled={loading || authLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>

              {isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-green-500 text-green-400 hover:bg-red-500/10"
                  onClick={() => navigate("/admin")}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Painel de Administração
                </Button>
              )}

              {!isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/subscription")}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Gerenciar Assinatura
                </Button>
              )}

              <Button
                onClick={handleSignOut}
                disabled={authLoading}
                variant="destructive"
                className="w-full"
              >
                {authLoading ? "Saindo..." : "Sair"}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProfileView;
