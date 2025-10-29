import React, { useState, useContext } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { useToast } from "./ui/use-toast";
import { Wallet, CreditCard, Loader2 } from "lucide-react";
import { UserContext } from "../contexts/UserContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const depositOptions = [
  {
    amount: 1,
    priceId: "price_1SMqB9BOcWVXza8Xb7xIl8mE", // Seu Price ID de R$ 1,00
  },
  // Adicione mais quando tiver os outros Price IDs
  // { amount: 10, priceId: "price_xxx" },
  // { amount: 20, priceId: "price_xxx" },
  // { amount: 50, priceId: "price_xxx" },
];

const Deposit = () => {
  const { toast } = useToast();
  const { user } = useContext(UserContext);
  const [selectedOption, setSelectedOption] = useState(depositOptions[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem("auth_token");

      const response = await fetch(`${API_URL}/payments/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId: selectedOption.priceId,
          amount: selectedOption.amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar sessão de pagamento");
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não foi retornada");
      }
    } catch (error) {
      console.error("Stripe Error:", error);
      toast({
        title: "Erro no Pagamento",
        description:
          error.message ||
          "Não foi possível iniciar o pagamento. Por favor, tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="max-w-md mx-auto"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-slate-800/50 border-slate-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl text-cyan-300">
            <Wallet className="w-8 h-8" />
            Depositar
          </CardTitle>
          <CardDescription className="text-slate-400">
            Adicione saldo à sua carteira para participar de jogos e torneios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-slate-900/50 rounded-lg text-center">
            <p className="text-sm text-slate-400">SALDO ATUAL</p>
            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-cyan-400">
              R$ {user.balance ? user.balance.toFixed(2) : "0.00"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Escolha um valor</Label>
            <div className="grid grid-cols-3 gap-2">
              {depositOptions.map((opt) => (
                <Button
                  key={opt.priceId}
                  variant={
                    selectedOption.priceId === opt.priceId
                      ? "default"
                      : "secondary"
                  }
                  onClick={() => setSelectedOption(opt)}
                  className={`transition-all ${
                    selectedOption.priceId === opt.priceId ? "bg-cyan-500" : ""
                  }`}
                  disabled={isLoading}
                >
                  R$ {opt.amount}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-700">
            <h3 className="font-semibold text-center text-slate-300">
              Escolha a forma de pagamento
            </h3>
            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full text-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5 mr-2" />
              )}
              Pagar R$ {selectedOption.amount.toFixed(2)}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Você será redirecionado para um ambiente de pagamento seguro do
              Stripe.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Deposit;
