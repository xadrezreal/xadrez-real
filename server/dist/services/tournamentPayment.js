"use strict";
/**
 * Serviço de Pagamentos de Torneios com Stripe Connect Transfers
 *
 * Fluxo NOVO (taxa da casa cobre taxas Stripe):
 *
 * 1. Depósito:
 *    - Usuário deposita R$ 100 → vai pro Stripe Connect dele
 *
 * 2. Entrada em Torneio (taxa R$ 10):
 *    - Taxa da casa: R$ 1,00 (10%) → cobre taxa Stripe + lucro da casa
 *    - Prize pool: R$ 9,00
 *    - Total debitado do usuário: R$ 10,00 (SEM TAXA EXTRA!)
 *    - Transfer: Connect do usuário → Connect da plataforma (R$ 10,00)
 *    - Custo real do transfer pro Stripe: ~R$ 0,80 (sai da taxa da casa)
 *
 * 3. Distribuição de Prêmios:
 *    - Vencedor ganha R$ 50,00
 *    - Transferimos R$ 50,00 (integral)
 *    - Custo do transfer: ~R$ 1,60 (sai da taxa da casa acumulada)
 *    - Transfer: Connect da plataforma → Connect do vencedor
 *
 * 4. Saque:
 *    - Usuário saca direto da conta Connect dele
 *    - Sem envolvimento da plataforma
 *
 * RESUMO: Usuário NUNCA paga taxa Stripe diretamente!
 * A taxa da casa (10%-20%) cobre tudo.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enterTournamentWithConnect = enterTournamentWithConnect;
exports.distributeTournamentPrizes = distributeTournamentPrizes;
exports.payTournamentPrize = payTournamentPrize;
exports.payAllTournamentPrizes = payAllTournamentPrizes;
const stripe_1 = __importDefault(require("stripe"));
const client_1 = require("@prisma/client");
const prizeCalculator_1 = require("./prizeCalculator");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
});
const prisma = new client_1.PrismaClient();
/**
 * Calcula posições finais baseado nas partidas do torneio (bracket elimination)
 *
 * Lógica:
 * - Campeão: venceu a final (última rodada)
 * - 2º lugar: perdeu a final
 * - 3º-4º: perderam na semifinal
 * - 5º-8º: perderam nas quartas
 * - etc.
 */
function calculateFinalStandings(tournament) {
    const { participants, matches } = tournament;
    if (!matches || matches.length === 0) {
        // Se não houver partidas, retornar ordem de entrada
        return participants.map((p, index) => ({
            userId: p.userId,
            finalPosition: index + 1,
        }));
    }
    // Agrupar partidas por rodada
    const matchesByRound = {};
    matches.forEach((match) => {
        if (!matchesByRound[match.round]) {
            matchesByRound[match.round] = [];
        }
        matchesByRound[match.round].push(match);
    });
    const rounds = Object.keys(matchesByRound)
        .map(Number)
        .sort((a, b) => b - a); // Ordem decrescente (última rodada primeiro)
    const standings = [];
    let currentPosition = 1;
    // Processar rodadas da última para a primeira
    for (const round of rounds) {
        const roundMatches = matchesByRound[round];
        if (round === rounds[0]) {
            // Última rodada (final)
            const finalMatch = roundMatches[0];
            if (finalMatch && finalMatch.winnerId) {
                // 1º lugar: vencedor da final
                standings.push({
                    userId: finalMatch.winnerId,
                    finalPosition: 1,
                });
                // 2º lugar: perdedor da final
                const loserId = finalMatch.player1Id === finalMatch.winnerId
                    ? finalMatch.player2Id
                    : finalMatch.player1Id;
                if (loserId) {
                    standings.push({
                        userId: loserId,
                        finalPosition: 2,
                    });
                }
                currentPosition = 3;
            }
        }
        else {
            // Outras rodadas: todos os perdedores ficam na mesma faixa
            const losers = [];
            roundMatches.forEach((match) => {
                if (match.winnerId) {
                    const loserId = match.player1Id === match.winnerId
                        ? match.player2Id
                        : match.player1Id;
                    if (loserId && !standings.find(s => s.userId === loserId)) {
                        losers.push(loserId);
                    }
                }
            });
            // Todos os perdedores dessa rodada compartilham a mesma posição base
            losers.forEach((userId) => {
                standings.push({
                    userId,
                    finalPosition: currentPosition,
                });
            });
            currentPosition += losers.length;
        }
    }
    // Adicionar participantes que não têm posição definida (não jogaram ou não terminaram)
    participants.forEach((p) => {
        if (!standings.find(s => s.userId === p.userId)) {
            standings.push({
                userId: p.userId,
                finalPosition: currentPosition,
            });
            currentPosition++;
        }
    });
    return standings;
}
/**
 * Entrada em torneio usando saldo da conta Connect do usuário
 *
 * IMPORTANTE: Usuário paga APENAS a entrada do torneio.
 * A taxa da casa (10% ou 20%) cobre as taxas Stripe + lucro da plataforma.
 *
 * Exemplo:
 * - Entrada: R$ 10,00
 * - Taxa casa (10%): R$ 1,00 (cobre Stripe ~R$ 0,80 + lucro ~R$ 0,20)
 * - Prize pool: R$ 9,00
 * - Usuário paga: R$ 10,00 (sem taxa extra!)
 */
async function enterTournamentWithConnect(userId, tournamentId, entryFee) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            stripeAccountId: true,
            balance: true,
        },
    });
    if (!user) {
        throw new Error('Usuário não encontrado');
    }
    if (!user.stripeAccountId) {
        throw new Error('Usuário precisa conectar conta Stripe primeiro');
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
    const netToPrizePool = entryFee - houseFee;
    // Verificar se usuário tem saldo suficiente (apenas a entrada!)
    if (user.balance < entryFee) {
        throw new Error(`Saldo insuficiente. Necessário: R$ ${entryFee.toFixed(2)}. ` +
            `Seu saldo: R$ ${user.balance.toFixed(2)}`);
    }
    // Fazer transfer da conta Connect do usuário para a conta principal da plataforma
    // Nota: Se STRIPE_PLATFORM_CONNECT_ID estiver configurado, usa ele.
    // Caso contrário, o dinheiro vai pra conta principal Stripe automaticamente.
    const platformAccountId = process.env.STRIPE_PLATFORM_CONNECT_ID;
    const transferParams = {
        amount: Math.round(entryFee * 100), // centavos
        currency: 'brl',
        description: `Entrada torneio: ${tournament.name}`,
        metadata: {
            tournamentId,
            userId,
            type: 'tournament_entry',
            entryFee: entryFee.toString(),
            houseFee: houseFee.toString(),
            housePercentage: housePercentage.toString(),
            netToPrizePool: netToPrizePool.toString(),
        },
    };
    // Se tiver conta Connect da plataforma configurada, transfere pra ela
    if (platformAccountId) {
        transferParams.destination = platformAccountId;
    }
    // Fazer transfer reverso: da conta Connect do usuário pra plataforma
    const transfer = await stripe.transfers.create(transferParams, {
        stripeAccount: user.stripeAccountId, // Executar a partir da conta do usuário
    });
    // Atualizar saldo do usuário (deduzir apenas a entrada)
    await prisma.user.update({
        where: { id: userId },
        data: {
            balance: {
                decrement: entryFee,
            },
        },
    });
    // Registrar transação
    await prisma.transaction.create({
        data: {
            userId,
            amount: -entryFee,
            type: 'TOURNAMENT_ENTRY',
            status: 'COMPLETED',
            stripeSessionId: transfer.id,
            description: `Entrada no torneio: ${tournament.name}`,
            metadata: {
                tournamentId,
                entryFee,
                houseFee,
                housePercentage,
                netToPrizePool,
                transferId: transfer.id,
            },
        },
    });
    // Criar participação no torneio
    await prisma.tournamentParticipant.create({
        data: {
            tournamentId,
            userId,
            paidEntry: true,
        },
    });
    return {
        success: true,
        breakdown: {
            entryFee,
            houseFee,
            housePercentage,
            netToPrizePool,
            message: `Taxa da casa de ${housePercentage}% (R$ ${houseFee.toFixed(2)}) cobre custos Stripe e operação da plataforma`,
        },
        transferId: transfer.id,
    };
}
/**
 * Distribui prêmios ao fim do torneio
 * Cria registros de prêmios mas NÃO faz transfers ainda
 */
async function distributeTournamentPrizes(tournamentId) {
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
    const participants = calculateFinalStandings(tournament);
    // Calcular prêmios
    const prizeCalculation = (0, prizeCalculator_1.calculatePrizes)(tournament.entryFee, participants);
    // Criar registros de prêmios
    const prizes = await Promise.all(prizeCalculation.prizes.map(async (prize) => {
        return prisma.tournamentPrize.create({
            data: {
                tournamentId,
                userId: prize.userId,
                position: prize.position,
                amount: prize.amount,
                paid: false,
            },
        });
    }));
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
 * Paga um prêmio específico fazendo transfer da plataforma para o vencedor
 *
 * IMPORTANTE: Vencedor recebe o valor INTEGRAL do prêmio.
 * Custos do transfer são cobertos pela taxa da casa.
 *
 * Exemplo:
 * - Prêmio: R$ 50,00
 * - Vencedor recebe: R$ 50,00 (integral!)
 * - Custo transfer (~R$ 1,60): sai da taxa da casa acumulada
 */
async function payTournamentPrize(prizeId) {
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
    if (!prize.user.stripeAccountId) {
        throw new Error('Usuário não tem conta Connect configurada');
    }
    // Fazer transfer da plataforma para a conta Connect do vencedor
    // Transferimos o valor INTEGRAL - custo do transfer sai da taxa da casa
    const transfer = await stripe.transfers.create({
        amount: Math.round(prize.amount * 100), // centavos
        currency: 'brl',
        destination: prize.user.stripeAccountId,
        description: `Prêmio ${prize.position}º lugar - ${prize.tournament.name}`,
        metadata: {
            tournamentId: prize.tournamentId,
            prizeId: prize.id,
            userId: prize.userId,
            position: prize.position.toString(),
            amount: prize.amount.toString(),
            type: 'prize_payout',
        },
    });
    // Atualizar saldo interno do usuário (valor integral)
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
            stripeSessionId: transfer.id,
            metadata: {
                tournamentId: prize.tournamentId,
                prizeId,
                position: prize.position,
                amount: prize.amount,
                transferId: transfer.id,
            },
        },
    });
    return {
        prize,
        amount: prize.amount,
        transferId: transfer.id,
        message: 'Prêmio transferido integralmente. Custos do transfer cobertos pela taxa da casa.',
    };
}
/**
 * Paga todos os prêmios de um torneio
 */
async function payAllTournamentPrizes(tournamentId) {
    const unpaidPrizes = await prisma.tournamentPrize.findMany({
        where: {
            tournamentId,
            paid: false,
        },
    });
    const results = await Promise.all(unpaidPrizes.map(prize => payTournamentPrize(prize.id)));
    const totalAmount = results.reduce((sum, r) => sum + r.amount, 0);
    return {
        totalPaid: results.length,
        totalAmount,
        prizes: results,
        message: `${results.length} prêmios pagos. Total: R$ ${totalAmount.toFixed(2)}. Custos Stripe cobertos pela taxa da casa.`,
    };
}
//# sourceMappingURL=tournamentPayment.js.map