import React from "react";
import { motion } from "framer-motion";
import ChessPiece from "./ChessPiece";

const pieceNames = {
  p: "Peão",
  n: "Cavalo",
  b: "Bispo",
  r: "Torre",
  q: "Rainha",
  k: "Rei",
};

const CapturedPieces = ({ pieces }) => {
  if (pieces.length === 0) return <div className="h-10"></div>;

  return (
    <motion.div
      className="bg-black/20 backdrop-blur-sm rounded-lg p-2 border border-gray-700/30 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex flex-wrap gap-x-2 gap-y-1 justify-start items-center min-h-[2rem]">
        {pieces.map((piece, index) => (
          <motion.div
            key={index}
            className="flex items-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <ChessPiece piece={piece} isCaptured={true} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default CapturedPieces;
