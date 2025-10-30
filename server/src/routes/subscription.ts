import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { stripe } from "../config/stripe";
import { SUBSCRIPTION_PLANS, SubscriptionPlanId } from "../config/stripe-plans";

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface CheckoutBody {
  planId: SubscriptionPlanId;
}

export async function subscriptionRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/checkout",
    { preHandler: [fastify.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { planId } = request.body as CheckoutBody;
        const userId = request.user.id;

        if (!planId || !SUBSCRIPTION_PLANS[planId]) {
          return reply.code(400).send({ error: "Plano inválido" });
        }

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

        const plan = SUBSCRIPTION_PLANS[planId];

        const session = await stripe.checkout.sessions.create({
          customer: user.stripeCustomerId || undefined,
          customer_email: user.stripeCustomerId ? undefined : user.email,
          mode: "subscription",
          line_items: [
            {
              price: plan.priceId,
              quantity: 1,
            },
          ],
          success_url: `${process.env.FRONTEND_URL}/subscription?upgraded=true`,
          cancel_url: `${process.env.FRONTEND_URL}/subscription?cancelled=true`,
          allow_promotion_codes: true,
          metadata: {
            userId: userId,
            planId: planId,
          },
        });

        fastify.log.info({
          message: "[SUBSCRIPTION] Checkout session created",
          userId,
          planId,
          sessionId: session.id,
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
          return_url: `${process.env.FRONTEND_URL}/subscription`,
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
    "/cancel",
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

        if (user.role !== "PREMIUM") {
          return reply.code(400).send({ error: "Você não é premium" });
        }

        if (!user.stripeSubscriptionId) {
          return reply
            .code(400)
            .send({ error: "Nenhuma assinatura encontrada" });
        }

        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        fastify.log.info(
          `Assinatura agendada para cancelamento: usuário ${userId}`
        );

        return reply.send({
          success: true,
          message:
            "Assinatura cancelada. Você manterá os benefícios até o fim do período.",
        });
      } catch (error: any) {
        fastify.log.error("Erro ao cancelar assinatura:", error);
        return reply.code(500).send({
          error: "Erro ao cancelar assinatura",
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

        const existingEvent = await fastify.prisma.stripeEvent.findUnique({
          where: { eventId: event.id },
        });

        if (existingEvent) {
          fastify.log.info(`Evento ${event.id} já processado, ignorando`);
          return reply.send({ received: true });
        }

        fastify.log.info({
          message: "Webhook recebido",
          eventType: event.type,
          eventId: event.id,
          timestamp: new Date().toISOString(),
        });

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as any;

            if (session.metadata?.userId) {
              await fastify.prisma.user.update({
                where: { id: session.metadata.userId },
                data: {
                  stripeCustomerId: session.customer as string,
                },
              });

              fastify.log.info(
                `Customer ID salvo para usuário ${session.metadata.userId}`
              );
            }
            break;
          }

          case "customer.subscription.created": {
            const subscription = event.data.object as any;

            const user = await fastify.prisma.user.findFirst({
              where: { stripeCustomerId: subscription.customer as string },
            });

            if (user && subscription.status === "active") {
              await fastify.prisma.user.update({
                where: { id: user.id },
                data: {
                  role: "PREMIUM",
                  stripeSubscriptionId: subscription.id,
                },
              });

              fastify.log.info({
                message: "Usuário atualizado para PREMIUM",
                userId: user.id,
                subscriptionId: subscription.id,
              });
            }
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

              fastify.log.info({
                message: "Usuário rebaixado para FREEMIUM",
                userId: user.id,
                reason: "subscription.deleted",
              });
            }
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object as any;

            const user = await fastify.prisma.user.findFirst({
              where: { stripeSubscriptionId: subscription.id },
            });

            if (user) {
              if (subscription.cancel_at_period_end) {
                fastify.log.info({
                  message: "Assinatura agendada para cancelamento",
                  userId: user.id,
                  cancelAt: new Date(
                    subscription.current_period_end * 1000
                  ).toISOString(),
                });
              }

              if (
                subscription.status === "canceled" ||
                subscription.status === "unpaid" ||
                subscription.status === "past_due"
              ) {
                await fastify.prisma.user.update({
                  where: { id: user.id },
                  data: {
                    role: "FREEMIUM",
                  },
                });

                fastify.log.info({
                  message: "Usuário rebaixado para FREEMIUM",
                  userId: user.id,
                  reason: `status: ${subscription.status}`,
                });
              }

              if (subscription.status === "active" && user.role !== "PREMIUM") {
                await fastify.prisma.user.update({
                  where: { id: user.id },
                  data: {
                    role: "PREMIUM",
                  },
                });

                fastify.log.info({
                  message: "Usuário reativado para PREMIUM",
                  userId: user.id,
                  reason: "subscription reativada",
                });
              }
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as any;

            const user = await fastify.prisma.user.findFirst({
              where: { stripeCustomerId: invoice.customer as string },
            });

            if (user) {
              fastify.log.warn({
                message: "Falha no pagamento",
                userId: user.id,
                attemptCount: invoice.attempt_count,
                nextPaymentAttempt: invoice.next_payment_attempt
                  ? new Date(invoice.next_payment_attempt * 1000).toISOString()
                  : null,
              });
            }
            break;
          }

          default:
            fastify.log.info(`Evento não tratado: ${event.type}`);
        }

        await fastify.prisma.stripeEvent.create({
          data: {
            eventId: event.id,
            type: event.type,
          },
        });

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
