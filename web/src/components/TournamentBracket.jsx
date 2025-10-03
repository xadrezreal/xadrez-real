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
    console.log("Tournament WS Message:", message);

    switch (message.type) {
      case "MATCH_STARTED":
        const isMyMatch =
          message.data.player1Id === user.id ||
          message.data.player2Id === user.id;

        if (isMyMatch) {
          navigate(`/game/${message.data.gameId}`);
        } else {
          fetchBracket();
        }
        break;

      case "MATCH_COMPLETED":
        toast({
          title: "Partida finalizada",
          description: `Vencedor: ${message.data.winnerName}`,
        });
        fetchBracket();
        break;

      case "ROUND_ADVANCED":
        toast({
          title: "Nova rodada!",
          description: `Rodada ${message.data.nextRound} iniciada`,
        });
        fetchBracket();
        break;

      case "TOURNAMENT_FINISHED":
        toast({
          title: "Torneio finalizado!",
          description: `Campeão: ${message.data.championName}`,
        });
        fetchTournamentData();
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

  const fetchBracket = async () => {
    try {
      const data = await tournamentService.getTournamentBracket(tournamentId);
      setBracket(data.bracket);
    } catch (error) {
      console.error("Erro ao buscar bracket:", error);
    }
  };

  const handlePlayMatch = async (match) => {
    const isPlayerInMatch =
      match.player1?.id === user.id || match.player2?.id === user.id;

    if (!isPlayerInMatch || match.status !== "PENDING") {
      toast({
        title: "Não é possível jogar",
        description: "Partida não disponível ou já finalizada",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await tournamentService.startMatch(
        tournamentId,
        match.id
      );

      console.log("Start match response:", response);

      const gameId = response.match?.gameId;

      if (!gameId) {
        throw new Error("GameId não retornado pelo servidor");
      }

      navigate(`/game/${gameId}`);
    } catch (error) {
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

                              {match.status === "IN_PROGRESS" && (
                                <div className="text-center">
                                  {match.player1?.id === user.id ||
                                  match.player2?.id === user.id ? (
                                    <div className="space-y-2">
                                      <p className="text-xs text-cyan-400 font-semibold animate-pulse">
                                        É a sua vez!
                                      </p>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                                        onClick={() =>
                                          navigate(`/game/${match.gameId}`)
                                        }
                                      >
                                        Entrar no Jogo
                                      </Button>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400">
                                      É a vez do oponente
                                    </p>
                                  )}
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
