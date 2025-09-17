import React, { useContext } from 'react';
import { motion } from 'framer-motion';

const pieceImageMap = {
  w: {
    p: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png',
    b: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png',
    n: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',
    r: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png',
    q: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png',
    k: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png',
  },
  b: {
    p: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
    b: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png',
    n: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png',
    r: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
    q: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',
    k: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png',
  },
};

const ChessPiece = ({ piece, isCaptured = false }) => {
  if (!piece) return null;
  const { type, color } = piece;

  const imageSrc = pieceImageMap[color]?.[type];

  const pieceSizeClass = isCaptured ? 'w-6 h-6' : 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14';

  return (
    <motion.div
      className={`cursor-grab ${pieceSizeClass} flex items-center justify-center`}
      style={{ touchAction: 'none' }}
      layoutId={`piece-${piece.color}-${piece.type}-${piece.square}`}
      whileHover={{ scale: isCaptured ? 1 : 1.1 }}
    >
      <img 
        src={imageSrc}
        alt={`${color} ${type}`}
        className="w-full h-full object-contain drop-shadow-lg"
      />
    </motion.div>
  );
};

export default ChessPiece;