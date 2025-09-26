export class WebSocketManager {
  private tournamentRooms: Map<string, Set<any>>;
  private gameRooms: Map<string, Set<any>>;
  private connections: Map<any, { userId?: string; rooms: Set<string> }>;

  constructor() {
    this.tournamentRooms = new Map();
    this.gameRooms = new Map();
    this.connections = new Map();
  }

  private cleanupDeadConnections(room: Set<any>): void {
    const toRemove: any[] = [];
    room.forEach((socket) => {
      if (!socket || socket.readyState !== 1) {
        toRemove.push(socket);
      }
    });

    toRemove.forEach((socket) => {
      room.delete(socket);
      if (socket) {
        this.connections.delete(socket);
      }
    });
  }

  addToTournamentRoom(
    tournamentId: string,
    socket: any,
    userId?: string
  ): void {
    if (!this.tournamentRooms.has(tournamentId)) {
      this.tournamentRooms.set(tournamentId, new Set());
    }

    const room = this.tournamentRooms.get(tournamentId)!;
    room.add(socket);

    if (!this.connections.has(socket)) {
      this.connections.set(socket, { userId, rooms: new Set() });
    }
    this.connections.get(socket)!.rooms.add(`tournament:${tournamentId}`);
  }

  removeFromTournamentRoom(tournamentId: string, socket: any): void {
    const room = this.tournamentRooms.get(tournamentId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        this.tournamentRooms.delete(tournamentId);
      }
    }

    const connectionInfo = this.connections.get(socket);
    if (connectionInfo) {
      connectionInfo.rooms.delete(`tournament:${tournamentId}`);
      if (connectionInfo.rooms.size === 0) {
        this.connections.delete(socket);
      }
    }
  }

  addToGameRoom(gameId: string, socket: any, userId?: string): void {
    if (!this.gameRooms.has(gameId)) {
      this.gameRooms.set(gameId, new Set());
    }

    const room = this.gameRooms.get(gameId)!;
    room.add(socket);

    if (!this.connections.has(socket)) {
      this.connections.set(socket, { userId, rooms: new Set() });
    }
    this.connections.get(socket)!.rooms.add(`game:${gameId}`);
  }

  removeFromGameRoom(gameId: string, socket: any): void {
    const room = this.gameRooms.get(gameId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        this.gameRooms.delete(gameId);
      }
    }

    const connectionInfo = this.connections.get(socket);
    if (connectionInfo) {
      connectionInfo.rooms.delete(`game:${gameId}`);
      if (connectionInfo.rooms.size === 0) {
        this.connections.delete(socket);
      }
    }
  }

  broadcastToTournament(tournamentId: string, message: any): void {
    const room = this.tournamentRooms.get(tournamentId);
    if (room) {
      this.cleanupDeadConnections(room);

      const messageString = JSON.stringify(message);
      const failedConnections: any[] = [];

      room.forEach((socket) => {
        try {
          if (socket && socket.readyState === 1) {
            socket.send(messageString);
          } else {
            failedConnections.push(socket);
          }
        } catch (error) {
          console.error("Falha ao enviar mensagem para socket:", error);
          failedConnections.push(socket);
        }
      });

      failedConnections.forEach((socket) => {
        this.removeFromTournamentRoom(tournamentId, socket);
      });
    }
  }

  broadcastToGame(gameId: string, message: any): void {
    const room = this.gameRooms.get(gameId);
    if (room) {
      this.cleanupDeadConnections(room);

      const messageString = JSON.stringify(message);
      const failedConnections: any[] = [];

      room.forEach((socket) => {
        try {
          if (socket && socket.readyState === 1) {
            socket.send(messageString);
          } else {
            failedConnections.push(socket);
          }
        } catch (error) {
          console.error("Falha ao enviar mensagem para socket:", error);
          failedConnections.push(socket);
        }
      });

      failedConnections.forEach((socket) => {
        this.removeFromGameRoom(gameId, socket);
      });
    }
  }

  startHeartbeat(): void {
    setInterval(() => {
      this.connections.forEach((connectionInfo, socket) => {
        if (socket && socket.readyState === 1) {
          try {
            if (typeof socket.ping === "function") {
              socket.ping();
            }
          } catch (error) {
            console.error("Ping falhou:", error);
            this.cleanupConnection(socket);
          }
        } else if (socket && socket.readyState !== 1) {
          this.cleanupConnection(socket);
        } else if (!socket) {
          this.connections.delete(socket);
        }
      });
    }, 30000);
  }

  private cleanupConnection(socket: any): void {
    const connectionInfo = this.connections.get(socket);
    if (connectionInfo) {
      connectionInfo.rooms.forEach((roomId) => {
        if (roomId.startsWith("tournament:")) {
          const tournamentId = roomId.replace("tournament:", "");
          this.removeFromTournamentRoom(tournamentId, socket);
        } else if (roomId.startsWith("game:")) {
          const gameId = roomId.replace("game:", "");
          this.removeFromGameRoom(gameId, socket);
        }
      });
    }
  }

  handleTournamentMessage(tournamentId: string, data: any, socket: any): void {
    switch (data.type) {
      case "join_tournament":
        this.broadcastToTournament(tournamentId, {
          type: "participant_joined",
          data: data.participant,
        });
        break;
    }
  }

  handleGameMessage(gameId: string, data: any, senderSocket: any): void {
    console.log(`[WS_MANAGER] === HANDLE GAME MESSAGE ===`);
    console.log(`[WS_MANAGER] GameId: ${gameId}`);
    console.log(`[WS_MANAGER] Message: ${data.type}`);
    console.log(`[WS_MANAGER] Sender: ${senderSocket._playerId || "UNKNOWN"}`);

    switch (data.type) {
      case "move":
        const room = this.gameRooms.get(gameId);
        if (!room) {
          console.warn(`[WS_MANAGER] Room ${gameId} not found`);
          return;
        }

        console.log(`[WS_MANAGER] Room has ${room.size} connections`);

        const moveMessage = {
          type: "move",
          data: {
            from: data.from,
            to: data.to,
            promotion: data.promotion,
            playerId: data.playerId,
            fen: data.fen,
            timestamp: data.timestamp || Date.now(),
          },
        };

        let sent = 0;
        let skipped = 0;

        const isTournamentGame = gameId.includes("tournament-");
        const isSinglePlayerTest = room.size === 1;

        room.forEach((connection) => {
          const isCurrentSender = connection === senderSocket;
          const isSamePlayer = connection._playerId === data.playerId;

          console.log(
            `[WS_MANAGER] Checking connection: ${
              connection._playerId || "NO_ID"
            }`
          );
          console.log(`[WS_MANAGER] - Is sender socket: ${isCurrentSender}`);
          console.log(`[WS_MANAGER] - Is same player: ${isSamePlayer}`);

          if (isTournamentGame && isSinglePlayerTest) {
            console.log(
              `[WS_MANAGER] TOURNAMENT TEST MODE - allowing self-receive`
            );
            if (connection && connection.readyState === 1) {
              try {
                connection.send(JSON.stringify(moveMessage));
                sent++;
                console.log(
                  `[WS_MANAGER] ✅ SENT to ${connection._playerId} (TOURNAMENT TEST)`
                );
              } catch (error) {
                console.error(`[WS_MANAGER] Send failed:`, error);
                this.removeFromGameRoom(gameId, connection);
              }
            }
            return;
          }

          if (isCurrentSender || isSamePlayer) {
            skipped++;
            console.log(`[WS_MANAGER] SKIPPING - same sender/player`);
            return;
          }

          if (connection && connection.readyState === 1) {
            try {
              connection.send(JSON.stringify(moveMessage));
              sent++;
              console.log(`[WS_MANAGER] ✅ SENT to ${connection._playerId}`);
            } catch (error) {
              console.error(`[WS_MANAGER] Send failed:`, error);
              this.removeFromGameRoom(gameId, connection);
            }
          } else {
            console.log(`[WS_MANAGER] Connection not ready`);
          }
        });

        console.log(`[WS_MANAGER] RESULT: ${sent} sent, ${skipped} skipped`);

        if (isTournamentGame && isSinglePlayerTest && sent === 1) {
          console.log(`[WS_MANAGER] ✅ Tournament test mode - sent to self`);
        } else if (sent === 0 && skipped === 1) {
          console.log(
            `[WS_MANAGER] ✅ Correctly sent to 0 (no opponents connected)`
          );
        } else if (sent === 1 && skipped === 1) {
          console.log(
            `[WS_MANAGER] ✅ Perfect - sent to 1 opponent, skipped sender`
          );
        } else {
          console.warn(`[WS_MANAGER] ⚠️ Unexpected result - check logic`);
        }
        break;

      case "resign":
        console.log(`[WS_MANAGER] Player resigned: ${data.playerId}`);
        this.broadcastToGame(gameId, {
          type: "resign",
          data: {
            playerId: data.playerId,
            winner: data.winner,
            timestamp: Date.now(),
          },
        });
        break;

      case "draw_offer":
        console.log(`[WS_MANAGER] Draw offer from: ${data.playerId}`);
        this.broadcastToGame(gameId, {
          type: "draw_offer",
          data: {
            from: data.playerId,
            timestamp: Date.now(),
          },
        });
        break;

      case "draw_accept":
        console.log(`[WS_MANAGER] Draw accepted by: ${data.playerId}`);
        this.broadcastToGame(gameId, {
          type: "game_end",
          data: {
            reason: "draw_agreement",
            acceptedBy: data.playerId,
            timestamp: Date.now(),
          },
        });
        break;

      case "chat_message":
        console.log(`[WS_MANAGER] Chat from: ${data.playerId}`);
        this.broadcastToGame(gameId, {
          type: "chat_message",
          data: {
            playerId: data.playerId,
            playerName: data.playerName,
            message: data.message,
            timestamp: Date.now(),
          },
        });
        break;

      default:
        console.warn(`[WS_MANAGER] Unknown message type: ${data.type}`);
    }
  }

  getTournamentRoomCount(): number {
    return this.tournamentRooms.size;
  }

  getGameRoomCount(): number {
    return this.gameRooms.size;
  }

  getActiveConnections(): number {
    return this.connections.size;
  }
}
