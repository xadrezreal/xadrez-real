import { FastifyInstance } from "fastify";
import { stripe } from "../config/stripe";

export async function subscriptionRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/checkout",
    { preHandler: [fastify.authenticate] },
    async (request: any, reply: any) => {
      const userId = request.user.id;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      const session = await stripe.checkout.sessions.create({
        customer_email: user!.email,
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

      return { url: session.url };
    }
  );

  fastify.post(
    "/portal",
    { preHandler: [fastify.authenticate] },
    async (request: any, reply: any) => {
      const userId = request.user.id;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user?.stripeCustomerId) {
        return reply.code(400).send({ error: "Sem assinatura ativa" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL}/profile`,
      });

      return { url: session.url };
    }
  );

  fastify.post("/webhook", async (request: any, reply: any) => {
    const sig = request.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      fastify.log.error("Webhook error:", err.message);
      return reply.code(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        await fastify.prisma.user.update({
          where: { id: session?.metadata?.userId },
          data: {
            role: "PREMIUM",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
        });
        break;

      case "customer.subscription.deleted":
        const subscription = event.data.object;
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
        }
        break;
    }

    return reply.send({ received: true });
  });
}
