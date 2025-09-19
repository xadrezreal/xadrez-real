import { PrismaClient } from "@prisma/client";
import { FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    bcrypt: typeof bcrypt;
    authenticate: (request: FastifyRequest, reply: any) => Promise<void>;
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
