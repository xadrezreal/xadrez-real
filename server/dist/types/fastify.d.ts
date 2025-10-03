import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { WebSocketManager } from "../websocket/webSocketManager";
declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
        bcrypt: typeof bcrypt;
        wsManager: WebSocketManager;
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: {
            id: string;
            email: string;
            role: string;
        };
        user: {
            id: string;
            email: string;
            role: string;
        };
    }
}
//# sourceMappingURL=fastify.d.ts.map