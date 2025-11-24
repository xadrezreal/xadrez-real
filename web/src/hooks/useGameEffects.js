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
  const currentGameIdRef = useRef(null);
  const timerRef = useRef(null);
  const timeoutHandledRef = useRef(false);

  const getBotMove = useCallback(() => {
    const move = getAdvancedBotMove(game.fen(), game.turn(), botLevel);
    if (move) {
      console.log(`[BOT] Nível ${botLevel} jogando:`, move.san || move);
      makeMove(move, true);
    } else {
      console.warn('[BOT] Nenhum movimento disponível');
    }
  }, [game, botLevel, makeMove]);

  const saveGameTime = useCallback(
    async (currentWhiteTime, currentBlackTime) => {
      if (gameType === "bot" || !gameId) return;

      const whiteChanged =
        !lastSavedTimeRef.current.white ||
        Math.abs(lastSavedTimeRef.current.white - currentWhiteTime) >= 3;
      const blackChanged =
        !lastSavedTimeRef.current.black ||
        Math.abs(lastSavedTimeRef.current.black - currentBlackTime) >= 3;

      if (!whiteChanged && !blackChanged) return;

      try {
        const token = localStorage.getItem("auth_token");

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
      } catch (error) {}
    },
    [gameId, gameType, game]
  );

  useEffect(() => {
    if (currentGameIdRef.current !== gameId) {
      gameInitialized.current = false;
      lastSavedTimeRef.current = { white: null, black: null };
      timeoutHandledRef.current = false;

      if (saveTimeIntervalRef.current) {
        clearInterval(saveTimeIntervalRef.current);
        saveTimeIntervalRef.current = null;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      currentGameIdRef.current = gameId;
    }
  }, [gameId]);

  useEffect(() => {
    if (gameType === "bot") {
      console.log('[BOT_INIT] Inicializando jogo com bot...');
      const newGame = new Chess();
      const timeControl = location.state?.timeControl || 600;
      console.log('[BOT_INIT] Cor do jogador:', location.state?.playerColor);
      console.log('[BOT_INIT] Nível do bot:', location.state?.botLevel);
      setGame(newGame);
      updateBoard(newGame);
      setWhiteTime(timeControl);
      setBlackTime(timeControl);
      setIsGameLoading(false);
      setGameStatus("playing");
      gameInitialized.current = true;
      console.log('[BOT_INIT] ✅ Jogo inicializado');
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
    console.log('[BOT_EFFECT] Verificando condições:', {
      gameType,
      isPlayerTurn,
      gameStatus,
      shouldTriggerBot: gameType === "bot" && !isPlayerTurn && gameStatus === "playing"
    });

    if (gameType === "bot" && !isPlayerTurn && gameStatus === "playing") {
      console.log('[BOT_EFFECT] ✅ Agendando movimento do bot...');
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

            if (gameStateData.game_id_text !== gameId) {
              throw new Error("GameId incorreto carregado");
            }

            if (isMounted) {
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
      timeoutHandledRef.current = false;
    };
  }, [gameId]);

  useEffect(() => {
    if (!isGameActive || gameType === "bot" || !gameId) return;

    if (saveTimeIntervalRef.current) {
      clearInterval(saveTimeIntervalRef.current);
    }

    saveTimeIntervalRef.current = setInterval(() => {
      if (whiteTime !== null && blackTime !== null) {
        saveGameTime(whiteTime, blackTime);
      }
    }, 5000);

    return () => {
      if (saveTimeIntervalRef.current) {
        clearInterval(saveTimeIntervalRef.current);
        saveTimeIntervalRef.current = null;
      }
    };
  }, [isGameActive, gameType, gameId, whiteTime, blackTime, saveGameTime]);

  useEffect(() => {
    if (!isGameActive || whiteTime === null || blackTime === null) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Para jogos online, precisa de gameData. Para bot, não precisa
    if (gameType !== "bot" && (!gameData || !gameData.white_player_id || !gameData.black_player_id)) {
      return;
    }

    if (whiteTime === 0 && blackTime === 0) {
      return;
    }

    if (!gameInitialized.current) {
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (isGameActive && gameStatus === "playing") {
      timeoutHandledRef.current = false;
    }

    timerRef.current = setInterval(() => {
      if (currentPlayer === "white") {
        setWhiteTime((t) => {
          if (t !== null && t <= 0 && !timeoutHandledRef.current) {
            timeoutHandledRef.current = true;

            clearInterval(timerRef.current);
            timerRef.current = null;

            // Para jogos bot, apenas mostrar notificação simples
            if (gameType === "bot") {
              toast({
                title: "⏰ Tempo esgotado!",
                description: "As brancas perderam por tempo.",
                variant: "destructive",
              });
            } else {
              const loserName = gameData.white_player_name;
              const winnerName = gameData.black_player_name;
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

              if (isUserTheLoser) {
                setTimeout(() => {
                  handleResign(true);
                }, 100);
              }
            }

            return 0;
          }
          return t !== null && t > 0 ? t - 1 : 0;
        });
      } else {
        setBlackTime((t) => {
          if (t !== null && t <= 0 && !timeoutHandledRef.current) {
            timeoutHandledRef.current = true;

            clearInterval(timerRef.current);
            timerRef.current = null;

            // Para jogos bot, apenas mostrar notificação simples
            if (gameType === "bot") {
              toast({
                title: "⏰ Tempo esgotado!",
                description: "As pretas perderam por tempo.",
                variant: "destructive",
              });
            } else {
              const loserName = gameData.black_player_name;
              const winnerName = gameData.white_player_name;
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

              if (isUserTheLoser) {
                setTimeout(() => {
                  handleResign(true);
                }, 100);
              }
            }

            return 0;
          }
          return t !== null && t > 0 ? t - 1 : 0;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
    gameStatus,
  ]);
};
