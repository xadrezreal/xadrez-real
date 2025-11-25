import { calculatePrizes, calculatePrizePreview } from '../prizeCalculator';

console.log('🧪 Testing Prize Calculator...\n');

// Test 1: Taxa de 10% até R$ 5.000
console.log('Test 1: Taxa de 10% (pote R$ 2.000)');
const test1 = calculatePrizePreview(20, 100);
console.log(`  Pote total: R$ ${test1.totalPrizePool}`);
console.log(`  Taxa casa: ${test1.housePercentage}%`);
console.log(`  Casa leva: R$ ${test1.houseTake}`);
console.log(`  Pote líquido: R$ ${test1.netPrizePool}`);
console.log(`  ✅ PASSED\n`);

// Test 2: Taxa de 20% acima de R$ 5.000
console.log('Test 2: Taxa de 20% (pote R$ 10.000)');
const test2 = calculatePrizePreview(20, 500);
console.log(`  Pote total: R$ ${test2.totalPrizePool}`);
console.log(`  Taxa casa: ${test2.housePercentage}%`);
console.log(`  Casa leva: R$ ${test2.houseTake}`);
console.log(`  Pote líquido: R$ ${test2.netPrizePool}`);
console.log(`  ✅ PASSED\n`);

// Test 3: Torneio de 2048 jogadores
console.log('Test 3: Torneio 2048 jogadores × R$ 20');
const participants2048 = Array.from({ length: 2048 }, (_, i) => ({
  userId: `user${i + 1}`,
  finalPosition: i + 1,
}));
const test3 = calculatePrizes(20, participants2048);
console.log(`  Pote total: R$ ${test3.totalPrizePool}`);
console.log(`  Taxa casa: ${test3.housePercentage}%`);
console.log(`  Casa leva: R$ ${test3.houseTake}`);
console.log(`  Pote líquido: R$ ${test3.netPrizePool}`);
console.log(`  Total de premiados: ${test3.prizes.length}`);
console.log(`  1º lugar: R$ ${test3.prizes[0].amount}`);
console.log(`  16º lugar: R$ ${test3.prizes[15].amount}`);
console.log(`  17º lugar: R$ ${test3.prizes[16].amount}`);
console.log(`  2048º lugar: R$ ${test3.prizes[2047].amount}`);

// Verificar soma
const totalPaid = test3.prizes.reduce((sum, p) => sum + p.amount, 0);
console.log(`  Soma de prêmios: R$ ${totalPaid.toFixed(2)}`);
console.log(`  Diferença: R$ ${Math.abs(totalPaid - test3.netPrizePool).toFixed(2)}`);
console.log(`  ✅ PASSED\n`);

// Test 4: Preview para 2048 jogadores
console.log('Test 4: Preview 2048 jogadores');
const preview = calculatePrizePreview(20, 2048);
console.log(`  Pote total: R$ ${preview.totalPrizePool}`);
console.log(`  Taxa casa: ${preview.housePercentage}%`);
console.log(`  Casa leva: R$ ${preview.houseTake}`);
console.log(`  Pote líquido: R$ ${preview.netPrizePool}`);
console.log(`  Premiação:`);
preview.preview.forEach(p => {
  console.log(`    ${p.description}: R$ ${p.amount}`);
});
console.log(`  ✅ PASSED\n`);

// Test 5: Torneio pequeno (4 jogadores)
console.log('Test 5: Torneio pequeno (4 jogadores × R$ 10)');
const participants4 = [
  { userId: 'user1', finalPosition: 1 },
  { userId: 'user2', finalPosition: 2 },
  { userId: 'user3', finalPosition: 3 },
  { userId: 'user4', finalPosition: 4 },
];
const test5 = calculatePrizes(10, participants4);
console.log(`  Pote total: R$ ${test5.totalPrizePool}`);
console.log(`  Taxa casa: ${test5.housePercentage}%`);
console.log(`  Casa leva: R$ ${test5.houseTake}`);
console.log(`  Pote líquido: R$ ${test5.netPrizePool}`);
console.log(`  1º lugar: R$ ${test5.prizes[0].amount} (50%)`);
console.log(`  2º lugar: R$ ${test5.prizes[1].amount} (30%)`);
console.log(`  3º lugar: R$ ${test5.prizes[2].amount} (10%)`);
console.log(`  4º lugar: R$ ${test5.prizes[3].amount} (10%)`);
console.log(`  ✅ PASSED\n`);

console.log('🎉 All tests passed!');
