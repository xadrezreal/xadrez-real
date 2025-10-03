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
exports.tournamentQueue = new bull_1.default("tournament-events", {
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
    },
});
exports.tournamentQueue.process("game-ended", async (job) => {
    const { gameIdText, wsManager, logger } = job.data;
    const orchestrator = new tournamentOrchestrator_1.TournamentOrchestrator(prisma, wsManager, logger);
    await orchestrator.handleMatchEnd(gameIdText);
});
exports.tournamentQueue.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});
exports.tournamentQueue.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
});
//# sourceMappingURL=tournamentQueue.js.map