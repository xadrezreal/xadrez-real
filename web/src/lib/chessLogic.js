import { Chess } from 'chess.js';

const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };

const evaluateBoard = (game) => {
  if (game.isCheckmate()) return game.turn() === 'w' ? -Infinity : Infinity;
  if (game.isDraw()) return 0;
  
  let totalEvaluation = 0;
  game.board().forEach(row => {
    row.forEach(piece => {
      if (piece) {
        totalEvaluation += pieceValues[piece.type] * (piece.color === 'w' ? 1 : -1);
      }
    });
  });
  return totalEvaluation;
};

const minimax = (game, depth, alpha, beta, isMaximizingPlayer) => {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves();
  if (isMaximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) {
        break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) {
        break;
      }
    }
    return minEval;
  }
};

export const getBotMove = (fen, color, level) => {
  const game = new Chess(fen);
  const legalMoves = game.moves({ verbose: true });
  if (legalMoves.length === 0) return null;
  
  let depth = 2; // Default for 'Fácil'
  if (level === 'Médio') depth = 3;
  if (level === 'Profissional') depth = 4;
  if (level === 'Ultra Difícil') depth = 5;

  let bestMove = null;
  let bestValue = color === 'w' ? Infinity : -Infinity;

  for (const move of legalMoves) {
    game.move(move);
    const boardValue = minimax(game, depth -1, -Infinity, Infinity, color !== 'w');
    game.undo();

    if (color === 'w') {
      if (boardValue < bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    } else { 
      if (boardValue > bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    }
  }
  return bestMove || legalMoves[0];
};