import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Trophy, RotateCcw, Frown, Swords, Home, Search } from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

const GameOverModal = ({
  gameStatus,
  winner,
  onNewGame,
  onRematch,
  onReturnHome,
  onReviewGame,
}) => {
  const { width, height } = useWindowSize();

  const getTitle = () => {
    switch (gameStatus) {
      case "checkmate":
        return `${winner?.name || "Vencedor"} Venceu!`;
      case "stalemate":
        return "Empate por Afogamento!";
      case "draw":
        return "Empate Acordado!";
      case "resignation":
        return `${winner?.name || "Vencedor"} Venceu por Desistência!`;
      case "timeout":
        return `${winner?.name || "Vencedor"} Venceu por Tempo!`;
      default:
        return "Fim de Jogo!";
    }
  };

  const getMessage = () => {
    if (
      (gameStatus === "checkmate" ||
        gameStatus === "resignation" ||
        gameStatus === "timeout") &&
      winner
    ) {
      return `Parabéns, ${winner.name}! (+10 Pontos)`;
    }
    return "Boa partida!";
  };

  const getLoserMessage = () =>
    (gameStatus === "checkmate" ||
      gameStatus === "resignation" ||
      gameStatus === "timeout") &&
    winner
      ? "Mais sorte na próxima! (-10 Pontos)"
      : "";
  const isWinner =
    winner &&
    (gameStatus === "checkmate" ||
      gameStatus === "resignation" ||
      gameStatus === "timeout");

  return (
    <>
      {isWinner && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={300}
        />
      )}
      <motion.div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-3xl border-2 border-amber-500/50 shadow-2xl max-w-lg w-full text-center"
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.5, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <motion.div
            className="flex justify-center mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          >
            {isWinner ? (
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <Frown className="w-10 h-10 text-white" />
              </div>
            )}
          </motion.div>
          <motion.h2
            className="text-3xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {getTitle()}
          </motion.h2>
          <motion.p
            className="text-lg text-white mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {getMessage()}
          </motion.p>
          {getLoserMessage() && (
            <motion.p
              className="text-md text-gray-400 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {getLoserMessage()}
            </motion.p>
          )}
          <motion.div
            className="grid grid-cols-2 gap-4 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={onRematch}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3"
              size="lg"
            >
              <Swords className="w-5 h-5 mr-2" />
              Revanche
            </Button>
            <Button
              onClick={onNewGame}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white px-6 py-3"
              size="lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Novo Jogo
            </Button>
            <Button
              onClick={onReviewGame}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3"
              size="lg"
            >
              <Search className="w-5 h-5 mr-2" />
              Rever Jogo
            </Button>
            <Button
              onClick={onReturnHome}
              variant="outline"
              className="text-white px-6 py-3"
              size="lg"
            >
              <Home className="w-5 h-5 mr-2" />
              Tela Inicial
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default GameOverModal;
