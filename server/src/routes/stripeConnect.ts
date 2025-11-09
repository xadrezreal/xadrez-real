import { FastifyInstance } from "fastify";
import Stripe from "stripe";
import "../types/fastify";
import { stripe } from "../config/stripe";

export async function stripeConnectRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/connect/account",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: any, reply: any) => {
      try {
        const userId = request.user.id;

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.status(404).send({ error: "Usuário não encontrado" });
        }

        if (user.stripeAccountId) {
          const account = await stripe.accounts.retrieve(user.stripeAccountId);
          return reply.send({
            accountId: user.stripeAccountId,
            accountStatus:
              account.charges_enabled && account.payouts_enabled
                ? "active"
                : "pending",
            accountLink: null,
          });
        }

        const account = await stripe.accounts.create({
          type: "express",
          country: "BR",
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "individual",
        });

        await fastify.prisma.user.update({
          where: { id: userId },
          data: {
            stripeAccountId: account.id,
            stripeAccountStatus: "pending",
          },
        });

        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${process.env.FRONTEND_URL}/wallet`,
          return_url: `${process.env.FRONTEND_URL}/wallet/connect/callback`,
          type: "account_onboarding",
        });

        return reply.send({
          accountId: account.id,
          accountStatus: "pending",
          accountLink: accountLink.url,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro ao criar conta conectada",
          details: error.message,
        });
      }
    }
  );

  fastify.get(
    "/connect/status",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: any, reply: any) => {
      try {
        const userId = request.user.id;

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user || !user.stripeAccountId) {
          return reply.send({
            connected: false,
            accountStatus: "not_connected",
          });
        }

        const account = await stripe.accounts.retrieve(user.stripeAccountId);

        const canReceivePayments =
          account.charges_enabled && account.payouts_enabled;

        await fastify.prisma.user.update({
          where: { id: userId },
          data: {
            stripeAccountStatus: canReceivePayments ? "active" : "pending",
          },
        });

        return reply.send({
          connected: true,
          accountId: user.stripeAccountId,
          accountStatus: canReceivePayments ? "active" : "pending",
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro ao verificar status da conta",
        });
      }
    }
  );

  fastify.post(
    "/withdraw",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: any, reply: any) => {
      try {
        const userId = request.user.id;
        const { amount } = request.body;

        if (!amount || amount <= 0) {
          return reply.status(400).send({ error: "Valor inválido" });
        }

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.status(404).send({ error: "Usuário não encontrado" });
        }

        if (!user.stripeAccountId) {
          return reply.status(400).send({
            error: "Você precisa conectar uma conta bancária primeiro",
          });
        }

        const account = await stripe.accounts.retrieve(user.stripeAccountId);

        if (!account.charges_enabled || !account.payouts_enabled) {
          return reply.status(400).send({
            error: "Sua conta ainda não foi verificada pelo Stripe",
          });
        }

        if (user.balance < amount) {
          return reply.status(400).send({
            error: "Saldo insuficiente",
            currentBalance: user.balance,
            requestedAmount: amount,
          });
        }

        const transfer = await stripe.transfers.create({
          amount: Math.round(amount * 100),
          currency: "brl",
          destination: user.stripeAccountId,
          description: `Saque da plataforma Xadrez Real`,
        });

        await fastify.prisma.$transaction(async (prisma) => {
          await prisma.user.update({
            where: { id: userId },
            data: {
              balance: {
                decrement: amount,
              },
            },
          });

          await prisma.transaction.create({
            data: {
              userId,
              amount: -amount,
              type: "WITHDRAWAL",
              status: "COMPLETED",
              description: `Saque para conta bancária`,
              metadata: {
                stripeTransferId: transfer.id,
                stripeAccountId: user.stripeAccountId,
              },
            },
          });
        });

        return reply.send({
          message: "Saque realizado com sucesso",
          transferId: transfer.id,
          amount,
          newBalance: user.balance - amount,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro ao processar saque",
          details: error.message,
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
    async (request: any, reply: any) => {
      const sig = request.headers["stripe-signature"];
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          request.rawBody,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET_CONNECT!
        );
      } catch (err: any) {
        fastify.log.error(
          `Webhook signature verification failed: ${err.message}`
        );
        return reply.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        switch (event.type) {
          case "account.updated":
            const account = event.data.object as Stripe.Account;

            await fastify.prisma.user.updateMany({
              where: { stripeAccountId: account.id },
              data: {
                stripeAccountStatus:
                  account.charges_enabled && account.payouts_enabled
                    ? "active"
                    : "pending",
              },
            });

            fastify.log.info(
              `Account ${account.id} updated to status: ${
                account.charges_enabled && account.payouts_enabled
                  ? "active"
                  : "pending"
              }`
            );
            break;

          case "account.external_account.created":
            fastify.log.info(
              `External account created for ${event.data.object.id}`
            );
            break;

          case "account.external_account.updated":
            fastify.log.info(
              `External account updated for ${event.data.object.id}`
            );
            break;

          case "payout.paid":
            fastify.log.info(`Payout ${event.data.object.id} was paid`);
            break;

          case "payout.failed":
            const payout = event.data.object as Stripe.Payout;
            fastify.log.error(
              `Payout ${payout.id} failed: ${payout.failure_message}`
            );
            break;

          case "transfer.created":
            fastify.log.info(`Transfer ${event.data.object.id} created`);
            break;

          case "transfer.updated":
            fastify.log.info(`Transfer ${event.data.object.id} updated`);
            break;

          default:
            fastify.log.info(`Unhandled event type ${event.type}`);
        }

        return reply.send({ received: true });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Webhook processing failed" });
      }
    }
  );
}
