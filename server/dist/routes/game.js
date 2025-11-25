"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRoutes = gameRoutes;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
let tournamentQueue = null;
function getTournamentQueue() {
    if (!tournamentQueue) {
        const Queue = require("bull");
        tournamentQueue = new Queue("tournament-events", {
            redis: {
                host: process.env.REDIS_HOST || "127.0.0.1",
                port: parseInt(process.env.REDIS_PORT || "6379"),
            },
        });
        console.log("[QUEUE] ✅ Tournament queue initialized (lazy)");
        tournamentQueue.on("ready", () => {
            console.log("[QUEUE] ✅ Connected to Redis!");
        });
        tournamentQueue.on("error", (error) => {
            console.error("[QUEUE] Error:", error.message);
        });
    }
    return tournamentQueue;
}
async function gameRoutes(fastify) {
    fastify.get("/api/game/:gameId/state", async (request, reply) => {
        const { gameId } = request.params;
        try {
            const game = await prisma.game.findUnique({
                where: { game_id_text: gameId },
            });
            if (!game) {
                return reply.code(404).send({ error: "Jogo não encontrado" });
            }
            console.log("[GET_STATE] Game loaded:", {
                gameId,
                fen: game.fen,
                whiteTime: game.white_time,
                blackTime: game.black_time,
                status: game.status,
            });
            return reply.send(game);
        }
        catch (error) {
            fastify.log.error("Erro ao buscar jogo:", error);
            return reply.code(500).send({ error: "Erro interno do servidor" });
        }
    });
    fastify.post("/api/game/:gameId/state", async (request, reply) => {
        const { gameId } = request.params;
        const gameStateData = request.body;
        console.log("[SAVE_STATE] Saving game state:", {
            gameId,
            fen: gameStateData.fen,
            whiteTime: gameStateData.white_time,
            blackTime: gameStateData.black_time,
            status: gameStateData.status,
        });
        // Bloquear jogos bot
        if (gameId && gameId.startsWith("bot_")) {
            console.log("[SAVE_STATE] ⚠️ Bot game detected, ignoring...");
            return reply.send({ success: true, message: "Bot game, not saved" });
        }
        try {
            await prisma.game.update({
                where: { game_id_text: gameId },
                data: {
                    fen: gameStateData.fen,
                    white_time: gameStateData.white_time,
                    black_time: gameStateData.black_time,
                    status: gameStateData.status || "playing",
                    updatedAt: new Date(),
                },
            });
            await prisma.gameState.upsert({
                where: { gameId },
                update: {
                    state: gameStateData,
                    updatedAt: new Date(),
                },
                create: {
                    gameId,
                    state: gameStateData,
                },
            });
            console.log("[SAVE_STATE] ✅ Game state saved in both tables");
            return reply.send({ success: true });
        }
        catch (error) {
            console.error("[SAVE_STATE] ❌ Error:", error);
            fastify.log.error("Erro ao salvar estado do jogo:", error);
            return reply.code(500).send({ error: "Erro interno do servidor" });
        }
    });
    fastify.put("/api/game/:gameId/move", async (request, reply) => {
        const { gameId } = request.params;
        const { fen, lastMove } = request.body;
        console.log("[UPDATE_MOVE] Updating move:", {
            gameId,
            fen,
            lastMove,
        });
        // Bloquear jogos bot
        if (gameId && gameId.startsWith("bot_")) {
            console.log("[UPDATE_MOVE] ⚠️ Bot game detected, ignoring...");
            return reply.send({ success: true, message: "Bot game, not saved" });
        }
        try {
            const game = await prisma.game.update({
                where: { game_id_text: gameId },
                data: {
                    fen,
                    last_move: lastMove,
                    updatedAt: new Date(),
                },
            });
            console.log("[UPDATE_MOVE] ✅ Move updated successfully");
            return reply.send(game);
        }
        catch (error) {
            console.error("[UPDATE_MOVE] ❌ Error:", error);
            fastify.log.error("Erro ao atualizar jogo:", error);
            return reply.code(500).send({ error: "Erro interno do servidor" });
        }
    });
    fastify.put("/api/game/:gameId/end", async (request, reply) => {
        const { gameId } = request.params;
        const { winnerId, reason } = request.body;
        console.log("[GAME_END_API] ========== API CALLED ==========");
        console.log("[GAME_END_API] Game ID:", gameId);
        console.log("[GAME_END_API] Winner ID:", winnerId);
        console.log("[GAME_END_API] Reason:", reason);
        // Bloquear jogos bot - eles não devem ser salvos no banco
        if (gameId && gameId.startsWith("bot_")) {
            console.log("[GAME_END_API] ⚠️ Bot game detected, ignoring...");
            return reply.send({ success: true, message: "Bot game, no points updated" });
        }
        try {
            console.log("[GAME_END_API] Finding game in database...");
            const existingGame = await prisma.game.findUnique({
                where: { game_id_text: gameId },
            });
            if (!existingGame) {
                console.error("[GAME_END_API] Game not found:", gameId);
                return reply.code(404).send({ error: "Game not found" });
            }
            console.log("[GAME_END_API] Game found, updating...");
            const game = await prisma.game.update({
                where: { game_id_text: gameId },
                data: {
                    status: reason,
                    winner_id: winnerId,
                },
            });
            console.log("[GAME_END_API] Game updated successfully");
            console.log("[GAME_END_API] Tournament ID:", game.tournament_id);
            if (game.tournament_id) {
                console.log("[GAME_END_API] Adding to tournament queue");
                const queue = getTournamentQueue();
                await queue.add("game-ended", {
                    gameIdText: gameId,
                });
                console.log("[GAME_END_API] ✅ Successfully added to queue");
            }
            return reply.send({ success: true, game });
        }
        catch (error) {
            console.error("[GAME_END_API] ❌ ERROR:", error);
            fastify.log.error("Erro ao finalizar jogo:", error);
            return reply.code(500).send({ error: "Erro interno do servidor" });
        }
    });
}
//# sourceMappingURL=game.js.map