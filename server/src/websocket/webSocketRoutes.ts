import { FastifyInstance } from "fastify";
import { WebSocketManager } from "./webSocketManager";

const wsManager = new WebSocketManager();

export const websocketRoutes = async (fastify: FastifyInstance) => {
  fastify.get("/ws/tournament/:id", { websocket: true }, (connection, req) => {
    const tournamentId = req.params.id as string;
    const userId = req.query.userId as string;

    const socket = connection.socket || connection;
    socket._playerId = userId;
    socket._roomId = `tournament:${tournamentId}`;

    fastify.log.info(
      `[TOURNAMENT] Cliente ${userId} conectando ao torneio ${tournamentId}`
    );

    try {
      wsManager.addToTournamentRoom(tournamentId, socket, userId);
      fastify.log.info(
        `[TOURNAMENT] Cliente ${userId} adicionado com sucesso ao torneio ${tournamentId}`
      );

      try {
        socket.send(
          JSON.stringify({
            type: "connection_confirmed",
            data: { tournamentId, userId, timestamp: Date.now() },
          })
        );
        fastify.log.info(`[TOURNAMENT] Confirmação enviada para ${userId}`);
      } catch (sendError) {
        fastify.log.error(
          `[TOURNAMENT] Falha ao enviar confirmação para ${userId}:`,
          sendError
        );
      }

      socket.on("message", async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          fastify.log.debug(`[TOURNAMENT] Mensagem de ${userId}:`, data);

          wsManager.handleTournamentMessage(tournamentId, data, socket);
        } catch (error) {
          fastify.log.error(
            `[TOURNAMENT] Erro ao processar mensagem de ${userId}:`,
            error
          );

          try {
            socket.send(
              JSON.stringify({
                type: "error",
                data: { message: "Formato de mensagem inválido" },
              })
            );
          } catch (sendError) {
            fastify.log.error(
              `[TOURNAMENT] Falha ao enviar erro para ${userId}:`,
              sendError
            );
          }
        }
      });

      socket.on("close", (code, reason) => {
        fastify.log.info(
          `[TOURNAMENT] Cliente ${userId} desconectado do torneio ${tournamentId}. Code: ${code}, Reason: ${
            reason?.toString() || "nenhum"
          }`
        );

        try {
          wsManager.removeFromTournamentRoom(tournamentId, socket);
        } catch (error) {
          fastify.log.error(
            `[TOURNAMENT] Erro ao remover ${userId} do torneio ${tournamentId}:`,
            error
          );
        }
      });

      socket.on("error", (error) => {
        fastify.log.error(
          `[TOURNAMENT] Erro WebSocket para ${userId} no torneio ${tournamentId}:`,
          error
        );

        try {
          wsManager.removeFromTournamentRoom(tournamentId, socket);
        } catch (removeError) {
          fastify.log.error(
            `[TOURNAMENT] Erro durante limpeza para ${userId}:`,
            removeError
          );
        }
      });
    } catch (initError) {
      fastify.log.error(
        `[TOURNAMENT] Falha ao inicializar WebSocket para ${userId}:`,
        initError
      );
      socket.close(1011, "Erro do servidor durante inicialização");
    }
  });

  fastify.get("/ws/game/:id", { websocket: true }, (connection, req) => {
    const gameId = req.params.id as string;
    const userId = req.query.userId as string;

    console.log(`[WS_ROUTE] === NEW GAME CONNECTION ===`);
    console.log(`[WS_ROUTE] GameId: ${gameId}`);
    console.log(`[WS_ROUTE] UserId: ${userId}`);

    const socket = connection.socket || connection;
    socket._playerId = userId;
    socket._gameId = gameId;

    fastify.log.info(`[GAME] Cliente ${userId} conectando ao jogo ${gameId}`);

    try {
      wsManager.addToGameRoom(gameId, socket, userId);
      fastify.log.info(
        `[GAME] Cliente ${userId} adicionado com sucesso ao jogo ${gameId}`
      );

      try {
        socket.send(
          JSON.stringify({
            type: "connection_confirmed",
            data: { gameId, userId, timestamp: Date.now() },
          })
        );
        fastify.log.info(`[GAME] Confirmação enviada para ${userId}`);
      } catch (sendError) {
        fastify.log.error(
          `[GAME] Falha ao enviar confirmação para ${userId}:`,
          sendError
        );
      }

      socket.on("message", async (message: Buffer) => {
        console.log(`[WS_ROUTE] === MESSAGE RECEIVED ===`);
        console.log(`[WS_ROUTE] From: ${userId}`);
        console.log(`[WS_ROUTE] Raw message:`, message.toString());

        try {
          const data = JSON.parse(message.toString());
          console.log(`[WS_ROUTE] Parsed data:`, data);
          fastify.log.debug(`[GAME] Mensagem de ${userId}:`, data);

          wsManager.handleGameMessage(gameId, data, socket);
        } catch (error) {
          console.error(`[WS_ROUTE] Message processing error:`, error);
          fastify.log.error(
            `[GAME] Erro ao processar mensagem de ${userId}:`,
            error
          );

          try {
            socket.send(
              JSON.stringify({
                type: "error",
                data: { message: "Formato de mensagem inválido" },
              })
            );
          } catch (sendError) {
            fastify.log.error(
              `[GAME] Falha ao enviar erro para ${userId}:`,
              sendError
            );
          }
        }
      });

      socket.on("close", (code, reason) => {
        console.log(`[WS_ROUTE] Connection closed: ${userId}, Code: ${code}`);
        fastify.log.info(
          `[GAME] Cliente ${userId} desconectado do jogo ${gameId}. Code: ${code}, Reason: ${
            reason?.toString() || "nenhum"
          }`
        );

        try {
          wsManager.removeFromGameRoom(gameId, socket);
        } catch (error) {
          fastify.log.error(
            `[GAME] Erro ao remover ${userId} do jogo ${gameId}:`,
            error
          );
        }
      });

      socket.on("error", (error) => {
        console.error(`[WS_ROUTE] Socket error for ${userId}:`, error);
        fastify.log.error(
          `[GAME] Erro WebSocket para ${userId} no jogo ${gameId}:`,
          error
        );

        try {
          wsManager.removeFromGameRoom(gameId, socket);
        } catch (removeError) {
          fastify.log.error(
            `[GAME] Erro durante limpeza para ${userId}:`,
            removeError
          );
        }
      });
    } catch (initError) {
      console.error(`[WS_ROUTE] Initialization error:`, initError);
      fastify.log.error(
        `[GAME] Falha ao inicializar WebSocket para ${userId}:`,
        initError
      );
      socket.close(1011, "Erro do servidor durante inicialização");
    }
  });

  fastify.get("/ws/health", async (request, reply) => {
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
