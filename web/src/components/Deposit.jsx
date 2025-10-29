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

// Configure aqui seus Price IDs do Stripe
const depositOptions = [
  {
    amount: 1,
    priceId: "price_1SMqB9BOcWVXza8Xb7xIl8mE",
  },
  // Adicione mais conforme criar no Stripe:
  // {
  //   amount: 10,
  //   priceId: "price_XXXXX",
  // },
  // {
  //   amount: 20,
  //   priceId: "price_YYYYY",
  // },
  // {
  //   amount: 50,
  //   priceId: "price_ZZZZZ",
  // },
  // {
  //   amount: 100,
  //   priceId: "price_WWWWW",
  // },
  // {
  //   amount: 200,
  //   priceId: "price_QQQQQ",
  // },
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

      console.log("[DEPOSIT] Criando checkout:", {
        priceId: selectedOption.priceId,
        amount: selectedOption.amount,
      });

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
      console.log("[DEPOSIT] Checkout criado:", data);

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não foi retornada");
      }
    } catch (error) {
      console.error("[DEPOSIT] Erro:", error);
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
            Depositar Saldo
          </CardTitle>
          <CardDescription className="text-slate-400">
            Adicione créditos à sua carteira para apostar em torneios e jogos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Saldo Atual */}
          <div className="p-4 bg-slate-900/50 rounded-lg text-center">
            <p className="text-sm text-slate-400">SALDO ATUAL</p>
            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-cyan-400">
              R$ {user?.balance ? user.balance.toFixed(2) : "0.00"}
            </p>
          </div>

          {/* Opções de Valores */}
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
                💡 Mais opções de valores em breve!
              </p>
            )}
          </div>

          {/* Benefícios */}
          <div className="space-y-3">
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-xs text-green-300 font-medium">
                ✓ Use para apostar em torneios
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-300 font-medium">
                ✓ Pagamento 100% seguro via Stripe
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-xs text-purple-300 font-medium">
                ✓ Crédito instantâneo após aprovação
              </p>
            </div>
          </div>

          {/* Preview do Depósito */}
          <div className="space-y-4 pt-4 border-t border-slate-700">
            <div className="p-4 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-lg border border-green-500/30">
              <p className="text-center">
                <span className="text-sm text-slate-300">
                  Você vai adicionar
                </span>
                <br />
                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-cyan-400">
                  R$ {selectedOption.amount.toFixed(2)}
                </span>
                <br />
                <span className="text-xs text-slate-400">
                  Novo saldo: R${" "}
                  {((user?.balance || 0) + selectedOption.amount).toFixed(2)}
                </span>
              </p>
            </div>

            {/* Botão de Pagamento */}
            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full text-lg bg-gradient-to-r from-green-500 to-cyan-500 text-white hover:from-green-600 hover:to-cyan-600 py-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Depositar R$ {selectedOption.amount.toFixed(2)}
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
