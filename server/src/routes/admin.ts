import { FastifyInstance } from "fastify";
import { z } from "zod";
import { isAdmin } from "../utils/roleHelper";
import "../types/fastify";

const promoteToAdminSchema = z.object({
  userId: z.string(),
});

const updateRoleSchema = z.object({
  role: z.enum(["FREEMIUM", "PREMIUM", "ADMIN"]),
});

export async function adminRoutes(fastify: FastifyInstance) {
  const requireAdmin = async (request: any, reply: any) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { role: true },
    });

    if (!user || !isAdmin(user.role)) {
      return reply.status(403).send({
        error: "Acesso negado",
        message: "Apenas administradores podem acessar esta rota",
      });
    }
  };

  fastify.post(
    "/promote-admin",
    {
      preHandler: [fastify.authenticate, requireAdmin],
    },
    async (request: any, reply: any) => {
      try {
        const { userId } = promoteToAdminSchema.parse(request.body);

        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: { role: "ADMIN" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });

        return reply.send({
          message: "Usuário promovido a ADMIN com sucesso",
          user: updatedUser,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro ao promover usuário",
        });
      }
    }
  );

  fastify.get(
    "/users",
    {
      preHandler: [fastify.authenticate, requireAdmin],
    },
    async (request: any, reply: any) => {
      try {
        const users = await fastify.prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            balance: true,
            createdAt: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return reply.send({ users });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro ao listar usuários",
        });
      }
    }
  );

  fastify.patch(
    "/users/:id/role",
    {
      preHandler: [fastify.authenticate, requireAdmin],
    },
    async (request: any, reply: any) => {
      try {
        const { id } = request.params;
        const { role } = updateRoleSchema.parse(request.body);

        const updatedUser = await fastify.prisma.user.update({
          where: { id },
          data: { role },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });

        return reply.send({
          message: `Role atualizada para ${role}`,
          user: updatedUser,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro ao atualizar role",
        });
      }
    }
  );

  fastify.delete(
    "/users/:id",
    {
      preHandler: [fastify.authenticate, requireAdmin],
    },
    async (request: any, reply: any) => {
      try {
        const { id } = request.params;

        if (request.user.id === id) {
          return reply.status(400).send({
            error: "Você não pode deletar sua própria conta como admin",
          });
        }

        await fastify.prisma.user.delete({
          where: { id },
        });

        return reply.send({
          message: "Usuário deletado com sucesso",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro ao deletar usuário",
        });
      }
    }
  );
}
