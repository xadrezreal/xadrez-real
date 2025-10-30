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
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const { navigate } = useNavigate();

  useEffect(() => {
    if (authUser) {
      setName(authUser.name || "");
      setEmail(authUser.email || "");
    }
  }, [authUser]);

  // ✅ Tratamento de parâmetros da URL
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

      // Redireciona para o Stripe
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

      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="bg-slate-800/50 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="w-6 h-6 text-cyan-400" />
                Gerenciar Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    Premium
                  </h3>
                  <ul className="space-y-2">
                    {premiumFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {!isPremium && (
                    <Button
                      onClick={handleUpgrade}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      {loading
                        ? "Processando..."
                        : "Fazer Upgrade - R$ 19,90/mês"}
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    Freemium
                  </h3>
                  <ul className="space-y-2">
                    {freemiumLimitations.map((limitation, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-400">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {isPremium && (
                <div className="border-t border-slate-700 pt-6 space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Crown className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-yellow-400 mb-1">
                          Você é Premium!
                        </h4>
                        <p className="text-sm text-slate-300">
                          Aproveite todos os benefícios exclusivos. Sua
                          assinatura renova automaticamente.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleManageSubscription}
                      disabled={loading}
                      variant="outline"
                      className="flex-1"
                    >
                      {loading ? "Carregando..." : "Gerenciar no Stripe"}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          disabled={loading}
                          className="flex-1"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Cancelar Assinatura
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                            Tem certeza?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-300">
                            Ao cancelar sua assinatura Premium:
                            <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
                              <li>Você perderá acesso aos recursos Premium</li>
                              <li>Voltará para a conta Freemium</li>
                              <li>
                                Manterá os benefícios até o fim do período pago
                              </li>
                              <li>
                                Poderá fazer upgrade novamente a qualquer
                                momento
                              </li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700">
                            Manter Premium
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            disabled={loading}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {loading
                              ? "Cancelando..."
                              : "Confirmar Cancelamento"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ProfileView;
