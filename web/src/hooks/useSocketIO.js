import { useEffect, useRef, useState, useContext } from "react";
import { io } from "socket.io-client";
import { UserContext } from "../contexts/UserContext";

export const useSocketIO = (namespace, options = {}) => {
  const { user } = useContext(UserContext);
  const [socket, setSocket] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Closed");
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      // console.log("[SOCKET.IO] User not loaded yet");
      setConnectionStatus("Waiting");
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

    // console.log("[SOCKET.IO] Connecting to:", API_URL);

    const newSocket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        userId: user.id,
      },
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      // console.log("[SOCKET.IO] ✅ Connected:", newSocket.id);
      setConnectionStatus("Open");
      setSocket(newSocket);

      if (options.onConnect) {
        options.onConnect();
      }
    });

    newSocket.on("message", (message) => {
      // console.log("[SOCKET.IO] 📨 Message received:", message);
      setLastMessage(message);

      if (options.onMessage) {
        options.onMessage(message);
      }
    });

    newSocket.on("game_message", (message) => {
      // console.log("[SOCKET.IO] 🎮 Game message:", message);
      setLastMessage(message);

      if (options.onMessage) {
        options.onMessage(message);
      }
    });

    newSocket.on("connection_confirmed", (data) => {
      // console.log("[SOCKET.IO] Connection confirmed:", data);
    });

    newSocket.on("disconnect", (reason) => {
      // console.log("[SOCKET.IO] Disconnected:", reason);
      setConnectionStatus("Closed");
      setSocket(null);

      if (options.onDisconnect) {
        options.onDisconnect(reason);
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error("[SOCKET.IO] Connection error:", error);
      setConnectionStatus("Error");

      if (options.onError) {
        options.onError(error);
      }
    });

    return () => {
      // console.log("[SOCKET.IO] Cleanup - disconnecting");
      newSocket.disconnect();
    };
  }, [user?.id]);

  const joinTournament = (tournamentId) => {
    if (socketRef.current?.connected) {
      // console.log("[SOCKET.IO] Joining tournament:", tournamentId);
      socketRef.current.emit("join_tournament", {
        tournamentId,
        userId: user?.id,
      });
    }
  };

  const leaveTournament = (tournamentId) => {
    if (socketRef.current?.connected) {
      // console.log("[SOCKET.IO] Leaving tournament:", tournamentId);
      socketRef.current.emit("leave_tournament", { tournamentId });
    }
  };

  const joinGame = (gameId) => {
    if (socketRef.current?.connected) {
      // console.log("[SOCKET.IO] Joining game:", gameId);
      socketRef.current.emit("join_game", { gameId, userId: user?.id });
    }
  };

  const leaveGame = (gameId) => {
    if (socketRef.current?.connected) {
      // console.log("[SOCKET.IO] Leaving game:", gameId);
      socketRef.current.emit("leave_game", { gameId });
    }
  };

  const sendGameMessage = (gameId, type, data) => {
    if (socketRef.current?.connected) {
      // console.log("[SOCKET.IO] 📤 Sending game message:", type);
      socketRef.current.emit("game_message", {
        gameId,
        type,
        data: {
          ...data,
          timestamp: Date.now(),
        },
      });
      return true;
    } else {
      console.warn("[SOCKET.IO] Cannot send - not connected");
      return false;
    }
  };

  const sendMessage = (message) => {
    if (socketRef.current?.connected) {
      // console.log("[SOCKET.IO] 📤 Sending message:", message);
      socketRef.current.emit("message", message);
      return true;
    }
    return false;
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  return {
    socket,
    lastMessage,
    connectionStatus,
    isConnected: connectionStatus === "Open",
    joinTournament,
    leaveTournament,
    joinGame,
    leaveGame,
    sendGameMessage,
    sendMessage,
    disconnect,
  };
};
