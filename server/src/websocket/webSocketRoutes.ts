import { FastifyInstance } from "fastify";
import { WebSocketManager } from "./webSocketManager";
import fastifyPlugin from "fastify-plugin";

async function websocketRoutesPlugin(fastify: FastifyInstance) {
  const wsManager = new WebSocketManager(fastify.server);

  fastify.decorate("wsManager", wsManager);

  console.log("[WS] Socket.IO WebSocketManager initialized");

  fastify.get("/ws/health", async () => {
    return {
      status: "healthy",
      timestamp: Date.now(),
      activeConnections: {
        tournaments: wsManager.getTournamentRoomCount(),
        games: wsManager.getGameRoomCount(),
        total: wsManager.getActiveConnections(),
      },
    };
  });

  fastify.addHook("onRequest", async (request, reply) => {
    if (request.url.startsWith("/socket.io/")) {
      return;
    }
  });
}

export const websocketRoutes = fastifyPlugin(websocketRoutesPlugin);
