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
                  country: true,
                },
              },
            },
          },
        },
      });

      for (const tournament of tournamentesToStart) {
        await this.startTournament(tournament);
      }
    } catch (error: any) {
      this.logger.error("Tournament status update error:", error);
    }
  }

  private async startTournament(tournament: any): Promise<void> {
    try {
      console.log(`[TOURNAMENT] Starting tournament ${tournament.id}`);

      await this.prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: "IN_PROGRESS" },
      });

      console.log(`[TOURNAMENT] Status updated to IN_PROGRESS`);

      const participants = tournament.participants.map((p: any) => {
        return {
          id: p.user.id,
          name: p.user.name,
          country: p.user.country || null,
        };
      });

      console.log(`[TOURNAMENT] Participants:`, participants);

      const shuffled = [...participants].sort(() => Math.random() - 0.5);

      const matches = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (shuffled[i + 1]) {
          const isFirstWhite = Math.random() < 0.5;
          const whitePlayer = isFirstWhite ? shuffled[i] : shuffled[i + 1];
          const blackPlayer = isFirstWhite ? shuffled[i + 1] : shuffled[i];

          console.log(`[TOURNAMENT] Creating match:`, {
            white: whitePlayer,
            black: blackPlayer,
          });

          const gameIdText = `tournament-${tournament.id}-final1`;

          const game = await this.prisma.game.create({
            data: {
              game_id_text: gameIdText,
              tournament_id: tournament.id,
              white_player_id: whitePlayer.id,
              black_player_id: blackPlayer.id,
              white_player_name: whitePlayer.name,
              black_player_name: blackPlayer.name,
              white_player_country: whitePlayer.country,
              black_player_country: blackPlayer.country,
              status: "playing",
              fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
              white_time: 600,
              black_time: 600,
              wager: 0,
            },
          });

          console.log(`[TOURNAMENT] Game created:`, game);

          matches.push(game.game_id_text);

          this.wsManager.broadcastToTournament(tournament.id, {
            type: "MATCH_CREATED",
            data: {
              gameId: game.game_id_text,
              whitePlayerId: whitePlayer.id,
              blackPlayerId: blackPlayer.id,
              whiteName: whitePlayer.name,
              blackName: blackPlayer.name,
              timestamp: Date.now(),
            },
          });
        }
      }

      this.wsManager.broadcastToTournament(tournament.id, {
        type: "TOURNAMENT_STARTED",
        data: {
          tournamentId: tournament.id,
          status: "IN_PROGRESS",
          matches,
          message: `Torneio iniciado! ${matches.length} partida(s) criada(s)`,
          timestamp: Date.now(),
        },
      });

      this.logger.info(
        `Tournament ${tournament.id} started with ${matches.length} matches`
      );
    } catch (error: any) {
      console.error(`[TOURNAMENT] Error:`, error);
      this.logger.error(`Error starting tournament ${tournament.id}:`, error);
    }
  }
}
