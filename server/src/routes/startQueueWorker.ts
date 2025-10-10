import Queue from "bull";
import { PrismaClient } from "@prisma/client";
import { TournamentOrchestrator } from "./tournamentOrchestrator";

const prisma = new PrismaClient();

export function startQueueWorker(wsManager: any, logger: any) {
  const queue = new Queue("tournament-events", {
    redis: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    },
  });

  queue.process("game-ended", async (job) => {
    console.log("[WORKER] ========== PROCESSING JOB ==========");
    console.log("[WORKER] Job ID:", job.id);

    const { gameIdText } = job.data;
    const orchestrator = new TournamentOrchestrator(prisma, wsManager, logger);

    await orchestrator.handleMatchEnd(gameIdText);

    console.log("[WORKER] ✅ Job completed");
    return { success: true };
  });

  queue.on("completed", (job) => {
    console.log(`[WORKER] Job ${job.id} completed`);
  });

  queue.on("failed", (job, err) => {
    console.error(`[WORKER] Job ${job.id} failed:`, err.message);
  });

  console.log("[WORKER] ✅ Queue worker started");
}
