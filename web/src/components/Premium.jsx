import React, { useContext, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Gem, CheckCircle, Tv, Trophy, Video, Loader2 } from "lucide-react";
import { UserContext } from "../contexts/UserContext";
import { toast } from "./ui/use-toast";
import { useNavigate } from "react-router-dom";

const Premium = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user || !user.id) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar sessão de checkout");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Erro ao criar checkout:", error);
      toast({
        title: "Erro",
        description:
          error.message || "Não foi possível iniciar o processo de assinatura.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const benefits = [
    {
      icon: <Tv className="w-5 h-5 text-purple-400" />,
      text: "Assista a jogos ao vivo",
    },
    {
      icon: <Trophy className="w-5 h-5 text-yellow-400" />,
      text: "Entrada grátis em torneios",
    },
    {
      icon: <Video className="w-5 h-5 text-cyan-400" />,
      text: "Grave e analise suas partidas",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-400" />,
      text: "Símbolo de diamante exclusivo",
    },
  ];

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
      className="max-w-2xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-slate-800/50 border-purple-500/50 text-white shadow-2xl shadow-purple-500/10">
        <CardHeader className="text-center">
          <motion.div variants={itemVariants}>
            <Gem className="mx-auto h-16 w-16 text-purple-400 drop-shadow-lg mb-4" />
            <CardTitle className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Seja Premium
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2 text-lg">
              Desbloqueie o potencial máximo do Xadrez Clássico.
            </CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent className="p-8">
          <motion.div className="space-y-4 mb-8" variants={containerVariants}>
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3"
                variants={itemVariants}
              >
                {benefit.icon}
                <span className="text-slate-200">{benefit.text}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={itemVariants} className="text-center">
            <p className="text-4xl font-bold mb-2">
              R$ 14,99{" "}
              <span className="text-lg font-normal text-slate-400">/ mês</span>
            </p>
            <Button
              size="lg"
              className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg py-6"
              onClick={handleSubscribe}
              disabled={isLoading || user?.isPremium}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : user?.isPremium ? (
                "Você já é Premium"
              ) : (
                "Assinar Agora"
              )}
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              Você será redirecionado para um ambiente de pagamento seguro do
              Stripe.
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Premium;
