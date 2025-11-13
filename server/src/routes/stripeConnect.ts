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
              account.capabilities?.transfers === "active"
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

        const canReceivePayments = account.capabilities?.transfers === "active";

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

  // Novo endpoint para verificar saldo real no Stripe
  fastify.get(
    "/connect/balance",
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
          return reply.status(400).send({
            error: "Conta Connect não encontrada",
          });
        }

        const balance = await stripe.balance.retrieve({
          stripeAccount: user.stripeAccountId,
        });

        // Saldo disponível em centavos, converter para reais
        const availableBalance =
          balance.available.reduce((sum, item) => sum + item.amount, 0) / 100;

        const pendingBalance =
          balance.pending.reduce((sum, item) => sum + item.amount, 0) / 100;

        return reply.send({
          available: availableBalance,
          pending: pendingBalance,
          currency: "BRL",
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Erro ao verificar saldo",
          details: error.message,
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

        if (amount < 5) {
          return reply.status(400).send({
            error: "O valor mínimo para saque é R$ 5,00",
          });
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

        if (account.capabilities?.transfers !== "active") {
          return reply.status(400).send({
            error: "Sua conta ainda não foi verificada pelo Stripe",
          });
        }

        // Verificar saldo REAL no Stripe
        const balance = await stripe.balance.retrieve({
          stripeAccount: user.stripeAccountId,
        });

        const availableBalance =
          balance.available.reduce((sum, item) => sum + item.amount, 0) / 100;

        if (availableBalance < amount) {
          return reply.status(400).send({
            error: "Saldo insuficiente no Stripe",
            availableBalance: availableBalance,
            requestedAmount: amount,
          });
        }

        // Criar payout DA conta Connect do usuário para a conta bancária dele
        const payout = await stripe.payouts.create(
          {
            amount: Math.round(amount * 100),
            currency: "brl",
            description: `Saque Xadrez Real - R$ ${amount.toFixed(2)}`,
            statement_descriptor: "XADREZ REAL",
            method: "standard", // standard = 2-7 dias úteis
          },
          {
            stripeAccount: user.stripeAccountId, // IMPORTANTE: fazer payout DA conta do usuário
          }
        );

        await fastify.prisma.$transaction(async (prisma) => {
          // Atualizar saldo interno (controle)
          await prisma.user.update({
            where: { id: userId },
            data: {
              balance: {
                decrement: amount,
              },
            },
          });

          // Registrar transação
          await prisma.transaction.create({
            data: {
              userId,
              amount: -amount,
              type: "WITHDRAWAL",
              status: "PENDING",
              description: `Saque para conta bancária`,
              metadata: {
                stripePayoutId: payout.id,
                stripeAccountId: user.stripeAccountId,
                arrivalDate: payout.arrival_date,
              },
            },
          });
        });

        return reply.send({
          message: "Saque realizado com sucesso",
          payoutId: payout.id,
          amount,
          newBalance: user.balance - amount,
          arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
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
                  account.capabilities?.transfers === "active"
                    ? "active"
                    : "pending",
              },
            });

            fastify.log.info(
              `Account ${account.id} updated to status: ${
                account.capabilities?.transfers === "active"
                  ? "active"
                  : "pending"
              }`
            );
            break;

          case "payout.paid":
            const paidPayout = event.data.object as Stripe.Payout;

            // Atualizar status da transação para COMPLETED
            await fastify.prisma.transaction.updateMany({
              where: {
                metadata: {
                  path: ["stripePayoutId"],
                  equals: paidPayout.id,
                },
              },
              data: {
                status: "COMPLETED",
              },
            });

            fastify.log.info(`Payout ${paidPayout.id} was paid`);
            break;

          case "payout.failed":
            const failedPayout = event.data.object as Stripe.Payout;

            // Atualizar status da transação para FAILED e devolver saldo
            const failedTransaction =
              await fastify.prisma.transaction.findFirst({
                where: {
                  metadata: {
                    path: ["stripePayoutId"],
                    equals: failedPayout.id,
                  },
                },
                include: {
                  user: true,
                },
              });

            if (failedTransaction) {
              await fastify.prisma.$transaction(async (prisma) => {
                // Devolver o saldo
                await prisma.user.update({
                  where: { id: failedTransaction.userId },
                  data: {
                    balance: {
                      increment: Math.abs(failedTransaction.amount),
                    },
                  },
                });

                // Atualizar status da transação
                await prisma.transaction.update({
                  where: { id: failedTransaction.id },
                  data: {
                    status: "FAILED",
                    description: `Saque falhou: ${failedPayout.failure_message}`,
                  },
                });
              });
            }

            fastify.log.error(
              `Payout ${failedPayout.id} failed: ${failedPayout.failure_message}`
            );
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
