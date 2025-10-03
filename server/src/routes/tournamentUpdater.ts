import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { WebSocketManager } from "../websocket/webSocketManager";
import { TournamentOrchestrator } from "./tournamentOrchestrator";

export class TournamentUpdater {
  private prisma: PrismaClient;
  private wsManager: WebSocketManager;
  private logger: FastifyBaseLogger;
  private orchestrator: TournamentOrchestrator;
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
    this.orchestrator = new TournamentOrchestrator(prisma, wsManager, logger);
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
      const tournamentsToStart = await this.prisma.tournament.findMany({
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
                  country: true,
                },
              },
            },
          },
        },
      });

      for (const tournament of tournamentsToStart) {
        await this.startTournament(tournament);
      }
    } catch (error: any) {
      this.logger.error("Tournament status update error:", error);
    }
  }

  private async startTournament(tournament: any): Promise<void> {
    try {
      console.log(`[TOURNAMENT] Starting tournament ${tournament.id}`);

      await this.orchestrator.createBracket(tournament.id);

      await this.prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: "IN_PROGRESS" },
      });

      console.log(`[TOURNAMENT] Status updated to IN_PROGRESS`);

      this.wsManager.broadcastToTournament(tournament.id, {
        type: "TOURNAMENT_STARTED",
        data: {
          tournamentId: tournament.id,
          status: "IN_PROGRESS",
          message: `Torneio iniciado!`,
          timestamp: Date.now(),
        },
      });

      this.logger.info(`Tournament ${tournament.id} started`);
    } catch (error: any) {
      console.error(`[TOURNAMENT] Error:`, error);
      this.logger.error(`Error starting tournament ${tournament.id}:`, error);

      await this.prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: "WAITING" },
      });
    }
  }
}
