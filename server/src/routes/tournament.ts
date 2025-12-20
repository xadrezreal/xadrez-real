import { FastifyInstance } from "fastify";
import { z } from "zod";
import { TournamentOrchestrator } from "./tournamentOrchestrator";
import "../types/fastify";
import { isPremiumOrAdmin } from "../utils/roleHelper";
import { enterTournamentWithConnect } from "../services/tournamentPayment";

const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  password: z.string().min(4).max(50).optional(),
  entryFee: z.number().min(0).max(10000),
  playerCount: z.number().int().min(2),
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

        if (!isPremiumOrAdmin(user.role)) {
          return reply.status(403).send({
            error: "Acesso negado",
            message:
              "Apenas usuários Premium podem criar torneios. Faça upgrade para desbloquear este recurso!",
          });
        }

        // Validar limite de jogadores baseado na role
        // PREMIUM: até 128 jogadores
        // ADMIN: até 8192 jogadores (potências de 2 para brackets: 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192)
        const maxPlayerCount = user.role === "ADMIN" ? 8192 : 128;
        if (tournamentData.playerCount > maxPlayerCount) {
          return reply.status(400).send({
            error: `Limite de jogadores excedido`,
            message: `Usuários ${user.role} podem criar torneios com até ${maxPlayerCount} jogadores. Você tentou criar com ${tournamentData.playerCount} jogadores.`,
            maxAllowed: maxPlayerCount,
          });
        }

        const startTime = new Date(tournamentData.startTime);
        if (startTime <= new Date()) {
          return reply.status(400).send({
            error: "A data de início deve ser no futuro",
          });
        }

        if (
          tournamentData.entryFee > 0 &&
          user.role !== "ADMIN" &&
          user.balance < tournamentData.entryFee
        ) {
          return reply.status(400).send({
            error: "Saldo insuficiente para criar e participar do torneio",
            requiredAmount: tournamentData.entryFee,
            currentBalance: user.balance,
          });
        }

        // Criar torneio primeiro
        const tournament = await fastify.prisma.tournament.create({
          data: {
            name: tournamentData.name,
            password: tournamentData.password || null,
            entryFee: tournamentData.entryFee,
            playerCount: tournamentData.playerCount,
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

        // Se não for admin, criador entra automaticamente
        if (user.role !== "ADMIN") {
          if (tournamentData.entryFee > 0) {
            // Usar sistema de transfers com Stripe Connect
            try {
              const entryResult = await enterTournamentWithConnect(
                userId,
                tournament.id,
                tournamentData.entryFee
              );

              fastify.log.info({
                message: "[TOURNAMENT] Creator joined with Connect transfer",
                userId,
                tournamentId: tournament.id,
                breakdown: entryResult.breakdown,
                transferId: entryResult.transferId,
              });
            } catch (error: any) {
              // Se falhar a entrada, deletar o torneio criado
              await fastify.prisma.tournament.delete({
                where: { id: tournament.id },
              });

              fastify.log.error({
                message: "[TOURNAMENT] Error entering tournament as creator",
                userId,
                tournamentId: tournament.id,
                error: error.message,
              });

              return reply.status(400).send({
                error: error.message || "Erro ao processar entrada no torneio",
              });
            }
          } else {
            // Torneio gratuito - apenas criar participação
            await fastify.prisma.tournamentParticipant.create({
              data: {
                tournamentId: tournament.id,
                userId: userId,
                paidEntry: false,
              },
            });
          }
        }

        const result = tournament;

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
          status: true,
          startTime: true,
          createdAt: true,
          password: true,
          creator: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          participants: {
            select: {
              userId: true,
              paidEntry: true,
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

      const tournamentsWithPrizePool = tournaments.map((t) => {
        const paidParticipants = t.participants.filter(
          (p) => p.paidEntry
        ).length;
        return {
          ...t,
          hasPassword: !!t.password,
          password: undefined,
          prizePool: t.entryFee * paidParticipants,
        };
      });

      const total = await fastify.prisma.tournament.count({ where });

      return reply.send({
        tournaments: tournamentsWithPrizePool,
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
          status: true,
          startTime: true,
          currentRound: true,
          totalRounds: true,
          winnerId: true,
          nextRoundStartTime: true,
          currentRoundStartTime: true,
          housePercentage: true,
          prizePool: true,
          houseTake: true,
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
          winner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          participants: {
            select: {
              id: true,
              userId: true,
              paidEntry: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  tournamentPoints: true,
                },
              },
            },
            orderBy: {
              joinedAt: "asc",
            },
          },
          prizes: {
            select: {
              id: true,
              userId: true,
              position: true,
              amount: true,
              paid: true,
              paidAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              position: "asc",
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

      const paidParticipants = tournament.participants.filter(
        (p) => p.paidEntry
      ).length;
      const prizePool = tournament.entryFee * paidParticipants;

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

        if (!user) {
          return reply.status(404).send({
            error: "Usuário não encontrado",
          });
        }

        if (user.role === "ADMIN") {
          return reply.status(403).send({
            error: "Administradores não podem participar de torneios",
            message:
              "Admins podem apenas criar e gerenciar torneios, mas não participar como jogadores.",
          });
        }

        if (tournament.entryFee > 0) {
          if (user.balance < tournament.entryFee) {
            return reply.status(400).send({
              error: "Saldo insuficiente para participar do torneio",
              requiredAmount: tournament.entryFee,
              currentBalance: user.balance,
            });
          }
        }

        // Se o torneio tem taxa de entrada, usar sistema de transfers com Stripe Connect
        let entryResult;
        if (tournament.entryFee > 0) {
          try {
            entryResult = await enterTournamentWithConnect(
              userId,
              tournamentId,
              tournament.entryFee
            );

            fastify.log.info({
              message: "[TOURNAMENT] User joined with Connect transfer",
              userId,
              tournamentId,
              breakdown: entryResult.breakdown,
              transferId: entryResult.transferId,
            });
          } catch (error: any) {
            fastify.log.error({
              message: "[TOURNAMENT] Error entering tournament with Connect",
              userId,
              tournamentId,
              error: error.message,
            });

            return reply.status(400).send({
              error: error.message || "Erro ao processar entrada no torneio",
            });
          }
        } else {
          // Torneio gratuito - apenas criar participação
          await fastify.prisma.tournamentParticipant.create({
            data: {
              tournamentId,
              userId,
              paidEntry: false,
            },
          });
        }

        const result = await fastify.prisma.user.findUnique({
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

        return reply.send({
          message: "Participação confirmada com sucesso!",
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

        const participant =
          await fastify.prisma.tournamentParticipant.findUnique({
            where: {
              tournamentId_userId: {
                tournamentId,
                userId,
              },
            },
          });

        const paidEntry = participant?.paidEntry || false;

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
            participants: {
              select: {
                userId: true,
                paidEntry: true,
              },
            },
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
              if (participant.paidEntry) {
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
