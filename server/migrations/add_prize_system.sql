-- Adicionar campos novos na tabela Tournament
ALTER TABLE "Tournament"
ADD COLUMN IF NOT EXISTS "housePercentage" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS "prizePool" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "houseTake" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- Criar tabela TournamentPrize se não existir
CREATE TABLE IF NOT EXISTS "TournamentPrize" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentPrize_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TournamentPrize_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS "TournamentPrize_tournamentId_idx" ON "TournamentPrize"("tournamentId");
CREATE INDEX IF NOT EXISTS "TournamentPrize_userId_idx" ON "TournamentPrize"("userId");

-- Adicionar relação tournamentPrizes ao User (já existe pela FK, só documentando)
COMMENT ON TABLE "TournamentPrize" IS 'Prizes awarded to users in tournaments';
