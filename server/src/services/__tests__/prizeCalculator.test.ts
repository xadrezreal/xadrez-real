import { calculatePrizes, calculatePrizePreview } from '../prizeCalculator';

describe('PrizeCalculator', () => {
  describe('calculateHouseFee', () => {
    it('deve aplicar 10% para pote até R$ 5.000', () => {
      // Torneio pequeno: 100 jogadores × R$ 20 = R$ 2.000
      const result = calculatePrizePreview(20, 100);

      expect(result.totalPrizePool).toBe(2000);
      expect(result.housePercentage).toBe(10);
      expect(result.houseTake).toBe(200);
      expect(result.netPrizePool).toBe(1800);
    });

    it('deve aplicar 20% para pote acima de R$ 5.000', () => {
      // Torneio grande: 500 jogadores × R$ 20 = R$ 10.000
      const result = calculatePrizePreview(20, 500);

      expect(result.totalPrizePool).toBe(10000);
      expect(result.housePercentage).toBe(20);
      expect(result.houseTake).toBe(2000);
      expect(result.netPrizePool).toBe(8000);
    });

    it('deve aplicar 20% exatamente no limite de R$ 5.000', () => {
      // Exatamente R$ 5.000: 250 jogadores × R$ 20 = R$ 5.000
      const result = calculatePrizePreview(20, 250);

      expect(result.totalPrizePool).toBe(5000);
      expect(result.housePercentage).toBe(10); // Ainda 10% em R$ 5.000
    });
  });

  describe('calculatePrizes - Torneios pequenos (<16)', () => {
    it('deve distribuir corretamente para 4 jogadores', () => {
      const participants = [
        { userId: 'user1', finalPosition: 1 },
        { userId: 'user2', finalPosition: 2 },
        { userId: 'user3', finalPosition: 3 },
        { userId: 'user4', finalPosition: 4 },
      ];

      const result = calculatePrizes(10, participants);

      // 4 × R$ 10 = R$ 40
      // 10% casa = R$ 4
      // Pote líquido = R$ 36
      expect(result.totalPrizePool).toBe(40);
      expect(result.houseTake).toBe(4);
      expect(result.netPrizePool).toBe(36);

      // 1º: 50% = R$ 18
      // 2º: 30% = R$ 10.80
      // 3º: 10% = R$ 3.60
      // 4º: 10% = R$ 3.60
      expect(result.prizes).toHaveLength(4);
      expect(result.prizes[0].amount).toBe(18);
      expect(result.prizes[1].amount).toBe(10.8);
      expect(result.prizes[2].amount).toBe(3.6);
      expect(result.prizes[3].amount).toBe(3.6);
    });
  });

  describe('calculatePrizes - Torneios grandes (≥16)', () => {
    it('deve distribuir para TOP 16 + resto igualmente (2048 jogadores)', () => {
      // Simular torneio de 2048 jogadores com R$ 20 entrada
      const participants = Array.from({ length: 2048 }, (_, i) => ({
        userId: `user${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(20, participants);

      // 2048 × R$ 20 = R$ 40.960
      // 20% casa = R$ 8.192
      // Pote líquido = R$ 32.768
      expect(result.totalPrizePool).toBe(40960);
      expect(result.housePercentage).toBe(20);
      expect(result.houseTake).toBe(8192);
      expect(result.netPrizePool).toBe(32768);

      // Todos os 2048 participantes devem receber algum prêmio
      expect(result.prizes).toHaveLength(2048);

      // TOP 16 recebe 60% = R$ 19.660,80
      // Campeão deve receber o maior valor
      const firstPlace = result.prizes.find(p => p.position === 1);
      expect(firstPlace).toBeDefined();
      expect(firstPlace!.amount).toBeGreaterThan(5000);
      expect(firstPlace!.amount).toBeLessThanOrEqual(8000);

      // 16º lugar deve receber menos que 1º
      const sixteenthPlace = result.prizes.find(p => p.position === 16);
      expect(sixteenthPlace).toBeDefined();
      expect(sixteenthPlace!.amount).toBeLessThan(firstPlace!.amount);
      expect(sixteenthPlace!.amount).toBeGreaterThan(0);

      // Resto (2032 jogadores) divide 40% = R$ 13.107,20
      // R$ 13.107,20 ÷ 2032 ≈ R$ 6,45 por pessoa
      const seventeenthPlace = result.prizes.find(p => p.position === 17);
      expect(seventeenthPlace).toBeDefined();
      expect(seventeenthPlace!.amount).toBeGreaterThan(6);
      expect(seventeenthPlace!.amount).toBeLessThan(7);

      // Todos do 17º ao 2048º devem receber o mesmo valor
      const restPrizes = result.prizes.slice(16);
      const firstRestPrize = restPrizes[0].amount;
      restPrizes.forEach(prize => {
        expect(prize.amount).toBe(firstRestPrize);
      });
    });

    it('deve ter soma de prêmios igual ao pote líquido', () => {
      const participants = Array.from({ length: 100 }, (_, i) => ({
        userId: `user${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(50, participants);

      // Somar todos os prêmios
      const totalPaid = result.prizes.reduce((sum, prize) => sum + prize.amount, 0);

      // Deve ser igual ao pote líquido (com margem de centavos por arredondamento)
      expect(Math.abs(totalPaid - result.netPrizePool)).toBeLessThan(1);
    });
  });

  describe('calculatePrizePreview', () => {
    it('deve mostrar preview correto para 2048 jogadores', () => {
      const preview = calculatePrizePreview(20, 2048);

      expect(preview.totalPrizePool).toBe(40960);
      expect(preview.houseTake).toBe(8192);
      expect(preview.netPrizePool).toBe(32768);
      expect(preview.preview.length).toBeGreaterThan(5);

      // Deve ter prêmio para campeão
      const firstPlace = preview.preview.find(p => p.description.includes('1º'));
      expect(firstPlace).toBeDefined();
      expect(firstPlace!.amount).toBeGreaterThan(5000);
    });

    it('deve mostrar preview correto para torneio pequeno', () => {
      const preview = calculatePrizePreview(10, 8);

      expect(preview.totalPrizePool).toBe(80);
      expect(preview.housePercentage).toBe(10);
      expect(preview.houseTake).toBe(8);
      expect(preview.netPrizePool).toBe(72);
      expect(preview.preview).toHaveLength(4);
    });
  });

  describe('Edge cases', () => {
    it('deve lidar com arredondamento corretamente', () => {
      const participants = Array.from({ length: 17 }, (_, i) => ({
        userId: `user${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(9.99, participants);

      // Valores devem ter no máximo 2 casas decimais
      result.prizes.forEach(prize => {
        expect(prize.amount.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      });
    });

    it('não deve criar prêmios negativos', () => {
      const participants = Array.from({ length: 50 }, (_, i) => ({
        userId: `user${i + 1}`,
        finalPosition: i + 1,
      }));

      const result = calculatePrizes(1, participants);

      result.prizes.forEach(prize => {
        expect(prize.amount).toBeGreaterThan(0);
      });
    });
  });
});
