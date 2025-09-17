import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import ChessPiece from "./ChessPiece";

const promotionPieces = [
  { name: "Queen", piece: "q" },
  { name: "Rook", piece: "r" },
  { name: "Bishop", piece: "b" },
  { name: "Knight", piece: "n" },
];

const PromotionModal = ({ onSelect, color }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-slate-800 p-8 rounded-lg border border-slate-700 shadow-xl"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          Promover Peão
        </h2>
        <div className="flex justify-center items-center gap-4">
          {promotionPieces.map(({ piece }) => (
            <Button
              key={piece}
              onClick={() => onSelect(piece)}
              variant="ghost"
              className="p-2 h-24 w-24 bg-slate-700/50 hover:bg-cyan-500/20"
            >
              <ChessPiece piece={{ type: piece, color }} />
            </Button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PromotionModal;
