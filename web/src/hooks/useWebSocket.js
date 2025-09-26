import { useEffect, useRef, useState, useContext } from "react";
import { UserContext } from "../contexts/UserContext";

export const useWebSocket = (url, options = {}) => {
  const { user } = useContext(UserContext);
  const [socket, setSocket] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Closed");
  const shouldConnect = useRef(true);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts || 3;
  const reconnectInterval = options.reconnectInterval || 3000;
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const connected = useRef(false);
  const connectionAttempted = useRef(false);

  const cleanup = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const startHeartbeat = (ws) => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping && ws.ping();
      }
    }, 25000);
  };

  const connect = () => {
    console.log("[WS_DEBUG] === CONNECT CALLED ===");
    console.log("[WS_DEBUG] shouldConnect:", shouldConnect.current);
    console.log("[WS_DEBUG] user?.id:", user?.id);
    console.log("[WS_DEBUG] url:", url);

    if (!shouldConnect.current || !user?.id || !url) {
      console.log("[WS_DEBUG] ABORTING: Missing requirements");
      return;
    }

    if (
      connectionAttempted.current &&
      (socket?.readyState === WebSocket.CONNECTING ||
        socket?.readyState === WebSocket.OPEN)
    ) {
      console.log("[WS_DEBUG] ABORTING: Connection already in progress");
      return;
    }

    cleanup();
    connectionAttempted.current = true;

    try {
      const wsUrl = url.includes("?")
        ? `${url}&userId=${user.id}`
        : `${url}?userId=${user.id}`;

      console.log("[WS_DEBUG] CREATING WEBSOCKET:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WS_DEBUG] ✅ WebSocket OPENED");
        setConnectionStatus("Open");
        reconnectAttempts.current = 0;
        connected.current = true;
        setSocket(ws);
        startHeartbeat(ws);

        if (options.onOpen) {
          options.onOpen();
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("[WS_DEBUG] 📨 MESSAGE RECEIVED:", message);

          if (message.type === "connection_confirmed") {
            console.log("[WS_DEBUG] Connection confirmed");
            return;
          }

          if (message.type === "error") {
            console.error("[WS_DEBUG] Server error:", message.data);
            return;
          }

          setLastMessage(message);

          if (options.onMessage) {
            options.onMessage(message);
          }
        } catch (error) {
          console.error("[WS_DEBUG] Message parse error:", error);
        }
      };

      ws.onclose = (event) => {
        console.log(
          "[WS_DEBUG] WebSocket CLOSED. Code:",
          event.code,
          "Reason:",
          event.reason
        );
        setConnectionStatus("Closed");
        setSocket(null);
        connected.current = false;
        connectionAttempted.current = false;
        cleanup();

        if (options.onClose && connected.current) {
          options.onClose(event);
        }

        if (
          shouldConnect.current &&
          event.code !== 1000 &&
          event.code !== 1001 &&
          reconnectAttempts.current < maxReconnectAttempts
        ) {
          reconnectAttempts.current++;
          const backoffTime =
            reconnectInterval * Math.pow(1.5, reconnectAttempts.current - 1);

          console.log(
            "[WS_DEBUG] Scheduling reconnect",
            reconnectAttempts.current
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldConnect.current) {
              connect();
            }
          }, backoffTime);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.log("[WS_DEBUG] Max reconnection attempts reached");
          setConnectionStatus("Failed");
        }
      };

      ws.onerror = (error) => {
        console.error("[WS_DEBUG] WebSocket ERROR:", error);
        setConnectionStatus("Error");
        connectionAttempted.current = false;

        if (options.onError) {
          options.onError(error);
        }
      };
    } catch (error) {
      console.error("[WS_DEBUG] Exception creating WebSocket:", error);
      setConnectionStatus("Error");
      connectionAttempted.current = false;
    }
  };

  useEffect(() => {
    console.log("[WS_DEBUG] === EFFECT TRIGGERED ===");
    console.log("[WS_DEBUG] url:", url);
    console.log("[WS_DEBUG] user?.id:", user?.id);

    if (!url) {
      console.log("[WS_DEBUG] No URL provided");
      return;
    }

    if (!user?.id) {
      console.log("[WS_DEBUG] User not loaded yet");
      setConnectionStatus("Waiting");
      return;
    }

    console.log("[WS_DEBUG] Starting connection setup");
    shouldConnect.current = true;
    reconnectAttempts.current = 0;
    connected.current = false;
    connectionAttempted.current = false;

    const connectTimer = setTimeout(() => {
      connect();
    }, 100);

    return () => {
      console.log("[WS_DEBUG] CLEANUP - Component unmounting");
      clearTimeout(connectTimer);
      shouldConnect.current = false;
      connected.current = false;
      connectionAttempted.current = false;
      cleanup();

      if (socket) {
        socket.close(1000, "Component unmounting");
      }
    };
  }, [url, user?.id]);

  const sendMessage = (message) => {
    console.log("[WS_DEBUG] === SEND MESSAGE CALLED ===");
    console.log("[WS_DEBUG] socket exists:", !!socket);
    console.log("[WS_DEBUG] socket.readyState:", socket?.readyState);
    console.log("[WS_DEBUG] WebSocket.OPEN:", WebSocket.OPEN);
    console.log("[WS_DEBUG] user?.id:", user?.id);
    console.log("[WS_DEBUG] message:", message);

    if (socket && socket.readyState === WebSocket.OPEN && user?.id) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: Date.now(),
          userId: user.id,
        };

        console.log("[WS_DEBUG] 📤 SENDING MESSAGE:", messageWithTimestamp);
        socket.send(JSON.stringify(messageWithTimestamp));
        console.log("[WS_DEBUG] ✅ MESSAGE SENT SUCCESSFULLY");
        return true;
      } catch (error) {
        console.error("[WS_DEBUG] ❌ SEND ERROR:", error);
        return false;
      }
    } else {
      console.warn("[WS_DEBUG] ⚠️ CANNOT SEND - Connection not ready");
      console.log("[WS_DEBUG] Status:", connectionStatus);

      if (shouldConnect.current && reconnectAttempts.current === 0) {
        console.log("[WS_DEBUG] Attempting immediate reconnect");
        connect();
      }

      return false;
    }
  };

  const disconnect = () => {
    console.log("[WS_DEBUG] Manual disconnect requested");
    shouldConnect.current = false;
    connected.current = false;
    connectionAttempted.current = false;
    cleanup();

    if (socket) {
      socket.close(1000, "Manual disconnect");
    }
  };

  return {
    socket,
    lastMessage,
    connectionStatus,
    sendMessage,
    disconnect,
    isConnected: connectionStatus === "Open",
    reconnectAttempts: reconnectAttempts.current,
  };
};
