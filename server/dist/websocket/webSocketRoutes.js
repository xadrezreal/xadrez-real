"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketRoutes = void 0;
const webSocketManager_1 = require("./webSocketManager");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
async function websocketRoutesPlugin(fastify) {
    const wsManager = new webSocketManager_1.WebSocketManager(fastify.server);
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
exports.websocketRoutes = (0, fastify_plugin_1.default)(websocketRoutesPlugin);
//# sourceMappingURL=webSocketRoutes.js.map