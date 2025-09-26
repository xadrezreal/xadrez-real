import { useEffect, useCallback, useRef } from "react";
import { Chess } from "chess.js";
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

    console.log(
      "INICIALIZANDO JOGO - gameInitialized:",
      gameInitialized.current
    );

    let isMounted = true;

    const initializeGame = () => {
      if (!isMounted || gameInitialized.current) return;

      if (gameId.includes("tournament-")) {
        const existingPlayerData = localStorage.getItem(
          `tournament_player_${gameId}`
        );
        let isWhitePlayer;

        if (existingPlayerData) {
          const playerData = JSON.parse(existingPlayerData);
          isWhitePlayer = playerData.color === "white";
        } else {
          const gameIdNumber = parseInt(gameId.split("-")[1]) || 0;
          const userIdHash = user.id
            .split("")
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
          isWhitePlayer = (gameIdNumber + userIdHash) % 2 === 0;

          localStorage.setItem(
            `tournament_player_${gameId}`,
            JSON.stringify({
              userId: user.id,
              color: isWhitePlayer ? "white" : "black",
              sessionKey: Date.now(),
            })
          );
        }

        const opponentId = `opponent_${gameId}_${
          isWhitePlayer ? "black" : "white"
        }`;

        const tournamentGameData = {
          game_id_text: gameId,
          status: "playing",
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          white_time: 600,
          black_time: 600,
          white_player_id: isWhitePlayer ? user.id : opponentId,
          white_player_name: isWhitePlayer ? user.name : "Jogador Branco",
          white_player_country: isWhitePlayer ? user.country : null,
          black_player_id: isWhitePlayer ? opponentId : user.id,
          black_player_name: isWhitePlayer ? "Jogador Preto" : user.name,
          black_player_country: isWhitePlayer ? null : user.country,
          tournament_id: gameId.split("-")[1],
          last_move: null,
          winner_id: null,
        };

        console.log("PROCESSANDO DADOS DO JOGO - PRIMEIRA VEZ");
        if (isMounted) {
          processGameData(tournamentGameData);
          setIsGameLoading(false);
          gameInitialized.current = true;
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
  }, [gameId, gameType, user?.id]);

  useEffect(() => {
    return () => {
      gameInitialized.current = false;
    };
  }, [gameId]);

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
