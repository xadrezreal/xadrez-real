import { Prisma, PrismaClient } from "@prisma/client";
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
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    if (!tournament) throw new Error("Tournament not found");

    await this.prisma.tournamentMatch.deleteMany({
      where: { tournamentId },
    });

    const participants = tournament.participants.map((p) => p.user);
    const numPlayers = participants.length;
    const totalRounds = Math.ceil(Math.log2(numPlayers));

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { totalRounds, currentRound: 1 },
    });

    await this.createRoundMatches(tournamentId, 1, participants);
    this.logger.info(
      `Bracket created for tournament ${tournamentId}: ${totalRounds} rounds`
    );
  }

  private async createRoundMatches(
    tournamentId: string,
    round: number,
    players: any[]
  ): Promise<void> {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const matchesInRound = Math.ceil(shuffled.length / 2);

    for (let i = 0; i < matchesInRound; i++) {
      const player1 = shuffled[i * 2];
      const player2 = shuffled[i * 2 + 1] || null;

      const matchStatus = !player2 ? "BYE" : "PENDING";
      const winnerId = !player2 ? player1.id : null;

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

      const updatedMatch = await this.prisma.tournamentMatch.findUnique({
        where: { id: matchId },
      });

      return { game: existingGame, match: updatedMatch };
    }

    const isFirstWhite = Math.random() < 0.5;
    const whitePlayer = isFirstWhite ? match.player1 : match.player2;
    const blackPlayer = isFirstWhite ? match.player2 : match.player1;

    const gameIdText = `tournament-${match.tournamentId}-r${match.round}-m${match.matchNumber}`;

    const existingGame = await this.prisma.game.findUnique({
      where: { game_id_text: gameIdText },
    });

    let game;

    if (existingGame) {
      await this.prisma.game.delete({
        where: { game_id_text: gameIdText },
      });
    }

    game = await this.prisma.game.create({
      data: {
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
        winner_id: null,
        last_move: Prisma.JsonNull,
      },
    });

    this.logger.info(
      `✅ New game created for match ${matchId}: ${JSON.stringify({
        gameId: game.game_id_text,
        whitePlayer: whitePlayer.name,
        blackPlayer: blackPlayer.name,
        whitePlayerId: whitePlayer.id,
        blackPlayerId: blackPlayer.id,
        fen: game.fen,
        whiteTime: game.white_time,
        blackTime: game.black_time,
        status: game.status,
      })}`
    );

    const updatedMatch = await this.prisma.tournamentMatch.update({
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

    return { game, match: updatedMatch };
  }

  async handleMatchEnd(gameIdText: string): Promise<void> {
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

    const match = await this.prisma.tournamentMatch.findUnique({
      where: { gameId: gameIdText },
      include: {
        tournament: true,
        player1: true,
        player2: true,
      },
    });

    if (!match) {
      this.logger.error(`Match not found for game ${gameIdText}`);
      return;
    }

    if (match.status === "COMPLETED") {
      return;
    }

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
        player1Id: match.player1Id,
        player2Id: match.player2Id,
      },
    });

    const pointsForWin = this.calculateMatchPoints(
      match.round,
      match.tournament.totalRounds
    );

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
    const pendingMatches = await this.prisma.tournamentMatch.count({
      where: {
        tournamentId,
        round,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    if (pendingMatches > 0) {
      this.logger.info(
        `Round ${round} still has ${pendingMatches} pending matches`
      );
      return;
    }

    await this.advanceToNextRound(tournamentId, round);
  }

  private async advanceToNextRound(
    tournamentId: string,
    completedRound: number
  ): Promise<void> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return;
    }

    const nextRound = completedRound + 1;

    if (nextRound > tournament.totalRounds) {
      await this.finalizeTournament(tournamentId);
      return;
    }

    const completedMatches = await this.prisma.tournamentMatch.findMany({
      where: {
        tournamentId,
        round: completedRound,
        status: { in: ["COMPLETED", "BYE"] },
      },
      include: {
        winner: true,
      },
      orderBy: {
        matchNumber: "asc",
      },
    });

    const winnerUsers = completedMatches
      .filter((m) => m.winner)
      .map((m) => m.winner!);

    if (winnerUsers.length === 0) {
      this.logger.error(`No winners found for round ${completedRound}`);
      return;
    }

    if (winnerUsers.length === 1) {
      await this.finalizeTournament(tournamentId);
      return;
    }

    await this.createRoundMatches(tournamentId, nextRound, winnerUsers);

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { currentRound: nextRound },
    });

    const newMatches = await this.prisma.tournamentMatch.findMany({
      where: {
        tournamentId,
        round: nextRound,
      },
    });

    const startPromises = newMatches
      .filter((m) => m.status !== "BYE")
      .map((match) =>
        this.startMatch(match.id).catch((error) => {
          this.logger.error(`Error starting match ${match.id}:`, error);
        })
      );

    await Promise.all(startPromises);

    this.wsManager.broadcastToTournament(tournamentId, {
      type: "ROUND_ADVANCED",
      data: {
        completedRound,
        nextRound,
        winnersCount: winnerUsers.length,
        winners: winnerUsers.map((w) => ({ id: w.id, name: w.name })),
        message: "Nova rodada iniciada! Clique em 'Jogar' para começar.",
      },
    });

    this.logger.info(
      `Tournament ${tournamentId} advanced to round ${nextRound} with ${winnerUsers.length} winners`
    );
  }

  private async finalizeTournament(tournamentId: string): Promise<void> {
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
