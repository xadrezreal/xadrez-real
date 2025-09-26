import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { WebSocketManager } from "../websocket/webSocketManager";

export class TournamentUpdater {
  private prisma: PrismaClient;
  private wsManager: WebSocketManager;
  private logger: FastifyBaseLogger;
  private interval: NodeJS.Timeout | null;

  constructor(
    prisma: PrismaClient,
    wsManager: WebSocketManager,
    logger: FastifyBaseLogger
  ) {
    this.prisma = prisma;
    this.wsManager = wsManager;
    this.logger = logger;
    this.interval = null;
  }

  start(intervalMs: number = 10000): void {
    this.interval = setInterval(async () => {
      await this.checkTournamentStatus();
    }, intervalMs);

    this.logger.info("Tournament status updater started");
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.logger.info("Tournament status updater stopped");
    }
  }

  private async checkTournamentStatus(): Promise<void> {
    try {
      const now = new Date();

      const tournamentesToStart = await this.prisma.tournament.findMany({
        where: {
          status: "WAITING",
          startTime: {
            lte: now,
          },
          participants: {
            some: {},
          },
        },
        include: {
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
        },
      });

      for (const tournament of tournamentesToStart) {
        await this.startTournament(tournament);
      }
    } catch (error) {
      this.logger.error("Tournament status update error:", error);
    }
  }

  private async startTournament(tournament: any): Promise<void> {
    try {
      // Update tournament status
      await this.prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: "IN_PROGRESS" },
      });

      // Broadcast tournament start via WebSocket
      this.wsManager.broadcastToTournament(tournament.id, {
        type: "tournament_started",
        data: {
          tournament: {
            ...tournament,
            status: "IN_PROGRESS",
          },
        },
      });

      this.logger.info(`Tournament ${tournament.id} started automatically`);
    } catch (error) {
      this.logger.error(`Error starting tournament ${tournament.id}:`, error);
    }
  }
}
