import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ChessBoard from "./ChessBoard";
import PlayerInfo from "./PlayerInfo";
import CapturedPieces from "./CapturedPieces";

import { UserContext } from "../contexts/UserContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  ArrowLeft,
  Flag,
  Clock,
  Trophy,
  Crown,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useChessGame } from "../hooks/useChessGame";
import { useToast } from "./ui/use-toast";
import { ConfirmDialog } from "./ui/confirm-dialog";

const TournamentMatch = () => {
  const { tournamentId, matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const matchData = location.state;

  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const gameId = `tournament-${tournamentId}-${matchId}`;

  const {
    game,
    board,
    gameStatus,
    currentPlayer,
    selectedSquare,
    capturedPieces,
    lastMove,
    winner,
    whiteTime,
    blackTime,
    playerColor,
    isPlayerTurn,
    whitePlayerInfo,
    blackPlayerInfo,
    isConnected,
    connectionStatus,
    gameData,
    handleMove,
    handleSquareClick,
    handleResign,
    isGameLoading,
  } = useChessGame({
    gameId,
    gameType: "tournament",
  });

  useEffect(() => {
    if (gameStatus && gameStatus !== "playing") {
      const isWinner = winner?.id === user.id;
      const getWinnerMessage = () => {
        if (!isWinner) {
          return {
            title: "😞 Derrota",
            description: "Você foi eliminado do torneio.",
          };
        }
        return {
          title: "🎉 VITÓRIA!",
          description: "Parabéns pela vitória!",
        };
      };

      const message = winner
        ? getWinnerMessage()
        : {
            title: "⚖️ Empate",
            description: "A partida terminou em empate",
          };

      toast({
        title: message.title,
        description: message.description,
        duration: 5000,
      });

      const timeout = setTimeout(() => {
        if (isWinner) {
          navigate(`/tournament/${tournamentId}/bracket`);
        } else {
          navigate("/");
        }
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [gameStatus, winner, user.id, navigate, tournamentId, toast]);

  const formatTime = (seconds) =>
    `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  const handleFinishMatch = () => {
    const isWinner = winner?.id === user.id;
    if (isWinner) {
      navigate(`/tournament/${tournamentId}/bracket`);
    } else {
      navigate("/");
    }
  };

  const handleConfirmResign = () => {
    handleResign();
    setShowResignDialog(false);
  };

  const handleConfirmLeave = () => {
    if (gameStatus === "playing") {
      handleResign();
    }
    navigate(`/tournament/${tournamentId}/bracket`);
  };

  const handleBackClick = () => {
    if (gameStatus === "playing") {
      setShowLeaveDialog(true);
    } else {
      navigate(`/tournament/${tournamentId}/bracket`);
    }
  };

  if (isGameLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="text-cyan-400 mb-4">Carregando partida...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800/50 border-red-500 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-400">Erro na Partida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white mb-4">Dados da partida não encontrados</p>
            <Button
              onClick={() => navigate(`/tournament/${tournamentId}/bracket`)}
              className="w-full"
            >
              Voltar ao Torneio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 flex flex-col p-2 sm:p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={handleBackClick}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Torneio
          </Button>

          <div className="text-center">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Partida do Torneio
            </h1>
            <p className="text-sm text-slate-400">
              Você joga com as {playerColor === "white" ? "brancas" : "pretas"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                isConnected
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isConnected ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {isConnected ? "Online" : "Offline"}
            </div>
            <Button
              onClick={() => setShowResignDialog(true)}
              disabled={gameStatus !== "playing"}
              variant="destructive"
              size="sm"
            >
              <Flag className="w-4 h-4 mr-1" />
              Desistir
            </Button>
          </div>
        </div>

        {gameStatus !== "playing" && (
          <motion.div
            className="bg-slate-800/80 border border-slate-600 rounded-lg p-4 mb-4 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              {winner?.id === user.id ? (
                <Crown className="w-6 h-6 text-yellow-400" />
              ) : (
                <Flag className="w-6 h-6 text-red-400" />
              )}
              <h2
                className={`text-xl font-bold ${
                  winner?.id === user.id
                    ? "text-green-400"
                    : winner
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}
              >
                {winner?.id === user.id
                  ? "Vitória!"
                  : winner
                  ? "Derrota!"
                  : "Empate!"}
              </h2>
            </div>
            <p className="text-slate-300 mb-2">
              {gameStatus === "checkmate"
                ? "Por xeque-mate"
                : gameStatus === "timeout"
                ? "Por tempo esgotado"
                : gameStatus === "resignation"
                ? "Por desistência"
                : "Partida empatada"}
            </p>
            <p className="text-sm text-cyan-400 mb-4">
              {winner?.id === user.id
                ? "Retornando ao torneio em 3 segundos..."
                : "Redirecionando em 3 segundos..."}
            </p>
            <Button
              onClick={handleFinishMatch}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              {winner?.id === user.id ? "Voltar ao Torneio" : "Sair do Torneio"}
            </Button>
          </motion.div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl mb-4">
            <PlayerInfo
              player={blackPlayerInfo}
              isCurrent={currentPlayer === "black"}
              time={formatTime(blackTime)}
            />
            <CapturedPieces pieces={capturedPieces.w} />
          </div>

          <motion.div
            className="mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <ChessBoard
              board={board}
              onMove={handleMove}
              orientation={playerColor}
              isPlayerTurn={isPlayerTurn}
              onSquareClick={handleSquareClick}
              selectedSquare={selectedSquare}
              game={game}
              lastMove={lastMove}
              isConnected={isConnected}
              connectionStatus={connectionStatus}
              gameType="tournament"
              gameData={gameData}
              userId={user?.id}
            />
          </motion.div>

          <div className="w-full max-w-2xl">
            <CapturedPieces pieces={capturedPieces.b} />
            <PlayerInfo
              player={whitePlayerInfo}
              isCurrent={currentPlayer === "white"}
              time={formatTime(whiteTime)}
            />
          </div>
        </div>

        <motion.div
          className="bg-slate-800/50 rounded-lg p-4 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-4">
              <span
                className={`flex items-center gap-1 ${
                  isPlayerTurn ? "text-green-400" : "text-slate-400"
                }`}
              >
                <Clock className="w-4 h-4" />
                {isPlayerTurn ? "Sua vez" : "Vez do oponente"}
              </span>
            </div>
            {gameStatus === "playing" && isConnected && (
              <div className="text-green-400 text-xs">Sincronizado</div>
            )}
          </div>
        </motion.div>
      </div>

      <ConfirmDialog
        open={showResignDialog}
        onOpenChange={setShowResignDialog}
        onConfirm={handleConfirmResign}
        title="Desistir da Partida?"
        description="Você tem certeza que deseja desistir? Esta ação resultará em uma derrota e você será eliminado do torneio."
        confirmText="Sim, desistir"
        cancelText="Continuar jogando"
        variant="destructive"
      />

      <ConfirmDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onConfirm={handleConfirmLeave}
        title="Sair da Partida?"
        description="Se você sair agora, estará automaticamente desistindo do jogo e será eliminado do torneio. Deseja realmente sair?"
        confirmText="Sim, sair e desistir"
        cancelText="Continuar jogando"
        variant="destructive"
      />
    </DndProvider>
  );
};

export default TournamentMatch;
