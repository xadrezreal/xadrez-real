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
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
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
  const [stripeBalance, setStripeBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [showAccountStatus, setShowAccountStatus] = useState(false);

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
        fetchStripeBalance();
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
    fetchStripeBalance();
  }, []);

  const fetchStripeBalance = async () => {
    try {
      setLoadingBalance(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/stripe/connect/balance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStripeBalance(data);
      }
    } catch (error) {
      console.error("Erro ao buscar saldo do Stripe:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

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

    if (stripeBalance && amount > stripeBalance.available) {
      toast({
        title: "Saldo insuficiente",
        description: `Você só tem R$ ${stripeBalance.available.toFixed(
          2
        )} disponível para saque.`,
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
          title: "Saque solicitado com sucesso!",
          description: `R$ ${amount.toFixed(
            2
          )} será depositado em sua conta em 2 dias úteis.`,
        });
        setWithdrawAmount("");
        fetchStripeBalance();
      } else {
        const errorMessage = data.error || "Tente novamente mais tarde.";
        const isBalanceError = errorMessage.includes("insuficiente");

        toast({
          title: isBalanceError
            ? "Saldo em processamento"
            : "Erro ao processar saque",
          description: isBalanceError
            ? "Seu depósito ainda está sendo processado. Aguarde até 7 dias após o depósito para poder sacar."
            : errorMessage,
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
            </div>
          </div>
        </div>
      );
    }
  };

  const canWithdraw = connectStatus?.accountStatus === "active";

  const displayBalance = stripeBalance?.hasAccount
    ? stripeBalance.total
    : user?.balance || 0;

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
            <p className="text-sm text-slate-400">SALDO TOTAL</p>
            {loadingBalance ? (
              <Loader2 className="w-8 h-8 mx-auto my-4 animate-spin text-cyan-400" />
            ) : (
              <>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-cyan-400">
                  R$ {displayBalance.toFixed(2)}
                </p>
                {stripeBalance?.hasAccount && stripeBalance.pending > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        Disponível
                      </span>
                      <span className="text-green-400 font-semibold">
                        R$ {stripeBalance.available.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        Em processamento
                      </span>
                      <span className="text-yellow-400 font-semibold">
                        R$ {stripeBalance.pending.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {renderConnectStatus()}

          {/* Status da Conta */}
          {connectStatus && (
            <div className="bg-slate-900/30 border border-slate-600/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowAccountStatus(!showAccountStatus)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-slate-300">Status da Conta</span>
                </div>
                {showAccountStatus ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {showAccountStatus && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="border-t border-slate-600/50"
                >
                  <div className="p-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Status</span>
                      <span className={`font-semibold px-2 py-1 rounded ${
                        connectStatus.accountStatus === "active"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {connectStatus.accountStatus === "active" ? "Ativa" : "Pendente"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Receber pagamentos</span>
                      <span className={connectStatus.chargesEnabled ? "text-green-400" : "text-red-400"}>
                        {connectStatus.chargesEnabled ? "✓ Habilitado" : "✗ Desabilitado"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Fazer saques</span>
                      <span className={connectStatus.payoutsEnabled ? "text-green-400" : "text-red-400"}>
                        {connectStatus.payoutsEnabled ? "✓ Habilitado" : "✗ Desabilitado"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Dados completos</span>
                      <span className={connectStatus.detailsSubmitted ? "text-green-400" : "text-yellow-400"}>
                        {connectStatus.detailsSubmitted ? "✓ Sim" : "⚠ Pendente"}
                      </span>
                    </div>

                    {stripeBalance && (
                      <>
                        <div className="pt-3 mt-3 border-t border-slate-600/50 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Disponível para saque</span>
                            <span className="text-green-400 font-semibold">
                              R$ {stripeBalance.available?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Em processamento</span>
                            <span className="text-yellow-400 font-semibold">
                              R$ {stripeBalance.pending?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-600/50">
                            <span className="text-slate-300 font-semibold">Saldo total</span>
                            <span className="text-cyan-400 font-bold">
                              R$ {stripeBalance.total?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="pt-3 mt-3 border-t border-slate-600/50">
                      <div className="text-xs text-slate-500">
                        <span className="font-mono">ID: {connectStatus.accountId?.slice(-12) || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

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
                  Valor para saque (mínimo R$ 5,00)
                </Label>
                <p className="text-xs text-slate-500 -mt-1">
                  ⏱️ Depósitos recentes levam até 7 dias para ficarem
                  disponíveis para saque
                </p>
                <Input
                  id="withdrawAmount"
                  type="number"
                  min="5"
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
                      Solicitar Saque
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
