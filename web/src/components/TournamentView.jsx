import React, { useState, useEffect } from "react";
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

const TournamentCard = ({ tournament }) => {
  const navigate = useNavigate();
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const participantCount = tournament._count?.participants || 0;
  const isFull = participantCount >= tournament.playerCount;
  const prizePool = (tournament.entryFee * participantCount * 0.8).toFixed(2);
  const startTime = new Date(tournament.startTime);

  const getStatusDisplay = () => {
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

  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-slate-800/50 border-slate-700 text-white h-full flex flex-col justify-between hover:border-cyan-500/50 transition-colors">
        <div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-300 truncate">
              {tournament.name}
            </CardTitle>
            <CardDescription>
              Criado por: {tournament.creator?.name || "Anônimo"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prizePool > 0 && (
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-sm text-slate-400">Prêmio Total Estimado</p>
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
            onClick={() => navigate(`/tournament/${tournament.id}`)}
            disabled={isFull && tournament.status === "WAITING"}
          >
            {getStatusDisplay()}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

const TournamentView = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3000"
        }/tournaments?status=waiting&limit=20`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar torneios");
      }

      const data = await response.json();
      setTournaments(data.tournaments || []);
    } catch (error) {
      console.error("Erro ao buscar torneios:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
    const interval = setInterval(fetchTournaments, 30000);
    return () => clearInterval(interval);
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
          <Button
            onClick={fetchTournaments}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            Tentar Novamente
          </Button>
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
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            variants={containerVariants}
          >
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </motion.div>

          <motion.div className="text-center mt-8" variants={itemVariants}>
            <Button
              onClick={() => navigate("/tournaments")}
              variant="outline"
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white"
            >
              Ver Todos os Torneios
            </Button>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default TournamentView;
