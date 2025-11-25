/**
 * Calcula a taxa progressiva da casa baseada no pote total coletado
 * 10% para potes até R$ 5.000
 * 20% para potes acima de R$ 5.000
 */
export function calculateHouseFee(totalCollected) {
  const TIER_1_LIMIT = 5000;
  const TIER_1_PERCENTAGE = 10; // 10%
  const TIER_2_PERCENTAGE = 20; // 20%

  if (totalCollected <= TIER_1_LIMIT) {
    return {
      percentage: TIER_1_PERCENTAGE,
      amount: (totalCollected * TIER_1_PERCENTAGE) / 100,
      netPrizePool: totalCollected * (1 - TIER_1_PERCENTAGE / 100),
    };
  } else {
    return {
      percentage: TIER_2_PERCENTAGE,
      amount: (totalCollected * TIER_2_PERCENTAGE) / 100,
      netPrizePool: totalCollected * (1 - TIER_2_PERCENTAGE / 100),
    };
  }
}

/**
 * Calcula informações completas sobre o prêmio de um torneio
 */
export function calculateTournamentPrize(entryFee, participantCount) {
  const totalCollected = entryFee * participantCount;
  const houseFee = calculateHouseFee(totalCollected);

  return {
    totalCollected,
    housePercentage: houseFee.percentage,
    houseAmount: houseFee.amount,
    netPrizePool: houseFee.netPrizePool,
  };
}

/**
 * Retorna uma descrição legível da estrutura de taxas
 */
export function getFeeTierDescription(totalCollected) {
  const TIER_1_LIMIT = 5000;

  if (totalCollected <= TIER_1_LIMIT) {
    return {
      tier: 1,
      message: "Taxa de 10% (potes até R$ 5.000)",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
    };
  } else {
    return {
      tier: 2,
      message: "Taxa de 20% (potes acima de R$ 5.000)",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
    };
  }
}
