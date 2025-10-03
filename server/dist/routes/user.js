"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const zod_1 = require("zod");
require("../types/fastify");
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    email: zod_1.z.string().email().optional(),
});
const updateRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(["FREEMIUM", "PREMIUM"]),
});
async function userRoutes(fastify) {
    fastify.get("/", {
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const users = await fastify.prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
            return reply.send({ users });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: "Erro interno do servidor",
            });
        }
    });
    fastify.get("/:id", {
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const user = await fastify.prisma.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!user) {
                return reply.status(404).send({
                    error: "Usuário não encontrado",
                });
            }
            return reply.send({ user });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: "Erro interno do servidor",
            });
        }
    });
    fastify.put("/:id", {
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const updateData = updateUserSchema.parse(request.body);
            if (request.user.id !== id) {
                return reply.status(403).send({
                    error: "Sem permissão para atualizar este usuário",
                });
            }
            if (updateData.email) {
                const existingUser = await fastify.prisma.user.findFirst({
                    where: {
                        email: updateData.email,
                        NOT: { id },
                    },
                });
                if (existingUser) {
                    return reply.status(400).send({
                        error: "Email já está em uso",
                    });
                }
            }
            const updatedUser = await fastify.prisma.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    updatedAt: true,
                },
            });
            return reply.send({
                message: "Usuário atualizado com sucesso",
                user: updatedUser,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    fastify.patch("/:id/role", {
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
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
                    updatedAt: true,
                },
            });
            return reply.send({
                message: `Role atualizada para ${role}`,
                user: updatedUser,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
    fastify.delete("/:id", {
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            if (request.user.id !== id) {
                return reply.status(403).send({
                    error: "Sem permissão para deletar este usuário",
                });
            }
            await fastify.prisma.user.delete({
                where: { id },
            });
            return reply.send({
                message: "Usuário deletado com sucesso",
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: "Erro interno do servidor",
            });
        }
    });
}
//# sourceMappingURL=user.js.map