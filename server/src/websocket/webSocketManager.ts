import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

export class WebSocketManager {
  private io: Server;
  private pubClient: ReturnType<typeof createClient>;
  private subClient: ReturnType<typeof createClient>;

  constructor(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: {
        origin: [
          "http://localhost:5173",
          "http://localhost:3000",
          "https://xadrezreal.com",
          "https://www.xadrezreal.com",
        ],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.pubClient = createClient({
      url: `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${
        process.env.REDIS_PORT || "6379"
      }`,
    });

    this.subClient = this.pubClient.duplicate();

    this.setupRedisAdapter();
    this.setupEventHandlers();
  }

  private async setupRedisAdapter() {
    try {
      await this.pubClient.connect();
      await this.subClient.connect();

      this.io.adapter(createAdapter(this.pubClient, this.subClient));

      console.log("✅ [WEBSOCKET] Socket.IO Redis adapter connected");
    } catch (error) {
      console.error("❌ [WEBSOCKET] Redis adapter connection failed:", error);
    }
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[WS] Client connected: ${socket.id}`);

      socket.on(
        "join_tournament",
        (data: { tournamentId: string; userId?: string }) => {
          const roomId = `tournament:${data.tournamentId}`;
          socket.join(roomId);
          console.log(
            `[WS] Socket ${socket.id} joined tournament ${data.tournamentId}`
          );

          socket.emit("connection_confirmed", {
            tournamentId: data.tournamentId,
            userId: data.userId,
            timestamp: Date.now(),
          });
        }
      );

      socket.on("leave_tournament", (data: { tournamentId: string }) => {
        const roomId = `tournament:${data.tournamentId}`;
        socket.leave(roomId);
        console.log(
          `[WS] Socket ${socket.id} left tournament ${data.tournamentId}`
        );
      });

      socket.on("join_game", (data: { gameId: string; userId?: string }) => {
        const roomId = `game:${data.gameId}`;
        socket.join(roomId);
        console.log(`[WS] Socket ${socket.id} joined game ${data.gameId}`);

        socket.emit("connection_confirmed", {
          gameId: data.gameId,
          userId: data.userId,
          timestamp: Date.now(),
        });
      });

      socket.on("leave_game", (data: { gameId: string }) => {
        const roomId = `game:${data.gameId}`;
        socket.leave(roomId);
        console.log(`[WS] Socket ${socket.id} left game ${data.gameId}`);
      });

      socket.on("game_message", (data: any) => {
        const gameId = data.gameId;
        if (!gameId) return;

        console.log(`[WS] Game message from ${socket.id}:`, data.type);

        switch (data.type) {
          case "move":
            this.io
              .to(`game:${gameId}`)
              .except(socket.id)
              .emit("game_message", {
                type: "move",
                data: data.data,
              });
            break;

          case "resign":
            this.io.to(`game:${gameId}`).emit("game_message", {
              type: "resign",
              data: data.data,
            });
            break;

          case "draw_offer":
            this.io
              .to(`game:${gameId}`)
              .except(socket.id)
              .emit("game_message", {
                type: "draw_offer",
                data: data.data,
              });
            break;

          case "draw_accept":
            this.io.to(`game:${gameId}`).emit("game_message", {
              type: "game_end",
              data: data.data,
            });
            break;

          case "chat_message":
            this.io.to(`game:${gameId}`).emit("game_message", {
              type: "chat_message",
              data: data.data,
            });
            break;

          default:
            console.warn(`[WS] Unknown game message type: ${data.type}`);
        }
      });

      socket.on("disconnect", () => {
        console.log(`[WS] Client disconnected: ${socket.id}`);
      });
    });
  }

  broadcastToTournament(tournamentId: string, message: any): void {
    this.io.to(`tournament:${tournamentId}`).emit("message", message);
    console.log(`[WS] Broadcast to tournament ${tournamentId}:`, message.type);
  }

  broadcastToGame(gameId: string, message: any): void {
    this.io.to(`game:${gameId}`).emit("message", message);
    console.log(`[WS] Broadcast to game ${gameId}:`, message.type);
  }

  startHeartbeat(): void {
    console.log(
      "[WS] Heartbeat started (Socket.IO handles this automatically)"
    );
  }

  getTournamentRoomCount(): number {
    let count = 0;
    this.io.of("/").adapter.rooms.forEach((_, key) => {
      if (key.startsWith("tournament:")) count++;
    });
    return count;
  }

  getGameRoomCount(): number {
    let count = 0;
    this.io.of("/").adapter.rooms.forEach((_, key) => {
      if (key.startsWith("game:")) count++;
    });
    return count;
  }

  getActiveConnections(): number {
    return this.io.of("/").sockets.size;
  }
}
