export declare class WebSocketManager {
    private io;
    private pubClient;
    private subClient;
    constructor(httpServer: any);
    private setupRedisAdapter;
    private setupEventHandlers;
    broadcastToTournament(tournamentId: string, message: any): void;
    broadcastToGame(gameId: string, message: any): void;
    startHeartbeat(): void;
    getTournamentRoomCount(): number;
    getGameRoomCount(): number;
    getActiveConnections(): number;
}
//# sourceMappingURL=webSocketManager.d.ts.map