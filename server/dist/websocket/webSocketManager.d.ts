export declare class WebSocketManager {
    private tournamentRooms;
    private gameRooms;
    private connections;
    constructor();
    private cleanupDeadConnections;
    addToTournamentRoom(tournamentId: string, socket: any, userId?: string): void;
    removeFromTournamentRoom(tournamentId: string, socket: any): void;
    addToGameRoom(gameId: string, socket: any, userId?: string): void;
    removeFromGameRoom(gameId: string, socket: any): void;
    broadcastToTournament(tournamentId: string, message: any): void;
    broadcastToGame(gameId: string, message: any): void;
    startHeartbeat(): void;
    private cleanupConnection;
    handleTournamentMessage(tournamentId: string, data: any, socket: any): void;
    handleGameMessage(gameId: string, data: any, senderSocket: any): void;
    getTournamentRoomCount(): number;
    getGameRoomCount(): number;
    getActiveConnections(): number;
}
//# sourceMappingURL=webSocketManager.d.ts.map