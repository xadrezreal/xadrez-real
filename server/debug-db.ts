// debug-db.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugDB() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log("========== TOURNAMENTS (Today) ==========");
  const tournaments = await prisma.tournament.findMany({
    where: {
      createdAt: {
        gte: today,
      },
    },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  console.log(JSON.stringify(tournaments, null, 2));

  console.log("\n========== TOURNAMENT MATCHES (Today) ==========");
  const matches = await prisma.tournamentMatch.findMany({
    where: {
      createdAt: {
        gte: today,
      },
    },
    include: {
      player1: true,
      player2: true,
      winner: true,
      tournament: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  console.log(JSON.stringify(matches, null, 2));

  console.log("\n========== GAMES (Today) ==========");
  const games = await prisma.game.findMany({
    where: {
      tournament_id: {
        not: null,
      },
      createdAt: {
        gte: today,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  console.log(JSON.stringify(games, null, 2));

  console.log("\n========== SPECIFIC TOURNAMENT ==========");
  const specificTournament = await prisma.tournament.findUnique({
    where: {
      id: "cmgipjv670094kv6d1zu4cjom",
    },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
  });
  console.log(JSON.stringify(specificTournament, null, 2));

  console.log("\n========== MATCHES FOR SPECIFIC TOURNAMENT ==========");
  const specificMatches = await prisma.tournamentMatch.findMany({
    where: {
      tournamentId: "cmgipjv670094kv6d1zu4cjom",
    },
    include: {
      player1: true,
      player2: true,
      winner: true,
    },
    orderBy: {
      round: "asc",
      matchNumber: "asc",
    },
  });
  console.log(JSON.stringify(specificMatches, null, 2));

  console.log("\n========== GAMES FOR SPECIFIC TOURNAMENT ==========");
  const specificGames = await prisma.game.findMany({
    where: {
      tournament_id: "cmgipjv670094kv6d1zu4cjom",
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  console.log(JSON.stringify(specificGames, null, 2));

  await prisma.$disconnect();
}

debugDB();
