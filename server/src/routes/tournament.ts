import { FastifyInstance } from "fastify";
import { z } from "zod";
import "../types/fastify";

const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  entryFee: z.number().min(0).max(10000),
  playerCount: z.number().int().min(4).max(8192),
  prizeDistribution: z.enum(["WINNER_TAKES_ALL", "SPLIT_TOP_2", "SPLIT_TOP_4"]),
  startTime: z.string().datetime(),
});

export async function tournamentRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: any, reply: any) => {
      try {
        const tournamentData = createTournamentSchema.parse(request.body);
        const userId = request.user.id;

        const startTime = new Date(tournamentData.startTime);
        if (startTime <= new Date()) {
          return reply.status(400).send({
            error: "A data de início deve ser no futuro",
          });
        }

        if (tournamentData.entryFee > 0) {
          const user = await fastify.prisma.user.findUnique({
            where: { id: userId },
            select: { balance: true },
          });

          if (!user || user.balance < tournamentData.entryFee) {
            return reply.status(400).send({
              error: "Saldo insuficiente para criar e participar do torneio",
            });
          }
        }

        const result = await fastify.prisma.$transaction(async (prisma) => {
          const tournament = await prisma.tournament.create({
            data: {
              name: tournamentData.name,
              entryFee: tournamentData.entryFee,
              playerCount: tournamentData.playerCount,
              prizeDistribution: tournamentData.prizeDistribution,
              startTime: startTime,
              creatorId: userId,
            },
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          await prisma.tournamentParticipant.create({
            data: {
              tournamentId: tournament.id,
              userId: userId,
            },
          });

          if (tournamentData.entryFee > 0) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                balance: {
                  decrement: tournamentData.entryFee,
                },
              },
            });
          }

          return tournament;
        });

        return reply.status(201).send({
          message: "Torneio criado com sucesso",
          tournament: result,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: "Dados inválidos",
            details: error.errors,
          });
        }

        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro interno do servidor",
        });
      }
    }
  );

  fastify.get("/", async (request: any, reply: any) => {
    try {
      const { status, page = 1, limit = 10 } = request.query;

      const skip = (page - 1) * limit;

      const where = status ? { status: status.toUpperCase() } : {};

      const tournaments = await fastify.prisma.tournament.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              participants: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: parseInt(limit),
      });

      const total = await fastify.prisma.tournament.count({ where });

      return reply.send({
        tournaments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: "Erro interno do servidor",
      });
    }
  });

  fastify.get("/:id", async (request: any, reply: any) => {
    try {
      const { id } = request.params;

      const tournament = await fastify.prisma.tournament.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              joinedAt: "asc",
            },
          },
          _count: {
            select: {
              participants: true,
            },
          },
        },
      });

      if (!tournament) {
        return reply.status(404).send({
          error: "Torneio não encontrado",
        });
      }

      const prizePool =
        tournament.entryFee * tournament._count.participants * 0.8;

      return reply.send({
        tournament: {
          ...tournament,
          prizePool,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: "Erro interno do servidor",
      });
    }
  });

  fastify.post(
    "/:id/join",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: any, reply: any) => {
      try {
        const { id: tournamentId } = request.params;
        const userId = request.user.id;

        const tournament = await fastify.prisma.tournament.findUnique({
          where: { id: tournamentId },
          include: {
            _count: {
              select: {
                participants: true,
              },
            },
          },
        });

        if (!tournament) {
          return reply.status(404).send({
            error: "Torneio não encontrado",
          });
        }

        if (tournament.status !== "WAITING") {
          return reply.status(400).send({
            error: "Torneio não está mais aceitando participantes",
          });
        }

        if (tournament._count.participants >= tournament.playerCount) {
          return reply.status(400).send({
            error: "Torneio já está lotado",
          });
        }

        const existingParticipant =
          await fastify.prisma.tournamentParticipant.findUnique({
            where: {
              tournamentId_userId: {
                tournamentId,
                userId,
              },
            },
          });

        if (existingParticipant) {
          return reply.status(400).send({
            error: "Você já está participando deste torneio",
          });
        }

        if (tournament.entryFee > 0) {
          const user = await fastify.prisma.user.findUnique({
            where: { id: userId },
            select: { balance: true },
          });

          if (!user || user.balance < tournament.entryFee) {
            return reply.status(400).send({
              error: "Saldo insuficiente para participar do torneio",
            });
          }
        }

        await fastify.prisma.$transaction(async (prisma) => {
          await prisma.tournamentParticipant.create({
            data: {
              tournamentId,
              userId,
            },
          });

          if (tournament.entryFee > 0) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                balance: {
                  decrement: tournament.entryFee,
                },
              },
            });
          }
        });

        return reply.send({
          message: "Participação confirmada com sucesso",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro interno do servidor",
        });
      }
    }
  );

  fastify.delete(
    "/:id/leave",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: any, reply: any) => {
      try {
        const { id: tournamentId } = request.params;
        const userId = request.user.id;

        const tournament = await fastify.prisma.tournament.findUnique({
          where: { id: tournamentId },
        });

        if (!tournament) {
          return reply.status(404).send({
            error: "Torneio não encontrado",
          });
        }

        if (tournament.status !== "WAITING") {
          return reply.status(400).send({
            error: "Não é possível sair de um torneio que já começou",
          });
        }

        if (tournament.creatorId === userId) {
          return reply.status(400).send({
            error:
              "O criador do torneio não pode sair. Considere cancelar o torneio.",
          });
        }

        await fastify.prisma.$transaction(async (prisma) => {
          await prisma.tournamentParticipant.delete({
            where: {
              tournamentId_userId: {
                tournamentId,
                userId,
              },
            },
          });

          if (tournament.entryFee > 0) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                balance: {
                  increment: tournament.entryFee,
                },
              },
            });
          }
        });

        return reply.send({
          message: "Você saiu do torneio com sucesso",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro interno do servidor",
        });
      }
    }
  );

  fastify.delete(
    "/:id",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: any, reply: any) => {
      try {
        const { id: tournamentId } = request.params;
        const userId = request.user.id;

        const tournament = await fastify.prisma.tournament.findUnique({
          where: { id: tournamentId },
          include: {
            participants: true,
          },
        });

        if (!tournament) {
          return reply.status(404).send({
            error: "Torneio não encontrado",
          });
        }

        if (tournament.creatorId !== userId) {
          return reply.status(403).send({
            error: "Apenas o criador pode cancelar o torneio",
          });
        }

        if (tournament.status !== "WAITING") {
          return reply.status(400).send({
            error: "Não é possível cancelar um torneio que já começou",
          });
        }

        await fastify.prisma.$transaction(async (prisma) => {
          if (tournament.entryFee > 0) {
            for (const participant of tournament.participants) {
              await prisma.user.update({
                where: { id: participant.userId },
                data: {
                  balance: {
                    increment: tournament.entryFee,
                  },
                },
              });
            }
          }

          await prisma.tournament.delete({
            where: { id: tournamentId },
          });
        });

        return reply.send({
          message: "Torneio cancelado e participantes reembolsados",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro interno do servidor",
        });
      }
    }
  );
}
