import Queue from "bull";
import { PrismaClient } from "@prisma/client";
import { TournamentOrchestrator } from "./tournamentOrchestrator";

const prisma = new PrismaClient();

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`[QUEUE] Retry connection attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const tournamentQueue = new Queue("tournament-events", {
  redis: redisConfig,
});

console.log("[QUEUE] Tournament queue initialized");

tournamentQueue.process("game-ended", async (job) => {
  console.log("[QUEUE] ========== PROCESSING JOB ==========");
  console.log("[QUEUE] Job ID:", job.id);
  console.log("[QUEUE] Job data:", job.data);

  const { gameIdText, wsManager, logger } = job.data;

  console.log("[QUEUE] Creating orchestrator...");
  const orchestrator = new TournamentOrchestrator(prisma, wsManager, logger);

  console.log("[QUEUE] Calling handleMatchEnd...");
  await orchestrator.handleMatchEnd(gameIdText);

  console.log("[QUEUE] ✅ Job completed successfully");
  return { success: true };
});

tournamentQueue.on("completed", (job, result) => {
  console.log(`[QUEUE] Job ${job.id} completed with result:`, result);
});

tournamentQueue.on("failed", (job, err) => {
  console.error(`[QUEUE] Job ${job.id} failed with error:`, err);
});

tournamentQueue.on("error", (error) => {
  console.error("[QUEUE] Queue error:", error.message);
});

tournamentQueue.on("ready", () => {
  console.log("[QUEUE] ✅ Connected to Redis successfully!");
});

console.log("[QUEUE] Event listeners registered");
