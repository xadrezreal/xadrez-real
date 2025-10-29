import { FastifyInstance } from "fastify";
import { z } from "zod";
import "../types/fastify";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/register", async (request: any, reply: any) => {
    try {
      const { name, email, password } = registerSchema.parse(request.body);

      const existingUser = await fastify.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(400).send({
          error: "Usuário já existe com este email",
        });
      }

      const hashedPassword = await fastify.bcrypt.hash(password, 12);

      const user = await fastify.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "FREEMIUM",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const token = fastify.jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        { expiresIn: "7d" }
      );

      return reply.status(201).send({
        message: "Usuário criado com sucesso",
        user,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: error,
        });
      }

      fastify.log.error(error);
      return reply.status(500).send({
        error: "Erro interno do servidor",
      });
    }
  });

  fastify.post("/login", async (request: any, reply: any) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return reply.status(401).send({
          error: "Email ou senha incorretos",
        });
      }

      const isValidPassword = await fastify.bcrypt.compare(
        password,
        user.password
      );

      if (!isValidPassword) {
        return reply.status(401).send({
          error: "Email ou senha incorretos",
        });
      }

      const token = fastify.jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        { expiresIn: "7d" }
      );

      return reply.send({
        message: "Login realizado com sucesso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: error,
        });
      }

      fastify.log.error(error);
      return reply.status(500).send({
        error: "Erro interno do servidor",
      });
    }
  });

  fastify.get(
    "/me",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: any, reply: any) => {
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            balance: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          return reply.status(404).send({
            error: "Usuário não encontrado",
          });
        }

        return reply.send(user);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro interno do servidor",
        });
      }
    }
  );
}
