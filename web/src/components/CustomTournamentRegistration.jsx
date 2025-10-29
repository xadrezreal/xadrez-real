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
  Copy,
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
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCreatorPassword, setShowCreatorPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, setUser } = useContext(UserContext);

  const isRegistered = tournament?.participants?.some(
    (participant) => participant.user.id === user.id
  );

  const isCreator = tournament?.creatorId === user.id;

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

      const data = await tournamentService.getTournament(id);

      setTournament(data.tournament);

      if (data.tournament.status === "IN_PROGRESS") {
        navigate(`/tournament/${id}/bracket`);
      }
    } catch (error) {
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

      setShowPasswordModal(false);
      setPasswordInput("");

      if (result.updatedUser) {
        setUser(result.updatedUser);
      }

      setTimeout(() => fetchTournament(), 1000);
    } catch (error) {
      toast({
        title: "Erro na Inscrição",
        description: error.message || "Falha ao se inscrever no torneio",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeave = async () => {
    try {
      await tournamentService.leaveTournament(id);

      sendMessage({
        type: "leave_tournament",
        participant: { user: { id: user.id, name: user.name } },
      });

      toast({
        title: "Saída confirmada",
        description:
          "Você saiu do torneio e seu valor de entrada foi reembolsado",
      });

      setTimeout(() => fetchTournament(), 1000);
    } catch (error) {
      console.error("Erro ao sair do torneio:", error);

      toast({
        title: "Erro",
        description: error.message || "Falha ao sair do torneio",
        variant: "destructive",
      });
    }
  };

  const shareLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: "Link copiado!",
      description: "Compartilhe com seus amigos",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPassword = () => {
    if (tournament?.password) {
      navigator.clipboard.writeText(tournament.password);
      setPasswordCopied(true);
      toast({
        title: "Senha copiada!",
        description: "Compartilhe com os participantes",
      });
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      toast({
        title: "Senha obrigatória",
        description: "Por favor, digite a senha do torneio",
        variant: "destructive",
      });
      return;
    }
    handleRegister(passwordInput);
  };

  const getPrizeText = (distribution) => {
    switch (distribution) {
      case "WINNER_TAKES_ALL":
        return "Vencedor leva tudo (100%)";
      case "SPLIT_TOP_2":
        return "Top 3 (60%, 30%, 10%)";
      case "SPLIT_TOP_4":
        return "Top 4 (50%, 25%, 15%, 6%, 4%)";
      default:
        return distribution;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-900">
        <p className="text-white text-xl">Carregando torneio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-900">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <Button onClick={() => navigate("/tournament")}>Voltar</Button>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900  to-slate-900">
        <p className="text-white text-xl">Torneio não encontrado</p>
      </div>
    );
  }

  const participantCount = tournament.participants?.length || 0;
  const isFull = participantCount >= tournament.playerCount;

  const startTime = new Date(tournament.startTime);

  const totalPrizePool = tournament.prizePool?.toFixed(2) || "0.00";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex justify-center items-center flex-col bg-gradient-to-br from-slate-900 to-slate-900 p-6"
    >
      <div className="max-w-xl mx-auto text-start">
        <Button
          variant="ghost"
          className="mb-4 text-white hover:bg-slate-800"
          onClick={() => navigate("/tournament")}
        >
          <ArrowLeft className="mr-2" />
          Voltar
        </Button>
      </div>

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Torneio Privado</DialogTitle>
            <DialogDescription className="text-slate-400">
              Este torneio requer uma senha para participar.
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
          {isCreator && tournament.hasPassword && tournament.password && (
            <div className="mt-2 text-xs bg-slate-700/50 p-2 rounded inline-flex items-center gap-2">
              <span className="text-slate-400">Senha:</span>
              <code className="bg-slate-900 px-2 py-0.5 rounded text-cyan-300 font-mono text-xs">
                {showCreatorPassword ? tournament.password : "••••••••"}
              </code>
              <button
                type="button"
                onClick={() => setShowCreatorPassword(!showCreatorPassword)}
                className="text-slate-400 hover:text-white"
              >
                {showCreatorPassword ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={copyPassword}
                className="text-slate-400 hover:text-white"
              >
                {passwordCopied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
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

          <div className="flex flex-col sm:flex-row gap-2 w-full">
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
                className="w-auto text-lg"
                onClick={handleLeave}
              >
                Sair
              </Button>
            )}

            {isRegistered && (
              <div className="flex items-center justify-center gap-2 w-full p-3 bg-green-500/20 border border-green-500 rounded-lg text-center">
                <Check className="w-6 h-6 text-green-400 mb-1" />
                <p className="text-green-400 font-bold w-full whitespace-nowrap">
                  Você está inscrito!
                </p>
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
