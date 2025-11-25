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
export declare function enterTournamentWithConnect(userId: string, tournamentId: string, entryFee: number): Promise<{
    success: boolean;
    breakdown: {
        entryFee: number;
        houseFee: number;
        housePercentage: number;
        netToPrizePool: number;
        message: string;
    };
    transferId: string;
}>;
/**
 * Distribui prêmios ao fim do torneio
 * Cria registros de prêmios mas NÃO faz transfers ainda
 */
export declare function distributeTournamentPrizes(tournamentId: string): Promise<{
    prizes: {
        id: string;
        createdAt: Date;
        amount: number;
        userId: string;
        tournamentId: string;
        position: number;
        paid: boolean;
        paidAt: Date | null;
    }[];
    summary: {
        totalPrizePool: number;
        houseTake: number;
        netPrizePool: number;
        totalPrizes: number;
    };
}>;
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
export declare function payTournamentPrize(prizeId: string): Promise<{
    prize: {
        user: {
            role: import(".prisma/client").$Enums.Role;
            name: string;
            email: string;
            password: string;
            id: string;
            balance: number;
            country: string | null;
            tournamentPoints: number;
            stripeCustomerId: string | null;
            stripeSubscriptionId: string | null;
            stripeAccountId: string | null;
            stripeAccountStatus: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        tournament: {
            name: string;
            password: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            entryFee: number;
            playerCount: number;
            prizeDistribution: import(".prisma/client").$Enums.PrizeDistribution;
            status: import(".prisma/client").$Enums.TournamentStatus;
            startTime: Date;
            currentRound: number;
            totalRounds: number;
            winnerId: string | null;
            nextRoundStartTime: Date | null;
            currentRoundStartTime: Date | null;
            housePercentage: number;
            prizePool: number;
            houseTake: number;
            creatorId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        amount: number;
        userId: string;
        tournamentId: string;
        position: number;
        paid: boolean;
        paidAt: Date | null;
    };
    amount: number;
    transferId: string;
    message: string;
}>;
/**
 * Paga todos os prêmios de um torneio
 */
export declare function payAllTournamentPrizes(tournamentId: string): Promise<{
    totalPaid: number;
    totalAmount: number;
    prizes: {
        prize: {
            user: {
                role: import(".prisma/client").$Enums.Role;
                name: string;
                email: string;
                password: string;
                id: string;
                balance: number;
                country: string | null;
                tournamentPoints: number;
                stripeCustomerId: string | null;
                stripeSubscriptionId: string | null;
                stripeAccountId: string | null;
                stripeAccountStatus: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
            tournament: {
                name: string;
                password: string | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                entryFee: number;
                playerCount: number;
                prizeDistribution: import(".prisma/client").$Enums.PrizeDistribution;
                status: import(".prisma/client").$Enums.TournamentStatus;
                startTime: Date;
                currentRound: number;
                totalRounds: number;
                winnerId: string | null;
                nextRoundStartTime: Date | null;
                currentRoundStartTime: Date | null;
                housePercentage: number;
                prizePool: number;
                houseTake: number;
                creatorId: string;
            };
        } & {
            id: string;
            createdAt: Date;
            amount: number;
            userId: string;
            tournamentId: string;
            position: number;
            paid: boolean;
            paidAt: Date | null;
        };
        amount: number;
        transferId: string;
        message: string;
    }[];
    message: string;
}>;
//# sourceMappingURL=tournamentPayment.d.ts.map