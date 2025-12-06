/**
 * Sistema de Premiação Progressiva para Torneios
 *
 * Calcula distribuição de prêmios com taxa progressiva da casa:
 * - Até R$ 5.000: 10% para a casa
 * - Acima de R$ 5.000: 20% para a casa
 *
 * Para torneios grandes (>= 2048 participantes):
 * - 33% dividido igualmente entre TODOS (até posição 2048)
 * - Restante dividido entre TOP 8 com percentuais fixos
 */
export interface PrizeCalculationResult {
    totalPrizePool: number;
    housePercentage: number;
    houseTake: number;
    netPrizePool: number;
    prizes: {
        position: number;
        userId: string;
        amount: number;
        description: string;
    }[];
}
/**
 * Calcula distribuição de prêmios para torneio
 */
export declare function calculatePrizes(entryFee: number, participants: {
    userId: string;
    finalPosition?: number;
}[]): PrizeCalculationResult;
/**
 * Calcula preview de prêmios (antes do torneio iniciar)
 */
export declare function calculatePrizePreview(entryFee: number, expectedParticipants: number): {
    totalPrizePool: number;
    housePercentage: number;
    houseTake: number;
    netPrizePool: number;
    preview: {
        description: string;
        amount: number;
    }[];
};
//# sourceMappingURL=prizeCalculator.d.ts.map