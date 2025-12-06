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
 * Calcula taxa progressiva da casa
 */
function calculateHouseFee(totalCollected: number): { percentage: number; amount: number } {
  const TIER_1_LIMIT = 5000;
  const TIER_1_PERCENTAGE = 10; // 10%
  const TIER_2_PERCENTAGE = 20; // 20%

  if (totalCollected <= TIER_1_LIMIT) {
    // Até R$ 5.000: 10%
    return {
      percentage: TIER_1_PERCENTAGE,
      amount: (totalCollected * TIER_1_PERCENTAGE) / 100,
    };
  } else {
    // Acima de R$ 5.000: 20%
    return {
      percentage: TIER_2_PERCENTAGE,
      amount: (totalCollected * TIER_2_PERCENTAGE) / 100,
    };
  }
}

/**
 * Calcula distribuição de prêmios para torneio
 */
export function calculatePrizes(
  entryFee: number,
  participants: { userId: string; finalPosition?: number }[]
): PrizeCalculationResult {
  const totalCollected = entryFee * participants.length;
  const houseFee = calculateHouseFee(totalCollected);
  const netPrizePool = totalCollected - houseFee.amount;

  const prizes: { position: number; userId: string; amount: number; description: string }[] = [];

  // Ordenar participantes por posição final
  const sortedParticipants = [...participants].sort((a, b) => {
    if (!a.finalPosition) return 1;
    if (!b.finalPosition) return -1;
    return a.finalPosition - b.finalPosition;
  });

  if (participants.length >= 2048) {
    // TORNEIOS MASSIVOS (>= 2048 jogadores)
    // 33% dividido entre os primeiros 2048 jogadores
    // 67% dividido entre TOP 8 com percentuais fixos

    const bonusPool = netPrizePool * 0.33; // 33% para bônus
    const top8Pool = netPrizePool * 0.67;  // 67% para TOP 8

    // Bônus: R$ para cada um dos primeiros 2048 (ou todos se < 2048)
    const bonusCount = Math.min(participants.length, 2048);
    const bonusPerPlayer = bonusPool / bonusCount;

    // TOP 8 distribuição fixa
    const top8Distribution = [
      { pct: 0.35, desc: "🏆 Campeão" },      // 35%
      { pct: 0.20, desc: "🥈 2º lugar" },     // 20%
      { pct: 0.15, desc: "🥉 3º lugar" },     // 15%
      { pct: 0.10, desc: "4º lugar" },        // 10%
      { pct: 0.08, desc: "5º lugar" },        // 8%
      { pct: 0.06, desc: "6º lugar" },        // 6%
      { pct: 0.04, desc: "7º lugar" },        // 4%
      { pct: 0.02, desc: "8º lugar" },        // 2%
    ];

    // Distribuir prêmios TOP 8
    for (let i = 0; i < Math.min(8, participants.length); i++) {
      const participant = sortedParticipants[i];
      if (participant) {
        const topPrize = top8Pool * top8Distribution[i].pct;
        prizes.push({
          position: i + 1,
          userId: participant.userId,
          amount: Number((topPrize + bonusPerPlayer).toFixed(2)),
          description: top8Distribution[i].desc,
        });
      }
    }

    // Distribuir bônus para o resto (9º até 2048º)
    for (let i = 8; i < bonusCount; i++) {
      const participant = sortedParticipants[i];
      if (participant) {
        prizes.push({
          position: i + 1,
          userId: participant.userId,
          amount: Number(bonusPerPlayer.toFixed(2)),
          description: `${i + 1}º lugar - Bônus`,
        });
      }
    }

    // Jogadores além de 2048 não recebem nada
    for (let i = bonusCount; i < participants.length; i++) {
      const participant = sortedParticipants[i];
      if (participant) {
        prizes.push({
          position: i + 1,
          userId: participant.userId,
          amount: 0,
          description: `${i + 1}º lugar`,
        });
      }
    }

  } else if (participants.length >= 16) {
    // TORNEIOS GRANDES (16-2047 jogadores)
    // TOP 8 + resto divide igualmente

    const top8Pool = netPrizePool * 0.6; // 60% para TOP 8
    const restPool = netPrizePool * 0.4; // 40% dividido igualmente entre o resto

    const top8Distribution = [
      { pct: 0.35, desc: "🏆 Campeão" },
      { pct: 0.20, desc: "🥈 2º lugar" },
      { pct: 0.15, desc: "🥉 3º lugar" },
      { pct: 0.10, desc: "4º lugar" },
      { pct: 0.08, desc: "5º lugar" },
      { pct: 0.06, desc: "6º lugar" },
      { pct: 0.04, desc: "7º lugar" },
      { pct: 0.02, desc: "8º lugar" },
    ];

    // Distribuir para TOP 8
    for (let i = 0; i < Math.min(8, participants.length); i++) {
      const participant = sortedParticipants[i];
      if (participant) {
        prizes.push({
          position: i + 1,
          userId: participant.userId,
          amount: Number((top8Pool * top8Distribution[i].pct).toFixed(2)),
          description: top8Distribution[i].desc,
        });
      }
    }

    // Resto dos participantes divide igualmente
    const remainingCount = participants.length - 8;
    if (remainingCount > 0) {
      const perPlayer = restPool / remainingCount;
      for (let i = 8; i < participants.length; i++) {
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
  } else {
    // TORNEIOS PEQUENOS (<16 jogadores)
    // TOP 4 recebe 70% do prize pool
    // Resto divide 30% igualmente

    const top4Pool = netPrizePool * 0.7;
    const restPool = netPrizePool * 0.3;

    // Distribuição TOP 4: 50%, 28.5%, 14.3%, 7.2% (do top4Pool)
    const top4Distribution = [0.5, 0.285, 0.143, 0.072];

    // Premiar TOP 4
    for (let i = 0; i < Math.min(participants.length, 4); i++) {
      const participant = sortedParticipants[i];
      if (participant) {
        prizes.push({
          position: i + 1,
          userId: participant.userId,
          amount: Number((top4Pool * top4Distribution[i]).toFixed(2)),
          description: i === 0 ? "🏆 Campeão" : `${i + 1}º lugar`,
        });
      }
    }

    // Resto (5º em diante) divide 30% igualmente
    const remainingCount = participants.length - 4;
    if (remainingCount > 0) {
      const perPlayer = restPool / remainingCount;
      for (let i = 4; i < participants.length; i++) {
        const participant = sortedParticipants[i];
        if (participant) {
          prizes.push({
            position: i + 1,
            userId: participant.userId,
            amount: Number(perPlayer.toFixed(2)),
            description: `${i + 1}º lugar - Participação`,
          });
        }
      }
    }
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
export function calculatePrizePreview(entryFee: number, expectedParticipants: number) {
  const totalCollected = entryFee * expectedParticipants;
  const houseFee = calculateHouseFee(totalCollected);
  const netPrizePool = totalCollected - houseFee.amount;

  let preview: { description: string; amount: number }[] = [];

  if (expectedParticipants >= 2048) {
    // Torneios massivos
    const bonusPool = netPrizePool * 0.33;
    const top8Pool = netPrizePool * 0.67;

    const bonusCount = Math.min(expectedParticipants, 2048);
    const bonusPerPlayer = bonusPool / bonusCount;

    const top8Distribution = [
      { desc: "🏆 1º lugar (35%)", pct: 0.35 },
      { desc: "🥈 2º lugar (20%)", pct: 0.20 },
      { desc: "🥉 3º lugar (15%)", pct: 0.15 },
      { desc: "4º lugar (10%)", pct: 0.10 },
      { desc: "5º lugar (8%)", pct: 0.08 },
      { desc: "6º lugar (6%)", pct: 0.06 },
      { desc: "7º lugar (4%)", pct: 0.04 },
      { desc: "8º lugar (2%)", pct: 0.02 },
    ];

    preview = top8Distribution.map((d) => ({
      description: d.desc,
      amount: Number((top8Pool * d.pct + bonusPerPlayer).toFixed(2)),
    }));

    preview.push({
      description: `9º-2.048º lugar (Bônus)`,
      amount: Number(bonusPerPlayer.toFixed(2)),
    });

  } else if (expectedParticipants >= 16) {
    const top8Pool = netPrizePool * 0.6;

    const top8Distribution = [
      { desc: "🏆 1º lugar (35%)", pct: 0.35 },
      { desc: "🥈 2º lugar (20%)", pct: 0.20 },
      { desc: "🥉 3º lugar (15%)", pct: 0.15 },
      { desc: "4º lugar (10%)", pct: 0.10 },
      { desc: "5º lugar (8%)", pct: 0.08 },
      { desc: "6º lugar (6%)", pct: 0.06 },
      { desc: "7º lugar (4%)", pct: 0.04 },
      { desc: "8º lugar (2%)", pct: 0.02 },
    ];

    preview = top8Distribution.map((d) => ({
      description: d.desc,
      amount: Number((top8Pool * d.pct).toFixed(2)),
    }));

    if (expectedParticipants > 8) {
      const restPool = netPrizePool * 0.4;
      const perPlayer = restPool / (expectedParticipants - 8);
      preview.push({
        description: `9º-${expectedParticipants}º lugar`,
        amount: Number(perPlayer.toFixed(2)),
      });
    }
  } else {
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
