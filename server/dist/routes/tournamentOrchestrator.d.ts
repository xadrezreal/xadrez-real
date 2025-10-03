import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { WebSocketManager } from "../websocket/webSocketManager";
export declare class TournamentOrchestrator {
    private prisma;
    private wsManager;
    private logger;
    constructor(prisma: PrismaClient, wsManager: WebSocketManager, logger: FastifyBaseLogger);
    createBracket(tournamentId: string): Promise<void>;
    private createRoundMatches;
    startMatch(matchId: string): Promise<void>;
    handleMatchEnd(gameIdText: string): Promise<void>;
    private calculateMatchPoints;
    private checkRoundCompletion;
    private advanceToNextRound;
    private finalizeTournament;
}
//# sourceMappingURL=tournamentOrchestrator.d.ts.map