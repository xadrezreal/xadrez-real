/**
 * Serviço de Pagamentos de Torneios com Split Payment
 *
 * Fluxo:
 * 1. Usuário paga entrada → Stripe divide automaticamente:
 *    - Taxa da casa → Conta principal Xadrez Real
 *    - Resto → Conta Stripe Connect do participante (fica em escrow)
 *
 * 2. Torneio termina → Prêmios são transferidos entre contas Connect
 *
 * 3. Usuário pode sacar → Dinheiro já está na conta Connect dele
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { calculatePrizes } from './prizeCalculator';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const prisma = new PrismaClient();

/**
 * Cria PaymentIntent para entrada em torneio com split payment
 */
export async function createTournamentEntryPayment(
  userId: string,
  tournamentId: string,
  entryFee: number
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  if (!user.stripeAccountId) {
    throw new Error('Usuário precisa conectar conta Stripe primeiro');
  }

  if (!user.stripeCustomerId) {
    throw new Error('Usuário precisa ter um customer ID');
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      _count: {
        select: { participants: true },
      },
    },
  });

  if (!tournament) {
    throw new Error('Torneio não encontrado');
  }

  // Calcular taxa da casa (progressiva)
  const totalCollected = entryFee * (tournament._count.participants + 1);
  const housePercentage = totalCollected <= 5000 ? 10 : 20;
  const houseFee = (entryFee * housePercentage) / 100;
  const netAmount = entryFee - houseFee;

  // Criar PaymentIntent com transferência automática para conta Connect
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(entryFee * 100), // centavos
    currency: 'brl',
    customer: user.stripeCustomerId,
    description: `Entrada no torneio: ${tournament.name}`,
    metadata: {
      tournamentId,
      userId,
      type: 'tournament_entry',
    },
    // Split payment: transferir automaticamente para conta Connect do usuário
    transfer_data: {
      amount: Math.round(netAmount * 100), // valor líquido vai para conta Connect
      destination: user.stripeAccountId,
    },
    // Taxa da casa fica na conta principal automaticamente
  });

  // Registrar transação como PENDING
  await prisma.transaction.create({
    data: {
      userId,
      amount: -entryFee,
      type: 'TOURNAMENT_ENTRY',
      status: 'PENDING',
      stripeSessionId: paymentIntent.id,
      description: `Entrada no torneio: ${tournament.name}`,
      metadata: {
        tournamentId,
        houseFee,
        netAmount,
        housePercentage,
      },
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    houseFee,
    netAmount,
    housePercentage,
  };
}

/**
 * Confirma entrada no torneio após pagamento bem-sucedido
 */
export async function confirmTournamentEntry(
  paymentIntentId: string
) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new Error('Pagamento não foi concluído');
  }

  const { userId, tournamentId } = paymentIntent.metadata;

  if (!userId || !tournamentId) {
    throw new Error('Metadata inválida no PaymentIntent');
  }

  // Atualizar transação para COMPLETED
  await prisma.transaction.updateMany({
    where: {
      stripeSessionId: paymentIntentId,
      status: 'PENDING',
    },
    data: {
      status: 'COMPLETED',
    },
  });

  // Criar participação no torneio
  const participant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId,
      userId,
      paidEntry: true,
    },
  });

  // Atualizar saldo interno (para controle)
  const transaction = await prisma.transaction.findFirst({
    where: { stripeSessionId: paymentIntentId },
  });

  if (transaction) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          decrement: Math.abs(transaction.amount),
        },
      },
    });
  }

  return participant;
}

/**
 * Distribui prêmios ao fim do torneio
 */
export async function distributeTournamentPrizes(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
      matches: {
        where: { status: 'COMPLETED' },
        orderBy: { round: 'desc' },
      },
    },
  });

  if (!tournament) {
    throw new Error('Torneio não encontrado');
  }

  if (tournament.status !== 'FINISHED') {
    throw new Error('Torneio ainda não terminou');
  }

  // Determinar posições finais baseado nas partidas
  const participants = tournament.participants.map((p, index) => ({
    userId: p.userId,
    finalPosition: index + 1, // Simplificado - você precisa calcular baseado nas rodadas
  }));

  // Calcular prêmios
  const prizeCalculation = calculatePrizes(tournament.entryFee, participants);

  // Criar registros de prêmios
  const prizes = await Promise.all(
    prizeCalculation.prizes.map(async (prize) => {
      return prisma.tournamentPrize.create({
        data: {
          tournamentId,
          userId: prize.userId,
          position: prize.position,
          amount: prize.amount,
          paid: false,
        },
      });
    })
  );

  // Atualizar torneio com valores calculados
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      prizePool: prizeCalculation.totalPrizePool,
      houseTake: prizeCalculation.houseTake,
      housePercentage: prizeCalculation.housePercentage,
    },
  });

  return {
    prizes,
    summary: {
      totalPrizePool: prizeCalculation.totalPrizePool,
      houseTake: prizeCalculation.houseTake,
      netPrizePool: prizeCalculation.netPrizePool,
      totalPrizes: prizes.length,
    },
  };
}

/**
 * Paga um prêmio específico
 *
 * Como funciona:
 * - O dinheiro já está na conta Connect do vencedor (foi depositado na entrada)
 * - Apenas atualizamos o saldo interno e marcamos como pago
 */
export async function payTournamentPrize(prizeId: string) {
  const prize = await prisma.tournamentPrize.findUnique({
    where: { id: prizeId },
    include: {
      user: true,
      tournament: true,
    },
  });

  if (!prize) {
    throw new Error('Prêmio não encontrado');
  }

  if (prize.paid) {
    throw new Error('Prêmio já foi pago');
  }

  // Atualizar saldo interno
  await prisma.user.update({
    where: { id: prize.userId },
    data: {
      balance: {
        increment: prize.amount,
      },
    },
  });

  // Marcar prêmio como pago
  await prisma.tournamentPrize.update({
    where: { id: prizeId },
    data: {
      paid: true,
      paidAt: new Date(),
    },
  });

  // Registrar transação
  await prisma.transaction.create({
    data: {
      userId: prize.userId,
      amount: prize.amount,
      type: 'TOURNAMENT_PRIZE',
      status: 'COMPLETED',
      description: `Prêmio ${prize.position}º lugar - ${prize.tournament.name}`,
      metadata: {
        tournamentId: prize.tournamentId,
        prizeId,
        position: prize.position,
      },
    },
  });

  return prize;
}

/**
 * Paga todos os prêmios de um torneio
 */
export async function payAllTournamentPrizes(tournamentId: string) {
  const unpaidPrizes = await prisma.tournamentPrize.findMany({
    where: {
      tournamentId,
      paid: false,
    },
  });

  const results = await Promise.all(
    unpaidPrizes.map(prize => payTournamentPrize(prize.id))
  );

  return {
    totalPaid: results.length,
    totalAmount: results.reduce((sum, p) => sum + p.amount, 0),
    prizes: results,
  };
}
