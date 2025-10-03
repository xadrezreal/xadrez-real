import React, { useMemo, useCallback } from "react";
import { useDrag, useDrop } from "react-dnd";
import { motion } from "framer-motion";
import ChessPiece from "./ChessPiece";

const ChessSquare = React.memo(
  ({
    piece,
    square,
    isLight,
    isKingInCheck,
    isSelected,
    isPossibleMove,
    isLastMove,
    onMove,
    onSquareClick,
    theme,
    isPlayerTurn,
    isDraggingPiece,
    isConnected = true,
    gameType = "online",
    playerColor = "white",
    gameData,
    userId,
  }) => {
    const myColor = useMemo(() => {
      if (!gameData || !userId) {
        return playerColor[0];
      }

      const isTournamentGame =
        gameData.tournament_id ||
        gameData.game_id_text?.includes("tournament-");

      if (isTournamentGame) {
        if (gameData.white_player_id === userId) {
          return "w";
        } else if (gameData.black_player_id === userId) {
          return "b";
        }
        return playerColor[0];
      }

      if (gameData.white_player_id === userId) return "w";
      if (gameData.black_player_id === userId) return "b";

      return playerColor[0];
    }, [gameData, userId, playerColor]);

    const canDrag = useMemo(() => {
      if (!piece || !isPlayerTurn) return false;
      if (gameType !== "bot" && !isConnected) return false;

      const canDragThisPiece = piece.color === myColor;

      return canDragThisPiece;
    }, [piece, isPlayerTurn, gameType, isConnected, myColor]);

    const dragItem = useMemo(() => {
      return piece ? { piece, square } : null;
    }, [piece, square]);

    const [{ isDragging }, drag] = useDrag({
      type: "piece",
      item: dragItem,
      canDrag: () => canDrag,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const handleDrop = useCallback(
      (item) => {
        if (!isConnected && gameType !== "bot") {
          return { moved: false };
        }
        const result = onMove(item.square, square);
        return { moved: result };
      },
      [onMove, square, isConnected, gameType]
    );

    const [{ isOver }, drop] = useDrop({
      accept: "piece",
      drop: handleDrop,
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    const handleClick = useCallback(() => {
      if (!isConnected && gameType !== "bot") return;
      onSquareClick(square);
    }, [onSquareClick, square, isConnected, gameType]);

    const squareColor = useMemo(() => {
      if (isKingInCheck) return "bg-red-500/60";
      if (isSelected) return "bg-blue-500/60";
      if (isLastMove) return "bg-yellow-500/40";
      if (isOver) return "bg-green-500/40";

      switch (theme) {
        case "classic":
          return isLight ? "bg-amber-100" : "bg-amber-800";
        case "ocean":
          return isLight ? "bg-sky-200" : "bg-blue-800";
        case "forest":
          return isLight ? "bg-green-200" : "bg-green-800";
        case "sunset":
          return isLight ? "bg-orange-200" : "bg-red-800";
        case "midnight":
          return isLight ? "bg-slate-600" : "bg-slate-900";
        default:
          return isLight ? "bg-amber-100" : "bg-amber-800";
      }
    }, [isKingInCheck, isSelected, isLastMove, isOver, theme, isLight]);

    const opacity = isDragging ? 0.5 : 1;
    const isDisabled = !isConnected && gameType !== "bot";

    return (
      <div
        ref={(node) => drag(drop(node))}
        className={`
          relative w-full aspect-square
          flex items-center justify-center cursor-pointer
          transition-all duration-200
          ${squareColor}
          ${isSelected ? "ring-2 ring-blue-400" : ""}
          ${isPossibleMove ? "ring-1 ring-green-400" : ""}
          ${isDisabled ? "cursor-not-allowed" : ""}
        `}
        style={{ opacity }}
        onClick={handleClick}
      >
        {isPossibleMove && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="w-1/3 aspect-square bg-green-400/60 rounded-full" />
          </motion.div>
        )}
        {piece && !isDraggingPiece && <ChessPiece piece={piece} />}
        {isDisabled && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
            <span className="text-red-400 text-xs">✗</span>
          </div>
        )}
      </div>
    );
  }
);

ChessSquare.displayName = "ChessSquare";

export default ChessSquare;
