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
            move: { from: moveFrom, to: moveTo },
            whiteTime: newWhiteTime,
            blackTime: newBlackTime,
          }),
        });
      } catch (error) {
        console.error("[SAVE_GAME] Error saving game state:", error);
      }
    },
    [gameType, gameId]
  );

  const { isConnected, connectionStatus, sendMessage, lastMessage, reconnect } =
    useWebSocket({
      gameId,
      userId: user?.id,
      enabled: gameType !== "bot" && !!gameId && !!user?.id,
      getWebSocketURL,
    });

  useEffect(() => {
    if (lastMessage) {
      const data = lastMessage;
      console.log("[WS_MESSAGE] Received:", data);

      if (data.type === "game_update" || data.type === "game_state") {
        processGameData(data.game);
      }

      if (data.type === "move") {
        const { move, fen: newFen, whiteTime: wt, blackTime: bt } = data;

        console.log("[WS_MOVE] Move received:", move);
        console.log("[WS_MOVE] New FEN:", newFen);
        console.log("[WS_MOVE] Times:", { white: wt, black: bt });

        const newGame = new Chess(newFen);
        gameInstanceRef.current = newGame;

        setGame(newGame);
        setFen(newFen);
        setBoard(newGame.board());
        setWhiteTime(wt);
        setBlackTime(bt);
        setMoveHistory(newGame.history({ verbose: true }));
        setCapturedPieces(updateCapturedPieces(newGame));
        setLastMove(move);
        setSelectedSquare(null);

        updateStatus(newGame);
      }

      if (data.type === "game_over" || data.type === "resign") {
        console.log("[WS_GAME_OVER] Game ended:", data);
        setGameStatus(data.reason || "resignation");
        setWinner(data.winner);
        onGameEnd();
      }

      if (data.type === "opponent_disconnected") {
        toast({
          title: "Oponente desconectado",
          description: "Aguardando reconexão...",
        });
      }

      if (data.type === "opponent_reconnected") {
        toast({
          title: "Oponente reconectado",
          description: "O jogo pode continuar!",
        });
      }

      if (data.type === "draw_offer") {
        toast({
          title: "Oferta de empate",
          description: `${data.playerName} ofereceu empate`,
        });
      }

      if (data.type === "chat_message") {
        setMessages((prev) => [...prev, data.message]);
      }
    }
  }, [
    lastMessage,
    processGameData,
    updateStatus,
    updateCapturedPieces,
    toast,
    onGameEnd,
  ]);

  const makeMove = useCallback(
    async (from, to, promotion = "q") => {
      if (isProcessingMoveRef.current) {
        console.log("[MAKE_MOVE] Already processing a move, ignoring...");
        return false;
      }

      if (gameStatus !== "playing") {
        console.log("[MAKE_MOVE] Game is not in playing state:", gameStatus);
        return false;
      }

      if (!isPlayerTurn) {
        console.log("[MAKE_MOVE] Not player's turn");
        return false;
      }

      isProcessingMoveRef.current = true;

      try {
        const currentGame = gameInstanceRef.current;

        console.log("[MAKE_MOVE] Attempting move:", {
          from,
          to,
          promotion,
          currentFen: currentGame.fen(),
        });

        const move = currentGame.move({
          from,
          to,
          promotion,
        });

        if (!move) {
          console.log("[MAKE_MOVE] Invalid move");
          isProcessingMoveRef.current = false;
          return false;
        }

        console.log("[MAKE_MOVE] Valid move:", move);

        const newFen = currentGame.fen();
        const newBoard = currentGame.board();
        const newHistory = currentGame.history({ verbose: true });
        const newCapturedPieces = updateCapturedPieces(currentGame);

        const newWhiteTime = currentPlayer === "white" ? whiteTime : whiteTime;
        const newBlackTime = currentPlayer === "black" ? blackTime : blackTime;

        setGame(new Chess(newFen));
        setFen(newFen);
        setBoard(newBoard);
        setMoveHistory(newHistory);
        setCapturedPieces(newCapturedPieces);
        setLastMove(move);
        setSelectedSquare(null);

        gameInstanceRef.current = currentGame;

        if (gameType !== "bot" && isConnected) {
          console.log("[MAKE_MOVE] Sending move via WebSocket");
          sendMessage({
            type: "move",
            move: { from, to, promotion },
            fen: newFen,
            whiteTime: newWhiteTime,
            blackTime: newBlackTime,
          });
        }

        await saveGameState(newFen, from, to, newWhiteTime, newBlackTime);

        updateStatus(currentGame);

        isProcessingMoveRef.current = false;
        return true;
      } catch (error) {
        console.error("[MAKE_MOVE] Error:", error);
        isProcessingMoveRef.current = false;
        return false;
      }
    },
    [
      gameStatus,
      isPlayerTurn,
      currentPlayer,
      whiteTime,
      blackTime,
      gameType,
      isConnected,
      sendMessage,
      saveGameState,
      updateStatus,
      updateCapturedPieces,
    ]
  );

  const handleMove = useCallback(
    (from, to, promotion = "q") => {
      return makeMove(from, to, promotion);
    },
    [makeMove]
  );

  const handleSquareClick = useCallback(
    (square) => {
      if (!isPlayerTurn) {
        return;
      }

      if (gameStatus !== "playing") {
        return;
      }

      if (selectedSquare) {
        const success = handleMove(selectedSquare, square);
        if (!success) {
          const piece = game.get(square);
          const isTournamentGame = gameId?.includes("tournament-");

          if (isTournamentGame) {
            const isWhitePlayer = gameData?.white_player_id === user.id;
            const isBlackPlayer = gameData?.black_player_id === user.id;

            if (
              piece &&
              ((piece.color === "w" && isWhitePlayer) ||
                (piece.color === "b" && isBlackPlayer))
            ) {
              setSelectedSquare(square);
            } else {
              setSelectedSquare(null);
            }
          } else {
            if (
              piece &&
              ((piece.color === "w" && currentPlayer === "white") ||
                (piece.color === "b" && currentPlayer === "black"))
            ) {
              setSelectedSquare(square);
            } else {
              setSelectedSquare(null);
            }
          }
        }
      } else {
        const piece = game.get(square);
        const isTournamentGame = gameId?.includes("tournament-");

        if (isTournamentGame) {
          const isWhitePlayer = gameData?.white_player_id === user.id;
          const isBlackPlayer = gameData?.black_player_id === user.id;

          if (
            piece &&
            ((piece.color === "w" && isWhitePlayer) ||
              (piece.color === "b" && isBlackPlayer))
          ) {
            setSelectedSquare(square);
          } else {
            toast({
              title: "Peça inválida",
              description: "Você só pode mover suas próprias peças!",
              variant: "destructive",
            });
          }
        } else {
          if (
            piece &&
            ((piece.color === "w" && currentPlayer === "white") ||
              (piece.color === "b" && currentPlayer === "black"))
          ) {
            setSelectedSquare(square);
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
      gameStatus,
    ]
  );

  const handleResign = useCallback(async () => {
    if (!gameData?.white_player_id || !gameData?.black_player_id) {
      toast({
        title: "Erro",
        description: "Aguarde o jogo carregar completamente",
        variant: "destructive",
      });
      return;
    }

    if (gameStatus !== "playing") {
      return;
    }

    const winnerInfo =
      playerColor === "white" ? blackPlayerInfo : whitePlayerInfo;

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
      reason: "resignation",
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

      setGameStatus("resignation");
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
  }, [
    gameData,
    gameStatus,
    playerColor,
    blackPlayerInfo,
    whitePlayerInfo,
    gameId,
    user.id,
    isConnected,
    sendMessage,
    toast,
  ]);

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
