import React, { useState, useEffect, useRef, useContext } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Trophy, Users, DollarSign, ArrowRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tournamentService } from "../lib/tournamentService";
import { UserContext } from "../contexts/UserContext";

const TournamentCard = React.memo(
  ({ tournament, userId }) => {
    const navigate = useNavigate();

    const participantCount = tournament._count?.participants || 0;
    const isFull = participantCount >= tournament.playerCount;
    const isParticipant =
      tournament.participants?.some((p) => p.userId === userId) || false;
    const prizePool = (tournament.entryFee * participantCount * 0.8).toFixed(2);
    const startTime = new Date(tournament.startTime);

    const getStatusDisplay = () => {
      if (isParticipant) {
        return "Acessar Torneio";
      }

      switch (tournament.status) {
        case "WAITING":
          return isFull ? "Lotado" : "Ver Torneio";
        case "IN_PROGRESS":
          return "Em Andamento";
        case "FINISHED":
          return "Finalizado";
        default:
          return "Ver Torneio";
      }
    };

    const getStatusColor = () => {
      if (isParticipant) {
        return "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700";
      }

      switch (tournament.status) {
        case "WAITING":
          return isFull
            ? "bg-red-500 hover:bg-red-600"
            : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700";
        case "IN_PROGRESS":
          return "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700";
        case "FINISHED":
          return "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700";
        default:
          return "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700";
      }
    };

    const handleViewTournament = async () => {
      try {
        const testResult = await tournamentService.getTournament(tournament.id);
        console.log("✅ Torneio encontrado:", testResult);
        navigate(`/tournament/${tournament.id}`);
      } catch (error) {
        console.error("❌ Erro ao buscar torneio:", error);
        alert(`Erro ao acessar torneio: ${error.message}`);
      }
    };

    return (
      <div>
        <Card className="bg-slate-800/50 border-slate-700 text-white h-full flex flex-col justify-between hover:border-cyan-500/50 transition-colors">
          <div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-300 truncate">
                {tournament.name}
                {isParticipant && (
                  <span className="text-xs bg-purple-500 px-2 py-1 rounded">
                    Inscrito
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Criado por: {tournament.creator?.name || "Anônimo"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {prizePool > 0 && (
                <div className="p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-400">
                    Prêmio Total Estimado
                  </p>
                  <p className="text-2xl font-bold text-yellow-400">
                    R$ {prizePool}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span>
                    {tournament.entryFee === 0
                      ? "Grátis"
                      : `R$ ${tournament.entryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>
                    Vagas: {participantCount} / {tournament.playerCount}
                  </span>
                </div>
              </div>
              <div className="text-sm text-slate-400">
                Começa em {startTime.toLocaleDateString("pt-BR")} às{" "}
                {startTime.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (participantCount / tournament.playerCount) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </CardContent>
          </div>
          <div className="p-4 pt-0">
            <Button
              className={`w-full text-white font-bold shadow-lg ${getStatusColor()}`}
              onClick={handleViewTournament}
              disabled={
                !isParticipant && isFull && tournament.status === "WAITING"
              }
            >
              {getStatusDisplay()}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.tournament.id === nextProps.tournament.id &&
      prevProps.tournament._count?.participants ===
        nextProps.tournament._count?.participants &&
      prevProps.tournament.status === nextProps.tournament.status &&
      prevProps.userId === nextProps.userId
    );
  }
);

const TournamentView = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const fetchTournaments = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setError(null);
      }

      const data = await tournamentService.getActiveTournaments({
        status: "waiting",
        limit: 20,
      });

      setTournaments((prevTournaments) => {
        const newTournaments = data.tournaments || [];

        if (prevTournaments.length !== newTournaments.length) {
          console.log("📊 Tamanho diferente - atualizando");
          return newTournaments;
        }

        const hasChanges = newTournaments.some((newT, index) => {
          const prevT = prevTournaments[index];
          if (!prevT) return true;

          const participantsChanged =
            prevT._count?.participants !== newT._count?.participants;
          const statusChanged = prevT.status !== newT.status;
          const idChanged = prevT.id !== newT.id;

          if (participantsChanged || statusChanged || idChanged) {
            console.log(`🔄 Mudança detectada no torneio ${newT.name}:`, {
              participantsChanged,
              statusChanged,
              idChanged,
            });
          }

          return participantsChanged || statusChanged || idChanged;
        });

        if (!hasChanges) {
          console.log(
            "🔒 Sem mudanças - MANTENDO estado anterior (sem re-render)"
          );
          return prevTournaments;
        }

        console.log("✅ Atualizando com novos dados");
        return newTournaments;
      });
    } catch (error) {
      console.error("❌ Erro ao buscar torneios:", error);
      if (!silent) {
        setError(error.message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchTournaments();
    intervalRef.current = setInterval(() => {
      fetchTournaments(true);
    }, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-slate-400 mt-4">Carregando torneios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="text-center p-8 bg-slate-800/50 rounded-lg"
        >
          <p className="text-red-400 text-lg mb-4">
            Erro ao carregar torneios: {error}
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => fetchTournaments()}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              Tentar Novamente
            </Button>

            <div className="bg-slate-900/50 p-4 rounded-lg text-left max-w-2xl mx-auto">
              <h3 className="text-yellow-400 font-bold mb-2">
                Informações de Debug:
              </h3>
              <div className="text-sm text-slate-300 space-y-1">
                <div>
                  <strong>API URL:</strong>{" "}
                  {import.meta.env.VITE_API_URL || "http://localhost:3000"}
                </div>
                <div>
                  <strong>Token:</strong>{" "}
                  {localStorage.getItem("auth_token")
                    ? "Presente"
                    : "❌ Ausente"}
                </div>
                <div>
                  <strong>Erro completo:</strong> {error}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-7xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="text-center mb-8" variants={itemVariants}>
        <Trophy className="mx-auto h-16 w-16 text-yellow-400 drop-shadow-lg" />
        <h1 className="text-4xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
          Área de Campeonatos
        </h1>
        <p className="text-lg text-slate-400 mt-2">
          Escolha um torneio, teste suas habilidades e concorra a prêmios!
        </p>

        <motion.div className="mt-6" variants={itemVariants}>
          <Button
            onClick={() => navigate("/create-tournament")}
            className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold px-6 py-3"
          >
            <Plus className="w-5 h-5 mr-2" />
            Criar Novo Torneio
          </Button>
        </motion.div>
      </motion.div>

      {tournaments.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="text-center p-8 bg-slate-800/50 rounded-lg"
        >
          <Trophy className="mx-auto h-12 w-12 text-slate-600 mb-4" />
          <p className="text-slate-300 text-lg mb-2">
            Nenhum torneio ativo no momento.
          </p>
          <p className="text-slate-400 mb-4">Que tal criar o primeiro?</p>
          <Button
            onClick={() => navigate("/create-tournament")}
            className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Torneio
          </Button>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                userId={user?.id}
              />
            ))}
          </div>

          <motion.div className="text-center mt-8" variants={itemVariants}>
            <Button
              onClick={() => fetchTournaments()}
              variant="outline"
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white"
            >
              Atualizar Lista
            </Button>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default TournamentView;
