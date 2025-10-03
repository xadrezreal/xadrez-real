"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const client_1 = require("@prisma/client");
const jwt_1 = __importDefault(require("@fastify/jwt"));
const cors_1 = __importDefault(require("@fastify/cors"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_js_1 = require("./routes/auth.js");
const user_js_1 = require("./routes/user.js");
const tournament_js_1 = require("./routes/tournament.js");
const webSocketRoutes_1 = require("./websocket/webSocketRoutes");
const tournamentUpdater_1 = require("./routes/tournamentUpdater");
const game_js_1 = require("./routes/game.js");
const prisma = new client_1.PrismaClient();
const fastify = (0, fastify_1.default)({ logger: { level: "info" } });
fastify.addHook("preHandler", async (request, reply) => {
    fastify.log.info(`${request.method} ${request.url} - Body: ${JSON.stringify(request.body)}`);
    const authHeader = request.headers.authorization;
    if (authHeader) {
        fastify.log.info(`Authorization header present: ${authHeader.substring(0, 20)}...`);
    }
});
fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error({
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        body: request.body,
    }, "Erro capturado");
    reply.status(500).send({
        error: "Internal Server Error",
        message: error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
});
const start = async () => {
    try {
        await fastify.register(cors_1.default, {
            origin: [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:3001",
                "http://69.62.95.68",
                "https://69.62.95.68",
                "http://xadrezreal.com",
                "https://xadrezreal.com",
                "http://www.xadrezreal.com",
                "https://www.xadrezreal.com",
            ],
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        });
        await fastify.register(websocket_1.default);
        await fastify.register(jwt_1.default, {
            secret: process.env.JWT_SECRET || "fallback-secret-key",
        });
        fastify.decorate("bcrypt", bcryptjs_1.default);
        fastify.decorate("prisma", prisma);
        fastify.decorate("authenticate", async function (request, reply) {
            try {
                const authHeader = request.headers.authorization;
                if (!authHeader) {
                    return reply.status(401).send({
                        error: "Unauthorized",
                        message: "Token de autorização necessário",
                    });
                }
                if (!authHeader.startsWith("Bearer ")) {
                    return reply.status(401).send({
                        error: "Unauthorized",
                        message: "Formato de token inválido",
                    });
                }
                const decoded = (await request.jwtVerify());
                if (typeof decoded === "object" &&
                    decoded !== null &&
                    "id" in decoded) {
                    fastify.log.info(`User authenticated successfully: ${decoded.id}`);
                }
            }
            catch (err) {
                fastify.log.error("JWT verification failed:", err);
                return reply
                    .status(401)
                    .send({ error: "Unauthorized", message: "Token inválido" });
            }
        });
        await fastify.register(webSocketRoutes_1.websocketRoutes);
        console.log("[SERVER] wsManager registered:", !!fastify.wsManager);
        await fastify.register(auth_js_1.authRoutes, { prefix: "/auth" });
        await fastify.register(user_js_1.userRoutes, { prefix: "/users" });
        await fastify.register(tournament_js_1.tournamentRoutes, { prefix: "/tournaments" });
        await fastify.register(game_js_1.gameRoutes);
        fastify.get("/health", async () => {
            return { status: "OK", timestamp: new Date().toISOString() };
        });
        console.log("[SERVER] Creating TournamentUpdater, wsManager:", !!fastify.wsManager);
        const tournamentUpdater = new tournamentUpdater_1.TournamentUpdater(prisma, fastify.wsManager, fastify.log);
        tournamentUpdater.start(10000);
        fastify.addHook("onClose", async () => {
            tournamentUpdater.stop();
            await prisma.$disconnect();
        });
        const port = parseInt(process.env.PORT || "3000");
        await fastify.listen({ port, host: "0.0.0.0" });
        console.log(`🚀 Server is running on http://localhost:${port}`);
        console.log(`🔌 WebSocket available on ws://localhost:${port}/ws/`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map