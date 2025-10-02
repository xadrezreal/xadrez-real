import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function gameRoutes(fastify) {
  fastify.get("/api/game/:gameId/state", async (request, reply) => {
    const { gameId } = request.params;

    try {
      const game = await prisma.game.findUnique({
        where: { game_id_text: gameId },
      });

      if (!game) {
        return reply.code(404).send({ error: "Jogo não encontrado" });
      }

      return reply.send(game);
    } catch (error) {
      fastify.log.error("Erro ao buscar jogo:", error);
      return reply.code(500).send({ error: "Erro interno do servidor" });
    }
  });

  fastify.post("/api/game/:gameId/state", async (request, reply) => {
    const { gameId } = request.params;
    const gameStateData = request.body;

    try {
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

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error("Erro ao salvar estado do jogo:", error);
      return reply.code(500).send({ error: "Erro interno do servidor" });
    }
  });

  fastify.put("/api/game/:gameId/move", async (request, reply) => {
    const { gameId } = request.params;
    const { fen, lastMove } = request.body;

    try {
      const game = await prisma.game.update({
        where: { game_id_text: gameId },
        data: {
          fen,
          last_move: lastMove,
          updatedAt: new Date(),
        },
      });

      return reply.send(game);
    } catch (error) {
      fastify.log.error("Erro ao atualizar jogo:", error);
      return reply.code(500).send({ error: "Erro interno do servidor" });
    }
  });
}
