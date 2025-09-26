import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function gameRoutes(fastify: any) {
  fastify.get("/api/game/:gameId/state", async (request: any, reply: any) => {
    const { gameId } = request.params;

    try {
      const gameState = await prisma.gameState.findUnique({
        where: { gameId },
      });

      if (!gameState) {
        return reply.code(404).send({ error: "Estado do jogo não encontrado" });
      }

      return reply.send(gameState.state);
    } catch (error) {
      fastify.log.error("Erro ao buscar estado do jogo:", error);
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
}
