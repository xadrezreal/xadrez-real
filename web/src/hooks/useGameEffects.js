import { Chess } from "chess.js";
import { useCallback, useEffect, useRef } from "react";
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
  makeMove,
}) => {
  const isGameActive = gameStatus === "playing";
  const gameInitialized = useRef(false);

  const getBotMove = useCallback(() => {
    const move = getAdvancedBotMove(game.fen(), game.turn(), botLevel);
    if (move) {
      makeMove(move, false);
    }
  }, [game, botLevel, makeMove]);

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
      gameInitialized.current = true;

      console.log("[GAME_EFFECTS] Bot game initialized");
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

  useEffect(() => {
    if (gameType === "bot" && !isPlayerTurn && gameStatus === "playing") {
      const botMoveTimeout = setTimeout(() => getBotMove(), 500);
      return () => clearTimeout(botMoveTimeout);
    }
  }, [isPlayerTurn, gameStatus, gameType, getBotMove]);

  useEffect(() => {
    if (gameType === "bot" || !gameId || !user?.id || gameInitialized.current)
      return;

    let isMounted = true;

    const initializeGame = async () => {
      if (!isMounted || gameInitialized.current) return;

      if (gameId.includes("tournament-")) {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

        try {
          const response = await fetch(`${API_URL}/api/game/${gameId}/state`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          });

          if (response.ok) {
            const gameStateData = await response.json();

            if (isMounted) {
              processGameData(gameStateData);
              setIsGameLoading(false);
              gameInitialized.current = true;
            }
          } else {
            toast({
              title: "Erro",
              description:
                "Partida não encontrada. O torneio pode não ter iniciado ainda.",
              variant: "destructive",
            });

            if (isMounted) {
              setIsGameLoading(false);
            }
          }
        } catch (error) {
          if (isMounted) {
            setIsGameLoading(false);
          }
        }

        return;
      }

      if (isMounted) {
        setIsGameLoading(false);
        gameInitialized.current = true;
      }
    };

    const timeoutId = setTimeout(initializeGame, 50);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [gameId, gameType, user?.id, processGameData, toast, setIsGameLoading]);

  useEffect(() => {
    return () => {
      gameInitialized.current = false;
    };
  }, [gameId]);

  useEffect(() => {
    if (!isGameActive || whiteTime === null || blackTime === null) return;

    if (!gameData || !gameData.white_player_id || !gameData.black_player_id) {
      console.log("[TIMER] Waiting for game data before starting timer");
      return;
    }

    const timer = setInterval(() => {
      if (currentPlayer === "white") {
        setWhiteTime((t) => {
          if (t !== null && t <= 1) {
            toast({
              title: "Tempo esgotado!",
              description: "Você perdeu por tempo.",
              variant: "destructive",
            });
            return 0;
          }
          return t !== null && t > 0 ? t - 1 : 0;
        });
      } else {
        setBlackTime((t) => {
          if (t !== null && t <= 1) {
            toast({
              title: "Tempo esgotado!",
              description: "Você perdeu por tempo.",
              variant: "destructive",
            });
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
    gameData,
    setWhiteTime,
    setBlackTime,
    toast,
  ]);
};
