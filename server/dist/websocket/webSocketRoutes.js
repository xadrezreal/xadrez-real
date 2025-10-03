"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketRoutes = void 0;
const webSocketManager_1 = require("./webSocketManager");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
async function websocketRoutesPlugin(fastify) {
    const wsManager = new webSocketManager_1.WebSocketManager();
    fastify.decorate("wsManager", wsManager);
    console.log("[WS] wsManager decorated, starting heartbeat");
    wsManager.startHeartbeat();
    fastify.get("/ws/tournament/:id", { websocket: true }, (connection, req) => {
        const tournamentId = req.params.id;
        const userId = req.query.userId;
        const socket = connection.socket || connection;
        socket._playerId = userId;
        socket._roomId = `tournament:${tournamentId}`;
        fastify.log.info(`[TOURNAMENT] Cliente ${userId} conectando ao torneio ${tournamentId}`);
        try {
            wsManager.addToTournamentRoom(tournamentId, socket, userId);
            socket.send(JSON.stringify({
                type: "connection_confirmed",
                data: { tournamentId, userId, timestamp: Date.now() },
            }));
            socket.on("message", async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    wsManager.handleTournamentMessage(tournamentId, data, socket);
                }
                catch {
                    socket.send(JSON.stringify({
                        type: "error",
                        data: { message: "Formato de mensagem inválido" },
                    }));
                }
            });
            socket.on("close", () => {
                wsManager.removeFromTournamentRoom(tournamentId, socket);
            });
            socket.on("error", () => {
                wsManager.removeFromTournamentRoom(tournamentId, socket);
            });
        }
        catch {
            socket.close(1011, "Erro do servidor durante inicialização");
        }
    });
    fastify.get("/ws/game/:id", { websocket: true }, (connection, req) => {
        const gameId = req.params.id;
        const userId = req.query.userId;
        const socket = connection.socket || connection;
        socket._playerId = userId;
        socket._gameId = gameId;
        fastify.log.info(`[GAME] Cliente ${userId} conectando ao jogo ${gameId}`);
        try {
            wsManager.addToGameRoom(gameId, socket, userId);
            socket.send(JSON.stringify({
                type: "connection_confirmed",
                data: { gameId, userId, timestamp: Date.now() },
            }));
            socket.on("message", async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    wsManager.handleGameMessage(gameId, data, socket);
                }
                catch {
                    socket.send(JSON.stringify({
                        type: "error",
                        data: { message: "Formato de mensagem inválido" },
                    }));
                }
            });
            socket.on("close", () => {
                wsManager.removeFromGameRoom(gameId, socket);
            });
            socket.on("error", () => {
                wsManager.removeFromGameRoom(gameId, socket);
            });
        }
        catch {
            socket.close(1011, "Erro do servidor durante inicialização");
        }
    });
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
}
exports.websocketRoutes = (0, fastify_plugin_1.default)(websocketRoutesPlugin);
//# sourceMappingURL=webSocketRoutes.js.map