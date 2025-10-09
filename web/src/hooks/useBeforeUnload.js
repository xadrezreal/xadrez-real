import { useEffect } from "react";

export const useBeforeUnload = (
  gameId,
  gameStatus,
  gameType,
  gameData,
  playerColor,
  whitePlayerInfo,
  blackPlayerInfo,
  user
) => {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (
        gameStatus === "playing" &&
        gameId &&
        gameType !== "bot" &&
        gameData
      ) {
        console.log(
          "[BEFOREUNLOAD] Page closing during active game - saving state"
        );

        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const apiEndpoint = `${API_URL}/api/game/${gameId}/end`;

        const winnerInfo =
          playerColor === "white" ? blackPlayerInfo : whitePlayerInfo;

        if (winnerInfo && winnerInfo.id) {
          const payloadData = {
            winnerId: winnerInfo.id,
            reason: "disconnection",
          };

          const blob = new Blob([JSON.stringify(payloadData)], {
            type: "application/json",
          });

          navigator.sendBeacon(apiEndpoint, blob);
          console.log("[BEFOREUNLOAD] Game end sent via beacon");
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    gameStatus,
    gameId,
    gameType,
    gameData,
    playerColor,
    whitePlayerInfo,
    blackPlayerInfo,
    user,
  ]);
};
