import { FastifyInstance } from "fastify";
import { z } from "zod";
import { TournamentOrchestrator } from "./tournamentOrchestrator";
import "../types/fastify";

const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  password: z.string().min(4).max(50).optional(),
  entryFee: z.number().min(0).max(10000),
  playerCount: z.number().int().min(2).max(8192),
  prizeDistribution: z.enum(["WINNER_TAKES_ALL", "SPLIT_TOP_2", "SPLIT_TOP_4"]),
  startTime: z.string().datetime(),
});

const joinTournamentSchema = z.object({
  password: z.string().optional(),
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

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { balance: true, role: true },
        });

        if (!user) {
          return reply.status(404).send({
            error: "Usuário não encontrado",
          });
        }

        if (user.role !== "PREMIUM") {
          return reply.status(403).send({
            error: "Acesso negado",
            message:
              "Apenas usuários Premium podem criar torneios. Faça upgrade para desbloquear este recurso!",
          });
        }

        const startTime = new Date(tournamentData.startTime);
        if (startTime <= new Date()) {
          return reply.status(400).send({
            error: "A data de início deve ser no futuro",
          });
        }

        const result = await fastify.prisma.$transaction(async (prisma) => {
          const tournament = await prisma.tournament.create({
            data: {
              name: tournamentData.name,
              password: tournamentData.password || null,
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
            details: error,
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
        select: {
          id: true,
          name: true,
          entryFee: true,
          playerCount: true,
          prizeDistribution: true,
          status: true,
          startTime: true,
          createdAt: true,
          password: true,
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          participants: {
            select: {
              userId: true,
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

      const tournamentsWithPasswordFlag = tournaments.map((t) => ({
        ...t,
        hasPassword: !!t.password,
        password: undefined,
      }));

      const total = await fastify.prisma.tournament.count({ where });

      return reply.send({
        tournaments: tournamentsWithPasswordFlag,
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
      const userId = request.user?.id;

      const tournament = await fastify.prisma.tournament.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          entryFee: true,
          playerCount: true,
          prizeDistribution: true,
          status: true,
          startTime: true,
          currentRound: true,
          totalRounds: true,
          winnerId: true,
          nextRoundStartTime: true,
          currentRoundStartTime: true,
          createdAt: true,
          updatedAt: true,
          creatorId: true,
          password: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          participants: {
            select: {
              userId: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true,
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

      const prizePool = tournament.entryFee * tournament._count.participants;

      const isCreator = userId && tournament.creatorId === userId;

      return reply.send({
        tournament: {
          ...tournament,
          hasPassword: !!tournament.password,
          password: isCreator ? tournament.password : undefined,
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

  fastify.get("/:id/bracket", async (request: any, reply: any) => {
    try {
      const { id } = request.params;

      const tournament = await fastify.prisma.tournament.findUnique({
        where: { id },
        include: {
          matches: {
            include: {
              player1: {
                select: { id: true, name: true },
              },
              player2: {
                select: { id: true, name: true },
              },
              winner: {
                select: { id: true, name: true },
              },
            },
            orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
          },
        },
      });

      if (!tournament) {
        return reply.status(404).send({
          error: "Torneio não encontrado",
        });
      }

      const bracketByRound: Record<number, any[]> = {};

      for (const match of tournament.matches) {
        if (!bracketByRound[match.round]) {
          bracketByRound[match.round] = [];
        }
        bracketByRound[match.round].push(match);
      }

      return reply.send({
        tournament,
        bracket: bracketByRound,
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
        const body = joinTournamentSchema.parse(request.body);

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

        if (tournament.password) {
          if (!body.password) {
            return reply.status(400).send({
              error: "Este torneio requer senha",
              requiresPassword: true,
            });
          }
          if (body.password !== tournament.password) {
            return reply.status(403).send({ error: "Senha incorreta" });
          }
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

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { balance: true, role: true },
        });

        const isPremium = user?.role === "PREMIUM";

        if (tournament.entryFee > 0 && !isPremium) {
          if (!user || user.balance < tournament.entryFee) {
            return reply.status(400).send({
              error: "Saldo insuficiente para participar do torneio",
            });
          }
        }

        const result = await fastify.prisma.$transaction(async (prisma) => {
          await prisma.tournamentParticipant.create({
            data: {
              tournamentId,
              userId,
            },
          });

          if (tournament.entryFee > 0 && !isPremium) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                balance: {
                  decrement: tournament.entryFee,
                },
              },
            });

            await prisma.transaction.create({
              data: {
                userId,
                amount: -tournament.entryFee,
                type: "TOURNAMENT_ENTRY",
                status: "COMPLETED",
                description: `Entrada no torneio: ${tournament.name}`,
                metadata: {
                  tournamentId,
                  tournamentName: tournament.name,
                },
              },
            });
          }

          const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              balance: true,
              stripeCustomerId: true,
              stripeSubscriptionId: true,
            },
          });

          return updatedUser;
        });

        const message = isPremium
          ? "Inscrição confirmada! Como Premium, você participa gratuitamente e concorre aos prêmios! 🎁"
          : "Participação confirmada com sucesso!";

        return reply.send({
          message,
          updatedUser: result,
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

        const userTransaction = await fastify.prisma.transaction.findFirst({
          where: {
            userId,
            type: "TOURNAMENT_ENTRY",
            metadata: {
              path: ["tournamentId"],
              equals: tournamentId,
            },
          },
        });

        const paidEntry = !!userTransaction;

        await fastify.prisma.$transaction(async (prisma) => {
          await prisma.tournamentParticipant.delete({
            where: {
              tournamentId_userId: {
                tournamentId,
                userId,
              },
            },
          });

          if (tournament.entryFee > 0 && paidEntry) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                balance: {
                  increment: tournament.entryFee,
                },
              },
            });

            await prisma.transaction.create({
              data: {
                userId,
                amount: tournament.entryFee,
                type: "REFUND",
                status: "COMPLETED",
                description: `Reembolso de saída do torneio: ${tournament.name}`,
                metadata: {
                  tournamentId,
                  tournamentName: tournament.name,
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
              const userTransaction = await prisma.transaction.findFirst({
                where: {
                  userId: participant.userId,
                  type: "TOURNAMENT_ENTRY",
                  metadata: {
                    path: ["tournamentId"],
                    equals: tournamentId,
                  },
                },
              });

              if (userTransaction) {
                await prisma.user.update({
                  where: { id: participant.userId },
                  data: {
                    balance: {
                      increment: tournament.entryFee,
                    },
                  },
                });

                await prisma.transaction.create({
                  data: {
                    userId: participant.userId,
                    amount: tournament.entryFee,
                    type: "REFUND",
                    status: "COMPLETED",
                    description: `Reembolso - Torneio cancelado: ${tournament.name}`,
                    metadata: {
                      tournamentId,
                      tournamentName: tournament.name,
                    },
                  },
                });
              }
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

  fastify.post(
    "/:tournamentId/match/:matchId/start",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: any, reply: any) => {
      try {
        const { matchId } = request.params;
        const userId = request.user.id;

        const match = await fastify.prisma.tournamentMatch.findUnique({
          where: { id: matchId },
        });

        if (!match) {
          return reply.status(404).send({
            error: "Partida não encontrada",
          });
        }

        if (match.player1Id !== userId && match.player2Id !== userId) {
          return reply.status(403).send({
            error: "Você não participa desta partida",
          });
        }

        const orchestrator = new TournamentOrchestrator(
          fastify.prisma,
          fastify.wsManager,
          fastify.log
        );

        await orchestrator.startMatch(matchId);

        const updatedMatch = await fastify.prisma.tournamentMatch.findUnique({
          where: { id: matchId },
          include: {
            player1: true,
            player2: true,
          },
        });

        return reply.send({
          message: "Partida iniciada com sucesso",
          match: updatedMatch,
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
