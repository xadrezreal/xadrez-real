# 🎯 Torneio de Teste - Xadrez Real

Este documento explica como criar e visualizar um torneio de teste com 32 jogadores fictícios para testar o sistema de distribuição de prêmios.

## 📋 O que o script cria?

O script `seedTestTournament.ts` cria automaticamente:

- **1 usuário admin** (se não existir)
- **32 jogadores fictícios** com nomes brasileiros
- **1 torneio completo** com:
  - Taxa de entrada: R$ 50,00
  - Pote total: R$ 1.600,00
  - Taxa da casa (10%): R$ 160,00
  - Pote de prêmios: R$ 1.440,00
  - Status: FINALIZADO
  - 5 rodadas completas simuladas
  - Bracket completo com vencedores
  - Distribuição de prêmios calculada e paga
  - Transações registradas

## 🚀 Como executar

### Em ambiente de DESENVOLVIMENTO (local):

```bash
cd server
npm run seed:test-tournament
```

### Em ambiente de PRODUÇÃO:

⚠️ **ATENÇÃO**: Isso criará dados fictícios no banco de produção!

```bash
cd server
ALLOW_TEST_TOURNAMENT=yes npm run seed:test-tournament
```

## 📊 Distribuição de Prêmios

Para 32 jogadores (torneio pequeno < 16), a distribuição é:

### TOP 4 (70% do pote = R$ 1.008,00):
- 🥇 **1º lugar**: 50% = R$ 504,00
- 🥈 **2º lugar**: 28,5% = R$ 287,28
- 🥉 **3º lugar**: 14,3% = R$ 144,14
- **4º lugar**: 7,2% = R$ 72,58

### Resto (30% do pote = R$ 432,00):
- **5º ao 32º lugar**: R$ 432,00 ÷ 28 = R$ 15,43 cada

## 🌐 Como visualizar os resultados

Após executar o script, você verá no console o ID do torneio criado. Exemplo:

```
📋 ID do Torneio: clxy1z2abc3def4ghijk
```

### Opções de visualização:

1. **Página de Resultados** (recomendado):
   ```
   http://localhost:5173/tournament/{ID_DO_TORNEIO}/results
   ```
   - Mostra distribuição de prêmios
   - Lista de participantes
   - Estatísticas do torneio
   - Gráficos de distribuição

2. **Bracket Completo**:
   ```
   http://localhost:5173/tournament/{ID_DO_TORNEIO}/bracket
   ```
   - Visualização de todas as partidas
   - Progresso por rodadas
   - Vencedores de cada partida

3. **Detalhes do Torneio**:
   ```
   http://localhost:5173/tournament/{ID_DO_TORNEIO}
   ```
   - Informações gerais
   - Status do torneio

## 🗑️ Como deletar o torneio de teste

### Manualmente via Prisma Studio:

```bash
cd server
npm run db:studio
```

Então navegue até a tabela `tournaments` e delete o torneio.

### Via SQL (cuidado!):

```sql
-- Encontre o ID do torneio de teste
SELECT id, name FROM tournaments WHERE name LIKE '%Teste%';

-- Delete tudo relacionado ao torneio (substitua {ID} pelo ID real)
DELETE FROM tournament_prizes WHERE "tournamentId" = '{ID}';
DELETE FROM tournament_matches WHERE "tournamentId" = '{ID}';
DELETE FROM tournament_participants WHERE "tournamentId" = '{ID}';
DELETE FROM transactions WHERE metadata->>'tournamentId' = '{ID}';
DELETE FROM tournaments WHERE id = '{ID}';

-- Delete os jogadores de teste (opcional)
DELETE FROM users WHERE email LIKE '%@testeplayers.com';
```

## 🔒 Segurança

- **Ambiente de desenvolvimento**: O script roda normalmente
- **Ambiente de produção**: Requer a flag `ALLOW_TEST_TOURNAMENT=yes`
- Todos os jogadores de teste têm o email no formato: `nome.sobrenome@testeplayers.com`
- Todos os jogadores de teste têm a senha: `teste123`
- O admin tem a senha: `admin123` (se for criado pelo script)

## 📁 Estrutura de arquivos criados

```
server/src/scripts/
  └── seedTestTournament.ts     # Script principal

server/package.json
  └── "seed:test-tournament"     # Comando npm

web/src/components/
  └── TestTournamentResults.jsx  # Página de visualização

web/src/App.jsx
  └── /tournament/:id/results    # Rota adicionada
```

## 🎮 Testando em produção

Se você quiser testar o sistema de prêmios em produção:

1. **Execute o script em produção**:
   ```bash
   ALLOW_TEST_TOURNAMENT=yes npm run seed:test-tournament
   ```

2. **Acesse a URL de resultados**:
   ```
   https://seu-dominio.com/tournament/{ID}/results
   ```

3. **Verifique**:
   - Distribuição de prêmios
   - Saldos dos jogadores
   - Transações registradas

4. **Delete após testar**:
   - Use Prisma Studio ou SQL para remover os dados de teste

## ⚙️ Customização

Para mudar os valores do torneio, edite o arquivo `seedTestTournament.ts`:

```typescript
// Linha ~110
const entryFee = 50;              // Mude a taxa de entrada
const playerCount = 32;           // Mude o número de jogadores
const tournamentName = '...';     // Mude o nome do torneio
```

Depois execute novamente o script.

## 🐛 Troubleshooting

### Erro: "username não existe no tipo User"
- **Causa**: O schema do Prisma usa `name` ao invés de `username`
- **Solução**: Já corrigido no script atual

### Erro: "calculatePrizes expects 2 arguments"
- **Causa**: Versão antiga da função
- **Solução**: Verifique que está usando a versão correta em `prizeCalculator.ts`

### Torneio não aparece na lista
- **Causa**: Torneio está com status FINISHED
- **Solução**: Use filtro de status ou acesse diretamente via URL

### Prêmios não aparecem
- **Causa**: Endpoint pode não estar retornando os prêmios
- **Solução**: Verifique se o backend está incluindo `prizes` na resposta

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do console ao executar o script
2. Confira que o Prisma está atualizado: `npm run db:generate`
3. Verifique a conexão com o banco de dados
4. Revise os arquivos de schema do Prisma

---

✅ **Tudo pronto!** Agora você pode criar e visualizar torneios de teste completos.
