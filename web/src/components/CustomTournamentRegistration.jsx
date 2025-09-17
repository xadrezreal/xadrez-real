import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
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
} from "lucide-react";
import { UserContext } from "../contexts/UserContext";
import { supabase } from "../lib/supabaseClient";

const CustomTournamentRegistration = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tournament, setTournament] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, setUser } = useContext(UserContext);

  const isRegistered = tournament?.registered_players?.some(
    (p) => p.id === user.id
  );

  useEffect(() => {
    const fetchTournament = async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast({ title: "Torneio não encontrado", variant: "destructive" });
        navigate("/tournament");
      } else {
        setTournament(data);
        if (
          data.status === "registering" &&
          data.registered_players.length >= data.player_count
        ) {
          await supabase.rpc("generate_tournament_bracket", {
            p_tournament_id: id,
          });
        }
        if (data.status === "active" && data.bracket) {
          navigate(`/tournament/${id}/bracket`);
        }
      }
      setLoading(false);
    };

    fetchTournament();

    const channel = supabase
      .channel(`public:tournaments:id=eq.${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setTournament(payload.new);
          if (payload.new.status === "active") {
            navigate(`/tournament/${id}/bracket`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate, toast]);

  const handleRegister = async () => {
    if (isRegistered || !tournament) return;

    const fee = parseFloat(tournament.entry_fee);
    if (fee > 0 && user.balance < fee) {
      toast({ title: "Saldo Insuficiente", variant: "destructive" });
      return;
    }

    const newPlayer = { id: user.id, name: user.name };
    const updatedRegisteredPlayers = [
      ...tournament.registered_players,
      newPlayer,
    ];

    const { data: updatedTournament, error } = await supabase
      .from("tournaments")
      .update({ registered_players: updatedRegisteredPlayers })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro ao se inscrever",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (fee > 0) {
      const { data: newBalance, error: balanceError } = await supabase.rpc(
        "update_balance",
        { amount_to_add: -fee, p_user_id: user.id }
      );
      if (!balanceError) {
        setUser((prev) => ({ ...prev, balance: newBalance }));
      }
    }

    toast({ title: "Inscrição realizada!", variant: "success" });

    if (
      updatedTournament.registered_players.length >=
      updatedTournament.player_count
    ) {
      await supabase.rpc("generate_tournament_bracket", {
        p_tournament_id: id,
      });
    }
  };

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: "Link Copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !tournament) {
    return <div className="text-center text-lg p-8">Carregando torneio...</div>;
  }

  const totalPrizePool = (
    parseFloat(tournament.entry_fee) *
    tournament.player_count *
    0.8
  ).toFixed(2);
  const isFull =
    tournament.registered_players.length >= tournament.player_count;
  const startTime = new Date(tournament.start_time);

  const getPrizeText = (type) => {
    const prizes = {
      winner_takes_all: "Campeão leva tudo (100%)",
      split_top_2: "Top 2: 60% / 40%",
      split_top_4: "Top 4: 40% / 30% / 20% / 10%",
    };
    return prizes[type] || "Não especificado";
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto p-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Button
        variant="ghost"
        onClick={() => navigate("/tournament")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Torneios
      </Button>
      <Card className="bg-slate-800/50 border-slate-700 text-white">
        <CardHeader className="text-center">
          <Trophy className="mx-auto h-12 w-12 text-yellow-400" />
          <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
            {tournament.name}
          </CardTitle>
          <CardDescription className="text-slate-400">
            Criado por:{" "}
            <span className="font-bold text-cyan-400">
              {tournament.creator_name}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
                <DollarSign className="w-4 h-4" />
                Entrada
              </p>
              <p className="text-xl font-bold">
                {parseFloat(tournament.entry_fee) === 0
                  ? "Grátis"
                  : `R$ ${parseFloat(tournament.entry_fee).toFixed(2)}`}
              </p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
                <Users className="w-4 h-4" />
                Jogadores
              </p>
              <p className="text-xl font-bold">
                {tournament.registered_players.length} /{" "}
                {tournament.player_count}
              </p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
                <Calendar className="w-4 h-4" /> Data
              </p>
              <p className="text-lg font-bold">
                {startTime.toLocaleDateString()}
              </p>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" /> Horário
              </p>
              <p className="text-lg font-bold">
                {startTime.toLocaleTimeString([], {
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
                {getPrizeText(tournament.prize_distribution_type)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {tournament.status === "registering" && !isFull && (
              <Button
                className="w-full text-lg bg-gradient-to-r from-green-500 to-cyan-500 shadow-lg"
                onClick={handleRegister}
                disabled={isRegistered}
              >
                {isRegistered ? (
                  <>
                    <Check className="mr-2" />
                    Inscrito
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2" />
                    Inscrever-se
                  </>
                )}
              </Button>
            )}
            {tournament.status === "active" && (
              <Button
                className="w-full text-lg"
                onClick={() => navigate(`/tournament/${id}/bracket`)}
              >
                Ver Chaveamento
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full text-lg"
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
