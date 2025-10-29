import React, { useState, useContext } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
import { Wallet, CreditCard, Loader2, ArrowLeft } from "lucide-react";
import { UserContext } from "../contexts/UserContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const depositOptions = [
  {
    amount: 1,
    priceId: "price_1SMqB9BOcWVXza8Xb7xIl8mE",
  },
  // Adicione mais Price IDs conforme criar no Stripe:
  // { amount: 10, priceId: "price_xxx" },
  // { amount: 20, priceId: "price_xxx" },
  // { amount: 50, priceId: "price_xxx" },
  // { amount: 100, priceId: "price_xxx" },
];

const Deposit = () => {
  const { toast } = useToast();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState(depositOptions[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        toast({
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para fazer um depósito.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

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
      <Button
        variant="ghost"
        onClick={() => navigate("/wallet")}
        className="mb-4 text-slate-300 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Carteira
      </Button>

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
              R$ {user?.balance ? user.balance.toFixed(2) : "0.00"}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Escolha um valor</Label>
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
                    selectedOption.priceId === opt.priceId
                      ? "bg-cyan-500 hover:bg-cyan-600"
                      : ""
                  }`}
                  disabled={isLoading}
                >
                  R$ {opt.amount.toFixed(2)}
                </Button>
              ))}
            </div>
            {depositOptions.length === 1 && (
              <p className="text-xs text-slate-500 text-center mt-2">
                Mais opções de valores em breve!
              </p>
            )}
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-300">
              💳 Pagamento processado de forma segura via Stripe
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-700">
            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full text-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pagar R$ {selectedOption.amount.toFixed(2)}
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Você será redirecionado para uma página segura de pagamento
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Deposit;
