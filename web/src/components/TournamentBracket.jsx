import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserContext } from "../contexts/UserContext";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { Swords, Crown, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const TournamentBracket = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournament = async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();
      if (error || !data) {
        toast({ title: "Torneio não encontrado.", variant: "destructive" });
        navigate("/tournament");
      } else {
        setTournament(data);
      }
      setLoading(false);
    };
    fetchTournament();

    const channel = supabase
      .channel(`public:tournaments:id=eq.${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => setTournament(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [tournamentId, navigate, toast]);

  const handlePlayMatch = async (match, roundId) => {
    const isPlayerInMatch = match.players.some((p) => p && p.id === user.id);
    const opponent = match.players.find((p) => p && p.id !== user.id);

    if (!isPlayerInMatch || match.winner || !opponent) {
      toast({ title: "Não é sua partida ou já foi finalizada." });
      return;
    }

    toast({
      title: `Partida contra ${opponent.name}`,
      description: "Redirecionando...",
    });

    const { data: gameId, error } = await supabase.rpc(
      "create_tournament_game",
      {
        p_tournament_id: tournamentId,
        p_round_id: roundId,
        p_match_id: match.id,
        p_player1_id: match.players[0].id,
        p_player2_id: match.players[1].id,
      }
    );

    if (error) {
      toast({
        title: "Erro ao criar partida",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate(`/game/${gameId}`);
    }
  };

  if (loading || !tournament || !tournament.bracket) {
    return (
      <div className="text-center p-8 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" /> Carregando chaveamento...
      </div>
    );
  }

  const { bracket } = tournament;

  return (
    <motion.div
      className="p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Button
        variant="ghost"
        onClick={() => navigate(`/tournament/${tournamentId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Torneio
      </Button>
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
        {tournament.name} - Chaveamento
      </h1>

      <div className="flex justify-center overflow-x-auto">
        <div className="flex space-x-8 md:space-x-16">
          {bracket.rounds.map((round, roundIndex) => (
            <div key={round.id} className="flex flex-col justify-around">
              <h3 className="text-xl font-bold text-center mb-4 text-slate-300">
                Rodada {roundIndex + 1}
              </h3>
              <div className="space-y-8">
                {round.matchups.map((match) => (
                  <div
                    key={match.id}
                    className="bg-slate-800/70 p-4 rounded-lg border border-slate-700 w-64"
                  >
                    {match.players.map((player, playerIndex) => (
                      <div
                        key={(player?.id || "bye") + playerIndex}
                        className={`flex justify-between items-center p-2 rounded ${
                          match.winner && match.winner.id === player?.id
                            ? "bg-green-500/20 font-bold"
                            : ""
                        }`}
                      >
                        <span>{player?.name || "Aguardando..."}</span>
                        {match.winner && match.winner.id === player?.id && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                    ))}
                    {!match.winner &&
                      match.players.every((p) => p && p.id !== "bye") &&
                      match.players.some((p) => p && p.id === user.id) && (
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => handlePlayMatch(match, round.id)}
                        >
                          <Swords className="w-4 h-4 mr-2" /> Jogar
                        </Button>
                      )}
                    {match.winner && (
                      <p className="text-xs text-center mt-2 text-slate-400">
                        Vencedor: {match.winner.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TournamentBracket;
