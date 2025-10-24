import React, { useState, useContext, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import ChessBoard from "./ChessBoard";
import GameOverModal from "./GameOverModal";
import Chat from "./Chat";
import MoveHistory from "./MoveHistory";
import PlayerInfo from "./PlayerInfo";
import CapturedPieces from "./CapturedPieces";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useChessGame } from "../hooks/useChessGame";
import { UserContext } from "../contexts/UserContext";
import PromotionModal from "./PromotionModal";
import BoardAppearance from "./BoardAppearance";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { SimpleConfirmDialog } from "./ui/simple-confirm-dialog";
import {
  Home,
  Flag,
  HeartHandshake as Handshake,
  MessageSquare,
  History,
  Palette,
  X,
  Users,
  Loader2,
} from "lucide-react";
import { isMobile } from "react-device-detect";

const Toolbar = ({
  onTogglePanel,
  onResign,
  onDrawOffer,
  onReturnHome,
  gameStatus,
  isBotGame,
  isTournamentGame,
}) => (
  <motion.div
    className="w-full max-w-xl mx-auto mb-1 bg-slate-800/60 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-700 flex items-center justify-center gap-1"
    initial={{ y: -50, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    <Button
      onClick={onReturnHome}
      variant="ghost"
      size="sm"
      className="text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-300 h-7 w-7 p-0"
    >
      <Home className="w-3.5 h-3.5" />
    </Button>
    <Button
      onClick={() => onTogglePanel("history")}
      variant="ghost"
      size="sm"
      className="text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-300 h-7 w-7 p-0"
    >
      <History className="w-3.5 h-3.5" />
    </Button>
    {!isBotGame && (
      <Button
        onClick={() => onTogglePanel("chat")}
        variant="ghost"
        size="sm"
        className="text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-300 h-7 w-7 p-0"
      >
        <MessageSquare className="w-3.5 h-3.5" />
      </Button>
    )}
    <Button
      onClick={() => onTogglePanel("appearance")}
      variant="ghost"
      size="sm"
      className="text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-300 h-7 w-7 p-0"
    >
      <Palette className="w-3.5 h-3.5" />
    </Button>
    <Button
      onClick={onResign}
      disabled={gameStatus !== "playing"}
      variant="ghost"
      size="sm"
      className="text-red-400 hover:bg-red-500/20 hover:text-red-300 h-7 w-7 p-0"
    >
      <Flag className="w-3.5 h-3.5" />
    </Button>
    {!isBotGame && !isTournamentGame && (
      <Button
        onClick={onDrawOffer}
        disabled={gameStatus !== "playing"}
        variant="ghost"
        size="sm"
        className="text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 h-7 w-7 p-0"
      >
        <Handshake className="w-3.5 h-3.5" />
      </Button>
    )}
  </motion.div>
);

const SidePanel = ({ children, onClose, position = "left" }) => {
  const variants = {
    hidden: { x: position === "left" ? "-100%" : "100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
  };

  return (
    <motion.div
      className={`fixed top-0 h-full p-4 z-20 ${
        position === "left" ? "left-0" : "right-0"
      }`}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={variants}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="relative bg-slate-800/80 backdrop-blur-lg border border-slate-700 rounded-2xl w-72 h-full flex flex-col">
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-gray-400 hover:text-white z-10"
        >
          <X className="w-5 h-5" />
        </Button>
        {children}
      </div>
    </motion.div>
  );
};

const WaitingForOpponent = () => {
  const navigate = useNavigate();
  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-3xl border-2 border-cyan-500/50 shadow-2xl max-w-lg w-full text-center"
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
          <Users className="w-16 h-16 text-cyan-400 animate-pulse" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Aguardando Oponente
        </h2>
        <p className="text-gray-300 mb-6">
          A partida começará assim que seu oponente se conectar.
        </p>
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="text-white"
        >
          Voltar para o Início
        </Button>
      </motion.div>
    </motion.div>
  );
};

const ChessGame = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user } = useContext(UserContext);
  const { toast } = useToast();
  const [activePanel, setActivePanel] = useState(null);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const { gameType } = location.state || { gameType: "online" };

  console.log("ChessGame - States:", {
    showResignDialog,
    showLeaveDialog,
    gameStatus,
  });

  const {
    game,
    board,
    gameStatus,
    winner,
    whiteTime,
    blackTime,
    moveHistory,
    messages,
    capturedPieces,
    selectedSquare,
    playerColor,
    isPlayerTurn,
    currentPlayer,
    whitePlayerInfo,
    blackPlayerInfo,
    promotionMove,
    lastMove,
    isGameLoading,
    isWaitingForOpponent,
    gameData,
    connectionStatus,
    isConnected,
    handleMove,
    handleSquareClick,
    handleResign,
    handleDrawOffer,
    handleSendMessage,
    handleNewGame,
    handleRematch,
    handlePromotion,
  } = useChessGame({ gameId: params.gameId, gameType });

  const isTournamentGame =
    params.gameId?.includes("tournament-") || gameData?.tournament_id;

  useEffect(() => {
    if (
      gameStatus &&
      gameStatus !== "playing" &&
      isTournamentGame &&
      gameData?.tournament_id
    ) {
      const isWinner = winner?.id === user?.id;

      toast({
        title: isWinner ? "🎉 Vitória!" : winner ? "😞 Derrota" : "Empate",
        description: isWinner
          ? "Aguardando próxima rodada..."
          : "Você foi eliminado do torneio.",
        duration: 5000,
      });

      const timeout = setTimeout(() => {
        if (isWinner) {
          navigate(`/tournament/${gameData.tournament_id}/bracket`);
        } else {
          navigate("/");
        }
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [gameStatus, winner, isTournamentGame, gameData, navigate, user, toast]);

  const handleResignClick = () => {
    console.log("handleResignClick - gameStatus:", gameStatus);
    if (gameStatus === "playing") {
      console.log("Abrindo dialog resign");
      setShowResignDialog(true);
    }
  };

  const handleReturnHomeClick = () => {
    console.log("handleReturnHomeClick - gameStatus:", gameStatus);
    if (gameStatus === "playing") {
      console.log("Abrindo dialog leave");
      setShowLeaveDialog(true);
    } else {
      console.log("Navegando direto");
      handleReturnHome();
    }
  };

  const handleConfirmResign = () => {
    console.log("handleConfirmResign confirmado");
    setShowResignDialog(false);
    setTimeout(() => {
      console.log("Executando handleResign");
      handleResign();
    }, 100);
  };

  const handleConfirmLeave = () => {
    console.log("handleConfirmLeave confirmado");
    setShowLeaveDialog(false);
    if (gameStatus === "playing") {
      console.log("Chamando handleResign");
      handleResign();
    }
    setTimeout(() => {
      console.log("Navegando");
      handleReturnHome();
    }, 100);
  };

  const formatTime = (seconds) =>
    `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  const handleReviewGame = () => {
    toast({
      title: "🚧 Funcionalidade em desenvolvimento!",
      description: "O modo de revisão de jogo estará disponível em breve! 🚀",
    });
  };

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const handleReturnHome = () => {
    if (isTournamentGame && gameData?.tournament_id) {
      navigate(`/tournament/${gameData.tournament_id}/bracket`);
    } else {
      navigate("/");
    }
  };

  const opponentInfo =
    playerColor === "white" ? blackPlayerInfo : whitePlayerInfo;
  const opponentTime = playerColor === "white" ? blackTime : whiteTime;
  const opponentCaptured =
    playerColor === "white" ? capturedPieces.w : capturedPieces.b;

  const ownInfo = playerColor === "white" ? whitePlayerInfo : blackPlayerInfo;
  const ownTime = playerColor === "white" ? whiteTime : blackTime;
  const ownCaptured =
    playerColor === "white" ? capturedPieces.b : capturedPieces.w;

  if (isGameLoading || isWaitingForOpponent) {
    return <WaitingForOpponent />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 flex items-center justify-center overflow-auto">
        <AnimatePresence>
          {activePanel && (
            <SidePanel
              onClose={() => setActivePanel(null)}
              position={
                isMobile || activePanel === "history" ? "left" : "right"
              }
            >
              {activePanel === "chat" && (
                <Chat
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  gameId={gameData?.game_id_text}
                />
              )}
              {activePanel === "history" && <MoveHistory moves={moveHistory} />}
              {activePanel === "appearance" && <BoardAppearance />}
            </SidePanel>
          )}
        </AnimatePresence>

        <div className="w-full max-w-xl mx-auto py-2 px-1">
          <Toolbar
            onTogglePanel={togglePanel}
            onResign={handleResignClick}
            onDrawOffer={handleDrawOffer}
            onReturnHome={handleReturnHomeClick}
            gameStatus={gameStatus}
            isBotGame={gameType === "bot"}
            isTournamentGame={isTournamentGame}
          />

          <div className="space-y-1">
            <PlayerInfo
              player={opponentInfo}
              isCurrent={currentPlayer !== playerColor}
              time={formatTime(opponentTime)}
              isMyPlayer={false}
            />
            <CapturedPieces pieces={opponentCaptured} />

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
              gameType={gameType}
              gameData={gameData}
              userId={user?.id}
            />

            <CapturedPieces pieces={ownCaptured} />
            <PlayerInfo
              player={ownInfo}
              isCurrent={currentPlayer === playerColor}
              time={formatTime(ownTime)}
              isMyPlayer={true}
            />
          </div>
        </div>

        <AnimatePresence>
          {gameStatus !== "playing" && gameStatus !== "waiting" && (
            <GameOverModal
              gameStatus={gameStatus}
              winner={winner}
              onNewGame={handleNewGame}
              onRematch={gameType === "bot" ? null : handleRematch}
              onReturnHome={handleReturnHome}
              onReviewGame={handleReviewGame}
            />
          )}
          {promotionMove && (
            <PromotionModal
              onSelect={handlePromotion}
              color={currentPlayer === "white" ? "w" : "b"}
            />
          )}
        </AnimatePresence>
      </div>

      <SimpleConfirmDialog
        open={showResignDialog}
        onOpenChange={setShowResignDialog}
        onConfirm={handleConfirmResign}
        title="Desistir da Partida?"
        description="Você tem certeza que deseja desistir? Esta ação não poderá ser desfeita."
        confirmText="Sim, desistir"
        cancelText="Continuar jogando"
        variant="destructive"
      />

      <SimpleConfirmDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onConfirm={handleConfirmLeave}
        title="Sair da Partida?"
        description="Se você sair agora enquanto a partida está em andamento, será considerada uma desistência. Deseja realmente sair?"
        confirmText="Sim, sair e desistir"
        cancelText="Continuar jogando"
        variant="destructive"
      />
    </DndProvider>
  );
};

export default ChessGame;
