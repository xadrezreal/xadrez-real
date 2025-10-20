import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/use-toast";
import {
  Trophy,
  Users,
  DollarSign,
  Check,
  Share2,
  ArrowLeft,
  LogIn,
  Calendar,
  Clock,
  Percent,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { UserContext } from "../contexts/UserContext";
import { tournamentService } from "../lib/tournamentService";
import { useWebSocket } from "../hooks/useWebSocket";

const CustomTournamentRegistration = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tournament, setTournament] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, setUser } = useContext(UserContext);

  const isRegistered = tournament?.participants?.some(
    (participant) => participant.user.id === user.id
  );

  useEffect(() => {
    if (!tournament || tournament.status !== "WAITING") {
      return;
    }

    const reloadKey = `tournament_reload_${id}`;
    const hasReloaded = localStorage.getItem(reloadKey);

    if (hasReloaded) {
      console.log("[REGISTRATION_RELOAD] Already reloaded, skipping");
      return;
    }

    const checkInterval = setInterval(() => {
      const startTime = new Date(tournament.startTime);
      const now = new Date();
      const timeUntilStart = startTime - now;

      console.log(
        `[REGISTRATION_RELOAD] Time until start: ${Math.ceil(
          timeUntilStart / 1000
        )}s`
      );

      if (timeUntilStart <= -25000) {
        localStorage.setItem(reloadKey, "true");
        window.location.reload();
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [tournament, id]);

  useEffect(() => {
    if (tournament?.status === "IN_PROGRESS") {
      const reloadKey = `tournament_reload_${id}`;
      localStorage.removeItem(reloadKey);
    }
  }, [tournament?.status, id]);

  const { lastMessage, sendMessage, isConnected } = useWebSocket(
    id ? `ws://localhost:3000/ws/tournament/${id}` : null,
    {
      onMessage: (message) => {
        console.log("WebSocket message received:", message);
        switch (message.type) {
          case "TOURNAMENT_STATUS_CHANGED":
          case "tournament_started":
            if (message.data.status === "IN_PROGRESS") {
              toast({
                title: "Torneio iniciado!",
                description: "Redirecionando para o chaveamento...",
              });

              setTimeout(() => {
                navigate(`/tournament/${id}/bracket`);
              }, 2000);
            }

            if (message.data.tournament) {
              setTournament(message.data.tournament);
            } else {
              setTournament((prev) =>
                prev ? { ...prev, status: message.data.status } : null
              );
            }
            break;

          case "participant_joined":
            toast({
              title: "Novo participante!",
              description: "Alguém se inscreveu no torneio",
            });
            setTimeout(() => fetchTournament(), 1000);
            break;

          case "participant_left":
            toast({
              title: "Participante saiu",
              description: "Alguém saiu do torneio",
            });
            setTimeout(() => fetchTournament(), 1000);
            break;

          default:
            console.log("Unknown WebSocket message type:", message.type);
        }
      },
    }
  );

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const [prevStatus, setPrevStatus] = useState(null);

  useEffect(() => {
    if (!tournament) return;

    if (prevStatus === "WAITING" && tournament.status === "IN_PROGRESS") {
      console.log("Tournament started! Fetching updated data...");
      fetchTournament();
    }

    setPrevStatus(tournament.status);
  }, [tournament?.status, prevStatus]);

  useEffect(() => {
    if (lastMessage) {
      console.log("WebSocket message received:", lastMessage);
    }
  }, [lastMessage]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("=== FETCHING TOURNAMENT REGISTRATION ===");
      console.log("Tournament ID:", id);

      const data = await tournamentService.getTournament(id);
      console.log("Tournament data received:", data);

      setTournament(data.tournament);

      if (data.tournament.status === "IN_PROGRESS") {
        navigate(`/tournament/${id}/bracket`);
      }
    } catch (error) {
      console.error("Erro ao buscar torneio:", error);
      setError(error.message);

      toast({
        title: "Torneio não encontrado",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    if (isRegistered || !tournament) return;

    const fee = parseFloat(tournament.entryFee || 0);

    if (fee > 0 && user.balance < fee) {
      toast({
        title: "Saldo Insuficiente",
        description: `Você precisa de R$ ${fee.toFixed(2)} para participar`,
        variant: "destructive",
      });
      navigate("/wallet");
      return;
    }

    if (tournament.hasPassword) {
      setShowPasswordModal(true);
    } else {
      handleRegister();
    }
  };

  const handleRegister = async (password = null) => {
    if (isRegistered || !tournament) return;

    setIsSubmitting(true);

    try {
      const result = await tournamentService.joinTournament(id, password);

      sendMessage({
        type: "join_tournament",
        participant: { user: { id: user.id, name: user.name } },
      });

      toast({
        title: "Inscrição realizada!",
        description: result.message,
        variant: "default",
      });

      const fee = parseFloat(tournament.entryFee || 0);
      if (fee > 0) {
        setUser((prev) => ({
          ...prev,
          balance: prev.balance - fee,
        }));
      }

      setShowPasswordModal(false);
      setPasswordInput("");
      fetchTournament();
    } catch (error) {
      console.error("Erro ao se inscrever:", error);
      toast({
        title: "Erro ao se inscrever",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      toast({
        title: "Senha obrigatória",
        description: "Digite a senha do torneio",
        variant: "destructive",
      });
      return;
    }
    handleRegister(passwordInput);
  };

  const handleLeave = async () => {
    if (!isRegistered || !tournament) return;

    try {
      const result = await tournamentService.leaveTournament(id);

      sendMessage({
        type: "leave_tournament",
        participant: { user: { id: user.id, name: user.name } },
      });

      toast({
        title: "Você saiu do torneio",
        description: result.message,
        variant: "default",
      });

      const fee = parseFloat(tournament.entryFee || 0);
      if (fee > 0) {
        setUser((prev) => ({
          ...prev,
          balance: prev.balance + fee,
        }));
      }

      fetchTournament();
    } catch (error) {
      console.error("Erro ao sair do torneio:", error);
      toast({
        title: "Erro ao sair do torneio",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: "Link Copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-slate-400 mt-4">Carregando torneio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/tournament")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Torneios
        </Button>

        <Card className="bg-slate-800/50 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-400">
              Erro ao carregar torneio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => navigate("/tournament")}
                  variant="outline"
                >
                  Voltar aos Torneios
                </Button>
                <Button
                  onClick={fetchTournament}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/tournament")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Torneios
        </Button>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <p className="text-slate-400">Torneio não encontrado</p>
            <Button onClick={() => navigate("/tournament")} className="mt-4">
              Voltar aos Torneios
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const participantCount =
    tournament._count?.participants || tournament.participants?.length || 0;
  const totalPrizePool = (
    parseFloat(tournament.entryFee || 0) *
    participantCount *
    0.8
  ).toFixed(2);
  const isFull = participantCount >= tournament.playerCount;
  const startTime = new Date(tournament.startTime);

  const getPrizeText = (type) => {
    const prizes = {
      WINNER_TAKES_ALL: "Campeão leva tudo (100%)",
      SPLIT_TOP_2: "Top 2: 60% / 40%",
      SPLIT_TOP_4: "Top 4: 40% / 30% / 20% / 10%",
      winner_takes_all: "Campeão leva tudo (100%)",
      split_top_2: "Top 2: 60% / 40%",
      split_top_4: "Top 4: 40% / 30% / 20% / 10%",
    };
    return prizes[type] || "Não especificado";
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto p-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Button
        variant="ghost"
        onClick={() => navigate("/tournament")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Torneios
      </Button>

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-400">
              <Lock className="w-5 h-5" />
              Torneio Privado
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Este torneio requer senha. Digite a senha para se inscrever.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite a senha do torneio"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="bg-slate-900/50 border-slate-700 pr-10"
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput("");
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="bg-slate-800/50 border-slate-700 text-white">
        <CardHeader className="text-center">
          <Trophy className="mx-auto h-12 w-12 text-yellow-400" />
          <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
            {tournament.name}
          </CardTitle>
          <CardDescription className="text-slate-400">
            Criado por:{" "}
            <span className="font-bold text-cyan-400">
              {tournament.creator?.name || "Criador"}
            </span>
          </CardDescription>
          {tournament.hasPassword && (
            <div className="flex items-center justify-center gap-1 text-amber-400 text-sm mt-2">
              <Lock className="w-4 h-4" />
              <span>Torneio Privado</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center p-3 bg-slate-900/50 rounded-lg">
            <p className="text-sm text-slate-400">Status</p>
            <p className="text-lg font-bold text-cyan-400">
              {tournament.status === "WAITING"
                ? "Aguardando Jogadores"
                : tournament.status === "IN_PROGRESS"
                ? "Em Andamento"
                : tournament.status === "FINISHED"
                ? "Finalizado"
                : tournament.status}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
                <DollarSign className="w-4 h-4" />
                Entrada
              </p>
              <p className="text-xl font-bold">
                {parseFloat(tournament.entryFee || 0) === 0
                  ? "Grátis"
                  : `R$ ${parseFloat(tournament.entryFee).toFixed(2)}`}
              </p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
                <Users className="w-4 h-4" />
                Jogadores
              </p>
              <p className="text-xl font-bold">
                {participantCount} / {tournament.playerCount}
              </p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
                <Calendar className="w-4 h-4" /> Data
              </p>
              <p className="text-lg font-bold">
                {startTime.toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" /> Horário
              </p>
              <p className="text-lg font-bold">
                {startTime.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-lg text-center space-y-2">
            <div>
              <p className="text-sm text-slate-400">Prêmio Total Estimado</p>
              <p className="text-lg font-bold text-yellow-400">
                R$ {totalPrizePool}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
                <Percent className="w-4 h-4" />
                Distribuição
              </p>
              <p className="text-md font-semibold">
                {getPrizeText(tournament.prizeDistribution)}
              </p>
            </div>
          </div>

          {tournament.participants && tournament.participants.length > 0 && (
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <h3 className="text-white font-bold mb-2">
                Participantes ({participantCount})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {tournament.participants.map((participant, index) => (
                  <div
                    key={participant.user.id}
                    className={`p-2 rounded flex items-center gap-2 ${
                      participant.user.id === user.id
                        ? "bg-cyan-500/20"
                        : "bg-slate-700/50"
                    }`}
                  >
                    <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {index + 1}
                    </div>
                    <span className="text-sm">{participant.user.name}</span>
                    {participant.user.id === user.id && (
                      <span className="text-xs text-cyan-400 ml-auto">
                        (Você)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {tournament.status === "WAITING" && !isFull && !isRegistered && (
              <Button
                className="w-full text-lg bg-gradient-to-r from-green-500 to-cyan-500 shadow-lg hover:from-green-600 hover:to-cyan-600"
                onClick={handleRegisterClick}
              >
                <LogIn className="mr-2" />
                Inscrever-se
              </Button>
            )}

            {tournament.status === "WAITING" && isRegistered && (
              <Button
                variant="destructive"
                className="w-full text-lg"
                onClick={handleLeave}
              >
                Sair do Torneio
              </Button>
            )}

            {isRegistered && (
              <div className="w-full p-3 bg-green-500/20 border border-green-500 rounded-lg text-center">
                <Check className="mx-auto w-6 h-6 text-green-400 mb-1" />
                <p className="text-green-400 font-bold">Você está inscrito!</p>
              </div>
            )}

            {tournament.status === "IN_PROGRESS" && (
              <Button
                className="w-full text-lg bg-gradient-to-r from-orange-500 to-red-500"
                onClick={() => navigate(`/tournament/${id}/bracket`)}
              >
                Ver Chaveamento
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full text-lg border-slate-600 hover:bg-slate-700"
              onClick={shareLink}
            >
              {copied ? (
                <Check className="w-5 h-5 mr-2 text-green-400" />
              ) : (
                <Share2 className="w-5 h-5 mr-2" />
              )}
              {copied ? "Copiado!" : "Compartilhar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CustomTournamentRegistration;
