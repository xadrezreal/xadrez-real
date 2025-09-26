import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import bcrypt from "bcryptjs";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/user.js";
import { tournamentRoutes } from "./routes/tournament.js";
import { websocketRoutes } from "./websocket/webSocketRoutes";
import { TournamentUpdater } from "./routes/tournamentUpdater";
import { gameRoutes } from "./routes/game.js";

const prisma = new PrismaClient();
const fastify = Fastify({ logger: { level: "info" } });

fastify.addHook("preHandler", async (request, reply) => {
  fastify.log.info(
    `${request.method} ${request.url} - Body: ${JSON.stringify(request.body)}`
  );
  const authHeader = request.headers.authorization;
  if (authHeader) {
    fastify.log.info(
      `Authorization header present: ${authHeader.substring(0, 20)}...`
    );
  }
});

fastify.setErrorHandler(async (error, request, reply) => {
  fastify.log.error(
    {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      body: request.body,
    },
    "Erro capturado"
  );
  reply.status(500).send({
    error: "Internal Server Error",
    message: error.message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

const start = async () => {
  try {
    await fastify.register(cors, {
      origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:3001",
        "http://69.62.95.68",
        "https://69.62.95.68",
        "http://xadrezreal.com",
        "https://xadrezreal.com",
        "http://www.xadrezreal.com",
        "https://www.xadrezreal.com",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    });

    await fastify.register(websocket);

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || "fallback-secret-key",
    });

    fastify.decorate("bcrypt", bcrypt);
    fastify.decorate("prisma", prisma);

    fastify.decorate("authenticate", async function (request, reply) {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
          return reply
            .status(401)
            .send({
              error: "Unauthorized",
              message: "Token de autorização necessário",
            });
        }
        if (!authHeader.startsWith("Bearer ")) {
          return reply
            .status(401)
            .send({
              error: "Unauthorized",
              message: "Formato de token inválido",
            });
        }
        const decoded = (await request.jwtVerify()) as { id: string } | string;
        if (
          typeof decoded === "object" &&
          decoded !== null &&
          "id" in decoded
        ) {
          fastify.log.info(`User authenticated successfully: ${decoded.id}`);
        }
      } catch (err: any) {
        fastify.log.error("JWT verification failed:", err);
        return reply
          .status(401)
          .send({ error: "Unauthorized", message: "Token inválido" });
      }
    });

    await fastify.register(websocketRoutes);
    await fastify.register(authRoutes, { prefix: "/auth" });
    await fastify.register(userRoutes, { prefix: "/users" });
    await fastify.register(tournamentRoutes, { prefix: "/tournaments" });
    await fastify.register(gameRoutes);

    fastify.get("/health", async () => {
      return { status: "OK", timestamp: new Date().toISOString() };
    });

    const tournamentUpdater = new TournamentUpdater(
      prisma,
      fastify.wsManager,
      fastify.log
    );
    tournamentUpdater.start(10000);

    fastify.addHook("onClose", async () => {
      tournamentUpdater.stop();
      await prisma.$disconnect();
    });

    const port = parseInt(process.env.PORT || "3000");
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Server is running on http://localhost:${port}`);
    console.log(`🔌 WebSocket available on ws://localhost:${port}/ws/`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
