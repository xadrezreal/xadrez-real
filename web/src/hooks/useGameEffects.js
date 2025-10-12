import { Chess } from "chess.js";
import { useCallback, useEffect, useRef } from "react";
import { getBotMove as getAdvancedBotMove } from "../lib/chessLogic";

const API_URL = "";

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
  handleResign,
}) => {
  const isGameActive = gameStatus === "playing";
  const gameInitialized = useRef(false);
  const lastSavedTimeRef = useRef({ white: null, black: null });
  const saveTimeIntervalRef = useRef(null);

  const getBotMove = useCallback(() => {
    const move = getAdvancedBotMove(game.fen(), game.turn(), botLevel);
    if (move) {
      makeMove(move, false);
    }
  }, [game, botLevel, makeMove]);

  // 🔥 NOVA FUNÇÃO: Salvar tempo periodicamente
  const saveGameTime = useCallback(
    async (currentWhiteTime, currentBlackTime) => {
      if (gameType === "bot" || !gameId) return;

      // Só salva se o tempo mudou significativamente (mais de 3 segundos)
      const whiteChanged =
        !lastSavedTimeRef.current.white ||
        Math.abs(lastSavedTimeRef.current.white - currentWhiteTime) >= 3;
      const blackChanged =
        !lastSavedTimeRef.current.black ||
        Math.abs(lastSavedTimeRef.current.black - currentBlackTime) >= 3;

      if (!whiteChanged && !blackChanged) return;

      try {
        const token = localStorage.getItem("auth_token");

        console.log("[AUTO_SAVE_TIME] Saving times:", {
          whiteTime: currentWhiteTime,
          blackTime: currentBlackTime,
        });

        await fetch(`${API_URL}/api/game/${gameId}/state`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fen: game.fen(),
            white_time: currentWhiteTime,
            black_time: currentBlackTime,
            status: "playing",
          }),
        });

        lastSavedTimeRef.current = {
          white: currentWhiteTime,
          black: currentBlackTime,
        };

        console.log("[AUTO_SAVE_TIME] ✅ Times saved successfully");
      } catch (error) {
        console.error("[AUTO_SAVE_TIME] ❌ Error saving times:", error);
      }
    },
    [gameId, gameType, game]
  );

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
        const API_URL = "";

        try {
          const response = await fetch(`${API_URL}/api/game/${gameId}/state`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          });

          if (response.ok) {
            const gameStateData = await response.json();

            if (isMounted) {
              console.log("[GAME_EFFECTS] Loading game data with times:", {
                whiteTime: gameStateData.white_time,
                blackTime: gameStateData.black_time,
              });

              lastSavedTimeRef.current = {
                white: gameStateData.white_time,
                black: gameStateData.black_time,
              };

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
          console.error("[GAME_EFFECTS] Error loading game:", error);
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

  // 🔥 NOVO: Auto-save de tempo a cada 5 segundos
  useEffect(() => {
    if (!isGameActive || gameType === "bot" || !gameId) return;

    // Limpar intervalo anterior se existir
    if (saveTimeIntervalRef.current) {
      clearInterval(saveTimeIntervalRef.current);
    }

    // Criar novo intervalo para salvar tempo a cada 5 segundos
    saveTimeIntervalRef.current = setInterval(() => {
      if (whiteTime !== null && blackTime !== null) {
        saveGameTime(whiteTime, blackTime);
      }
    }, 5000); // Salva a cada 5 segundos

    return () => {
      if (saveTimeIntervalRef.current) {
        clearInterval(saveTimeIntervalRef.current);
        saveTimeIntervalRef.current = null;
      }
    };
  }, [isGameActive, gameType, gameId, whiteTime, blackTime, saveGameTime]);

  useEffect(() => {
    if (!isGameActive || whiteTime === null || blackTime === null) return;

    if (!gameData || !gameData.white_player_id || !gameData.black_player_id) {
      console.log("[TIMER] Waiting for game data before starting timer");
      return;
    }

    // 🔥 CRÍTICO: Não iniciar timer se os tempos ainda não foram carregados
    if (whiteTime === 0 && blackTime === 0) {
      console.log("[TIMER] Waiting for times to be loaded from database");
      return;
    }

    // 🔥 CRÍTICO: Aguardar um pouco após carregar o jogo antes de iniciar o timer
    if (!gameInitialized.current) {
      console.log("[TIMER] Waiting for game initialization");
      return;
    }

    let timeoutCalled = false;

    const timer = setInterval(() => {
      if (currentPlayer === "white") {
        setWhiteTime((t) => {
          if (t !== null && t <= 0 && !timeoutCalled) {
            timeoutCalled = true;
            const winnerId = gameData.black_player_id;
            const loserName = gameData.white_player_name;
            const winnerName = gameData.black_player_name;

            console.log("[TIMER] ⏰ White time expired! Black wins:", winnerId);

            clearInterval(timer);

            const isUserTheLoser = gameData.white_player_id === user.id;

            toast({
              title: isUserTheLoser
                ? "⏰ Você perdeu por tempo!"
                : `⏰ ${loserName} perdeu por tempo!`,
              description: isUserTheLoser
                ? "Seu tempo esgotou. Redirecionando..."
                : `${winnerName} venceu! Aguarde a próxima partida...`,
              variant: isUserTheLoser ? "destructive" : "default",
            });

            setTimeout(() => {
              handleResign(true);
            }, 100);

            return 0;
          }
          return t !== null && t > 0 ? t - 1 : 0;
        });
      } else {
        setBlackTime((t) => {
          if (t !== null && t <= 0 && !timeoutCalled) {
            timeoutCalled = true;
            const winnerId = gameData.white_player_id;
            const loserName = gameData.black_player_name;
            const winnerName = gameData.white_player_name;

            console.log("[TIMER] ⏰ Black time expired! White wins:", winnerId);

            clearInterval(timer);

            const isUserTheLoser = gameData.black_player_id === user.id;

            toast({
              title: isUserTheLoser
                ? "⏰ Você perdeu por tempo!"
                : `⏰ ${loserName} perdeu por tempo!`,
              description: isUserTheLoser
                ? "Seu tempo esgotou. Redirecionando..."
                : `${winnerName} venceu! Aguarde a próxima partida...`,
              variant: isUserTheLoser ? "destructive" : "default",
            });

            setTimeout(() => {
              handleResign(true);
            }, 100);

            return 0;
          }
          return t !== null && t > 0 ? t - 1 : 0;
        });
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    isGameActive,
    currentPlayer,
    whiteTime,
    blackTime,
    gameData,
    user,
    toast,
    handleResign,
    setWhiteTime,
    setBlackTime,
  ]);
};
