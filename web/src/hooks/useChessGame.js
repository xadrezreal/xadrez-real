import {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import { Chess } from "chess.js";
import { useGameEffects } from "../hooks/useGameEffects";
import { useToast } from "../components/ui/use-toast";
import { useWebSocket } from "../hooks/useWebSocket";
import { useBeforeUnload } from "../hooks/useBeforeUnload";

const API_URL = "";

export const useChessGame = ({ gameId, gameType: initialGameType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useContext(UserContext);
  const { toast } = useToast();

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  );
  const [board, setBoard] = useState(game.board());
  const [isGameLoading, setIsGameLoading] = useState(true);
  const [gameData, setGameData] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [gameStatus, setGameStatus] = useState("loading");
  const [winner, setWinner] = useState(null);
  const [whiteTime, setWhiteTime] = useState(null);
  const [blackTime, setBlackTime] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [promotionMove, setPromotionMove] = useState(null);

  const gameInstanceRef = useRef(game);
  const isProcessingMoveRef = useRef(false);
  const lastSavedTimeRef = useRef({ white: null, black: null });

  const gameType = gameData?.tournament_id
    ? "tournament"
    : initialGameType || "online";
  const { botLevel, playerColor: initialPlayerColor } = location.state || {};

  const getWebSocketURL = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = protocol === "wss:" ? "" : ":3000";
    return `${protocol}//${host}${port}`;
  };

  const playerColor = useMemo(() => {
    if (!gameData || !user?.id) return initialPlayerColor || "white";

    if (gameData.white_player_id === user.id) return "white";
    if (gameData.black_player_id === user.id) return "black";

    const isTournamentGame =
      gameData.tournament_id || gameData.game_id_text?.includes("tournament-");

    if (isTournamentGame) {
      if (gameData.black_player_id?.includes("opponent_")) {
        return "white";
      }
      if (gameData.white_player_id?.includes("opponent_")) {
        return "black";
      }
    }

    return initialPlayerColor || "white";
  }, [gameData, user?.id, initialPlayerColor]);

  const isWaitingForOpponent =
    gameType !== "bot" && gameData?.status === "waiting";
  const currentPlayer = game.turn() === "w" ? "white" : "black";

  const isPlayerTurn = useMemo(() => {
    if (isWaitingForOpponent || gameStatus !== "playing") return false;

    if (gameType === "bot") {
      return currentPlayer === playerColor;
    }

    if (!gameData || !user?.id) return false;

    const isTournamentGame = gameId?.includes("tournament-");
    const userIsWhite = gameData.white_player_id === user.id;
    const userIsBlack = gameData.black_player_id === user.id;

    if (isTournamentGame) {
      if (currentPlayer === "white" && userIsWhite) return true;
      if (currentPlayer === "black" && userIsBlack) return true;
      return false;
    }

    if (currentPlayer === "white" && userIsWhite) return true;
    if (currentPlayer === "black" && userIsBlack) return true;

    return false;
  }, [
    currentPlayer,
    gameStatus,
    isWaitingForOpponent,
    gameType,
    gameData,
    gameId,
    user?.id,
    playerColor,
  ]);

  const whitePlayerInfo = useMemo(() => {
    if (gameType === "bot") {
      return playerColor === "white"
        ? { id: user.id, name: user.name, country: user.country }
        : { name: `Bot Nível ${botLevel}` };
    }
    if (!gameData) return { name: "Jogador Branco" };
    return {
      id: gameData.white_player_id,
      name: gameData.white_player_name,
      country: gameData.white_player_country,
    };
  }, [gameData, user, gameType, botLevel, playerColor]);

  const blackPlayerInfo = useMemo(() => {
    if (gameType === "bot") {
      return playerColor === "black"
        ? { id: user.id, name: user.name, country: user.country }
        : { name: `Bot Nível ${botLevel}` };
    }
    if (!gameData) return { name: "Jogador Preto" };
    return {
      id: gameData.black_player_id,
      name: gameData.black_player_name,
      country: gameData.black_player_country,
    };
  }, [gameData, user, gameType, botLevel, playerColor]);

  const wager = gameData?.wager || 0;

  const updateBoard = useCallback((gameInstance) => {
    setBoard(gameInstance.board());
  }, []);

  const onGameEnd = useCallback(() => {
    setUser((prevUser) => ({
      ...prevUser,
      status: "online",
      currentGameId: null,
    }));
  }, [setUser]);

  const updateCapturedPieces = useCallback((gameInstance) => {
    const history = gameInstance.history({ verbose: true });
    const captured = { w: [], b: [] };
    history.forEach((move) => {
      if (move.captured) {
        const piece = {
          type: move.captured,
          color: move.color === "w" ? "black" : "white",
        };
        if (move.color === "w") captured.b.push(piece);
        else captured.w.push(piece);
      }
    });
    return captured;
  }, []);

  const handleWagerPayout = useCallback(() => {
    console.log("Payout desabilitado - Supabase removido");
  }, []);

  const handleGameEnd = useCallback(
    async (gameInstance, reason) => {
      if (gameType === "bot" || !gameId || !gameData) return;

      const winnerId =
        gameInstance.turn() === "w"
          ? gameData.black_player_id
          : gameData.white_player_id;

      const winnerInfo =
        gameInstance.turn() === "w"
          ? {
              id: gameData.black_player_id,
              name: gameData.black_player_name,
            }
          : {
              id: gameData.white_player_id,
              name: gameData.white_player_name,
            };

      setGameStatus(reason);

      if (reason !== "stalemate" && reason !== "draw") {
        setWinner(winnerInfo);
      }

      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`${API_URL}/api/game/${gameId}/end`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            winnerId:
              reason === "stalemate" || reason === "draw" ? null : winnerId,
            reason,
          }),
        });

        if (!response.ok) {
          throw new Error("Erro ao finalizar jogo");
        }

        const data = await response.json();
        console.log("[GAME_END] Game finalized:", data);
      } catch (error) {
        console.error("[GAME_END] Error finalizing game:", error);
      }
    },
    [gameId, gameType, gameData]
  );

  const updateStatus = useCallback(
    (gameInstance = game) => {
      let status = "playing";
      let newWinner = null;

      if (gameInstance.isCheckmate()) {
        status = "checkmate";
        newWinner =
          gameInstance.turn() === "w" ? blackPlayerInfo : whitePlayerInfo;
        handleGameEnd(gameInstance, "checkmate");
      } else if (gameInstance.isStalemate()) {
        status = "stalemate";
        handleGameEnd(gameInstance, "stalemate");
      } else if (
        gameInstance.isThreefoldRepetition() ||
        gameInstance.isDraw()
      ) {
        status = "draw";
        handleGameEnd(gameInstance, "draw");
      }

      if (status !== "playing") {
        setIsGameLoading(false);
        setWinner(newWinner);
        if (newWinner) handleWagerPayout(newWinner);
        onGameEnd();
      }
      setGameStatus(status);
      return { status, newWinner };
    },
    [
      game,
      blackPlayerInfo,
      whitePlayerInfo,
      handleWagerPayout,
      onGameEnd,
      handleGameEnd,
    ]
  );

  const saveGameState = useCallback(
    async (newFen, moveFrom, moveTo, newWhiteTime, newBlackTime) => {
      if (gameType === "bot" || !gameId) return;

      try {
        const token = localStorage.getItem("auth_token");

        console.log("[SAVE_GAME] Saving game state:", {
          gameId,
          fen: newFen,
          whiteTime: newWhiteTime,
          blackTime: newBlackTime,
        });

        await fetch(`${API_URL}/api/game/${gameId}/move`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fen: newFen,
            lastMove:
              moveFrom && moveTo ? { from: moveFrom, to: moveTo } : null,
          }),
        });

        if (newWhiteTime !== null && newBlackTime !== null) {
          await fetch(`${API_URL}/api/game/${gameId}/state`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fen: newFen,
              white_time: newWhiteTime,
              black_time: newBlackTime,
              status: "playing",
            }),
          });

          lastSavedTimeRef.current = {
            white: newWhiteTime,
            black: newBlackTime,
          };
        }

        console.log("[SAVE_GAME] ✅ Game state saved successfully");
      } catch (error) {
        console.error("[SAVE_GAME] ❌ Error saving game state:", error);
      }
    },
    [gameId, gameType]
  );

  const handleWebSocketMessage = useCallback(
    (message) => {
      const isTournamentGame = gameId?.includes("tournament-");
      const isSelfMessage = message.data?.playerId === user.id;

      if (!isTournamentGame && isSelfMessage) {
        return;
      }

      switch (message.type) {
        case "move":
          const { fen: newFen, from, to } = message.data;
          try {
            const newGame = new Chess(newFen);
            gameInstanceRef.current = newGame;
            setGame(newGame);
            setFen(newFen);
            setBoard(newGame.board());
            setMoveHistory(newGame.history({ verbose: true }));
            setCapturedPieces(updateCapturedPieces(newGame));
            setSelectedSquare(null);
            setLastMove(null);
            updateStatus(newGame);

            if (!isTournamentGame || !isSelfMessage) {
              toast({
                title: "Movimento do oponente",
                description: `${from} → ${to}`,
              });
            }
          } catch (error) {
            console.error("Erro ao processar movimento:", error);
          }
          break;

        case "game_end":
          setGameStatus(message.data.reason);

          const gameEndWinner =
            message.data.winner?.id === gameData?.white_player_id
              ? whitePlayerInfo
              : message.data.winner?.id === gameData?.black_player_id
              ? blackPlayerInfo
              : null;

          setWinner(gameEndWinner);
          onGameEnd();
          toast({
            title: "Partida finalizada",
            description: `Fim de jogo: ${message.data.reason}`,
          });
          break;

        case "resign":
          setGameStatus("resignation");

          const resignWinner =
            message.data.winner?.id === gameData?.white_player_id
              ? whitePlayerInfo
              : message.data.winner?.id === gameData?.black_player_id
              ? blackPlayerInfo
              : message.data.winner;

          setWinner(resignWinner);
          onGameEnd();

          const didIWin = resignWinner?.id === user.id;
          toast({
            title: didIWin ? "🎉 Vitória!" : "😞 Seu oponente desistiu",
            description: didIWin
              ? "Você venceu! Aguarde a próxima rodada."
              : `${resignWinner?.name || "Oponente"} venceu por desistência`,
            duration: 5000,
          });
          break;

        case "connection_confirmed":
          break;

        case "error":
          toast({
            title: "Erro do servidor",
            description: message.data.message,
            variant: "destructive",
          });
          break;
      }
    },
    [
      user.id,
      gameId,
      gameData,
      toast,
      updateCapturedPieces,
      updateStatus,
      onGameEnd,
      whitePlayerInfo,
      blackPlayerInfo,
    ]
  );

  const { connectionStatus, sendMessage, isConnected } = useWebSocket(
    gameId && gameType !== "bot"
      ? `${getWebSocketURL()}/ws/game/${gameId}`
      : null,
    {
      onMessage: handleWebSocketMessage,
      onOpen: () => console.log("Conectado ao WebSocket"),
      onClose: () => console.log("Desconectado do WebSocket"),
    }
  );

  const makeMove = useCallback(
    async (move) => {
      if (isProcessingMoveRef.current) {
        return null;
      }

      if (!isPlayerTurn) {
        return null;
      }

      isProcessingMoveRef.current = true;

      try {
        const currentGame = gameInstanceRef.current;
        const moveResult = currentGame.move(move);

        if (moveResult) {
          const newGame = new Chess(currentGame.fen());
          const newFen = newGame.fen();

          gameInstanceRef.current = newGame;
          setGame(newGame);
          setFen(newFen);
          updateBoard(newGame);
          setLastMove({ from: moveResult.from, to: moveResult.to });
          setMoveHistory(newGame.history({ verbose: true }));
          setCapturedPieces(updateCapturedPieces(newGame));
          setSelectedSquare(null);
          setPromotionMove(null);

          setTimeout(() => {
            setLastMove(null);
          }, 2000);

          const { status, newWinner } = updateStatus(newGame);

          await saveGameState(
            newFen,
            moveResult.from,
            moveResult.to,
            whiteTime,
            blackTime
          );

          if (gameId && gameType !== "bot" && isConnected) {
            sendMessage({
              type: "move",
              from: moveResult.from,
              to: moveResult.to,
              promotion: moveResult.promotion,
              playerId: user.id,
              fen: newFen,
            });
          }
        }

        return moveResult;
      } finally {
        setTimeout(() => {
          isProcessingMoveRef.current = false;
        }, 100);
      }
    },
    [
      isPlayerTurn,
      updateBoard,
      gameId,
      updateCapturedPieces,
      gameType,
      user.id,
      isConnected,
      sendMessage,
      updateStatus,
      saveGameState,
      whiteTime,
      blackTime,
    ]
  );

  const handleMove = useCallback(
    (from, to, promotion) => {
      if (game.isGameOver() || !isPlayerTurn) return;

      const move = { from, to, promotion };
      const piece = game.get(from);

      if (piece?.type === "p" && (to.endsWith("8") || to.endsWith("1"))) {
        const moves = game.moves({ square: from, verbose: true });
        const isPromotionMove = moves.some((m) => m.to === to && m.promotion);
        if (isPromotionMove && !promotion) {
          setPromotionMove({ from, to });
          return;
        }
      }

      makeMove(move);
    },
    [game, isPlayerTurn, makeMove]
  );

  const handleSquareClick = useCallback(
    (square) => {
      if (!isPlayerTurn) {
        return;
      }

      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
        } else {
          handleMove(selectedSquare, square);
        }
      } else {
        const piece = game.get(square);

        if (piece) {
          const isTournamentGame = gameId?.includes("tournament-");
          let canSelectPiece = false;

          let myPieceColor;

          if (isTournamentGame && gameData) {
            if (gameData.white_player_id === user.id) {
              myPieceColor = "w";
            } else if (gameData.black_player_id === user.id) {
              myPieceColor = "b";
            }
          } else if (playerColor) {
            myPieceColor = playerColor[0];
          }

          canSelectPiece =
            piece.color === myPieceColor && piece.color === currentPlayer[0];

          if (canSelectPiece) {
            const moves = game.moves({ square: square, verbose: true });
            if (moves.length > 0) {
              setSelectedSquare(square);
            }
          } else {
            toast({
              title: "Peça inválida",
              description: "Você só pode mover suas próprias peças!",
              variant: "destructive",
            });
          }
        }
      }
    },
    [
      selectedSquare,
      isPlayerTurn,
      handleMove,
      game,
      playerColor,
      currentPlayer,
      gameId,
      gameData,
      user.id,
      toast,
    ]
  );

  const handleResign = useCallback(
    async (isAutomatic = false) => {
      if (!gameData?.white_player_id || !gameData?.black_player_id) {
        toast({
          title: "Erro",
          description: "Aguarde o jogo carregar completamente",
          variant: "destructive",
        });
        return;
      }

      const winnerInfo =
        playerColor === "white" ? blackPlayerInfo : whitePlayerInfo;
      const resignationType = isAutomatic ? "timeout" : "resignation";

      if (!winnerInfo?.id) {
        console.error("[RESIGN] Winner info invalid:", winnerInfo);
        return;
      }

      console.log("[RESIGN] ========== RESIGNING ==========");
      console.log("[RESIGN] Resigning player:", user.id);
      console.log("[RESIGN] Winner:", winnerInfo.id, winnerInfo.name);

      const token = localStorage.getItem("auth_token");

      const payload = {
        winnerId: winnerInfo.id,
        reason: resignationType,
      };

      console.log("[RESIGN] Payload being sent:", payload);

      try {
        const response = await fetch(`${API_URL}/api/game/${gameId}/end`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[RESIGN] API failed:", response.status, errorText);
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        console.log("[RESIGN] API success:", result);

        setGameStatus(resignationType);
        setWinner(winnerInfo);

        if (isConnected) {
          sendMessage({
            type: "resign",
            playerId: user.id,
            winner: winnerInfo,
          });
        }
      } catch (error) {
        console.error("[RESIGN] Error:", error);
      }
    },
    [
      gameData,
      playerColor,
      blackPlayerInfo,
      whitePlayerInfo,
      gameId,
      user.id,
      isConnected,
      sendMessage,
      toast,
      setGameStatus,
      setWinner,
    ]
  );

  const processGameData = useCallback(
    (data) => {
      if (!data) return;

      if (isProcessingMoveRef.current) return;

      if (
        gameData?.game_id_text === data.game_id_text &&
        gameData.status === data.status &&
        gameData.fen === data.fen
      )
        return;

      console.log("[PROCESS_GAME_DATA] ========== LOADING GAME ==========");
      console.log("[PROCESS_GAME_DATA] Game ID:", data.game_id_text);
      console.log("[PROCESS_GAME_DATA] FEN:", data.fen);
      console.log("[PROCESS_GAME_DATA] White Time:", data.white_time);
      console.log("[PROCESS_GAME_DATA] Black Time:", data.black_time);
      console.log("[PROCESS_GAME_DATA] Status:", data.status);
      console.log("[PROCESS_GAME_DATA] Winner ID:", data.winner_id);
      console.log("[PROCESS_GAME_DATA] ===============================");

      const newGame = new Chess(data.fen);
      gameInstanceRef.current = newGame;

      setGameData(data);
      setGame(newGame);
      setFen(data.fen);
      setBoard(newGame.board());
      setWhiteTime(data.white_time);
      setBlackTime(data.black_time);
      setGameStatus(data.status);
      setMoveHistory(newGame.history({ verbose: true }));
      setCapturedPieces(updateCapturedPieces(newGame));
      setLastMove(data.last_move);

      lastSavedTimeRef.current = {
        white: data.white_time,
        black: data.black_time,
      };

      if (data.winner_id) {
        const winnerInfo =
          data.winner_id === data.white_player_id
            ? {
                id: data.white_player_id,
                name: data.white_player_name,
                country: data.white_player_country,
              }
            : {
                id: data.black_player_id,
                name: data.black_player_name,
                country: data.black_player_country,
              };

        setWinner(winnerInfo);
      }

      if (data.status === "playing") {
        setUser((prevUser) => ({
          ...prevUser,
          status: "in_game",
          currentGameId: data.game_id_text,
        }));
        setIsGameLoading(false);
      } else if (data.status !== "waiting") {
        console.log(
          "[PROCESS_GAME_DATA] ⚠️ Game is already finished:",
          data.status
        );
        onGameEnd();
        setIsGameLoading(false);
      } else {
        setIsGameLoading(false);
      }
    },
    [gameData, updateCapturedPieces, setUser, onGameEnd]
  );

  useEffect(() => {
    gameInstanceRef.current = game;
  }, [game]);

  useGameEffects({
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
  });

  const handlePromotion = (piece) => {
    if (promotionMove) {
      handleMove(promotionMove.from, promotionMove.to, piece);
    }
  };

  const handleDrawOffer = () => {
    if (gameId && gameType !== "bot" && isConnected) {
      sendMessage({ type: "draw_offer", playerId: user.id });
    }
    toast({ title: "Oferta de empate enviada" });
  };

  const handleSendMessage = async () => {
    console.log("Chat desabilitado");
  };

  const handleNewGame = useCallback(() => navigate("/"), [navigate]);
  const handleRematch = useCallback(
    () => toast({ title: "Funcionalidade indisponível" }),
    [toast]
  );

  const stableBoard = useMemo(() => board, [board]);
  const stableLastMove = useMemo(() => lastMove, [lastMove]);
  const stableCapturedPieces = useMemo(() => capturedPieces, [capturedPieces]);

  useBeforeUnload(
    gameId,
    gameStatus,
    gameType,
    gameData,
    playerColor,
    whitePlayerInfo,
    blackPlayerInfo,
    user
  );

  return {
    game,
    board: stableBoard,
    gameStatus,
    winner,
    whiteTime: whiteTime ?? 0,
    blackTime: blackTime ?? 0,
    moveHistory,
    messages,
    capturedPieces: stableCapturedPieces,
    selectedSquare,
    playerColor,
    isPlayerTurn,
    currentPlayer,
    wager,
    whitePlayerInfo,
    blackPlayerInfo,
    promotionMove,
    lastMove: stableLastMove,
    isGameLoading,
    isWaitingForOpponent,
    gameData,
    connectionStatus,
    isConnected,
    handleMove,
    handleSquareClick,
    handleResign,
    handleDrawOffer,
    handleSendMessage,
    handleNewGame,
    handleRematch,
    handlePromotion,
  };
};
