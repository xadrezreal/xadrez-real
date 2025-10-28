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
  // ==================== CHECKOUT ====================
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

        // Verifica se já tem assinatura ativa
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

        // Cria sessão de checkout
        const session = await stripe.checkout.sessions.create({
          customer: user.stripeCustomerId || undefined, // ✅ Reutiliza customer se existir
          customer_email: user.stripeCustomerId ? undefined : user.email, // ✅ Email só para novos
          mode: "subscription",
          line_items: [
            {
              price: process.env.STRIPE_PRICE_ID!,
              quantity: 1,
            },
          ],
          success_url: `${process.env.FRONTEND_URL}/profile?upgraded=true`,
          cancel_url: `${process.env.FRONTEND_URL}/profile?cancelled=true`,
          allow_promotion_codes: true, // ✅ Permite cupons de desconto
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

  // ==================== PORTAL ====================
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

  // ==================== CANCELAR ====================
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

  // ==================== WEBHOOK ====================
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

        // ✅ IDEMPOTÊNCIA - Verifica se evento já foi processado
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

        // ==================== PROCESSAR EVENTOS ====================
        switch (event.type) {
          // ✅ Salva o customer ID quando checkout completa
          case "checkout.session.completed": {
            const session = event.data.object as any;

            if (session.metadata?.userId) {
              await fastify.prisma.user.update({
                where: { id: session.metadata.userId },
                data: {
                  stripeCustomerId: session.customer as string,
                  // ⚠️ NÃO torna PREMIUM aqui - espera customer.subscription.created
                },
              });

              fastify.log.info(
                `Customer ID salvo para usuário ${session.metadata.userId}`
              );
            }
            break;
          }

          // ✅ Torna PREMIUM apenas quando assinatura é criada E está ativa
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

          // ✅ Remove PREMIUM quando assinatura é deletada
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

          // ✅ Atualiza status da assinatura
          case "customer.subscription.updated": {
            const subscription = event.data.object as any;

            const user = await fastify.prisma.user.findFirst({
              where: { stripeSubscriptionId: subscription.id },
            });

            if (user) {
              // Log de cancelamento agendado
              if (subscription.cancel_at_period_end) {
                fastify.log.info({
                  message: "Assinatura agendada para cancelamento",
                  userId: user.id,
                  cancelAt: new Date(
                    subscription.current_period_end * 1000
                  ).toISOString(),
                });
              }

              // Remove premium se status mudou para canceled/unpaid
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

              // Reativa se voltou a ficar ativo
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

          // ✅ Trata falha de pagamento
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

              // Aqui você pode enviar email ao usuário notificando
              // Stripe tentará cobrar automaticamente
            }
            break;
          }

          default:
            fastify.log.info(`Evento não tratado: ${event.type}`);
        }

        // ✅ Marca evento como processado
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
