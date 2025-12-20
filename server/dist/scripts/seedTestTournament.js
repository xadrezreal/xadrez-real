"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prizeCalculator_1 = require("../services/prizeCalculator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
// Gera nomes fictícios brasileiros
const firstNames = [
    'João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Julia', 'Carlos', 'Beatriz',
    'Rafael', 'Larissa', 'Felipe', 'Camila', 'Bruno', 'Fernanda', 'Thiago', 'Amanda',
    'Gustavo', 'Isabela', 'Diego', 'Gabriela', 'Matheus', 'Carolina', 'Ricardo', 'Vanessa',
    'André', 'Patrícia', 'Marcelo', 'Renata', 'Rodrigo', 'Juliana', 'Fábio', 'Mariana'
];
const lastNames = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
    'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Rocha', 'Almeida',
    'Nascimento', 'Araújo', 'Melo', 'Barbosa', 'Cardoso', 'Correia', 'Dias', 'Teixeira',
    'Cavalcanti', 'Monteiro', 'Freitas', 'Campos', 'Miranda', 'Pires', 'Moreira', 'Mendes'
];
function generateEmail(firstName, lastName, index) {
    const clean = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return `${clean(firstName)}.${clean(lastName)}${index}@testeplayers.com`;
}
async function seedTestTournament() {
    console.log('🎮 Iniciando criação de torneio de teste...\n');
    // SEGURANÇA: Não executar em produção sem confirmação explícita
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_TOURNAMENT !== 'yes') {
        console.error('❌ ERRO: Este script não pode ser executado em produção sem confirmação!');
        console.error('   Este é um script de TESTE apenas para ambiente de desenvolvimento.');
        console.error('   Para executar em produção, defina: ALLOW_TEST_TOURNAMENT=yes');
        process.exit(1);
    }
    if (process.env.NODE_ENV === 'production') {
        console.log('🚨 ATENÇÃO: Executando em PRODUÇÃO!');
        console.log('   Dados fictícios serão criados no banco de produção.');
        console.log('   Lembre-se de deletar depois!\n');
    }
    else {
        console.log('⚠️  AVISO: Este script criará dados fictícios no banco de dados.');
        console.log('   Ambiente: DESENVOLVIMENTO\n');
    }
    try {
        // 1. Criar usuário admin se não existir
        let adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });
        if (!adminUser) {
            console.log('👤 Criando usuário admin...');
            const hashedPassword = await bcryptjs_1.default.hash('admin123', 10);
            adminUser = await prisma.user.create({
                data: {
                    email: 'admin@xadrezreal.com',
                    name: 'Administrador',
                    password: hashedPassword,
                    role: 'ADMIN',
                    balance: 100000, // Saldo alto para testes
                    tournamentPoints: 0
                }
            });
            console.log('✅ Admin criado\n');
        }
        else {
            console.log('✅ Admin já existe\n');
        }
        // 2. Criar 32 jogadores fictícios
        console.log('👥 Criando 32 jogadores fictícios...');
        const players = [];
        const hashedPassword = await bcryptjs_1.default.hash('teste123', 10);
        for (let i = 0; i < 32; i++) {
            const firstName = firstNames[i];
            const lastName = lastNames[i];
            const fullName = `${firstName} ${lastName}`;
            const email = generateEmail(firstName, lastName, i + 1);
            // Verifica se usuário já existe
            let player = await prisma.user.findUnique({
                where: { email }
            });
            if (!player) {
                player = await prisma.user.create({
                    data: {
                        email,
                        name: fullName,
                        password: hashedPassword,
                        balance: 1000, // R$ 1.000 para cada jogador
                        role: 'FREEMIUM',
                        tournamentPoints: 0
                    }
                });
                console.log(`  ✓ ${player.name}`);
            }
            else {
                console.log(`  → ${player.name} já existe`);
            }
            players.push(player);
        }
        console.log(`\n✅ ${players.length} jogadores prontos\n`);
        // 3. Criar torneio de teste
        console.log('🏆 Criando torneio de teste...');
        const entryFee = 50; // R$ 50 de entrada
        const expectedPrizePool = entryFee * players.length; // R$ 1.600 total
        const housePercentage = expectedPrizePool > 5000 ? 20 : 10; // 10% para potes < R$ 5.000
        const houseTake = expectedPrizePool * (housePercentage / 100);
        const netPrizePool = expectedPrizePool - houseTake;
        const tournament = await prisma.tournament.create({
            data: {
                name: '🎯 Torneio de Teste - 32 Jogadores',
                entryFee,
                playerCount: 32,
                status: 'FINISHED', // Já finalizado para visualizar prêmios
                startTime: new Date(Date.now() - 3600000), // 1 hora atrás
                currentRound: 5,
                totalRounds: 5, // log2(32) = 5 rodadas
                creatorId: adminUser.id,
                housePercentage,
                prizePool: netPrizePool,
                houseTake
            }
        });
        console.log(`  ✓ Torneio criado: ${tournament.name}`);
        console.log(`  ✓ ID: ${tournament.id}`);
        console.log(`  ✓ Taxa de entrada: R$ ${entryFee.toFixed(2)}`);
        console.log(`  ✓ Pote total coletado: R$ ${expectedPrizePool.toFixed(2)}`);
        console.log(`  ✓ Taxa da casa (${housePercentage}%): R$ ${houseTake.toFixed(2)}`);
        console.log(`  ✓ Pote de prêmios: R$ ${netPrizePool.toFixed(2)}\n`);
        // 4. Registrar todos os jogadores no torneio
        console.log('📝 Registrando jogadores no torneio...');
        for (const player of players) {
            await prisma.tournamentParticipant.create({
                data: {
                    tournamentId: tournament.id,
                    userId: player.id,
                    paidEntry: true,
                    joinedAt: new Date(Date.now() - 3600000 + Math.random() * 1800000) // Entre 1h e 30min atrás
                }
            });
            // Debita a entrada do saldo do jogador
            await prisma.user.update({
                where: { id: player.id },
                data: {
                    balance: {
                        decrement: entryFee
                    }
                }
            });
        }
        console.log(`✅ ${players.length} jogadores registrados e pagamento processado\n`);
        // 5. Simular bracket completo (5 rodadas)
        console.log('🎲 Simulando bracket do torneio...\n');
        // Embaralha jogadores aleatoriamente
        const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
        let currentRoundPlayers = shuffledPlayers;
        for (let round = 1; round <= 5; round++) {
            const matchesInRound = Math.ceil(currentRoundPlayers.length / 2);
            console.log(`  Rodada ${round}/5 (${matchesInRound} partidas):`);
            const winners = [];
            for (let i = 0; i < currentRoundPlayers.length; i += 2) {
                const player1 = currentRoundPlayers[i];
                const player2 = currentRoundPlayers[i + 1];
                if (!player2) {
                    // BYE - jogador avança automaticamente
                    winners.push(player1);
                    await prisma.tournamentMatch.create({
                        data: {
                            tournamentId: tournament.id,
                            round,
                            matchNumber: Math.floor(i / 2) + 1,
                            player1Id: player1.id,
                            status: 'BYE',
                            winnerId: player1.id
                        }
                    });
                    console.log(`    ✓ ${player1.name} avança (BYE)`);
                }
                else {
                    // Simula partida - vencedor aleatório (50/50)
                    const winner = Math.random() > 0.5 ? player1 : player2;
                    winners.push(winner);
                    await prisma.tournamentMatch.create({
                        data: {
                            tournamentId: tournament.id,
                            round,
                            matchNumber: Math.floor(i / 2) + 1,
                            player1Id: player1.id,
                            player2Id: player2.id,
                            winnerId: winner.id,
                            status: 'COMPLETED'
                        }
                    });
                    console.log(`    ✓ ${winner.name} vence ${winner.id === player1.id ? player2.name : player1.name}`);
                }
            }
            currentRoundPlayers = winners;
            console.log('');
        }
        // O último vencedor é o campeão
        const champion = currentRoundPlayers[0];
        await prisma.tournament.update({
            where: { id: tournament.id },
            data: {
                winnerId: champion.id
            }
        });
        console.log(`🏆 CAMPEÃO: ${champion.name}\n`);
        // 6. Calcular e distribuir prêmios
        console.log('💰 Calculando distribuição de prêmios...\n');
        // Determinar posições finais baseado no bracket
        const finalPositions = new Map();
        // 1º lugar - campeão da final (rodada 5)
        finalPositions.set(champion.id, 1);
        // 2º lugar - perdedor da final (rodada 5)
        const finalMatch = await prisma.tournamentMatch.findFirst({
            where: {
                tournamentId: tournament.id,
                round: 5
            }
        });
        if (finalMatch) {
            const runnerUpId = finalMatch.player1Id === champion.id
                ? finalMatch.player2Id
                : finalMatch.player1Id;
            if (runnerUpId)
                finalPositions.set(runnerUpId, 2);
        }
        // 3º e 4º lugares - perdedores da semifinal (rodada 4)
        const semifinalMatches = await prisma.tournamentMatch.findMany({
            where: {
                tournamentId: tournament.id,
                round: 4
            }
        });
        let position = 3;
        for (const match of semifinalMatches) {
            const loserId = match.player1Id === match.winnerId
                ? match.player2Id
                : match.player1Id;
            if (loserId && !finalPositions.has(loserId)) {
                finalPositions.set(loserId, position);
                position++;
            }
        }
        // 5º-8º lugares - perdedores das quartas (rodada 3)
        const quarterMatches = await prisma.tournamentMatch.findMany({
            where: {
                tournamentId: tournament.id,
                round: 3
            }
        });
        for (const match of quarterMatches) {
            const loserId = match.player1Id === match.winnerId
                ? match.player2Id
                : match.player1Id;
            if (loserId && !finalPositions.has(loserId)) {
                finalPositions.set(loserId, position);
                position++;
            }
        }
        // Restante dos jogadores (9º-32º) - perdedores das rodadas anteriores
        for (const player of players) {
            if (!finalPositions.has(player.id)) {
                finalPositions.set(player.id, position);
                position++;
            }
        }
        // Usa a função calculatePrizes
        const participantsWithPositions = Array.from(finalPositions.entries()).map(([userId, pos]) => ({
            userId,
            finalPosition: pos
        }));
        const prizeCalculation = (0, prizeCalculator_1.calculatePrizes)(entryFee, participantsWithPositions);
        console.log('📊 RESUMO DA DISTRIBUIÇÃO:\n');
        console.log(`  Total arrecadado: R$ ${expectedPrizePool.toFixed(2)}`);
        console.log(`  Taxa da casa (${housePercentage}%): R$ ${houseTake.toFixed(2)}`);
        console.log(`  Pote de prêmios: R$ ${prizeCalculation.netPrizePool.toFixed(2)}\n`);
        console.log('🏅 PREMIAÇÃO:\n');
        let totalDistributed = 0;
        for (const prize of prizeCalculation.prizes) {
            const player = players.find(p => p.id === prize.userId);
            if (player) {
                // Cria registro de prêmio
                await prisma.tournamentPrize.create({
                    data: {
                        tournamentId: tournament.id,
                        userId: player.id,
                        position: prize.position,
                        amount: prize.amount,
                        paid: true,
                        paidAt: new Date()
                    }
                });
                // Credita prêmio no saldo do jogador
                await prisma.user.update({
                    where: { id: player.id },
                    data: {
                        balance: {
                            increment: prize.amount
                        }
                    }
                });
                totalDistributed += prize.amount;
                const medal = prize.position === 1 ? '🥇' : prize.position === 2 ? '🥈' : prize.position === 3 ? '🥉' : '  ';
                console.log(`  ${medal} ${prize.position}º lugar - ${player.name.padEnd(25)} R$ ${prize.amount.toFixed(2).padStart(10)}`);
            }
        }
        console.log('\n' + '─'.repeat(60));
        console.log(`  TOTAL DISTRIBUÍDO: R$ ${totalDistributed.toFixed(2)}`);
        console.log(`  LUCRO DA CASA: R$ ${houseTake.toFixed(2)}`);
        console.log('─'.repeat(60));
        // 7. Criar transações para auditoria
        console.log('\n💳 Registrando transações...');
        // Transações de entrada
        for (const player of players) {
            await prisma.transaction.create({
                data: {
                    userId: player.id,
                    type: 'TOURNAMENT_ENTRY',
                    amount: -entryFee,
                    status: 'COMPLETED',
                    metadata: {
                        tournamentId: tournament.id,
                        tournamentName: tournament.name
                    }
                }
            });
        }
        // Transações de prêmio
        for (const prize of prizeCalculation.prizes) {
            await prisma.transaction.create({
                data: {
                    userId: prize.userId,
                    type: 'TOURNAMENT_PRIZE',
                    amount: prize.amount,
                    status: 'COMPLETED',
                    metadata: {
                        tournamentId: tournament.id,
                        tournamentName: tournament.name,
                        position: prize.position
                    }
                }
            });
        }
        console.log('✅ Transações registradas\n');
        console.log('━'.repeat(60));
        console.log('🎉 TORNEIO DE TESTE CRIADO COM SUCESSO!');
        console.log('━'.repeat(60));
        console.log(`\n📋 ID do Torneio: ${tournament.id}`);
        console.log(`👥 Total de jogadores: ${players.length}`);
        console.log(`💰 Pote de prêmios: R$ ${netPrizePool.toFixed(2)}`);
        console.log(`🏆 Campeão: ${champion.name}`);
        console.log(`🥇 Prêmio do campeão: R$ ${prizeCalculation.prizes[0].amount.toFixed(2)}\n`);
        console.log('🔗 Para visualizar:');
        console.log(`   - Resultados: /tournament/${tournament.id}/results`);
        console.log(`   - Bracket: /tournament/${tournament.id}/bracket\n`);
    }
    catch (error) {
        console.error('❌ Erro ao criar torneio de teste:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Executa o seed
seedTestTournament()
    .then(() => {
    console.log('✅ Script finalizado!');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Falha ao executar script:', error);
    process.exit(1);
});
//# sourceMappingURL=seedTestTournament.js.map