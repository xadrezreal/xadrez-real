import React, { useState, useContext, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserContext } from "../contexts/UserContext";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Swords,
  Crown,
  ArrowLeft,
  Loader2,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  Clock,
  Timer,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { tournamentService } from "../lib/tournamentService";
import { useSocketIO } from "../hooks/useSocketIO";
import { calculateTournamentPrize } from "../lib/prizeCalculations";

const TournamentBracket = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bracket, setBracket] = useState({});
  const [nextRoundStartTime, setNextRoundStartTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const hasReloadedRef = useRef(false);
  const previousStatusRef = useRef(null);

  const socketIO = useSocketIO(null, {
    onMessage: (message) => {
      handleWebSocketMessage(message);
    },
    onConnect: () => {
      toast({
        title: "Conectado ao torneio",
        description: "Você receberá atualizações em tempo real",
      });
    },
  });

  useEffect(() => {
    if (tournamentId && socketIO.isConnected) {
      socketIO.joinTournament(tournamentId);
    }

    return () => {
      if (tournamentId && socketIO.isConnected) {
        socketIO.leaveTournament(tournamentId);
      }
    };
  }, [tournamentId, socketIO.isConnected]);

  const { connectionStatus } = socketIO;

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case "MATCH_STARTED":
        const isMyMatch =
          message.data.player1Id === user.id ||
          message.data.player2Id === user.id;
        if (isMyMatch) {
          toast({
            title: "🎮 Sua partida começou!",
            description: "Clique em 'Jogar Agora' para entrar",
            duration: 8000,
          });
        }
        fetchBracket();
        break;
      case "MATCH_COMPLETED":
        const wasMyMatch =
          message.data.player1Id === user.id ||
          message.data.player2Id === user.id;
        toast({
          title: "Partida finalizada",
          description: `Vencedor: ${message.data.winnerName}`,
        });

        fetchBracket();
        if (wasMyMatch && message.data.winnerId === user.id) {
          setTimeout(() => {
            toast({
              title: "🎉 Você venceu!",
              description: "Aguarde a próxima rodada começar",
            });
          }, 1000);
        }
        break;
      case "ROUND_ADVANCED":
        toast({
          title: "🎉 Nova rodada agendada!",
          description: message.data.message,
          duration: 10000,
        });
        if (message.data.startsAt) {
          setNextRoundStartTime(new Date(message.data.startsAt));
        }
        fetchBracket();
        fetchTournamentData();
        break;
      case "ROUND_STARTED_AUTO":
        toast({
          title: "⚡ Rodada iniciada!",
          description: message.data.message,
          duration: 8000,
        });
        if (message.data.startsAt) {
          setNextRoundStartTime(new Date(message.data.startsAt));
        } else {
          setNextRoundStartTime(null);
          setTimeRemaining(null);
        }
        fetchBracket();
        break;
      case "TOURNAMENT_FINISHED":
        toast({
          title: "🏆 Torneio Finalizado!",
          description: `Campeão: ${message.data.championName}. Redirecionando para resultados...`,
          duration: 5000,
        });
        fetchTournamentData();
        fetchBracket();

        // Redireciona para a página de resultados após 5 segundos
        setTimeout(() => {
          navigate(`/tournament/${tournamentId}/results`);
        }, 5000);
        break;
      case "TOURNAMENT_STARTED":
        toast({
          title: "🎮 Torneio Iniciado!",
          description: "O chaveamento está sendo gerado...",
          duration: 5000,
        });
        fetchTournamentData();
        fetchBracket();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    fetchTournamentData();
  }, [tournamentId]);

  useEffect(() => {
    if (!tournament) return;

    if (
      previousStatusRef.current === "WAITING" &&
      tournament.status === "IN_PROGRESS"
    ) {
      fetchBracket();
    }

    if (tournament.nextRoundStartTime) {
      setNextRoundStartTime(new Date(tournament.nextRoundStartTime));
    }

    previousStatusRef.current = tournament.status;
  }, [tournament?.status, tournament?.nextRoundStartTime]);

  useEffect(() => {
    if (!nextRoundStartTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextRoundStartTime - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        setNextRoundStartTime(null);
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining({ minutes, seconds, total: diff });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRoundStartTime]);

  useEffect(() => {
    if (!tournament || tournament.status !== "WAITING") {
      hasReloadedRef.current = false;
      return;
    }

    const checkInterval = setInterval(() => {
      const startTime = new Date(tournament.startTime);
      const now = new Date();
      const timeUntilStart = startTime - now;

      if (timeUntilStart <= 0 && !hasReloadedRef.current) {
        hasReloadedRef.current = true;

        toast({
          title: "🎮 Torneio Iniciado!",
          description: "O torneio começou agora!",
          duration: 5000,
        });

        window.location.reload();
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [tournament?.startTime, tournament?.status]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tournamentService.getTournament(tournamentId);
      setTournament(data.tournament);

      if (data.tournament.status === "WAITING") {
        const startTime = new Date(data.tournament.startTime);
        const timeUntilStart = startTime - new Date();
        if (timeUntilStart > 0) {
          toast({
            title: "Aguardando início",
            description: `Torneio começa em ${Math.ceil(
              timeUntilStart / 60000
            )} minutos`,
          });
        }
      }

      if (data.tournament.status === "IN_PROGRESS") {
        await fetchBracket();
      }

      // Se o torneio já terminou, redireciona para a página de resultados
      if (data.tournament.status === "FINISHED") {
        toast({
          title: "Torneio Finalizado",
          description: "Redirecionando para resultados...",
          duration: 3000,
        });
        setTimeout(() => {
          navigate(`/tournament/${tournamentId}/results`);
        }, 3000);
      }
    } catch (error) {
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

  const fetchBracket = async () => {
    try {
      const data = await tournamentService.getTournamentBracket(tournamentId);
      setBracket(data.bracket);

      if (data.tournament?.nextRoundStartTime) {
        setNextRoundStartTime(new Date(data.tournament.nextRoundStartTime));
      }

      if (Object.keys(data.bracket).length === 0) {
        setTimeout(() => {
          fetchBracket();
        }, 2000);
      }
    } catch (error) {
      setTimeout(() => {
        fetchBracket();
      }, 2000);
    }
  };

  const userIsEliminated = useMemo(() => {
    if (!bracket || !tournament || !user) return false;
    let userWasInTournament = false;
    let userLostAMatch = false;
    for (let round = 1; round <= tournament.totalRounds; round++) {
      const roundMatches = bracket[round];
      if (!roundMatches) continue;
      for (const match of roundMatches) {
        const userIsPlayer1 = match.player1?.id === user.id;
        const userIsPlayer2 = match.player2?.id === user.id;
        const userIsInThisMatch = userIsPlayer1 || userIsPlayer2;
        if (userIsInThisMatch) {
          userWasInTournament = true;
          if (match.status === "COMPLETED" || match.status === "BYE") {
            if (match.winnerId && match.winnerId !== user.id) {
              userLostAMatch = true;
              break;
            }
          }
        }
      }
      if (userLostAMatch) break;
    }
    return userWasInTournament && userLostAMatch;
  }, [bracket, tournament, user]);

  const userJustWon = useMemo(() => {
    if (!bracket || !tournament || !user || userIsEliminated) return false;
    const currentRoundMatches = bracket[tournament.currentRound];
    if (!currentRoundMatches) return false;
    return currentRoundMatches.some(
      (match) => match.status === "COMPLETED" && match.winnerId === user.id
    );
  }, [bracket, tournament, user, userIsEliminated]);

  const hasNextMatch = useMemo(() => {
    if (!bracket || !tournament || !user || userIsEliminated) return false;
    const currentRoundMatches = bracket[tournament.currentRound];
    if (!currentRoundMatches) return false;
    return currentRoundMatches.some(
      (match) =>
        match.status === "PENDING" &&
        (match.player1?.id === user.id || match.player2?.id === user.id)
    );
  }, [bracket, tournament, user, userIsEliminated]);

  const userIsChampion = useMemo(() => {
    if (!tournament || !user) return false;
    return tournament.status === "FINISHED" && tournament.winnerId === user.id;
  }, [tournament, user]);

  // Determinar rodada atual a mostrar
  const displayRound = useMemo(() => {
    if (selectedRound !== null) return selectedRound;
    if (!tournament) return 1;
    return tournament.currentRound || 1;
  }, [selectedRound, tournament]);

  // Filtrar matches por busca
  const filteredMatches = useMemo(() => {
    if (!bracket[displayRound]) return [];
    if (!searchTerm.trim()) return bracket[displayRound];

    const term = searchTerm.toLowerCase();
    return bracket[displayRound].filter((match) =>
      match.player1?.name?.toLowerCase().includes(term) ||
      match.player2?.name?.toLowerCase().includes(term)
    );
  }, [bracket, displayRound, searchTerm]);

  // Encontrar match do usuário na rodada atual
  const userMatchInRound = useMemo(() => {
    if (!bracket[displayRound] || !user) return null;
    return bracket[displayRound].find(
      (match) =>
        match.player1?.id === user.id || match.player2?.id === user.id
    );
  }, [bracket, displayRound, user]);

  // Auto-scroll para o card do usuário
  useEffect(() => {
    if (userMatchInRound && !searchTerm) {
      const element = document.getElementById(`match-${userMatchInRound.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [userMatchInRound, searchTerm]);

  const handlePlayMatch = async (match) => {
    if (userIsEliminated) {
      toast({
        title: "Você foi eliminado",
        description: "Jogadores eliminados não podem jogar",
        variant: "destructive",
      });
      return;
    }
    const isPlayerInMatch =
      match.player1?.id === user.id || match.player2?.id === user.id;
    if (!isPlayerInMatch) {
      toast({
        title: "Não é sua partida",
        description: "Você não está nesta partida",
        variant: "destructive",
      });
      return;
    }
    if (match.status === "COMPLETED" || match.status === "BYE") {
      toast({
        title: "Partida já finalizada",
        description: "Esta partida já terminou",
        variant: "destructive",
      });
      return;
    }
    if (!match.player1 || !match.player2) {
      toast({
        title: "Aguardando oponente",
        description: "A partida ainda não tem todos os jogadores",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await tournamentService.startMatch(
        tournamentId,
        match.id
      );
      const gameId = response.match?.gameId || response.game?.game_id_text;
      if (!gameId) {
        throw new Error("GameId não retornado pelo servidor");
      }
      navigate(`/game/${gameId}`, {
        replace: true,
        state: { forceReload: true },
      });
    } catch (error) {
      toast({
        title: "Erro ao entrar na partida",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <motion.div
        className="p-4 md:p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center py-12">
          <Loader2 className="animate-spin w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Carregando chaveamento...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="p-4 md:p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate("/tournament")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Torneios
        </Button>
        <Card className="max-w-md mx-auto bg-slate-800/50 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-400">Erro no Chaveamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white mb-4">{error}</p>
            <Button
              onClick={fetchTournamentData}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate(`/tournament/${tournamentId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Torneio
        </Button>
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            connectionStatus === "Open"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {connectionStatus === "Open" ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          {connectionStatus === "Open" ? "Tempo Real" : "Desconectado"}
        </div>
      </div>

      {tournament?.status === "WAITING" && (
        <Card className="mb-6 bg-yellow-500/10 border-yellow-500/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">
                Aguardando início automático
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              O torneio começará automaticamente às{" "}
              {new Date(tournament.startTime).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {timeRemaining && !userIsEliminated && (
        <Card className="mb-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/50">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <Timer className="w-8 h-8 text-cyan-400 animate-pulse" />
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-cyan-400">
                    Próxima Rodada
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-4 text-center">
                <div className="bg-slate-800/50 rounded-lg px-6 py-4 min-w-[100px]">
                  <div className="text-4xl font-bold text-cyan-400">
                    {String(timeRemaining.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">minutos</div>
                </div>
                <div className="text-3xl font-bold text-cyan-400">:</div>
                <div className="bg-slate-800/50 rounded-lg px-6 py-4 min-w-[100px]">
                  <div className="text-4xl font-bold text-cyan-400">
                    {String(timeRemaining.seconds).padStart(2, "0")}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">segundos</div>
                </div>
              </div>
              <div className="w-full max-w-md">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
                    style={{
                      width: `${Math.max(
                        0,
                        100 - (timeRemaining.total / (22 * 60 * 1000)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center max-w-md">
                Quando o tempo acabar, a próxima rodada é liberada.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {userIsEliminated && (
        <Card className="mb-6 bg-red-500/10 border-red-500/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-red-400">
              <Trophy className="w-5 h-5" />
              <span className="font-semibold">Você foi eliminado!</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Obrigado por participar! Continue acompanhando o torneio.
            </p>
          </CardContent>
        </Card>
      )}

      {userJustWon && !hasNextMatch && !userIsEliminated && (
        <Card className="mb-6 bg-green-500/10 border-green-500/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Trophy className="w-5 h-5 animate-bounce" />
              <span className="font-semibold">
                {tournament.currentRound === tournament.totalRounds - 1
                  ? "🎉 Você passou para a FINAL!"
                  : "🎉 Você passou para a próxima fase!"}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              {timeRemaining
                ? "Aguarde o cronômetro zerar para começar sua próxima partida"
                : "Aguarde enquanto os outros jogos da rodada terminam..."}
            </p>
          </CardContent>
        </Card>
      )}

      {userIsChampion && (
        <Card className="mb-6 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />
              <span className="text-2xl font-bold text-yellow-400">
                🏆 VOCÊ VENCEU O TORNEIO! 🏆
              </span>
              <p className="text-lg text-slate-300 mt-2">
                Parabéns, {user.name}! Você é o campeão!
              </p>
              <p className="text-sm text-slate-400">
                +200 pontos de torneio conquistados!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {tournament && (
        <>
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              {tournament.name}
            </h1>
            <p className="text-slate-400 mb-4">Chaveamento do Torneio</p>
            <div className="flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">
                  {tournament._count?.participants || 0} jogadores
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-slate-300">
                  R${" "}
                  {calculateTournamentPrize(
                    tournament.entryFee,
                    tournament._count?.participants || 0
                  ).netPrizePool.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {Object.keys(bracket).length > 0 && (
            <div className="max-w-6xl mx-auto">
              {/* Navegação e Busca */}
              <div className="mb-6 space-y-4">
                {/* Navegação de Rodadas */}
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRound(Math.max(1, displayRound - 1))}
                    disabled={displayRound === 1}
                    className="text-slate-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-2 px-6 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-sm">Rodada</span>
                    <span className="text-2xl font-bold text-cyan-400">
                      {displayRound}
                    </span>
                    <span className="text-slate-400 text-sm">
                      de {tournament.totalRounds}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRound(Math.min(tournament.totalRounds, displayRound + 1))}
                    disabled={displayRound === tournament.totalRounds}
                    className="text-slate-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  {selectedRound !== null && selectedRound !== tournament.currentRound && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRound(null)}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      Voltar à rodada atual
                    </Button>
                  )}
                </div>

                {/* Busca de Jogador */}
                {bracket[displayRound]?.length > 10 && (
                  <div className="max-w-md mx-auto relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar jogador..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                {/* Indicadores */}
                <div className="flex justify-center gap-6 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-cyan-500/20 border border-cyan-500/50"></div>
                    <span>Você</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50"></div>
                    <span>Vencedor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-700/50"></div>
                    <span>Outros</span>
                  </div>
                </div>
              </div>

              {/* Lista de Partidas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMatches.map((match) => {
                  const isUserMatch = match.player1?.id === user.id || match.player2?.id === user.id;

                  return (
                    <Card
                      key={match.id}
                      id={`match-${match.id}`}
                      className={`transition-all duration-300 ${
                        isUserMatch
                          ? "bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/20"
                          : "bg-slate-800/70 border-slate-700"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2 mb-4">
                          <div
                            className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                              match.winnerId === match.player1?.id
                                ? "bg-green-500/20 border border-green-500/50"
                                : match.player1?.id === user.id
                                ? "bg-cyan-500/20 border border-cyan-500/50"
                                : "bg-slate-700/50"
                            }`}
                          >
                            <span
                              className={`truncate ${
                                match.winnerId === match.player1?.id
                                  ? "text-green-300 font-bold"
                                  : match.player1?.id === user.id
                                  ? "text-cyan-300 font-semibold"
                                  : "text-slate-300"
                              }`}
                            >
                              {match.player1?.name || "Aguardando..."}
                            </span>
                            {match.winnerId === match.player1?.id && (
                              <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0 ml-2" />
                            )}
                          </div>

                          <div
                            className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                              match.winnerId === match.player2?.id
                                ? "bg-green-500/20 border border-green-500/50"
                                : match.player2?.id === user.id
                                ? "bg-cyan-500/20 border border-cyan-500/50"
                                : "bg-slate-700/50"
                            }`}
                          >
                            <span
                              className={`truncate ${
                                match.winnerId === match.player2?.id
                                  ? "text-green-300 font-bold"
                                  : match.player2?.id === user.id
                                  ? "text-cyan-300 font-semibold"
                                  : "text-slate-300"
                              }`}
                            >
                              {match.player2?.name || "Aguardando..."}
                            </span>
                            {match.winnerId === match.player2?.id && (
                              <Crown className="w-5 h-5 text-yellow-400 flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </div>

                        {(match.status === "PENDING" ||
                          match.status === "IN_PROGRESS") &&
                          match.player1 &&
                          match.player2 &&
                          !userIsEliminated &&
                          (match.player1.id === user.id ||
                            match.player2.id === user.id) && (
                            <Button
                              size="sm"
                              className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 animate-pulse"
                              onClick={() => handlePlayMatch(match)}
                            >
                              <Swords className="w-4 h-4 mr-2" />
                              Jogar Agora
                            </Button>
                          )}

                        {match.status === "COMPLETED" && (
                          <div className="text-center">
                            <p className="text-xs text-green-400 font-semibold">
                              Vencedor: {match.winner?.name}
                            </p>
                          </div>
                        )}

                        {match.status === "BYE" && (
                          <div className="text-center">
                            <p className="text-xs text-blue-400">
                              {match.player1?.name} avança automaticamente
                            </p>
                          </div>
                        )}

                        {match.status === "IN_PROGRESS" &&
                          !userIsEliminated &&
                          (match.player1?.id === user.id ||
                            match.player2?.id === user.id) && (
                            <div className="space-y-2">
                              <p className="text-xs text-cyan-400 font-semibold animate-pulse text-center">
                                É a sua vez!
                              </p>
                            </div>
                          )}

                        {match.status === "IN_PROGRESS" &&
                          (userIsEliminated ||
                            (match.player1?.id !== user.id &&
                              match.player2?.id !== user.id)) && (
                            <div className="text-center">
                              <p className="text-xs text-slate-400">
                                Partida em andamento
                              </p>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Mensagem quando nenhum resultado */}
              {filteredMatches.length === 0 && searchTerm && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">
                    Nenhum jogador encontrado com "{searchTerm}"
                  </p>
                </div>
              )}

              {/* Info de partidas */}
              <div className="mt-6 text-center text-sm text-slate-400">
                Mostrando {filteredMatches.length} de {bracket[displayRound]?.length || 0} partidas
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default TournamentBracket;
