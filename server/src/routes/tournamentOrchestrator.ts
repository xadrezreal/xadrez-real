import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { WebSocketManager } from "../websocket/webSocketManager";

export class TournamentOrchestrator {
  private prisma: PrismaClient;
  private wsManager: WebSocketManager;
  private logger: FastifyBaseLogger;

  constructor(
    prisma: PrismaClient,
    wsManager: WebSocketManager,
    logger: FastifyBaseLogger
  ) {
    this.prisma = prisma;
    this.wsManager = wsManager;
    this.logger = logger;
  }

  async createBracket(tournamentId: string): Promise<any> {
    console.log("[BRACKET] Starting createBracket for", tournamentId);

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    if (!tournament) throw new Error("Tournament not found");
    console.log(
      "[BRACKET] Found tournament with",
      tournament.participants.length,
      "participants"
    );

    await this.prisma.tournamentMatch.deleteMany({
      where: { tournamentId },
    });
    console.log("[BRACKET] Deleted old matches");

    const participants = tournament.participants.map((p) => p.user);
    const numPlayers = participants.length;
    const totalRounds = Math.ceil(Math.log2(numPlayers));

    console.log("[BRACKET] Will create", totalRounds, "rounds");

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { totalRounds, currentRound: 1 },
    });

    await this.createRoundMatches(tournamentId, 1, participants);
    console.log("[BRACKET] Matches created successfully");

    this.logger.info(
      `Bracket created for tournament ${tournamentId}: ${totalRounds} rounds`
    );
  }

  private async createRoundMatches(
    tournamentId: string,
    round: number,
    players: any[]
  ): Promise<void> {
    console.log(
      `[BRACKET] Creating ${Math.ceil(
        players.length / 2
      )} matches for round ${round}`
    );

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const matchesInRound = Math.ceil(shuffled.length / 2);

    for (let i = 0; i < matchesInRound; i++) {
      const player1 = shuffled[i * 2];
      const player2 = shuffled[i * 2 + 1] || null;

      const matchStatus = !player2 ? "BYE" : "PENDING";
      const winnerId = !player2 ? player1.id : null;

      console.log(
        `[BRACKET] Match ${i + 1}: ${player1.name} vs ${player2?.name || "BYE"}`
      );

      await this.prisma.tournamentMatch.create({
        data: {
          tournamentId,
          round,
          matchNumber: i + 1,
          player1Id: player1.id,
          player2Id: player2?.id,
          status: matchStatus,
          winnerId,
        },
      });

      if (!player2) {
        this.logger.info(
          `Player ${player1.name} receives BYE in round ${round}`
        );
      }
    }
  }

  async startMatch(matchId: string): Promise<any> {
    const match = await this.prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: {
        player1: true,
        player2: true,
        tournament: true,
      },
    });

    if (!match || !match.player1 || !match.player2) {
      throw new Error("Match or players not found");
    }

    if (match.status === "COMPLETED" || match.status === "BYE") {
      throw new Error("Match already finished");
    }

if (match.status === "IN_PROGRESS") {
  const existingGame = await this.prisma.game.findUnique({
    where: { game_id_text: match.gameId! },
  });
  return existingGame;
}
    const isFirstWhite = Math.random() < 0.5;
    const whitePlayer = isFirstWhite ? match.player1 : match.player2;
    const blackPlayer = isFirstWhite ? match.player2 : match.player1;

    const gameIdText = `tournament-${match.tournamentId}-r${match.round}-m${match.matchNumber}`;

    const game = await this.prisma.game.upsert({
      where: { game_id_text: gameIdText },
      update: {
        status: "playing",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        white_time: 600,
        black_time: 600,
      },
      create: {
        game_id_text: gameIdText,
        tournament_id: match.tournamentId,
        white_player_id: whitePlayer.id,
        black_player_id: blackPlayer.id,
        white_player_name: whitePlayer.name,
        black_player_name: blackPlayer.name,
        white_player_country: whitePlayer.country,
        black_player_country: blackPlayer.country,
        status: "playing",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        white_time: 600,
        black_time: 600,
        wager: 0,
      },
    });

    await this.prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        gameId: game.game_id_text,
        status: "IN_PROGRESS",
      },
    });

    this.wsManager.broadcastToTournament(match.tournamentId, {
      type: "MATCH_STARTED",
      data: {
        matchId,
        round: match.round,
        gameId: game.game_id_text,
        whitePlayer: whitePlayer.name,
        blackPlayer: blackPlayer.name,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
      },
    });

    this.logger.info(`Match ${matchId} started: ${game.game_id_text}`);

    return game;
  }

  async handleMatchEnd(gameIdText: string): Promise<void> {
    console.log("[MATCH_END] Processing game end:", gameIdText);

    const game = await this.prisma.game.findUnique({
      where: { game_id_text: gameIdText },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });

    if (!game || !game.tournament_id || !game.winner_id) {
      this.logger.warn(
        `Game ${gameIdText} is not a tournament game or has no winner`
      );
      return;
    }

    console.log("[MATCH_END] Found game with winner:", game.winner_id);

    const match = await this.prisma.tournamentMatch.findUnique({
      where: { gameId: gameIdText },
      include: { tournament: true },
    });

    if (!match) {
      this.logger.error(`Match not found for game ${gameIdText}`);
      return;
    }

    console.log("[MATCH_END] Updating match to COMPLETED");

    await this.prisma.tournamentMatch.update({
      where: { id: match.id },
      data: {
        winnerId: game.winner_id,
        status: "COMPLETED",
      },
    });

    this.wsManager.broadcastToTournament(match.tournamentId, {
      type: "MATCH_COMPLETED",
      data: {
        matchId: match.id,
        round: match.round,
        winnerId: game.winner_id,
        winnerName:
          game.winner_id === game.white_player_id
            ? game.whitePlayer.name
            : game.blackPlayer.name,
      },
    });

    const pointsForWin = this.calculateMatchPoints(
      match.round,
      match.tournament.totalRounds
    );

    console.log("[MATCH_END] Awarding", pointsForWin, "points to winner");

    await this.prisma.user.update({
      where: { id: game.winner_id },
      data: {
        tournamentPoints: { increment: pointsForWin },
      },
    });

    this.logger.info(
      `Match ${match.id} completed. Winner: ${game.winner_id} (+${pointsForWin} points)`
    );

    await this.checkRoundCompletion(match.tournamentId, match.round);
  }

  private calculateMatchPoints(round: number, totalRounds: number): number {
    const roundsFromFinal = totalRounds - round + 1;
    const pointsMap: Record<number, number> = {
      1: 10,
      2: 25,
      3: 50,
      4: 100,
    };
    return pointsMap[roundsFromFinal] || 10;
  }

  private async checkRoundCompletion(
    tournamentId: string,
    round: number
  ): Promise<void> {
    console.log("[ROUND_CHECK] Checking if round", round, "is complete");

    const pendingMatches = await this.prisma.tournamentMatch.count({
      where: {
        tournamentId,
        round,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    console.log("[ROUND_CHECK] Pending matches:", pendingMatches);

    if (pendingMatches > 0) {
      this.logger.info(
        `Round ${round} still has ${pendingMatches} pending matches`
      );
      return;
    }

    console.log("[ROUND_CHECK] Round complete, advancing...");
    await this.advanceToNextRound(tournamentId, round);
  }

  private async advanceToNextRound(
    tournamentId: string,
    completedRound: number
  ): Promise<void> {
    console.log("[ADVANCE] Advancing from round", completedRound);

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) return;

    const nextRound = completedRound + 1;

    console.log(
      "[ADVANCE] Next round:",
      nextRound,
      "Total rounds:",
      tournament.totalRounds
    );

    if (nextRound > tournament.totalRounds) {
      console.log("[ADVANCE] Tournament complete!");
      await this.finalizeTournament(tournamentId);
      return;
    }

    const winners = await this.prisma.tournamentMatch.findMany({
      where: {
        tournamentId,
        round: completedRound,
      },
      include: {
        winner: true,
      },
    });

    const winnerUsers = winners.filter((m) => m.winner).map((m) => m.winner!);

    console.log("[ADVANCE] Winners advancing:", winnerUsers.length);

    if (winnerUsers.length === 0) {
      this.logger.error(`No winners found for round ${completedRound}`);
      return;
    }

    await this.createRoundMatches(tournamentId, nextRound, winnerUsers);

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { currentRound: nextRound },
    });

    this.wsManager.broadcastToTournament(tournamentId, {
      type: "ROUND_ADVANCED",
      data: {
        completedRound,
        nextRound,
        winnersCount: winnerUsers.length,
      },
    });

    this.logger.info(
      `Tournament ${tournamentId} advanced to round ${nextRound}`
    );
  }

  private async finalizeTournament(tournamentId: string): Promise<void> {
    console.log("[FINALIZE] Finalizing tournament", tournamentId);

    const finalMatch = await this.prisma.tournamentMatch.findFirst({
      where: {
        tournamentId,
        status: "COMPLETED",
      },
      orderBy: {
        round: "desc",
      },
      include: {
        winner: true,
        tournament: true,
      },
    });

    if (!finalMatch || !finalMatch.winner) {
      this.logger.error(
        `No final match winner found for tournament ${tournamentId}`
      );
      return;
    }

    const champion = finalMatch.winner;
    const championBonus = 200;

    console.log("[FINALIZE] Champion:", champion.name, "Bonus:", championBonus);

    await this.prisma.user.update({
      where: { id: champion.id },
      data: {
        tournamentPoints: { increment: championBonus },
      },
    });

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "FINISHED",
        winnerId: champion.id,
      },
    });

    this.wsManager.broadcastToTournament(tournamentId, {
      type: "TOURNAMENT_FINISHED",
      data: {
        championId: champion.id,
        championName: champion.name,
        totalPoints: championBonus,
      },
    });

    this.logger.info(
      `Tournament ${tournamentId} finished! Champion: ${champion.name}`
    );
  }
}
