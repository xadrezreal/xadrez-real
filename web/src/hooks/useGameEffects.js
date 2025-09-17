import { useEffect, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import { supabase } from "../lib/supabaseClient";
import { getBotMove as getAdvancedBotMove } from "../lib/chessLogic";

export const useGameEffects = ({
  gameId,
  user,
  gameType,
  botLevel,
  location,
  isPlayerTurn,
  game,
  gameStatus,
  gameData,
  whiteTime,
  blackTime,
  currentPlayer,
  navigate,
  toast,
  setGame,
  setWhiteTime,
  setBlackTime,
  setIsGameLoading,
  setGameStatus,
  updateBoard,
  processGameData,
  handleResign,
  makeMove,
  setMessages,
}) => {
  const gameChannelRef = useRef(null);
  const movesChannelRef = useRef(null);
  const messageChannelRef = useRef(null);
  const isGameActive = gameStatus === "playing";

  const getBotMove = useCallback(() => {
    const move = getAdvancedBotMove(game.fen(), game.turn(), botLevel);
    if (move) {
      makeMove(move, false);
    }
  }, [game, botLevel, makeMove]);

  // Bot game setup
  useEffect(() => {
    if (gameType === "bot") {
      const newGame = new Chess();
      const timeControl = location.state?.timeControl || 600;
      setGame(newGame);
      updateBoard(newGame);
      setWhiteTime(timeControl);
      setBlackTime(timeControl);
      setIsGameLoading(false);
      setGameStatus("playing");
    }
  }, [
    gameType,
    updateBoard,
    location.state,
    setGame,
    setWhiteTime,
    setBlackTime,
    setIsGameLoading,
    setGameStatus,
  ]);

  // Bot move logic
  useEffect(() => {
    if (gameType === "bot" && !isPlayerTurn && gameStatus === "playing") {
      const botMoveTimeout = setTimeout(() => getBotMove(), 500);
      return () => clearTimeout(botMoveTimeout);
    }
  }, [isPlayerTurn, gameStatus, gameType, getBotMove]);

  // Online game fetching
  useEffect(() => {
    if (gameType === "bot" || !gameId) return;

    const fetchGame = async () => {
      if (!user.id) {
        setTimeout(fetchGame, 100);
        return;
      }

      setIsGameLoading(true);
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("game_id_text", gameId)
        .single();

      if (error || !data) {
        toast({
          title: "Erro ao carregar o jogo",
          description: "Jogo não encontrado.",
          variant: "destructive",
        });
        navigate("/");
        setIsGameLoading(false);
        return;
      }

      // For waiting games, only the white player should be able to access it initially
      if (data.status === "waiting" && data.white_player_id !== user.id) {
        // This is the black player joining. Update the game.
        const { data: updatedGame, error: updateError } = await supabase
          .from("games")
          .update({
            black_player_id: user.id,
            black_player_name: user.name,
            black_player_country: user.country,
            status: "playing",
          })
          .eq("game_id_text", gameId)
          .select()
          .single();

        if (updateError) {
          toast({
            title: "Erro ao entrar no jogo",
            description: updateError.message,
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        processGameData(updatedGame);
      } else {
        const isPlayerInGame =
          data.white_player_id === user.id || data.black_player_id === user.id;
        if (!isPlayerInGame && data.status !== "waiting") {
          toast({
            title: "Acesso Negado",
            description: "Você não faz parte desta partida.",
            variant: "destructive",
          });
          navigate("/");
          setIsGameLoading(false);
          return;
        }
        processGameData(data);
      }
      setIsGameLoading(false);
    };

    fetchGame();
  }, [
    gameId,
    gameType,
    user.id,
    user.name,
    user.country,
    navigate,
    toast,
    processGameData,
    setIsGameLoading,
  ]);

  // Realtime subscriptions
  useEffect(() => {
    if (gameType === "bot" || !gameId) return;

    // Cleanup previous channels
    if (gameChannelRef.current) supabase.removeChannel(gameChannelRef.current);
    if (messageChannelRef.current)
      supabase.removeChannel(messageChannelRef.current);
    if (movesChannelRef.current)
      supabase.removeChannel(movesChannelRef.current);

    const gameChannel = supabase
      .channel(`game-state:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `game_id_text=eq.${gameId}`,
        },
        (payload) => {
          processGameData(payload.new);
        }
      )
      .subscribe();
    gameChannelRef.current = gameChannel;

    const movesChannel = supabase
      .channel(`game-moves:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "partidas",
          filter: `game_id_text=eq.${gameId}`,
        },
        (payload) => {
          if (payload.new.player_id !== user.id) {
            makeMove(payload.new.move, true);
          }
        }
      )
      .subscribe();
    movesChannelRef.current = movesChannel;

    const messageChannel = supabase
      .channel(`game-chat:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_messages",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setMessages((currentMessages) => [...currentMessages, payload.new]);
        }
      )
      .subscribe();
    messageChannelRef.current = messageChannel;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("game_messages")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    return () => {
      if (gameChannelRef.current)
        supabase.removeChannel(gameChannelRef.current);
      if (messageChannelRef.current)
        supabase.removeChannel(messageChannelRef.current);
      if (movesChannelRef.current)
        supabase.removeChannel(movesChannelRef.current);
    };
  }, [
    gameId,
    gameType,
    user.id,
    processGameData,
    setMessages,
    makeMove,
    gameData,
  ]);

  // Game timer logic
  useEffect(() => {
    if (!isGameActive || whiteTime === null || blackTime === null) return;

    const timer = setInterval(() => {
      if (currentPlayer === "white") {
        setWhiteTime((t) => {
          if (t !== null && t <= 1) {
            clearInterval(timer);
            handleResign(true);
            return 0;
          }
          return t !== null && t > 0 ? t - 1 : 0;
        });
      } else {
        setBlackTime((t) => {
          if (t !== null && t <= 1) {
            clearInterval(timer);
            handleResign(true);
            return 0;
          }
          return t !== null && t > 0 ? t - 1 : 0;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isGameActive,
    currentPlayer,
    whiteTime,
    blackTime,
    setWhiteTime,
    setBlackTime,
    handleResign,
  ]);
};
