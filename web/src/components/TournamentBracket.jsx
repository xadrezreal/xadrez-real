// TournamentBracket.tsx
import React, { useState, useEffect, useContext, useMemo } from "react";
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
} from "lucide-react";
import { tournamentService } from "../lib/tournamentService";
import { useWebSocket } from "../hooks/useWebSocket";

const getWebSocketURL = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const port = protocol === "wss:" ? "" : ":3000";
  return `${protocol}//${host}${port}`;
};

const TournamentBracket = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bracket, setBracket] = useState({});

  const { connectionStatus } = useWebSocket(
    `${getWebSocketURL()}/ws/tournament/${tournamentId}`,
    {
      onMessage: (message) => {
        handleWebSocketMessage(message);
      },
      onOpen: () => {
        console.log("[BRACKET_WS] Connected to tournament");
        toast({
          title: "Conectado ao torneio",
          description: "Você receberá atualizações em tempo real",
        });
      },
      onClose: () => {
        console.log("[BRACKET_WS] Disconnected from tournament");
      },
    }
  );

  const handleWebSocketMessage = (message) => {
    console.log("[BRACKET_WS] Message received:", message);

    switch (message.type) {
      case "MATCH_STARTED":
        const isMyMatch =
          message.data.player1Id === user.id ||
          message.data.player2Id === user.id;

        console.log("[BRACKET_WS] Match started:", {
          isMyMatch,
          gameId: message.data.gameId,
          player1Id: message.data.player1Id,
          player2Id: message.data.player2Id,
          userId: user.id,
        });

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

        console.log("[BRACKET_WS] Match completed:", {
          wasMyMatch,
          winnerId: message.data.winnerId,
          winnerName: message.data.winnerName,
          userId: user.id,
        });

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
        console.log("[BRACKET_WS] Round advanced:", {
          completedRound: message.data.completedRound,
          nextRound: message.data.nextRound,
          winnersCount: message.data.winnersCount,
        });

        toast({
          title: "🎉 Nova rodada começou!",
          description: message.data.message,
          duration: 10000,
        });

        fetchBracket();
        fetchTournamentData();
        break;

      case "TOURNAMENT_FINISHED":
        console.log("[BRACKET_WS] Tournament finished:", {
          championId: message.data.championId,
          championName: message.data.championName,
        });

        toast({
          title: "🏆 Torneio Finalizado!",
          description: `Campeão: ${message.data.championName}`,
          duration: 10000,
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

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await tournamentService.getTournament(tournamentId);
      setTournament(data.tournament);

      console.log("[BRACKET] Tournament data loaded:", {
        status: data.tournament.status,
        currentRound: data.tournament.currentRound,
        totalRounds: data.tournament.totalRounds,
      });

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
    } catch (error) {
      console.error("[BRACKET] Error fetching tournament:", error);
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
      console.log("[BRACKET] Bracket data loaded:", data.bracket);
    } catch (error) {
      console.error("[BRACKET] Error fetching bracket:", error);
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
              console.log("[BRACKET] User lost in round", round, {
                matchId: match.id,
                winnerId: match.winnerId,
                userId: user.id,
              });
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

  useEffect(() => {
    if (bracket && tournament && user) {
      console.log("[BRACKET_DEBUG] Current state:", {
        userId: user.id,
        currentRound: tournament.currentRound,
        totalRounds: tournament.totalRounds,
        userIsEliminated,
        userJustWon,
        hasNextMatch,
        bracketKeys: Object.keys(bracket),
      });
    }
  }, [bracket, tournament, user, userIsEliminated, userJustWon, hasNextMatch]);

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

    if (match.status !== "PENDING") {
      toast({
        title: "Partida não disponível",
        description: "Esta partida já foi iniciada ou finalizada",
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
      console.log("[BRACKET] Starting match:", {
        matchId: match.id,
        player1: match.player1.name,
        player2: match.player2.name,
      });

      const response = await tournamentService.startMatch(
        tournamentId,
        match.id
      );

      const gameId = response.match?.gameId || response.game?.game_id_text;

      if (!gameId) {
        throw new Error("GameId não retornado pelo servidor");
      }

      console.log("[BRACKET] Match started, navigating to game:", gameId);
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error("[BRACKET] Error starting match:", error);
      toast({
        title: "Erro ao iniciar partida",
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
                {tournament.currentRound === tournament.totalRounds
                  ? "🎉 Você passou para a FINAL!"
                  : "🎉 Você passou para a próxima fase!"}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Aguarde enquanto os outros jogos da rodada terminam...
            </p>
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
                  {(
                    tournament.entryFee *
                    (tournament._count?.participants || 0) *
                    0.8
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {Object.keys(bracket).length > 0 ? (
            <div className="flex justify-center overflow-x-auto pb-4">
              <div className="flex space-x-8 md:space-x-16">
                {Object.keys(bracket)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((round) => (
                    <div
                      key={round}
                      className="flex flex-col justify-around min-w-[280px]"
                    >
                      <h3 className="text-xl font-bold text-center mb-6 text-slate-300">
                        Rodada {round}
                      </h3>
                      <div className="space-y-8">
                        {bracket[round].map((match) => (
                          <Card
                            key={match.id}
                            className="bg-slate-800/70 border-slate-700 w-full"
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
                                    className={`${
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
                                    <Crown className="w-5 h-5 text-yellow-400" />
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
                                    className={`${
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
                                    <Crown className="w-5 h-5 text-yellow-400" />
                                  )}
                                </div>
                              </div>

                              {match.status === "PENDING" &&
                                match.player1 &&
                                match.player2 &&
                                !userIsEliminated &&
                                (match.player1.id === user.id ||
                                  match.player2.id === user.id) && (
                                  <Button
                                    size="sm"
                                    className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 animate-pulse"
                                    onClick={() => handlePlayMatch(match)}
                                    disabled={userIsEliminated}
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
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                                      onClick={() =>
                                        navigate(`/game/${match.gameId}`)
                                      }
                                      disabled={userIsEliminated}
                                    >
                                      Entrar no Jogo
                                    </Button>
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
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <Card className="max-w-md mx-auto bg-slate-800/50 border-slate-700">
              <CardContent className="p-8 text-center">
                <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aguardando início do torneio</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
};

export default TournamentBracket;
