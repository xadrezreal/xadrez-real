"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentUpdater = void 0;
const tournamentOrchestrator_1 = require("./tournamentOrchestrator");
class TournamentUpdater {
    prisma;
    wsManager;
    logger;
    orchestrator;
    interval;
    constructor(prisma, wsManager, logger) {
        this.prisma = prisma;
        this.wsManager = wsManager;
        this.logger = logger;
        this.interval = null;
        this.orchestrator = new tournamentOrchestrator_1.TournamentOrchestrator(prisma, wsManager, logger);
    }
    start(intervalMs = 10000) {
        this.interval = setInterval(async () => {
            await this.checkTournamentStatus();
        }, intervalMs);
        this.logger.info("Tournament status updater started");
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            this.logger.info("Tournament status updater stopped");
        }
    }
    async checkTournamentStatus() {
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
        }
        catch (error) {
            this.logger.error("Tournament status update error:", error);
        }
    }
    async startTournament(tournament) {
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
        }
        catch (error) {
            console.error(`[TOURNAMENT] Error:`, error);
            this.logger.error(`Error starting tournament ${tournament.id}:`, error);
            await this.prisma.tournament.update({
                where: { id: tournament.id },
                data: { status: "WAITING" },
            });
        }
    }
}
exports.TournamentUpdater = TournamentUpdater;
//# sourceMappingURL=tournamentUpdater.js.map