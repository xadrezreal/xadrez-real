import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { stripe } from "../config/stripe";

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface CreateCheckoutBody {
  priceId: string;
  amount: number;
}

export async function paymentRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/create-checkout",
    { preHandler: [fastify.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { priceId, amount } = request.body as CreateCheckoutBody;
        const userId = request.user.id;

        if (!priceId) {
          return reply.code(400).send({
            error: "Price ID é obrigatório",
          });
        }

        if (!amount || amount < 1) {
          return reply.code(400).send({
            error: "Valor mínimo de depósito é R$ 1,00",
          });
        }

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true },
        });

        if (!user) {
          return reply.code(404).send({
            error: "Usuário não encontrado",
          });
        }

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendUrl}/wallet?deposit_cancelled=true`,
          metadata: {
            userId: userId,
            amount: amount.toString(),
            type: "deposit",
          },
          customer_email: user.email,
        });

        fastify.log.info({
          message: "[PAYMENT] Checkout session created",
          sessionId: session.id,
          userId,
          amount,
          priceId,
        });

        return reply.send({
          url: session.url,
          sessionId: session.id,
        });
      } catch (error: any) {
        fastify.log.error("[PAYMENT] Error creating checkout:", error);
        return reply.code(500).send({
          error: "Erro ao criar sessão de pagamento",
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
      const sig = request.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_PAYMENTS;

      if (!webhookSecret) {
        fastify.log.error("[WEBHOOK] Webhook secret not configured");
        return reply.code(500).send({
          error: "Webhook secret não configurado",
        });
      }

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
          webhookSecret
        );
      } catch (err: any) {
        fastify.log.error("[WEBHOOK] Signature verification failed:", err);
        return reply.code(400).send({
          error: `Webhook Error: ${err.message}`,
        });
      }

      fastify.log.info({
        message: "[WEBHOOK] Event received",
        eventType: event.type,
        eventId: event.id,
      });

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;

        fastify.log.info({
          message: "[WEBHOOK] Checkout completed",
          sessionId: session.id,
          metadata: session.metadata,
        });

        if (session.metadata?.type === "deposit") {
          try {
            const userId = session.metadata.userId;
            const amount = parseFloat(session.metadata.amount);

            if (!userId || !amount) {
              fastify.log.error("[WEBHOOK] Invalid metadata", session.metadata);
              return reply.code(400).send({ error: "Metadata inválido" });
            }

            await fastify.prisma.user.update({
              where: { id: userId },
              data: {
                balance: {
                  increment: amount,
                },
              },
            });

            await fastify.prisma.transaction.create({
              data: {
                userId: userId,
                amount: amount,
                type: "DEPOSIT",
                status: "COMPLETED",
                stripeSessionId: session.id,
                description: `Depósito via Stripe - R$ ${amount.toFixed(2)}`,
              },
            });

            fastify.log.info({
              message: "[WEBHOOK] Balance updated successfully",
              userId,
              amount,
              newBalance: (
                await fastify.prisma.user.findUnique({
                  where: { id: userId },
                  select: { balance: true },
                })
              )?.balance,
            });
          } catch (error: any) {
            fastify.log.error("[WEBHOOK] Error updating balance:", error);
            console.error("[WEBHOOK] FULL ERROR:", error);
            return reply.code(500).send({
              error: "Erro ao processar pagamento",
            });
          }
        }
      }

      return reply.send({ received: true });
    }
  );

  fastify.get(
    "/verify-session/:sessionId",
    { preHandler: [fastify.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { sessionId } = request.params as { sessionId: string };
        const userId = request.user.id;

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.metadata?.userId !== userId) {
          return reply.code(403).send({
            error: "Não autorizado",
          });
        }

        if (session.payment_status === "paid") {
          const amount = parseFloat(session.metadata?.amount || "0");

          return reply.send({
            success: true,
            amount: amount,
            status: session.payment_status,
          });
        }

        return reply.send({
          success: false,
          status: session.payment_status,
        });
      } catch (error: any) {
        fastify.log.error("[PAYMENT] Error verifying session:", error);
        return reply.code(500).send({
          error: "Erro ao verificar sessão",
          message: error.message,
        });
      }
    }
  );

  fastify.get(
    "/transactions",
    { preHandler: [fastify.authenticate] },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.id;
        const { limit = 10, offset = 0 } = request.query as {
          limit?: number;
          offset?: number;
        };

        const transactions = await fastify.prisma.transaction.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: Number(limit),
          skip: Number(offset),
          select: {
            id: true,
            amount: true,
            type: true,
            status: true,
            description: true,
            createdAt: true,
          },
        });

        const total = await fastify.prisma.transaction.count({
          where: { userId },
        });

        return reply.send({
          transactions,
          pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset),
          },
        });
      } catch (error: any) {
        fastify.log.error("[PAYMENT] Error fetching transactions:", error);
        return reply.code(500).send({
          error: "Erro ao buscar transações",
          message: error.message,
        });
      }
    }
  );
}
