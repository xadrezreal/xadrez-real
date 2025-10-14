import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { stripe } from "../config/stripe";

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export async function subscriptionRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/checkout",
    { preHandler: [fastify.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.id;

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.code(404).send({ error: "Usuário não encontrado" });
        }

        if (user.role === "PREMIUM") {
          return reply.code(400).send({ error: "Usuário já é premium" });
        }

        if (user.stripeCustomerId && user.stripeSubscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              user.stripeSubscriptionId
            );
            if (subscription.status === "active") {
              return reply.code(400).send({ error: "Assinatura já ativa" });
            }
          } catch (err: any) {
            fastify.log.warn("Erro ao verificar assinatura existente:", err);
          }
        }

        const session = await stripe.checkout.sessions.create({
          customer_email: user.email,
          mode: "subscription",
          line_items: [
            {
              price: process.env.STRIPE_PRICE_ID!,
              quantity: 1,
            },
          ],
          success_url: `${process.env.FRONTEND_URL}/profile?upgraded=true`,
          cancel_url: `${process.env.FRONTEND_URL}/profile`,
          metadata: {
            userId: userId,
          },
        });

        return reply.send({ url: session.url });
      } catch (error: any) {
        fastify.log.error("Erro ao criar checkout:", error);
        return reply.code(500).send({
          error: "Erro ao criar sessão de checkout",
          message: error.message,
        });
      }
    }
  );

  // Rota do portal
  fastify.post(
    "/portal",
    { preHandler: [fastify.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.id;

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.code(404).send({ error: "Usuário não encontrado" });
        }

        if (!user.stripeCustomerId) {
          return reply.code(400).send({ error: "Sem assinatura ativa" });
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: `${process.env.FRONTEND_URL}/profile`,
        });

        return reply.send({ url: session.url });
      } catch (error: any) {
        fastify.log.error("Erro ao criar portal:", error);
        return reply.code(500).send({
          error: "Erro ao acessar portal",
          message: error.message,
        });
      }
    }
  );

  fastify.post(
    "/webhook",
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sig = request.headers["stripe-signature"];

        if (!sig) {
          return reply.code(400).send({ error: "Assinatura ausente" });
        }

        if (!request.rawBody) {
          return reply.code(400).send({ error: "Body ausente" });
        }

        let event;

        try {
          event = stripe.webhooks.constructEvent(
            request.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
          );
        } catch (err: any) {
          fastify.log.error("Webhook signature verification failed:", err);
          return reply.code(400).send(`Webhook Error: ${err.message}`);
        }

        fastify.log.info(`Webhook recebido: ${event.type}`);

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as any;

            if (!session.metadata?.userId) {
              fastify.log.error("userId não encontrado nos metadados");
              break;
            }

            await fastify.prisma.user.update({
              where: { id: session.metadata.userId },
              data: {
                role: "PREMIUM",
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
              },
            });

            fastify.log.info(
              `Usuário ${session.metadata.userId} atualizado para PREMIUM`
            );
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as any;

            const user = await fastify.prisma.user.findFirst({
              where: { stripeSubscriptionId: subscription.id },
            });

            if (user) {
              await fastify.prisma.user.update({
                where: { id: user.id },
                data: {
                  role: "FREEMIUM",
                  stripeSubscriptionId: null,
                },
              });

              fastify.log.info(`Usuário ${user.id} rebaixado para FREEMIUM`);
            }
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object as any;

            const user = await fastify.prisma.user.findFirst({
              where: { stripeSubscriptionId: subscription.id },
            });

            if (user) {
              if (
                subscription.status === "canceled" ||
                subscription.status === "unpaid"
              ) {
                await fastify.prisma.user.update({
                  where: { id: user.id },
                  data: {
                    role: "FREEMIUM",
                  },
                });
                fastify.log.info(
                  `Usuário ${user.id} rebaixado para FREEMIUM (status: ${subscription.status})`
                );
              }
            }
            break;
          }

          default:
            fastify.log.info(`Evento não tratado: ${event.type}`);
        }

        return reply.send({ received: true });
      } catch (error: any) {
        fastify.log.error("Erro no webhook:", error);
        return reply.code(500).send({
          error: "Erro ao processar webhook",
          message: error.message,
        });
      }
    }
  );
}
