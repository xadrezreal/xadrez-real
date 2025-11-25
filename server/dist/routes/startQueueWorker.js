"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startQueueWorker = startQueueWorker;
const bull_1 = __importDefault(require("bull"));
const client_1 = require("@prisma/client");
const tournamentOrchestrator_1 = require("./tournamentOrchestrator");
const prisma = new client_1.PrismaClient();
function startQueueWorker(wsManager, logger) {
    const queue = new bull_1.default("tournament-events", {
        redis: {
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: parseInt(process.env.REDIS_PORT || "6379"),
        },
    });
    queue.process("game-ended", async (job) => {
        console.log("[WORKER] ========== PROCESSING JOB ==========");
        console.log("[WORKER] Job ID:", job.id);
        const { gameIdText } = job.data;
        const orchestrator = new tournamentOrchestrator_1.TournamentOrchestrator(prisma, wsManager, logger);
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
//# sourceMappingURL=startQueueWorker.js.map