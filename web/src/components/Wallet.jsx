import React, { useContext, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { toast } from "./ui/use-toast";
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { UserContext } from "../contexts/UserContext";

const Wallet = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get("deposit_success")) {
      const amount = parseFloat(query.get("amount"));
      if (!isNaN(amount)) {
        setUser((prevUser) => ({
          ...prevUser,
          balance: (prevUser.balance || 0) + amount,
        }));
        toast({
          title: "Depósito bem-sucedido!",
          description: `R$ ${amount.toFixed(
            2
          )} foram adicionados à sua carteira.`,
          variant: "success",
          duration: 5000,
        });
        navigate("/wallet", { replace: true });
      }
    }

    if (location.state?.error) {
      toast({
        title: "Aviso",
        description: location.state.error,
        variant: "destructive",
      });
      navigate("/wallet", { replace: true, state: {} });
    }
  }, [location, setUser, navigate, toast]);

  const handleDeposit = () => {
    navigate("/deposit");
  };

  const handleWithdraw = () => {
    toast({
      title: "Função de Retirada",
      description:
        "🚧 Este recurso ainda não foi implementado. Mas não se preocupe! Você pode solicitá-lo em seu próximo prompt! 🚀",
      duration: 5000,
    });
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
            <WalletIcon className="w-8 h-8" />
            Minha Carteira
          </CardTitle>
          <CardDescription className="text-slate-400">
            Gerencie seu saldo e transações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-slate-900/50 rounded-lg text-center">
            <p className="text-sm text-slate-400">SALDO ATUAL</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-cyan-400">
              R$ {user.balance ? user.balance.toFixed(2) : "0.00"}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-200">Ações</h3>
            <Button
              onClick={handleDeposit}
              className="w-full bg-gradient-to-r from-green-500 to-cyan-500 text-white"
            >
              <ArrowDownToLine className="w-5 h-5 mr-2" />
              Depositar Dinheiro
            </Button>
            <Button
              onClick={handleWithdraw}
              variant="outline"
              className="w-full"
            >
              <ArrowUpFromLine className="w-5 h-5 mr-2" />
              Retirar Dinheiro
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Wallet;
