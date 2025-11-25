"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const client_1 = require("@prisma/client");
const tournamentOrchestrator_1 = require("./tournamentOrchestrator");
const prisma = new client_1.PrismaClient();
const redisConfig = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`[QUEUE] Retry connection attempt ${times}, delay: ${delay}ms`);
        return delay;
    },
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};
exports.tournamentQueue = new bull_1.default("tournament-events", {
    redis: redisConfig,
});
console.log("[QUEUE] Tournament queue initialized");
exports.tournamentQueue.process("game-ended", async (job) => {
    console.log("[QUEUE] ========== PROCESSING JOB ==========");
    console.log("[QUEUE] Job ID:", job.id);
    console.log("[QUEUE] Job data:", job.data);
    const { gameIdText, wsManager, logger } = job.data;
    console.log("[QUEUE] Creating orchestrator...");
    const orchestrator = new tournamentOrchestrator_1.TournamentOrchestrator(prisma, wsManager, logger);
    console.log("[QUEUE] Calling handleMatchEnd...");
    await orchestrator.handleMatchEnd(gameIdText);
    console.log("[QUEUE] ✅ Job completed successfully");
    return { success: true };
});
exports.tournamentQueue.on("completed", (job, result) => {
    console.log(`[QUEUE] Job ${job.id} completed with result:`, result);
});
exports.tournamentQueue.on("failed", (job, err) => {
    console.error(`[QUEUE] Job ${job.id} failed with error:`, err);
});
exports.tournamentQueue.on("error", (error) => {
    console.error("[QUEUE] Queue error:", error.message);
});
exports.tournamentQueue.on("ready", () => {
    console.log("[QUEUE] ✅ Connected to Redis successfully!");
});
console.log("[QUEUE] Event listeners registered");
//# sourceMappingURL=tournamentQueue.js.map