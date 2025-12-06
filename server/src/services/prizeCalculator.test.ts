import { calculatePrizes, calculatePrizePreview } from './prizeCalculator';

describe('Prize Calculator', () => {
  describe('Torneios Massivos (>= 2048 jogadores)', () => {
    it('deve calcular corretamente para 8192 jogadores com R$ 5 de entrada', () => {
      // Cenário do Marco: 8192 jogadores x R$ 5
      const entryFee = 5;
      const participants = Array.from({ length: 8192 }, (_, i) => ({
        userId: `user-${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(entryFee, participants);

      // Total arrecadado: 8192 x R$ 5 = R$ 40.960
      expect(result.totalPrizePool).toBe(40960);

      // Taxa da casa: 20% de R$ 40.960 = R$ 8.192
      expect(result.housePercentage).toBe(20);
      expect(result.houseTake).toBe(8192);

      // Prize pool líquido: R$ 40.960 - R$ 8.192 = R$ 32.768
      expect(result.netPrizePool).toBe(32768);

      // 33% do prize pool para bônus: R$ 32.768 x 0.33 = R$ 10.813,44
      const bonusPool = 32768 * 0.33;
      const bonusPerPlayer = bonusPool / 2048; // R$ 5,28 por jogador

      // 67% do prize pool para TOP 8: R$ 32.768 x 0.67 = R$ 21.954,56
      const top8Pool = 32768 * 0.67;

      // Verificar TOP 8
      expect(result.prizes[0].position).toBe(1);
      expect(result.prizes[0].amount).toBeCloseTo(top8Pool * 0.35 + bonusPerPlayer, 2); // 1º lugar

      expect(result.prizes[1].position).toBe(2);
      expect(result.prizes[1].amount).toBeCloseTo(top8Pool * 0.20 + bonusPerPlayer, 2); // 2º lugar

      expect(result.prizes[2].position).toBe(3);
      expect(result.prizes[2].amount).toBeCloseTo(top8Pool * 0.15 + bonusPerPlayer, 2); // 3º lugar

      expect(result.prizes[3].position).toBe(4);
      expect(result.prizes[3].amount).toBeCloseTo(top8Pool * 0.10 + bonusPerPlayer, 2); // 4º lugar

      expect(result.prizes[4].position).toBe(5);
      expect(result.prizes[4].amount).toBeCloseTo(top8Pool * 0.08 + bonusPerPlayer, 2); // 5º lugar

      expect(result.prizes[5].position).toBe(6);
      expect(result.prizes[5].amount).toBeCloseTo(top8Pool * 0.06 + bonusPerPlayer, 2); // 6º lugar

      expect(result.prizes[6].position).toBe(7);
      expect(result.prizes[6].amount).toBeCloseTo(top8Pool * 0.04 + bonusPerPlayer, 2); // 7º lugar

      expect(result.prizes[7].position).toBe(8);
      expect(result.prizes[7].amount).toBeCloseTo(top8Pool * 0.02 + bonusPerPlayer, 2); // 8º lugar

      // Verificar bônus (9º a 2048º)
      const player100 = result.prizes.find(p => p.position === 100);
      expect(player100?.amount).toBeCloseTo(bonusPerPlayer, 2);

      const player2048 = result.prizes.find(p => p.position === 2048);
      expect(player2048?.amount).toBeCloseTo(bonusPerPlayer, 2);

      // Verificar que jogadores além de 2048 não ganham nada
      const player2049 = result.prizes.find(p => p.position === 2049);
      expect(player2049?.amount).toBe(0);

      const player8192 = result.prizes.find(p => p.position === 8192);
      expect(player8192?.amount).toBe(0);

      // Total de prêmios deve ser igual ao prize pool
      const totalPaid = result.prizes.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPaid).toBeCloseTo(result.netPrizePool, 0); // Tolerância de centavos
    });

    it('deve garantir que primeiros 2048 recebem bônus igual', () => {
      const entryFee = 10;
      const participants = Array.from({ length: 4096 }, (_, i) => ({
        userId: `user-${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(entryFee, participants);

      // Verificar que posições 9-2048 recebem o mesmo valor
      const bonusWinners = result.prizes.slice(8, 2048);
      const firstBonus = bonusWinners[0].amount;

      bonusWinners.forEach(prize => {
        expect(prize.amount).toBe(firstBonus);
      });
    });
  });

  describe('Torneios Grandes (16-2047 jogadores)', () => {
    it('deve calcular corretamente para 128 jogadores com R$ 10 de entrada', () => {
      const entryFee = 10;
      const participants = Array.from({ length: 128 }, (_, i) => ({
        userId: `user-${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(entryFee, participants);

      // Total: 128 x R$ 10 = R$ 1.280
      expect(result.totalPrizePool).toBe(1280);

      // Taxa: 10% de R$ 1.280 = R$ 128
      expect(result.housePercentage).toBe(10);
      expect(result.houseTake).toBe(128);

      // Prize pool: R$ 1.280 - R$ 128 = R$ 1.152
      expect(result.netPrizePool).toBe(1152);

      // 60% para TOP 8: R$ 691,20
      const top8Pool = 1152 * 0.6;

      // Verificar distribuição TOP 8
      expect(result.prizes[0].amount).toBeCloseTo(top8Pool * 0.35, 2); // 35%
      expect(result.prizes[1].amount).toBeCloseTo(top8Pool * 0.20, 2); // 20%
      expect(result.prizes[2].amount).toBeCloseTo(top8Pool * 0.15, 2); // 15%
      expect(result.prizes[3].amount).toBeCloseTo(top8Pool * 0.10, 2); // 10%

      // 40% dividido entre 120 jogadores
      const restPool = 1152 * 0.4;
      const perPlayer = restPool / 120;

      const player9 = result.prizes.find(p => p.position === 9);
      expect(player9?.amount).toBeCloseTo(perPlayer, 2);

      const player128 = result.prizes.find(p => p.position === 128);
      expect(player128?.amount).toBeCloseTo(perPlayer, 2);
    });
  });

  describe('Torneios Pequenos (<16 jogadores)', () => {
    it('deve calcular corretamente para 8 jogadores com R$ 20 de entrada', () => {
      const entryFee = 20;
      const participants = Array.from({ length: 8 }, (_, i) => ({
        userId: `user-${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(entryFee, participants);

      // Total: 8 x R$ 20 = R$ 160
      expect(result.totalPrizePool).toBe(160);

      // Taxa: 10% de R$ 160 = R$ 16
      expect(result.housePercentage).toBe(10);
      expect(result.houseTake).toBe(16);

      // Prize pool: R$ 160 - R$ 16 = R$ 144
      expect(result.netPrizePool).toBe(144);

      // 70% para TOP 4: R$ 100,80
      const top4Pool = 144 * 0.7;

      // Distribuição: 50%, 28.5%, 14.3%, 7.2%
      expect(result.prizes[0].amount).toBeCloseTo(top4Pool * 0.5, 2);
      expect(result.prizes[1].amount).toBeCloseTo(top4Pool * 0.285, 2);
      expect(result.prizes[2].amount).toBeCloseTo(top4Pool * 0.143, 2);
      expect(result.prizes[3].amount).toBeCloseTo(top4Pool * 0.072, 2);

      // 30% dividido entre 4 jogadores (5º-8º)
      const restPool = 144 * 0.3;
      const perPlayer = restPool / 4;

      expect(result.prizes[4].amount).toBeCloseTo(perPlayer, 2);
      expect(result.prizes[7].amount).toBeCloseTo(perPlayer, 2);
    });

    it('deve garantir que todos os participantes ganham algo', () => {
      const entryFee = 5;
      const participants = Array.from({ length: 12 }, (_, i) => ({
        userId: `user-${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(entryFee, participants);

      // Todos devem ter prêmio > 0
      result.prizes.forEach(prize => {
        expect(prize.amount).toBeGreaterThan(0);
      });
    });
  });

  describe('Taxa Progressiva da Casa', () => {
    it('deve usar 10% para valores até R$ 5.000', () => {
      const participants = Array.from({ length: 100 }, (_, i) => ({
        userId: `user-${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(50, participants); // R$ 5.000 total

      expect(result.housePercentage).toBe(10);
      expect(result.houseTake).toBe(500);
    });

    it('deve usar 20% para valores acima de R$ 5.000', () => {
      const participants = Array.from({ length: 200 }, (_, i) => ({
        userId: `user-${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(50, participants); // R$ 10.000 total

      expect(result.housePercentage).toBe(20);
      expect(result.houseTake).toBe(2000);
    });
  });

  describe('Preview de Prêmios', () => {
    it('deve gerar preview correto para torneio massivo', () => {
      const preview = calculatePrizePreview(5, 8192);

      expect(preview.totalPrizePool).toBe(40960);
      expect(preview.housePercentage).toBe(20);
      expect(preview.houseTake).toBe(8192);
      expect(preview.netPrizePool).toBe(32768);

      // Deve ter 9 itens no preview (TOP 8 + bônus)
      expect(preview.preview.length).toBe(9);

      // Último item deve ser o bônus
      const bonusItem = preview.preview[preview.preview.length - 1];
      expect(bonusItem.description).toContain('2.048');
    });

    it('deve gerar preview correto para torneio grande', () => {
      const preview = calculatePrizePreview(10, 64);

      expect(preview.preview.length).toBe(9); // TOP 8 + resto
      expect(preview.preview[8].description).toContain('9º-64º');
    });

    it('deve gerar preview correto para torneio pequeno', () => {
      const preview = calculatePrizePreview(20, 4);

      expect(preview.preview.length).toBe(4); // Apenas TOP 4
    });
  });

  describe('Validação de Soma Total', () => {
    it('deve distribuir 100% do prize pool (tolerância de centavos)', () => {
      const testCases = [
        { entryFee: 5, participants: 8192 },
        { entryFee: 10, participants: 2048 },
        { entryFee: 15, participants: 512 },
        { entryFee: 20, participants: 64 },
        { entryFee: 25, participants: 16 },
        { entryFee: 30, participants: 8 },
      ];

      testCases.forEach(({ entryFee, participants: count }) => {
        const participants = Array.from({ length: count }, (_, i) => ({
          userId: `user-${i + 1}`,
          finalPosition: i + 1,
        }));

        const result = calculatePrizes(entryFee, participants);
        const totalPaid = result.prizes.reduce((sum, p) => sum + p.amount, 0);

        // Tolerância de R$ 2,00 devido a arredondamentos (quando temos 2048 jogadores)
        expect(Math.abs(totalPaid - result.netPrizePool)).toBeLessThanOrEqual(2);
      });
    });
  });
});
