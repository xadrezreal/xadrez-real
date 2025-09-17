import React, { useContext } from "react";
import { motion } from "framer-motion";
import ChessSquare from "./ChessSquare";
import { BoardThemeContext } from "../contexts/BoardThemeContext";
import { useDragLayer } from "react-dnd";

function CustomDragLayer() {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 100,
        left: currentOffset.x,
        top: currentOffset.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* You can render a custom preview of your piece here */}
    </div>
  );
}

const ChessBoard = ({
  board,
  onMove,
  orientation,
  isPlayerTurn,
  onSquareClick,
  selectedSquare,
  game,
  lastMove,
}) => {
  const { boardTheme } = useContext(BoardThemeContext);
  const { isDragging, item } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
  }));

  const getSquareFromIndex = (row, col) => {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const rank = orientation === "white" ? 8 - row : row + 1;
    const file = orientation === "white" ? files[col] : files[7 - col];
    return `${file}${rank}`;
  };

  const getKingSquare = () => {
    if (!game.inCheck()) return null;
    const kingPiece = { type: "k", color: game.turn() };
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const squareName = getSquareFromIndex(i, j);
        const square = game.get(squareName);
        if (
          square &&
          square.type === kingPiece.type &&
          square.color === kingPiece.color
        ) {
          return squareName;
        }
      }
    }
    return null;
  };
  const kingSquare = getKingSquare();
  const is3D = ["wood3d", "marble3d", "glass3d"].includes(boardTheme);

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      <div
        className="relative shadow-2xl rounded-lg"
        style={is3D ? { perspective: "1000px" } : {}}
      >
        <motion.div
          className="grid grid-cols-8 rounded-lg overflow-hidden border-4 border-slate-600"
          style={
            is3D
              ? {
                  transform: "rotateX(55deg) rotateZ(0deg)",
                  transformStyle: "preserve-3d",
                }
              : {}
          }
        >
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const squareName = getSquareFromIndex(rowIndex, colIndex);
              const isKingInCheck = game.inCheck() && squareName === kingSquare;
              const isSelected = squareName === selectedSquare;
              const possibleMoves = selectedSquare
                ? game
                    .moves({ square: selectedSquare, verbose: true })
                    .map((m) => m.to)
                : [];
              const isPossibleMove = possibleMoves.includes(squareName);
              const isLastMove = lastMove && squareName === lastMove.to;
              const isDraggingPiece = isDragging && item.square === squareName;

              return (
                <ChessSquare
                  key={squareName}
                  piece={piece ? { ...piece, square: squareName } : null}
                  square={squareName}
                  isLight={(rowIndex + colIndex) % 2 === 0}
                  isKingInCheck={isKingInCheck}
                  isSelected={isSelected}
                  isPossibleMove={isPossibleMove}
                  isLastMove={isLastMove}
                  onMove={onMove}
                  onSquareClick={onSquareClick}
                  theme={boardTheme}
                  isPlayerTurn={isPlayerTurn}
                  isDraggingPiece={isDraggingPiece}
                />
              );
            })
          )}
        </motion.div>

        {!is3D && (
          <>
            <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-around text-gray-400 font-bold text-sm pointer-events-none">
              {(orientation === "white"
                ? [8, 7, 6, 5, 4, 3, 2, 1]
                : [1, 2, 3, 4, 5, 6, 7, 8]
              ).map((num) => (
                <div
                  key={num}
                  className="h-12 sm:h-16 md:h-20 flex items-center"
                >
                  {num}
                </div>
              ))}
            </div>

            <div className="absolute -bottom-6 left-0 right-0 flex justify-around text-gray-400 font-bold text-sm pointer-events-none">
              {(orientation === "white"
                ? ["a", "b", "c", "d", "e", "f", "g", "h"]
                : ["h", "g", "f", "e", "d", "c", "b", "a"]
              ).map((letter) => (
                <div
                  key={letter}
                  className="w-12 sm:w-16 md:w-20 flex justify-center items-center"
                >
                  {letter}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <CustomDragLayer />
    </motion.div>
  );
};

export default ChessBoard;
