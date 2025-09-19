import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import bcrypt from "bcryptjs";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";

const prisma = new PrismaClient();

const fastify = Fastify({
  logger: true,
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
    });

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || "fallback-secret-key",
    });

    fastify.decorate("bcrypt", bcrypt);

    fastify.decorate("prisma", prisma);

    fastify.decorate("authenticate", async function (request: any, reply: any) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    await fastify.register(authRoutes, { prefix: "/auth" });
    await fastify.register(userRoutes, { prefix: "/users" });

    fastify.get("/health", async (request, reply) => {
      return { status: "OK", timestamp: new Date().toISOString() };
    });

    fastify.addHook("onClose", async (instance) => {
      await prisma.$disconnect();
    });

    const port = parseInt(process.env.PORT || "3000");
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Server is running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
