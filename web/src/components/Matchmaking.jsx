import React, { useState, useContext, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { UserContext } from "../contexts/UserContext";
import { supabase } from "../lib/supabaseClient";
import { Loader2, Swords } from "lucide-react";

const Matchmaking = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, setUser } = useContext(UserContext);

  const [timeControl] = useState(location.state?.timeControl || 600);
  const [wager] = useState(location.state?.wager || 0);
  const [isSearching, setIsSearching] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFindMatch = async () => {
    if (!user || !user.id) {
      toast({
        title: "Erro de Autenticação",
        description: "Você precisa estar logado para buscar uma partida.",
        variant: "destructive",
      });
      navigate("/profile");
      return;
    }

    const wagerAmount = parseFloat(wager) || 0;
    if (user.balance < wagerAmount) {
      toast({
        title: "Saldo Insuficiente",
        description: `Você não tem saldo suficiente para apostar R$${wagerAmount}.`,
        variant: "destructive",
      });
      navigate("/wallet");
      return;
    }

    setIsSearching(true);
    setUser((prev) => ({ ...prev, status: "searching" }));
    toast({
      title: t("matchmaking.finding_match"),
      description: "Aguarde, estamos conectando você a um oponente.",
    });

    try {
      const { data, error } = await supabase.functions.invoke(
        "matchmaking-v2",
        {
          body: {
            player_id: user.id,
            time_control: parseInt(timeControl, 10),
            wager: wagerAmount,
          },
        }
      );

      if (error) throw error;

      if (isMounted.current) {
        // The player is now in the queue or has a match.
        // Redirect to GameRoom which will listen for the game_id.
        navigate(`/gameroom`);
      }
    } catch (error) {
      console.error("Error finding match:", error);
      if (isMounted.current) {
        toast({
          title: t("matchmaking.error_finding_match"),
          description: error.message,
          variant: "destructive",
        });
        setIsSearching(false);
        setUser((prev) => ({ ...prev, status: "online" }));
        navigate("/");
      }
    }
  };

  const handleCancelSearch = async () => {
    setIsSearching(false);
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
      setUser((prev) => ({ ...prev, status: "online" }));
    }
    navigate("/");
  };

  useEffect(() => {
    handleFindMatch();

    const cleanup = async () => {
      if (isMounted.current && user && user.id) {
        await supabase
          .from("matchmaking_queue")
          .delete()
          .eq("player_id", user.id);
        await supabase
          .from("players_online")
          .update({ status: "online", current_game_id: null })
          .eq("id", user.id);
      }
    };

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="flex items-center justify-center p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-md bg-slate-800/60 border-slate-700 text-white">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Swords className="w-12 h-12 text-cyan-400" />
          </div>
          <CardTitle className="text-center text-2xl font-bold text-cyan-300">
            {t("matchmaking.title")}
          </CardTitle>
          <CardDescription className="text-center text-slate-400">
            Buscando um oponente digno...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="pt-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-4 my-8">
                <Loader2 className="mr-2 h-10 w-10 animate-spin text-cyan-400" />
                <p className="text-slate-300 text-lg animate-pulse">
                  {t("matchmaking.finding_match")}
                </p>
              </div>
              <Button
                onClick={handleCancelSearch}
                variant="destructive"
                className="w-full text-lg py-6"
              >
                {t("matchmaking.cancel")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Matchmaking;
