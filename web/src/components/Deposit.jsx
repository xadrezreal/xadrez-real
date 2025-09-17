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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/use-toast";
import { Wallet, DollarSign, CreditCard, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { UserContext } from "../contexts/UserContext";

const depositOptions = [10, 20, 50, 100, 200, 500];
const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51RtHls2XMJs3OkwIAqlBmCIWeOSrot4G6KZXfOjhGVxoYeZj6BgpPUEuIPyXdlxdCvxSQLEpZQeicbGf2YQz7uAa00EVPUfCj7";
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const Deposit = () => {
  const { toast } = useToast();
  const { user, setUser } = useContext(UserContext);
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);
    const depositValue = customAmount ? parseFloat(customAmount) : amount;

    if (isNaN(depositValue) || depositValue < 10) {
      toast({
        title: "Valor Inválido",
        description: "O valor mínimo para depósito é de R$ 10,00.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const stripe = await stripePromise;

      const response = await fetch("https://api.stripe.com/v1/payment_links", {
        method: "POST",
        headers: {
          Authorization: `Bearer sk_test_51RtHls2XMJs3OkwI238kMk6sVib5nzzaBBk8ALOllP70mUViE2S0fE2Sq14FOHwa385RswJhpSq07Oax7tUO9UL3001UylpS2w`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "line_items[0][price_data][currency]": "brl",
          "line_items[0][price_data][product_data][name]": `Depósito de Créditos`,
          "line_items[0][price_data][unit_amount]": Math.round(
            depositValue * 100
          ),
          "line_items[0][quantity]": 1,
          "payment_method_types[]": "card",
          "after_completion[type]": "redirect",
          "after_completion[redirect][url]": `${window.location.origin}/wallet?deposit_success=true&amount=${depositValue}`,
        }),
      });

      const paymentLink = await response.json();

      if (paymentLink.url) {
        window.location.href = paymentLink.url;
      } else {
        throw new Error("Falha ao criar o link de pagamento.");
      }
    } catch (error) {
      console.error("Stripe Error:", error);
      toast({
        title: "Erro no Pagamento",
        description:
          "Não foi possível iniciar o pagamento. Por favor, tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value && !isNaN(parseFloat(value))) {
      setAmount(0);
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
          <div className="space-y-2">
            <Label>Escolha um valor ou digite abaixo</Label>
            <div className="grid grid-cols-3 gap-2">
              {depositOptions.map((opt) => (
                <Button
                  key={opt}
                  variant={
                    amount === opt && !customAmount ? "default" : "secondary"
                  }
                  onClick={() => {
                    setAmount(opt);
                    setCustomAmount("");
                  }}
                  className={`transition-all ${
                    amount === opt && !customAmount ? "bg-cyan-500" : ""
                  }`}
                >
                  R$ {opt}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customAmount">
              Ou insira um valor (mín. R$ 10,00)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="customAmount"
                type="number"
                placeholder="0.00"
                min="10"
                step="0.01"
                value={customAmount}
                onChange={handleCustomAmountChange}
                className="pl-10"
              />
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
              Pagar com Cartão / PIX
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
