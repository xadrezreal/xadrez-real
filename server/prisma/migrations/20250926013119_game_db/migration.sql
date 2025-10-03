-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('FREEMIUM', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."TournamentStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "public"."PrizeDistribution" AS ENUM ('WINNER_TAKES_ALL', 'SPLIT_TOP_2', 'SPLIT_TOP_4');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'FREEMIUM',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entryFee" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "playerCount" INTEGER NOT NULL,
    "prizeDistribution" "public"."PrizeDistribution" NOT NULL DEFAULT 'SPLIT_TOP_2',
    "status" "public"."TournamentStatus" NOT NULL DEFAULT 'WAITING',
    "startTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tournament_participants" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."game_states" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournamentId_userId_key" ON "public"."tournament_participants"("tournamentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "game_states_gameId_key" ON "public"."game_states"("gameId");

-- AddForeignKey
ALTER TABLE "public"."tournaments" ADD CONSTRAINT "tournaments_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_participants" ADD CONSTRAINT "tournament_participants_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tournament_participants" ADD CONSTRAINT "tournament_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
