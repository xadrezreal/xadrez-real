"use strict";
/**
 * Sistema de Premiação Progressiva para Torneios
 *
 * Calcula distribuição de prêmios com taxa progressiva da casa:
 * - Até R$ 5.000: 10% para a casa
 * - Acima de R$ 5.000: 20% para a casa
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePrizes = calculatePrizes;
exports.calculatePrizePreview = calculatePrizePreview;
/**
 * Calcula taxa progressiva da casa
 */
function calculateHouseFee(totalCollected) {
    const TIER_1_LIMIT = 5000;
    const TIER_1_PERCENTAGE = 10; // 10%
    const TIER_2_PERCENTAGE = 20; // 20%
    if (totalCollected <= TIER_1_LIMIT) {
        // Até R$ 5.000: 10%
        return {
            percentage: TIER_1_PERCENTAGE,
            amount: (totalCollected * TIER_1_PERCENTAGE) / 100,
        };
    }
    else {
        // Acima de R$ 5.000: 20%
        return {
            percentage: TIER_2_PERCENTAGE,
            amount: (totalCollected * TIER_2_PERCENTAGE) / 100,
        };
    }
}
/**
 * Distribui prêmios para TOP 16 usando escala geométrica
 */
function distributeTop16(pool) {
    // Valores fixos
    const FIRST_PLACE = Math.min(pool * 0.35, 8000); // 35% ou max R$ 8.000
    const SIXTEENTH_PLACE = Math.max(pool * 0.01, 50); // 1% ou min R$ 50
    // Distribuição geométrica para 2º-15º lugares
    const remaining = pool - FIRST_PLACE - SIXTEENTH_PLACE;
    const q = 0.85; // razão geométrica
    // Calcular primeira parcela (2º lugar)
    const sum = (1 - Math.pow(q, 14)) / (1 - q); // soma de 14 termos
    const secondPlace = remaining / sum;
    const prizes = [FIRST_PLACE];
    // Gerar 2º ao 15º lugar
    for (let i = 0; i < 14; i++) {
        prizes.push(secondPlace * Math.pow(q, i));
    }
    prizes.push(SIXTEENTH_PLACE);
    return prizes;
}
/**
 * Calcula distribuição de prêmios para torneio
 */
function calculatePrizes(entryFee, participants) {
    const totalCollected = entryFee * participants.length;
    const houseFee = calculateHouseFee(totalCollected);
    const netPrizePool = totalCollected - houseFee.amount;
    const prizes = [];
    // Ordenar participantes por posição final
    const sortedParticipants = [...participants].sort((a, b) => {
        if (!a.finalPosition)
            return 1;
        if (!b.finalPosition)
            return -1;
        return a.finalPosition - b.finalPosition;
    });
    if (participants.length >= 16) {
        // Torneios grandes: TOP 16 + resto
        const top16Pool = netPrizePool * 0.6; // 60% para TOP 16
        const restPool = netPrizePool * 0.4; // 40% dividido igualmente entre o resto
        const top16Prizes = distributeTop16(top16Pool);
        // Distribuir para TOP 16
        for (let i = 0; i < 16; i++) {
            const participant = sortedParticipants[i];
            if (participant) {
                prizes.push({
                    position: i + 1,
                    userId: participant.userId,
                    amount: Number(top16Prizes[i].toFixed(2)),
                    description: i === 0 ? "🏆 Campeão" : `${i + 1}º lugar`,
                });
            }
        }
        // Resto dos participantes divide igualmente
        const remainingCount = participants.length - 16;
        if (remainingCount > 0) {
            const perPlayer = restPool / remainingCount;
            for (let i = 16; i < participants.length; i++) {
                const participant = sortedParticipants[i];
                if (participant) {
                    prizes.push({
                        position: i + 1,
                        userId: participant.userId,
                        amount: Number(perPlayer.toFixed(2)),
                        description: `Participação (${i + 1}º-${participants.length}º)`,
                    });
                }
            }
        }
    }
    else {
        // Torneios pequenos: distribuição simples
        // 1º: 50%, 2º: 30%, 3º-4º: 10% cada
        const distribution = [0.5, 0.3, 0.1, 0.1];
        for (let i = 0; i < Math.min(participants.length, 4); i++) {
            const participant = sortedParticipants[i];
            if (participant) {
                prizes.push({
                    position: i + 1,
                    userId: participant.userId,
                    amount: Number((netPrizePool * distribution[i]).toFixed(2)),
                    description: i === 0 ? "🏆 Campeão" : `${i + 1}º lugar`,
                });
            }
        }
        // Resto não ganha nada em torneios pequenos
    }
    return {
        totalPrizePool: Number(totalCollected.toFixed(2)),
        housePercentage: houseFee.percentage,
        houseTake: Number(houseFee.amount.toFixed(2)),
        netPrizePool: Number(netPrizePool.toFixed(2)),
        prizes,
    };
}
/**
 * Calcula preview de prêmios (antes do torneio iniciar)
 */
function calculatePrizePreview(entryFee, expectedParticipants) {
    const totalCollected = entryFee * expectedParticipants;
    const houseFee = calculateHouseFee(totalCollected);
    const netPrizePool = totalCollected - houseFee.amount;
    let preview = [];
    if (expectedParticipants >= 16) {
        const top16Pool = netPrizePool * 0.6;
        const top16Prizes = distributeTop16(top16Pool);
        preview = [
            { description: "🏆 1º lugar", amount: Number(top16Prizes[0].toFixed(2)) },
            { description: "🥈 2º lugar", amount: Number(top16Prizes[1].toFixed(2)) },
            { description: "🥉 3º lugar", amount: Number(top16Prizes[2].toFixed(2)) },
            { description: "4º lugar", amount: Number(top16Prizes[3].toFixed(2)) },
            { description: "5º-8º lugar", amount: Number(top16Prizes[4].toFixed(2)) },
            { description: "9º-16º lugar", amount: Number(top16Prizes[8].toFixed(2)) },
        ];
        if (expectedParticipants > 16) {
            const restPool = netPrizePool * 0.4;
            const perPlayer = restPool / (expectedParticipants - 16);
            preview.push({
                description: `17º-${expectedParticipants}º lugar`,
                amount: Number(perPlayer.toFixed(2)),
            });
        }
    }
    else {
        const distribution = [
            { desc: "🏆 1º lugar", pct: 0.5 },
            { desc: "🥈 2º lugar", pct: 0.3 },
            { desc: "🥉 3º lugar", pct: 0.1 },
            { desc: "4º lugar", pct: 0.1 },
        ];
        preview = distribution.slice(0, Math.min(expectedParticipants, 4)).map((d) => ({
            description: d.desc,
            amount: Number((netPrizePool * d.pct).toFixed(2)),
        }));
    }
    return {
        totalPrizePool: Number(totalCollected.toFixed(2)),
        housePercentage: houseFee.percentage,
        houseTake: Number(houseFee.amount.toFixed(2)),
        netPrizePool: Number(netPrizePool.toFixed(2)),
        preview,
    };
}
//# sourceMappingURL=prizeCalculator.js.map