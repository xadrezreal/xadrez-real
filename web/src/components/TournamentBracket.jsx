import React, { useState, useEffect, useContext } from "react";
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

const TournamentBracket = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bracket, setBracket] = useState(null);

  // WebSocket connection
  const { lastMessage, connectionStatus, sendMessage } = useWebSocket(
    `ws://localhost:3000/ws/tournament/${tournamentId}`,
    {
      onMessage: (message) => {
        handleWebSocketMessage(message);
      },
      onOpen: () => {
        toast({
          title: "Conectado ao torneio",
          description: "Você receberá atualizações em tempo real",
        });
      },
      onClose: () => {
        console.log("WebSocket desconectado do torneio");
      },
    }
  );

  const handleWebSocketMessage = (message) => {
    console.log("MENSAGEM COMPLETA:", JSON.stringify(message, null, 2));

    switch (message.type) {
      case "move":
        if (message.data.playerId !== user.id) {
          console.log("PROCESSANDO MOVIMENTO DO OPONENTE");
          const { from, to, promotion, fen } = message.data;
          applyOpponentMove(from, to, promotion, fen);
          // resto igual...
        } else {
          console.log("IGNORANDO MEU PROPRIO MOVIMENTO");
        }
        break;

      case "game_end":
        console.log("🏁 Fim de jogo recebido:", message.data);
        setGameStatus(message.data.reason);
        setWinner(message.data.winner);
        setTimerActive(false);

        toast({
          title: "Partida finalizada",
          description: `Fim de jogo: ${message.data.reason}`,
        });
        break;

      default:
        console.log("❓ Tipo de mensagem desconhecido:", message.type);
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

      if (
        data.tournament.status === "IN_PROGRESS" &&
        data.tournament.participants
      ) {
        generateBracket(data.tournament.participants);
      }
    } catch (error) {
      console.error("Erro ao buscar bracket:", error);
      setError(error.message);
      toast({
        title: "Erro ao carregar chaveamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBracket = (participants) => {
    const players = participants.map((p) => ({
      id: p.user.id,
      name: p.user.name,
    }));

    if (players.length === 4) {
      const generatedBracket = {
        rounds: [
          {
            id: "semifinals",
            name: "Semifinais",
            matches: [
              {
                id: "semi1",
                players: [players[0], players[1]],
                winner: null,
                canPlay: true,
              },
              {
                id: "semi2",
                players: [players[2], players[3]],
                winner: null,
                canPlay: true,
              },
            ],
          },
          {
            id: "final",
            name: "Final",
            matches: [
              {
                id: "final1",
                players: [null, null],
                winner: null,
                canPlay: false,
              },
            ],
          },
        ],
      };
      setBracket(generatedBracket);
    } else if (players.length === 2) {
      const generatedBracket = {
        rounds: [
          {
            id: "final",
            name: "Final",
            matches: [
              {
                id: "final1",
                players: [players[0], players[1]],
                winner: null,
                canPlay: true,
              },
            ],
          },
        ],
      };
      setBracket(generatedBracket);
    }
  };

  const handlePlayMatch = async (match, roundId) => {
    const isPlayerInMatch = match.players.some((p) => p && p.id === user.id);
    const opponent = match.players.find((p) => p && p.id !== user.id);

    if (!isPlayerInMatch || match.winner || !opponent) {
      toast({
        title: "Não é possível jogar",
        description: "Partida não disponível ou já finalizada",
        variant: "destructive",
      });
      return;
    }

    if (!match.canPlay) {
      toast({
        title: "Partida não liberada",
        description: "Aguarde as partidas anteriores terminarem",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: `Partida contra ${opponent.name}`,
      description: "Redirecionando para o jogo...",
    });

    navigate(`/tournament/${tournamentId}/match/${match.id}`, {
      state: {
        player1: match.players[0],
        player2: match.players[1],
        opponent,
        tournamentData: tournament,
        matchId: match.id,
        roundId,
      },
    });
  };

  const updateBracketResult = (resultData) => {
    setBracket((prevBracket) => {
      if (!prevBracket) return prevBracket;

      const newBracket = JSON.parse(JSON.stringify(prevBracket));

      newBracket.rounds.forEach((round) => {
        round.matches.forEach((match) => {
          if (match.id === resultData.matchId) {
            match.winner = resultData.winner;

            if (round.id === "semifinals" && match.winner) {
              const finalRound = newBracket.rounds.find(
                (r) => r.id === "final"
              );
              const finalMatch = finalRound.matches[0];

              if (resultData.matchId === "semi1") {
                finalMatch.players[0] = match.winner;
              } else if (resultData.matchId === "semi2") {
                finalMatch.players[1] = match.winner;
              }

              if (finalMatch.players[0] && finalMatch.players[1]) {
                finalMatch.canPlay = true;
              }
            }
          }
        });
      });

      return newBracket;
    });
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
      {/* Header com status de conexão */}
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

      {tournament && (
        <>
          {/* Header do Torneio */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              {tournament.name}
            </h1>
            <p className="text-slate-400 mb-4">Chaveamento do Torneio</p>

            <div className="flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">
                  {tournament._count?.participants ||
                    tournament.participants?.length ||
                    0}{" "}
                  jogadores
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

          {/* Chaveamento */}
          {bracket ? (
            <div className="flex justify-center overflow-x-auto pb-4">
              <div className="flex space-x-8 md:space-x-16">
                {bracket.rounds.map((round) => (
                  <div
                    key={round.id}
                    className="flex flex-col justify-around min-w-[280px]"
                  >
                    <h3 className="text-xl font-bold text-center mb-6 text-slate-300">
                      {round.name}
                    </h3>
                    <div className="space-y-8">
                      {round.matches.map((match) => (
                        <Card
                          key={match.id}
                          className="bg-slate-800/70 border-slate-700 w-full"
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2 mb-4">
                              {match.players.map((player, playerIndex) => (
                                <div
                                  key={player?.id || `empty-${playerIndex}`}
                                  className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                                    match.winner &&
                                    match.winner.id === player?.id
                                      ? "bg-green-500/20 border border-green-500/50"
                                      : player?.id === user.id
                                      ? "bg-cyan-500/20 border border-cyan-500/50"
                                      : "bg-slate-700/50"
                                  }`}
                                >
                                  <span
                                    className={`${
                                      match.winner &&
                                      match.winner.id === player?.id
                                        ? "text-green-300 font-bold"
                                        : player?.id === user.id
                                        ? "text-cyan-300 font-semibold"
                                        : "text-slate-300"
                                    }`}
                                  >
                                    {player?.name || "Aguardando..."}
                                  </span>
                                  {match.winner &&
                                    match.winner.id === player?.id && (
                                      <Crown className="w-5 h-5 text-yellow-400" />
                                    )}
                                </div>
                              ))}
                            </div>

                            {!match.winner &&
                              match.canPlay &&
                              match.players.every((p) => p && p.id) &&
                              match.players.some(
                                (p) => p && p.id === user.id
                              ) && (
                                <Button
                                  size="sm"
                                  className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 animate-pulse"
                                  onClick={() =>
                                    handlePlayMatch(match, round.id)
                                  }
                                >
                                  <Swords className="w-4 h-4 mr-2" />
                                  Jogar Agora
                                </Button>
                              )}

                            {match.winner && (
                              <div className="text-center">
                                <p className="text-xs text-green-400 font-semibold">
                                  Vencedor: {match.winner.name}
                                </p>
                              </div>
                            )}

                            {!match.canPlay && !match.winner && (
                              <div className="text-center">
                                <p className="text-xs text-slate-500">
                                  Aguardando partidas anteriores
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
