import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import { Chess } from "chess.js";
import { supabase } from "../lib/supabaseClient";
import { useGameEffects } from "../hooks/useGameEffects";
import { useToast } from "../components/ui/use-toast";

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

  const gameType = gameData?.tournament_id
    ? "tournament"
    : initialGameType || "online";
  const { botLevel, playerColor: initialPlayerColor } = location.state || {};

  const playerColor = useMemo(() => {
    if (!gameData || !user.id) return initialPlayerColor || "white";
    if (gameData.white_player_id === user.id) return "white";
    if (gameData.black_player_id === user.id) return "black";
    return "white";
  }, [gameData, user.id, initialPlayerColor]);

  const isWaitingForOpponent =
    gameType !== "bot" && gameData?.status === "waiting";

  const currentPlayer = game.turn() === "w" ? "white" : "black";
  const isPlayerTurn =
    !isWaitingForOpponent &&
    (gameType === "bot"
      ? currentPlayer === playerColor
      : gameData
      ? currentPlayer === playerColor
      : false);

  const whitePlayerInfo = useMemo(() => {
    if (gameType === "bot")
      return playerColor === "white"
        ? { id: user.id, name: user.name, country: user.country }
        : { name: `Bot Nível ${botLevel}` };
    if (!gameData) return { name: "Jogador Branco" };
    return {
      id: gameData.white_player_id,
      name: gameData.white_player_name,
      country: gameData.white_player_country,
    };
  }, [gameData, user, gameType, botLevel, playerColor]);

  const blackPlayerInfo = useMemo(() => {
    if (gameType === "bot")
      return playerColor === "black"
        ? { id: user.id, name: user.name, country: user.country }
        : { name: `Bot Nível ${botLevel}` };
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

  const handleWagerPayout = useCallback(
    async (winnerInfo) => {
      if (wager > 0 && winnerInfo?.id === user.id) {
        const prize = wager * 2 * 0.8;
        const { data, error } = await supabase.rpc("update_balance", {
          amount_to_add: prize,
          p_user_id: user.id,
        });
        if (!error) {
          setUser((prevUser) => ({ ...prevUser, balance: data }));
          toast({
            title: "Você venceu a aposta!",
            description: `R$ ${prize.toFixed(
              2
            )} foram adicionados à sua carteira.`,
            variant: "success",
          });
        }
      }
    },
    [user.id, wager, setUser, toast]
  );

  const updateStatus = useCallback(() => {
    let status = "playing";
    let newWinner = null;
    if (game.isCheckmate()) {
      status = "checkmate";
      newWinner = game.turn() === "w" ? blackPlayerInfo : whitePlayerInfo;
    } else if (
      game.isStalemate() ||
      game.isThreefoldRepetition() ||
      game.isDraw()
    ) {
      status = "draw";
    }

    if (status !== "playing") {
      setIsGameLoading(false);
      setWinner(newWinner);
      if (newWinner) {
        handleWagerPayout(newWinner);
      }
      onGameEnd();
    }
    setGameStatus(status);
    return { status, newWinner };
  }, [game, blackPlayerInfo, whitePlayerInfo, handleWagerPayout, onGameEnd]);

  const makeMove = useCallback(
    async (move, isRemote = false) => {
      const moveResult = game.move(move);
      if (moveResult) {
        const newFen = game.fen();
        const { status, newWinner } = updateStatus();
        const newLastMove = { from: moveResult.from, to: moveResult.to };

        setFen(newFen);
        updateBoard(game);
        setLastMove(newLastMove);
        setMoveHistory(game.history({ verbose: true }));
        setCapturedPieces(updateCapturedPieces(game));
        setSelectedSquare(null);
        setPromotionMove(null);

        if (!isRemote && gameId && gameType !== "bot") {
          await supabase.from("partidas").insert({
            game_id_text: gameId,
            player_id: user.id,
            move: moveResult,
          });

          const updates = {
            fen: newFen,
            status: status,
            updated_at: new Date().toISOString(),
            last_move: newLastMove,
          };
          if (newWinner) {
            updates.winner_id = newWinner.id;
          }
          const { error } = await supabase
            .from("games")
            .update(updates)
            .eq("game_id_text", gameId);
          if (error) console.error("Error updating game state:", error);
        }
      }
      return moveResult;
    },
    [
      game,
      updateStatus,
      updateBoard,
      gameId,
      updateCapturedPieces,
      gameType,
      user.id,
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
      makeMove(move, false);
    },
    [game, isPlayerTurn, makeMove]
  );

  const handlePromotion = (piece) => {
    if (promotionMove) {
      handleMove(promotionMove.from, promotionMove.to, piece);
    }
  };

  const handleResign = useCallback(
    async (isAutomatic = false) => {
      const winnerInfo =
        playerColor === "white" ? blackPlayerInfo : whitePlayerInfo;
      const resignationType = isAutomatic ? "timeout" : "resignation";
      setGameStatus(resignationType);
      setWinner(winnerInfo);
      setIsGameLoading(false);
      onGameEnd();
      if (gameId && gameType !== "bot") {
        await supabase
          .from("games")
          .update({
            status: resignationType,
            winner_id: winnerInfo.id,
          })
          .eq("game_id_text", gameId);
        handleWagerPayout(winnerInfo);
      } else {
        handleWagerPayout(winnerInfo);
      }
    },
    [
      playerColor,
      blackPlayerInfo,
      whitePlayerInfo,
      gameId,
      handleWagerPayout,
      gameType,
      onGameEnd,
    ]
  );

  const handleSquareClick = useCallback(
    (square) => {
      if (!isPlayerTurn) return;

      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
        } else {
          handleMove(selectedSquare, square);
        }
      } else {
        const piece = game.get(square);
        if (piece && playerColor && piece.color === playerColor[0]) {
          const moves = game.moves({ square: square, verbose: true });
          if (moves.length > 0) {
            setSelectedSquare(square);
          }
        }
      }
    },
    [selectedSquare, isPlayerTurn, handleMove, game, playerColor]
  );

  const handleSendMessage = async (messageText) => {
    if (!gameId || !user.id || gameType === "bot") return;
    const { error } = await supabase.from("game_messages").insert({
      game_id: gameId,
      sender_id: user.id,
      sender_name: user.name,
      message: messageText,
    });
    if (error) {
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    }
  };

  const processGameData = useCallback(
    (data) => {
      if (!data) return;
      const newGame = new Chess(data.fen);
      setFen(data.fen);
      setGameData(data);
      setGame(newGame);
      updateBoard(newGame);
      setWhiteTime(data.white_time);
      setBlackTime(data.black_time);
      setGameStatus(data.status);
      setIsGameLoading(false);
      setMoveHistory(newGame.history({ verbose: true }));
      setCapturedPieces(updateCapturedPieces(newGame));
      setLastMove(data.last_move);

      if (data.status !== "playing" && data.status !== "waiting") {
        onGameEnd();
      }

      if (data.winner_id) {
        const winnerInfo =
          data.winner_id === data.white_player_id
            ? whitePlayerInfo
            : blackPlayerInfo;
        setWinner(winnerInfo);
      }

      if (data.status === "playing") {
        setUser((prevUser) => ({
          ...prevUser,
          status: "in_game",
          currentGameId: data.game_id_text,
        }));
      }
    },
    [
      updateBoard,
      updateCapturedPieces,
      whitePlayerInfo,
      blackPlayerInfo,
      setUser,
      onGameEnd,
    ]
  );

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

  const handleDrawOffer = () =>
    toast({ title: "Funcionalidade indisponível." });
  const handleNewGame = () => navigate("/");
  const handleRematch = () => toast({ title: "Funcionalidade indisponível." });

  return {
    game,
    board,
    gameStatus,
    winner,
    whiteTime: whiteTime ?? 0,
    blackTime: blackTime ?? 0,
    moveHistory,
    messages,
    capturedPieces,
    selectedSquare,
    playerColor,
    isPlayerTurn,
    currentPlayer,
    wager,
    whitePlayerInfo,
    blackPlayerInfo,
    promotionMove,
    lastMove,
    isGameLoading,
    isWaitingForOpponent,
    gameData,
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
