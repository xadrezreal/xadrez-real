import React, { useContext, useEffect, useState } from "react";
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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "./ui/use-toast";
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { UserContext } from "../contexts/UserContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const Wallet = () => {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [connectStatus, setConnectStatus] = useState(null);
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    const refreshUser = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("[WALLET] Erro ao atualizar saldo:", error);
      }
    };

    refreshUser();

    const query = new URLSearchParams(location.search);
    if (query.get("deposit_success") || query.get("session_id")) {
      setTimeout(() => {
        refreshUser();
        toast({
          title: "Depósito Confirmado!",
          description: "Seu saldo foi atualizado com sucesso.",
          variant: "default",
          duration: 5000,
        });
        navigate("/wallet", { replace: true });
      }, 2000);
    }

    if (location.state?.error) {
      toast({
        title: "Aviso",
        description: location.state.error,
        variant: "destructive",
      });
      navigate("/wallet", { replace: true, state: {} });
    }
  }, [location, setUser, navigate]);

  useEffect(() => {
    checkConnectStatus();
  }, []);

  const checkConnectStatus = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/stripe/connect/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConnectStatus(data);
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
    }
  };

  const handleConnectAccount = async () => {
    setLoadingConnect(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/stripe/connect/account`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accountLink) {
          window.location.href = data.accountLink;
        } else {
          toast({
            title: "Conta já conectada!",
            description: "Sua conta bancária já está vinculada.",
          });
          checkConnectStatus();
        }
      } else {
        throw new Error("Erro ao conectar conta");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível conectar a conta bancária.",
        variant: "destructive",
      });
    } finally {
      setLoadingConnect(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);

    if (!amount || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido para saque.",
        variant: "destructive",
      });
      return;
    }

    if (amount > user?.balance) {
      toast({
        title: "Saldo insuficiente",
        description: `Você só tem R$ ${user?.balance.toFixed(2)} disponível.`,
        variant: "destructive",
      });
      return;
    }

    if (amount < 5) {
      toast({
        title: "Valor mínimo",
        description: "O valor mínimo para saque é R$ 5,00.",
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/stripe/withdraw`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Saque realizado com sucesso!",
          description: `R$ ${amount.toFixed(
            2
          )} será depositado em sua conta em 2-7 dias úteis.`,
        });
        setWithdrawAmount("");
        setUser({ ...user, balance: data.newBalance });
      } else {
        toast({
          title: "Erro ao processar saque",
          description: data.error || "Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível processar o saque.",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDeposit = () => {
    navigate("/deposit");
  };

  const renderConnectStatus = () => {
    if (!connectStatus) {
      return null;
    }

    if (!connectStatus.connected) {
      return (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-400">
                Conta bancária não conectada
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Para retirar dinheiro, você precisa conectar uma conta bancária.
              </p>
              <Button
                onClick={handleConnectAccount}
                disabled={loadingConnect}
                className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-black"
                size="sm"
              >
                {loadingConnect ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Conectar Conta Bancária
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (connectStatus.accountStatus === "pending") {
      return (
        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-orange-400">
                Verificação pendente
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Sua conta está sendo verificada pelo Stripe. Pode levar algumas
                horas ou até 1 dia.
              </p>
              {!connectStatus.detailsSubmitted && (
                <Button
                  onClick={handleConnectAccount}
                  disabled={loadingConnect}
                  className="mt-3 bg-orange-500 hover:bg-orange-600 text-white"
                  size="sm"
                >
                  {loadingConnect ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Completar Verificação
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (connectStatus.accountStatus === "active") {
      return (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-400">
                Conta bancária conectada
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Você pode retirar dinheiro a qualquer momento.
              </p>
            </div>
          </div>
        </div>
      );
    }
  };

  const canWithdraw = connectStatus?.accountStatus === "active";

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
              R$ {user?.balance ? user.balance.toFixed(2) : "0.00"}
            </p>
          </div>

          {renderConnectStatus()}

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-200">Ações</h3>

            <Button
              onClick={handleDeposit}
              className="w-full bg-gradient-to-r from-green-500 to-cyan-500 text-white"
            >
              <ArrowDownToLine className="w-5 h-5 mr-2" />
              Depositar Dinheiro
            </Button>

            {canWithdraw && (
              <div className="space-y-3">
                <Label htmlFor="withdrawAmount" className="text-slate-300">
                  Valor para saque (mínimo R$ 10,00)
                </Label>
                <Input
                  id="withdrawAmount"
                  type="number"
                  min="10"
                  step="0.01"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="bg-slate-900/50 border-slate-700"
                  disabled={isWithdrawing}
                />
                <Button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ArrowUpFromLine className="w-5 h-5 mr-2" />
                      Retirar Dinheiro
                    </>
                  )}
                </Button>
              </div>
            )}

            {!canWithdraw && connectStatus?.connected && (
              <Button
                disabled
                variant="outline"
                className="w-full opacity-50 cursor-not-allowed"
              >
                <ArrowUpFromLine className="w-5 h-5 mr-2" />
                Retirar Dinheiro (Verificação Pendente)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Wallet;
