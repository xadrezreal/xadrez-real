import Queue from "bull";
import { PrismaClient } from "@prisma/client";
import { TournamentOrchestrator } from "./tournamentOrchestrator";

const prisma = new PrismaClient();

export const tournamentQueue = new Queue("tournament-events", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

tournamentQueue.process("game-ended", async (job) => {
  const { gameIdText, wsManager, logger } = job.data;
  const orchestrator = new TournamentOrchestrator(prisma, wsManager, logger);
  await orchestrator.handleMatchEnd(gameIdText);
});

tournamentQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

tournamentQueue.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
