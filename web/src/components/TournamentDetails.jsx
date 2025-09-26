import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useToast } from "./ui/use-toast";
import { UserContext } from "../contexts/UserContext";
import { tournamentService } from "../lib/tournamentService";
import TournamentRulesModal from "./TournamentRulesModal";
import {
  Trophy,
  Users,
  DollarSign,
  Calendar,
  Clock,
  Crown,
  Share2,
  Copy,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Loader2,
  AlertCircle,
  ShieldCheck,
  X,
  CheckCircle,
} from "lucide-react";

const TournamentDetails = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, setUser } = useContext(UserContext);

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [error, setError] = useState(null);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getTournament(tournamentId);
      setTournament(data.tournament);
      setError(null);
    } catch (error) {
      console.error("Erro ao buscar torneio:", error);
      setError(error.message);
      toast({
        title: "Erro ao carregar torneio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();

      // Polling para atualizar dados em tempo real
      const interval = setInterval(fetchTournament, 10000);
      return () => clearInterval(interval);
    }
  }, [tournamentId]);

  const isUserParticipating = () => {
    if (!tournament || !user) return false;
    return tournament.participants?.some((p) => p.user.id === user.id) || false;
  };

  const canJoinTournament = () => {
    if (!tournament || !user) return false;
    return (
      tournament.status === "WAITING" &&
      !isUserParticipating() &&
      tournament._count.participants < tournament.playerCount
    );
  };

  const canLeaveTournament = () => {
    if (!tournament || !user) return false;
    return (
      tournament.status === "WAITING" &&
      isUserParticipating() &&
      tournament.creatorId !== user.id
    );
  };

  const canCancelTournament = () => {
    if (!tournament || !user) return false;
    return tournament.status === "WAITING" && tournament.creatorId === user.id;
  };

  const handleJoinTournament = async () => {
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para participar.",
        variant: "destructive",
      });
      return;
    }

    if (tournament.entryFee > 0 && user.balance < tournament.entryFee) {
      toast({
        title: "Saldo Insuficiente",
        description: `Você precisa de R$ ${tournament.entryFee.toFixed(
          2
        )} para participar.`,
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      await tournamentService.joinTournament(tournamentId);

      // Atualizar saldo local se necessário
      if (tournament.entryFee > 0) {
        setUser((prev) => ({
          ...prev,
          balance: prev.balance - tournament.entryFee,
        }));
      }

      toast({
        title: "Sucesso!",
        description: "Você se inscreveu no torneio com sucesso!",
      });

      fetchTournament(); // Atualizar dados
    } catch (error) {
      toast({
        title: "Erro ao participar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveTournament = async () => {
    if (!window.confirm("Tem certeza que deseja sair do torneio?")) return;

    setActionLoading(true);
    try {
      await tournamentService.leaveTournament(tournamentId);

      // Reembolsar taxa se necessário
      if (tournament.entryFee > 0) {
        setUser((prev) => ({
          ...prev,
          balance: prev.balance + tournament.entryFee,
        }));
      }

      toast({
        title: "Sucesso!",
        description: "Você saiu do torneio. Taxa reembolsada se aplicável.",
      });

      fetchTournament();
    } catch (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTournament = async () => {
    if (
      !window.confirm(
        "Tem certeza que deseja cancelar o torneio? Todos os participantes serão reembolsados."
      )
    )
      return;

    setActionLoading(true);
    try {
      await tournamentService.cancelTournament(tournamentId);
      toast({
        title: "Torneio cancelado",
        description: "Torneio cancelado e participantes reembolsados.",
      });
      navigate("/tournaments");
    } catch (error) {
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const copyTournamentLink = () => {
    const tournamentUrl = `${window.location.origin}/tournament/${tournamentId}`;
    navigator.clipboard.writeText(tournamentUrl);
    toast({
      title: "Link copiado!",
      description: "Link do torneio copiado para a área de transferência.",
    });
  };

  const shareTournament = () => {
    const tournamentUrl = `${window.location.origin}/tournament/${tournamentId}`;
    if (navigator.share) {
      navigator.share({
        title: `Torneio: ${tournament?.name}`,
        text: `Participe do torneio de xadrez "${tournament?.name}"!`,
        url: tournamentUrl,
      });
    } else {
      copyTournamentLink();
    }
  };

  const getStatusBadge = () => {
    if (!tournament) return null;

    const statusConfig = {
      WAITING: { text: "Aguardando", color: "bg-yellow-500" },
      IN_PROGRESS: { text: "Em Andamento", color: "bg-orange-500" },
      FINISHED: { text: "Finalizado", color: "bg-green-500" },
    };

    const config = statusConfig[tournament.status] || {
      text: tournament.status,
      color: "bg-gray-500",
    };

    return (
      <Badge className={`${config.color} text-white`}>{config.text}</Badge>
    );
  };

  const getPrizeDistributionText = () => {
    switch (tournament?.prizeDistribution) {
      case "WINNER_TAKES_ALL":
        return "Vencedor leva tudo";
      case "SPLIT_TOP_2":
        return "60% / 40% (Top 2)";
      case "SPLIT_TOP_4":
        return "40% / 30% / 20% / 10% (Top 4)";
      default:
        return "Não definido";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
            <p className="text-slate-400">Carregando detalhes do torneio...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Erro ao carregar torneio
          </h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="space-x-4">
            <Button onClick={fetchTournament} variant="outline">
              Tentar Novamente
            </Button>
            <Button onClick={() => navigate("/tournaments")}>
              Voltar aos Torneios
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  const participantCount = tournament._count?.participants || 0;
  const prizePool = (tournament.entryFee * participantCount * 0.8).toFixed(2);
  const startTime = new Date(tournament.startTime);
  const isStarted = tournament.status !== "WAITING";

  return (
    <motion.div
      className="container mx-auto p-4 max-w-4xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header com navegação */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/tournaments")}
          className="mb-4 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Torneios
        </Button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {tournament.name}
            </h1>
            <div className="flex items-center gap-2 text-slate-400">
              <span>Criado por: {tournament.creator?.name}</span>
              {getStatusBadge()}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={shareTournament}
              variant="outline"
              size="sm"
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
            <Button
              onClick={copyTournamentLink}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-400 hover:bg-slate-600"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Link
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações principais */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-800/50 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Informações do Torneio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-slate-400">Participantes</p>
                    <p className="font-bold">
                      {participantCount} / {tournament.playerCount}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm text-slate-400">Taxa de Entrada</p>
                    <p className="font-bold">
                      {tournament.entryFee === 0
                        ? "Grátis"
                        : `R$ ${tournament.entryFee.toFixed(2)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-slate-400">Data de Início</p>
                    <p className="font-bold">
                      {startTime.toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-sm text-slate-400">Horário</p>
                    <p className="font-bold">
                      {startTime.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {prizePool > 0 && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="font-bold text-yellow-400">
                      Premiação Total
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    R$ {prizePool}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Distribuição: {getPrizeDistributionText()}
                  </p>
                </div>
              )}

              {/* Barra de progresso */}
              <div>
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Vagas preenchidas</span>
                  <span>
                    {participantCount}/{tournament.playerCount}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (participantCount / tournament.playerCount) * 100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participantes */}
          <Card className="bg-slate-800/50 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Participantes ({participantCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.participants && tournament.participants.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {tournament.participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{participant.user.name}</p>
                        <p className="text-xs text-slate-400">
                          Inscrito em{" "}
                          {new Date(participant.joinedAt).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                      {participant.user.id === tournament.creatorId && (
                        <Crown
                          className="w-4 h-4 text-yellow-400"
                          title="Criador"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">
                  Nenhum participante ainda
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ações e informações laterais */}
        <div className="space-y-6">
          {/* Status do usuário */}
          {user && (
            <Card className="bg-slate-800/50 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Seu Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {isUserParticipating() ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">
                        Inscrito
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-400">Não inscrito</span>
                    </>
                  )}
                </div>

                {tournament.entryFee > 0 && (
                  <div className="text-sm">
                    <p className="text-slate-400">Seu saldo:</p>
                    <p className="font-bold text-white">
                      R$ {user.balance?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                )}

                {/* Ações principais */}
                <div className="space-y-2">
                  {canJoinTournament() && (
                    <Button
                      onClick={handleJoinTournament}
                      disabled={actionLoading}
                      className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-2" />
                      )}
                      Participar do Torneio
                    </Button>
                  )}

                  {canLeaveTournament() && (
                    <Button
                      onClick={handleLeaveTournament}
                      disabled={actionLoading}
                      variant="destructive"
                      className="w-full"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <UserMinus className="w-4 h-4 mr-2" />
                      )}
                      Sair do Torneio
                    </Button>
                  )}

                  {canCancelTournament() && (
                    <Button
                      onClick={handleCancelTournament}
                      disabled={actionLoading}
                      variant="destructive"
                      className="w-full"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <X className="w-4 h-4 mr-2" />
                      )}
                      Cancelar Torneio
                    </Button>
                  )}

                  {isStarted && isUserParticipating() && (
                    <Button
                      onClick={() =>
                        navigate(`/tournament/${tournamentId}/bracket`)
                      }
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Ver Chaveamento
                    </Button>
                  )}

                  {!isStarted && participantCount >= tournament.playerCount && (
                    <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
                      <p className="text-green-400 text-sm font-medium">
                        Torneio lotado! O jogo começará no horário programado.
                      </p>
                    </div>
                  )}

                  {!isStarted && participantCount < tournament.playerCount && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                      <p className="text-yellow-400 text-sm">
                        Aguardando mais{" "}
                        {tournament.playerCount - participantCount}{" "}
                        participantes
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Regras */}
          <Card className="bg-slate-800/50 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Regras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowRules(true)}
                variant="outline"
                className="w-full border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white"
              >
                Ver Regras do Torneio
              </Button>
            </CardContent>
          </Card>

          {/* Informações adicionais */}
          <Card className="bg-slate-800/50 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Formato:</span>
                <span>Eliminação Simples</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Criado em:</span>
                <span>
                  {new Date(tournament.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ID do Torneio:</span>
                <span className="font-mono text-xs">{tournament.id}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de regras */}
      <TournamentRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </motion.div>
  );
};

export default TournamentDetails;
