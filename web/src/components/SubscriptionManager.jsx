import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import {
  Crown,
  Check,
  Zap,
  TrendingUp,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "./ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
} from "./ui/alert-dialog";

const SubscriptionManager = () => {
  const { isPremium } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("upgraded") === "true") {
      toast({
        title: "🎉 Bem-vindo ao Premium!",
        description: "Seu upgrade foi concluído com sucesso!",
        duration: 5000,
      });
      window.history.replaceState({}, "", "/subscription");
    }

    if (params.get("cancelled") === "true") {
      toast({
        title: "Checkout cancelado",
        description: "Você pode tentar novamente quando quiser.",
        variant: "default",
      });
      window.history.replaceState({}, "", "/subscription");
    }
  }, [toast]);

  const plans = [
    {
      id: "trial",
      name: "Teste Premium",
      price: 1.0,
      period: "primeiro mês",
      description: "Experimente todos os recursos por apenas R$ 1",
      features: [
        "Acesso total por 30 dias",
        "Todos os recursos Premium",
        "Cancele quando quiser",
        "Após o período: R$ 15/mês",
      ],
      popular: false,
      icon: <Zap className="w-8 h-8 text-cyan-400" />,
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      id: "monthly",
      name: "Plano Mensal",
      price: 15.0,
      period: "mês",
      description: "Flexibilidade total, cancele quando quiser",
      features: [
        "Entrada grátis em torneios",
        "Crie torneios privados",
        "Sem anúncios",
        "Suporte prioritário",
      ],
      popular: true,
      icon: <Crown className="w-8 h-8 text-yellow-400" />,
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      id: "yearly",
      name: "Plano Anual",
      price: 140.0,
      originalPrice: 180.0,
      period: "ano",
      description: "Economize 20% com o plano anual",
      features: [
        "Todos os recursos Premium",
        "Economia de R$ 40/ano",
        "Melhor custo-benefício",
        "Apenas R$ 11,67/mês",
      ],
      popular: false,
      discount: "20% OFF",
      icon: <TrendingUp className="w-8 h-8 text-green-400" />,
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  const handleSubscribe = async (planId) => {
    try {
      setIsLoading(true);
      setSelectedPlan(planId);
      const token = localStorage.getItem("auth_token");

      if (!token) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/subscription/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planId }),
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
        description: error.message || "Não foi possível processar a assinatura",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsLoading(true);
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
        description: "Você manterá os benefícios até o fim do período pago.",
      });

      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 text-white hover:bg-slate-800"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft className="mr-2" />
          Voltar ao Perfil
        </Button>

        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
            Escolha seu Plano Premium
          </h1>
          <p className="text-slate-400 text-lg">
            Desbloqueie todos os recursos e leve seu xadrez ao próximo nível
          </p>
        </motion.div>

        {isPremium && (
          <motion.div variants={itemVariants} className="mb-8">
            <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Crown className="w-8 h-8 text-yellow-400" />
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Você é Premium!
                      </h3>
                      <p className="text-slate-300">
                        Aproveite todos os benefícios exclusivos
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleManageSubscription}
                      disabled={isLoading}
                      className="bg-slate-800 hover:bg-slate-700"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Gerenciar"
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isLoading}>
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                            Cancelar Assinatura?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-300">
                            Você perderá acesso aos recursos Premium, mas
                            manterá os benefícios até o fim do período pago.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700">
                            Manter Premium
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            disabled={isLoading}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Confirmar"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <motion.div key={plan.id} variants={itemVariants}>
              <Card
                className={`relative overflow-hidden ${
                  plan.popular
                    ? "border-yellow-500/50 shadow-xl shadow-yellow-500/20"
                    : "border-slate-700"
                } bg-slate-800/50 text-white hover:scale-105 transition-transform duration-300`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1 text-xs font-bold">
                    MAIS POPULAR
                  </div>
                )}
                {plan.discount && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1 text-xs font-bold">
                    {plan.discount}
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4">{plan.icon}</div>
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-slate-400 text-sm">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    {plan.originalPrice && (
                      <p className="text-slate-500 line-through text-lg">
                        R$ {plan.originalPrice.toFixed(2)}
                      </p>
                    )}
                    <p className="text-4xl font-bold">
                      R$ {plan.price.toFixed(2)}
                    </p>
                    <p className="text-slate-400 text-sm">por {plan.period}</p>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isLoading || isPremium}
                    className={`w-full bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white font-bold py-6 text-lg`}
                  >
                    {isLoading && selectedPlan === plan.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPremium ? (
                      "Já é Premium"
                    ) : (
                      "Assinar Agora"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div variants={itemVariants} className="mt-12 text-center">
          <p className="text-slate-500 text-sm">
            Pagamento seguro processado pelo Stripe • Cancele quando quiser
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SubscriptionManager;
