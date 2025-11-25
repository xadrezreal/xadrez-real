import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { WebSocketManager } from "../websocket/webSocketManager";
export declare class TournamentOrchestrator {
    private prisma;
    private wsManager;
    private logger;
    private roundTimers;
    constructor(prisma: PrismaClient, wsManager: WebSocketManager, logger: FastifyBaseLogger);
    createBracket(tournamentId: string): Promise<any>;
    private createRoundMatches;
    private startRoundImmediately;
    startMatch(matchId: string): Promise<any>;
    handleMatchEnd(gameIdText: string): Promise<void>;
    private calculateMatchPoints;
    private checkRoundCompletion;
    private advanceToNextRound;
    private forceAdvanceToNextRound;
    private finalizeTournament;
}
//# sourceMappingURL=tournamentOrchestrator.d.ts.map