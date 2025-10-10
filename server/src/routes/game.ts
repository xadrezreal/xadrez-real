import { PrismaClient } from "@prisma/client";
import { FastifyInstance } from "fastify";

const prisma = new PrismaClient();

let tournamentQueue: any = null;

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

    tournamentQueue.on("error", (error: any) => {
      console.error("[QUEUE] Error:", error.message);
    });
  }
  return tournamentQueue;
}

export async function gameRoutes(fastify: FastifyInstance) {
  fastify.get("/api/game/:gameId/state", async (request: any, reply: any) => {
    const { gameId } = request.params;
    try {
      const game = await prisma.game.findUnique({
        where: { game_id_text: gameId },
      });
      if (!game) {
        return reply.code(404).send({ error: "Jogo não encontrado" });
      }
      return reply.send(game);
    } catch (error: any) {
      fastify.log.error("Erro ao buscar jogo:", error);
      return reply.code(500).send({ error: "Erro interno do servidor" });
    }
  });

  fastify.post("/api/game/:gameId/state", async (request: any, reply: any) => {
    const { gameId } = request.params;
    const gameStateData = request.body;
    try {
      await prisma.gameState.upsert({
        where: { gameId },
        update: {
          state: gameStateData as any,
          updatedAt: new Date(),
        },
        create: {
          gameId,
          state: gameStateData as any,
        },
      });
      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error("Erro ao salvar estado do jogo:", error);
      return reply.code(500).send({ error: "Erro interno do servidor" });
    }
  });

  fastify.put("/api/game/:gameId/move", async (request: any, reply: any) => {
    const { gameId } = request.params;
    const { fen, lastMove } = request.body;
    try {
      const game = await prisma.game.update({
        where: { game_id_text: gameId },
        data: {
          fen,
          last_move: lastMove as any,
          updatedAt: new Date(),
        },
      });
      return reply.send(game);
    } catch (error: any) {
      fastify.log.error("Erro ao atualizar jogo:", error);
      return reply.code(500).send({ error: "Erro interno do servidor" });
    }
  });

  fastify.put("/api/game/:gameId/end", async (request: any, reply: any) => {
    const { gameId } = request.params;
    const { winnerId, reason } = request.body;

    console.log("[GAME_END_API] ========== API CALLED ==========");
    console.log("[GAME_END_API] Game ID:", gameId);
    console.log("[GAME_END_API] Winner ID:", winnerId);
    console.log("[GAME_END_API] Reason:", reason);

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
          wsManager: (fastify as any).wsManager,
          logger: fastify.log,
        });

        console.log("[GAME_END_API] ✅ Successfully added to queue");
      }

      return reply.send({ success: true, game });
    } catch (error: any) {
      console.error("[GAME_END_API] ❌ ERROR:", error);
      fastify.log.error("Erro ao finalizar jogo:", error);
      return reply.code(500).send({ error: "Erro interno do servidor" });
    }
  });
}
