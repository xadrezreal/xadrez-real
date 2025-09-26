import { FastifyInstance } from "fastify";
import { WebSocketManager } from "./webSocketManager";

interface WSQuery {
  userId: string;
}

interface WSParams {
  id: string;
}

const wsManager = new WebSocketManager();

export const websocketRoutes = async (fastify: FastifyInstance) => {
  fastify.get<{ Params: WSParams; Querystring: WSQuery }>(
    "/ws/tournament/:id",
    { websocket: true },
    (connection, req) => {
      const tournamentId = req.params.id;
      const userId = req.query.userId;

      const socket = connection.socket || connection;
      (socket as any)._playerId = userId;
      (socket as any)._roomId = `tournament:${tournamentId}`;

      fastify.log.info(
        `[TOURNAMENT] Cliente ${userId} conectando ao torneio ${tournamentId}`
      );

      try {
        wsManager.addToTournamentRoom(tournamentId, socket, userId);

        socket.send(
          JSON.stringify({
            type: "connection_confirmed",
            data: { tournamentId, userId, timestamp: Date.now() },
          })
        );

        socket.on("message", async (message: Buffer) => {
          try {
            const data = JSON.parse(message.toString());
            wsManager.handleTournamentMessage(tournamentId, data, socket);
          } catch {
            socket.send(
              JSON.stringify({
                type: "error",
                data: { message: "Formato de mensagem inválido" },
              })
            );
          }
        });

        socket.on("close", () => {
          wsManager.removeFromTournamentRoom(tournamentId, socket);
        });

        socket.on("error", () => {
          wsManager.removeFromTournamentRoom(tournamentId, socket);
        });
      } catch {
        socket.close(1011, "Erro do servidor durante inicialização");
      }
    }
  );

  fastify.get<{ Params: WSParams; Querystring: WSQuery }>(
    "/ws/game/:id",
    { websocket: true },
    (connection, req) => {
      const gameId = req.params.id;
      const userId = req.query.userId;

      const socket = connection.socket || connection;
      (socket as any)._playerId = userId;
      (socket as any)._gameId = gameId;

      fastify.log.info(`[GAME] Cliente ${userId} conectando ao jogo ${gameId}`);

      try {
        wsManager.addToGameRoom(gameId, socket, userId);

        socket.send(
          JSON.stringify({
            type: "connection_confirmed",
            data: { gameId, userId, timestamp: Date.now() },
          })
        );

        socket.on("message", async (message: Buffer) => {
          try {
            const data = JSON.parse(message.toString());
            wsManager.handleGameMessage(gameId, data, socket);
          } catch {
            socket.send(
              JSON.stringify({
                type: "error",
                data: { message: "Formato de mensagem inválido" },
              })
            );
          }
        });

        socket.on("close", () => {
          wsManager.removeFromGameRoom(gameId, socket);
        });

        socket.on("error", () => {
          wsManager.removeFromGameRoom(gameId, socket);
        });
      } catch {
        socket.close(1011, "Erro do servidor durante inicialização");
      }
    }
  );

  fastify.get("/ws/health", async () => {
    return {
      status: "healthy",
      timestamp: Date.now(),
      activeConnections: {
        tournaments: wsManager.getTournamentRoomCount(),
        games: wsManager.getGameRoomCount(),
      },
    };
  });

  fastify.decorate("wsManager", wsManager);
};
