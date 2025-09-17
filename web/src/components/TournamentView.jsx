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
import { Trophy, Users, DollarSign, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const TournamentCard = ({ tournament }) => {
  const navigate = useNavigate();

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const isFull =
    tournament.registered_players.length >= tournament.player_count;
  const prizePool = (
    tournament.entry_fee *
    tournament.player_count *
    0.8
  ).toFixed(2);
  const startTime = new Date(tournament.start_time);

  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-slate-800/50 border-slate-700 text-white h-full flex flex-col justify-between">
        <div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-300 truncate">
              {tournament.name}
            </CardTitle>
            <CardDescription>
              Criado por: {tournament.creator_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400">Prêmio Total Estimado</p>
              <p className="text-2xl font-bold text-yellow-400">
                R$ {prizePool}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span>
                  Entrada: R$ {parseFloat(tournament.entry_fee).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-4 h-4 text-blue-400" />
                <span>
                  Vagas: {tournament.registered_players.length} /{" "}
                  {tournament.player_count}
                </span>
              </div>
            </div>
            <div className="text-sm text-slate-400">
              Começa em {startTime.toLocaleDateString()} às{" "}
              {startTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </CardContent>
        </div>
        <div className="p-4 pt-0">
          <Button
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold shadow-lg"
            onClick={() => navigate(`/tournament/${tournament.id}`)}
            disabled={isFull && tournament.status !== "registering"}
          >
            {tournament.status === "registering"
              ? isFull
                ? "Lotado"
                : "Ver Torneio"
              : "Em Andamento"}
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

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .in("status", ["registering", "active"])
        .order("start_time", { ascending: true });

      if (!error) {
        setTournaments(data);
      }
      setLoading(false);
    };
    fetchTournaments();

    const channel = supabase
      .channel("public:tournaments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        fetchTournaments
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      </motion.div>

      {loading ? (
        <p className="text-center text-slate-400">Carregando torneios...</p>
      ) : tournaments.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="text-center p-8 bg-slate-800/50 rounded-lg"
        >
          <p className="text-slate-300 text-lg">
            Nenhum torneio ativo no momento.
          </p>
          <p className="text-slate-400">Que tal criar o seu?</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          variants={containerVariants}
        >
          {tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default TournamentView;
