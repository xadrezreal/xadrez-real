import React from "react";
import { useDrop, useDrag } from "react-dnd";
import { motion } from "framer-motion";
import ChessPiece from "./ChessPiece";
import { isMobile } from "react-device-detect";

const themes = {
  classic: {
    light: "bg-[#D2B48C]",
    dark: "bg-[#8B4513]",
  },
  modern: {
    light: "bg-beige-200", // beige
    dark: "bg-green-700", // green
  },
  ocean: {
    light: "bg-[#B0E0E6]",
    dark: "bg-[#4682B4]",
  },
  stone: {
    light: "bg-slate-300",
    dark: "bg-slate-600",
  },
  wood3d: {
    light: "bg-[#D2B48C]",
    dark: "bg-[#8B4513]",
  },
};

const ChessSquare = ({
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
}) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: "chessPiece",
      drop: (item) => onMove(item.square, square),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [square, onMove]
  );

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "chessPiece",
      item: { piece, square },
      canDrag: () => isPlayerTurn && piece,
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [piece, square, isPlayerTurn]
  );

  const selectedTheme = themes[theme] || themes.modern;
  const is3D = theme.includes("3d");

  const getSquareColor = () => {
    if (isOver) return "bg-yellow-400/60";
    if (isKingInCheck) return "bg-red-500/70";
    if (isLastMove) return "bg-yellow-500/50";
    if (isLight) return selectedTheme.light;
    return selectedTheme.dark;
  };

  const handleClick = () => {
    onSquareClick(square);
  };

  return (
    <div
      ref={isMobile ? null : drop}
      onClick={handleClick}
      className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 relative flex justify-center items-center ${getSquareColor()} transition-colors duration-200 cursor-pointer`}
      style={{
        transform: is3D ? "translateZ(0px)" : "none",
      }}
    >
      <div
        ref={isMobile ? null : drag}
        className="w-full h-full flex items-center justify-center"
      >
        {piece && !(isDraggingPiece && piece.square === square) && (
          <ChessPiece piece={piece} />
        )}
      </div>
      {isSelected && (
        <motion.div
          className="absolute w-1/3 h-1/3 rounded-full bg-yellow-500/70 pointer-events-none"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        />
      )}
      {isPossibleMove && !isSelected && (
        <motion.div
          className="absolute w-full h-full flex items-center justify-center pointer-events-none"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div
            className={`rounded-full ${
              piece
                ? "w-full h-full border-4 border-yellow-400/50"
                : "w-1/3 h-1/3 bg-yellow-400/50"
            }`}
          ></div>
        </motion.div>
      )}
    </div>
  );
};

export default ChessSquare;
