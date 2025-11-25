-- Adicionar campos novos na tabela tournaments
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS "housePercentage" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS "prizePool" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "houseTake" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- Criar tabela tournament_prizes se não existir
CREATE TABLE IF NOT EXISTS tournament_prizes (
    id TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    position INTEGER NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_prizes_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES tournaments(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tournament_prizes_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS "tournament_prizes_tournamentId_idx" ON tournament_prizes("tournamentId");
CREATE INDEX IF NOT EXISTS "tournament_prizes_userId_idx" ON tournament_prizes("userId");

-- Adicionar relação tournamentPrizes ao User (já existe pela FK, só documentando)
COMMENT ON TABLE tournament_prizes IS 'Prizes awarded to users in tournaments';
