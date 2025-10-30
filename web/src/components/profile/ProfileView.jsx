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
import {
  UserCheck,
  Crown,
  Settings,
  CreditCard,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { UserContext } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
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
  const [showSettings, setShowSettings] = useState(false);

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

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");

      if (!token) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/subscription/checkout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erro ${response.status}`);
      }

      if (!data.url) {
        throw new Error("URL de checkout não recebida");
      }

      window.location.href = data.url;
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o upgrade",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/subscription/portal`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao acessar portal");
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error("URL do portal não recebida");
      }

      window.location.href = url;
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível acessar o portal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/subscription/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao cancelar assinatura");
      }

      toast({
        title: "✅ Assinatura cancelada",
        description:
          "Sua assinatura foi cancelada com sucesso. Você manterá os benefícios até o fim do período pago.",
      });

      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const premiumFeatures = [
    "Sem anúncios",
    "Acesso a todos os níveis de bot",
    "Análise de partidas com IA",
    "Criar torneios privados",
    "Customização avançada do tabuleiro",
    "Suporte prioritário",
  ];

  const freemiumLimitations = [
    "Anúncios entre partidas",
    "Bot limitado a nível 3",
    "Sem análise de IA",
    "Apenas torneios públicos",
    "Temas de tabuleiro limitados",
  ];

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
            {isPremium && <Crown className="w-6 h-6 text-yellow-400 ml-2" />}
          </CardTitle>
          <CardDescription className="text-slate-400 pt-2">
            Gerencie suas informações de perfil aqui.
            {isPremium && (
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
              <div className="flex items-center gap-2 p-2 bg-slate-700/30 rounded-md">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isPremium ? "bg-yellow-400" : "bg-slate-400"
                  }`}
                ></div>
                <span
                  className={isPremium ? "text-yellow-400" : "text-slate-400"}
                >
                  {isPremium ? "Premium" : "Freemium"}
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

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/subscription")}
              >
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar Assinatura
              </Button>

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
