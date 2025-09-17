import React, { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { motion } from "framer-motion";
import { Loader2, Swords, UserCheck } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { UserContext } from "../contexts/UserContext";
import { Button } from "./ui/button";

const GameRoom = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, setUser } = useContext(UserContext);

  useEffect(() => {
    if (!user || !user.id) return;

    const channel = supabase.channel(`player-status:${user.id}`);

    const subscription = channel
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players_online",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const gameId = payload.new.current_game_id;
          if (payload.new.status === "in_game" && gameId) {
            toast({
              title: "Oponente Encontrado!",
              description: "A partida vai começar.",
            });
            navigate(`/game/${gameId}`);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          // Check initial state in case we missed the update
          const checkInitialState = async () => {
            const { data, error } = await supabase
              .from("players_online")
              .select("status, current_game_id")
              .eq("id", user.id)
              .single();
            if (error) {
              toast({
                title: "Erro ao verificar status",
                description: error.message,
                variant: "destructive",
              });
              navigate("/");
            } else if (
              data &&
              data.status === "in_game" &&
              data.current_game_id
            ) {
              navigate(`/game/${data.current_game_id}`);
            }
          };
          checkInitialState();
        } else if (err) {
          toast({
            title: "Erro de conexão",
            description: "Não foi possível conectar à sala do jogo.",
            variant: "destructive",
          });
          navigate("/");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, toast, user]);

  const handleCancel = async () => {
    toast({
      title: "Busca cancelada",
      description: "Você saiu da fila de espera.",
    });
    if (user && user.id) {
      await supabase
        .from("matchmaking_queue")
        .delete()
        .eq("player_id", user.id);
      await supabase
        .from("players_online")
        .update({ status: "online", current_game_id: null })
        .eq("id", user.id);
      setUser((prev) => ({ ...prev, status: "online", currentGameId: null }));
    }
    navigate("/");
  };

  return (
    <motion.div
      className="flex items-center justify-center min-h-full p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full max-w-md bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-lg p-8 border border-slate-700 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="mb-6"
        >
          <Swords className="w-20 h-20 text-cyan-400 mx-auto" />
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-3">Buscando Partida</h2>
        <p className="text-slate-300 mb-2">Aguardando um oponente digno...</p>
        <p className="text-sm text-slate-500 mb-8">
          Você será redirecionado automaticamente.
        </p>

        <div className="flex items-center justify-center gap-4 my-8">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-slate-300 text-lg animate-pulse">Procurando...</p>
          <UserCheck className="ml-2 h-8 w-8 text-green-500 opacity-50" />
        </div>

        <Button onClick={handleCancel} variant="outline" className="w-full">
          Cancelar e Voltar
        </Button>
      </div>
    </motion.div>
  );
};

export default GameRoom;
