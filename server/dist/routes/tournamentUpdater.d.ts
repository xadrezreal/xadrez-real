import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { WebSocketManager } from "../websocket/webSocketManager";
export declare class TournamentUpdater {
    private prisma;
    private wsManager;
    private logger;
    private orchestrator;
    private interval;
    constructor(prisma: PrismaClient, wsManager: WebSocketManager, logger: FastifyBaseLogger);
    start(intervalMs?: number): void;
    stop(): void;
    private checkTournamentStatus;
    private startTournament;
}
//# sourceMappingURL=tournamentUpdater.d.ts.map