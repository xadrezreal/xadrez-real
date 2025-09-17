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
import { loadStripe } from "@stripe/stripe-js";

const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51RtHls2XMJs3OkwIAqlBmCIWeOSrot4G6KZXfOjhGVxoYeZj6BgpPUEuIPyXdlxdCvxSQLEpZQeicbGf2YQz7uAa00EVPUfCj7";
const STRIPE_PRICE_ID = "price_1RtHqF2XMJs3OkwI4a1gO3xP"; // Example Price ID for subscription
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const Premium = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
        mode: "subscription",
        successUrl: `${window.location.origin}/profile?subscription_success=true`,
        cancelUrl: `${window.location.origin}/premium`,
      });

      if (error) {
        console.error("Stripe checkout error:", error);
        toast({
          title: "Erro",
          description: "Não foi possível iniciar o processo de assinatura.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Stripe error:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
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
              disabled={isLoading || user.isPremium}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : user.isPremium ? (
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
