import { Prisma, PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { WebSocketManager } from "../websocket/webSocketManager";

export class TournamentOrchestrator {
  private prisma: PrismaClient;
  private wsManager: WebSocketManager;
  private logger: FastifyBaseLogger;
  private roundTimers: Map<string, NodeJS.Timeout> = new Map();

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

    // Inicia a primeira rodada IMEDIATAMENTE (sem delay)
    await this.startRoundImmediately(tournamentId, 1);

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

  // NOVA FUNÇÃO: Inicia uma rodada IMEDIATAMENTE (sem delay)
  private async startRoundImmediately(
    tournamentId: string,
    round: number
  ): Promise<void> {
    this.logger.info(`🚀 Starting round ${round} immediately`);

    const now = new Date();
    const roundDuration = 20 * 60 * 1000; // 20 minutos para os jogos
    const intervalDuration = 2 * 60 * 1000; // 2 minutos de intervalo
    const totalTime = roundDuration + intervalDuration; // 22 minutos total
    const roundEndTime = new Date(now.getTime() + totalTime);

    // Atualiza o banco com os timestamps
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        currentRoundStartTime: now,
        nextRoundStartTime: roundEndTime,
      },
    });

    // Busca todas as partidas PENDING da rodada
    const matches = await this.prisma.tournamentMatch.findMany({
      where: {
        tournamentId,
        round,
        status: "PENDING",
      },
    });

    // Inicia todas as partidas
    for (const match of matches) {
      try {
        await this.startMatch(match.id);
      } catch (error: any) {
        this.logger.error(`Error starting match ${match.id}:`, error);
      }
    }

    // Notifica que a rodada começou
    this.wsManager.broadcastToTournament(tournamentId, {
      type: "ROUND_STARTED_AUTO",
      data: {
        round,
        startsAt: roundEndTime.toISOString(),
        message:
          "Rodada iniciada! Clique em 'Jogar Agora' para entrar na partida.",
        timestamp: now.toISOString(),
      },
    });

    // Cria timer para forçar avanço após 22 minutos (20 de jogo + 2 de intervalo)
    const timerKey = `${tournamentId}-${round}-advance`;
    if (this.roundTimers.has(timerKey)) {
      clearTimeout(this.roundTimers.get(timerKey));
    }

    const timer = setTimeout(async () => {
      await this.forceAdvanceToNextRound(tournamentId, round);
      this.roundTimers.delete(timerKey);
    }, totalTime);

    this.roundTimers.set(timerKey, timer);

    this.logger.info(
      `Round ${round} started at ${now.toISOString()}. Will force advance at ${roundEndTime.toISOString()} (22 minutes: 20 game + 2 interval)`
    );
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
      select: {
        tournament_id: true,
        winner_id: true,
        white_player_id: true,
        black_player_id: true,
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
      select: {
        id: true,
        status: true,
        round: true,
        tournamentId: true,
        player1Id: true,
        player2Id: true,
        tournament: {
          select: {
            totalRounds: true,
          },
        },
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

    // Busca APENAS o nome do vencedor
    const winner = await this.prisma.user.findUnique({
      where: { id: game.winner_id },
      select: { name: true },
    });

    const winnerName = winner?.name || "Unknown";

    this.wsManager.broadcastToTournament(match.tournamentId, {
      type: "MATCH_COMPLETED",
      data: {
        matchId: match.id,
        round: match.round,
        winnerId: game.winner_id,
        winnerName,
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
        `Round ${round} still has ${pendingMatches} pending matches.`
      );
      return;
    }

    this.logger.info(`Round ${round} completed! All matches finished.`);

    // Todas as partidas terminaram, cancela o timer e avança
    const timerKey = `${tournamentId}-${round}-advance`;
    if (this.roundTimers.has(timerKey)) {
      clearTimeout(this.roundTimers.get(timerKey));
      this.roundTimers.delete(timerKey);
      this.logger.info(
        `Timer cancelled for round ${round} - all matches completed early`
      );
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

    // Cria as partidas da próxima rodada
    await this.createRoundMatches(tournamentId, nextRound, winnerUsers);

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        currentRound: nextRound,
      },
    });

    // Inicia a próxima rodada IMEDIATAMENTE (sem intervalo adicional)
    // O intervalo de 2 minutos já está incluído nos 22 minutos totais da rodada
    this.logger.info(
      `All matches completed for round ${completedRound}. Starting round ${nextRound} immediately.`
    );

    await this.startRoundImmediately(tournamentId, nextRound);

    this.logger.info(
      `Tournament ${tournamentId} advanced to round ${nextRound} with ${winnerUsers.length} winners.`
    );
  }

  private async forceAdvanceToNextRound(
    tournamentId: string,
    currentRound: number
  ): Promise<void> {
    this.logger.info(
      `⏰ Timer expired for round ${currentRound}. Forcing advancement...`
    );

    // Busca apenas os IDs, sem carregar os objetos dos jogadores
    const pendingMatches = await this.prisma.tournamentMatch.findMany({
      where: {
        tournamentId,
        round: currentRound,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      select: {
        id: true,
        status: true,
        gameId: true,
        player1Id: true,
        player2Id: true,
      },
    });

    if (pendingMatches.length > 0) {
      this.logger.warn(
        `Round ${currentRound} still has ${pendingMatches.length} incomplete matches. Determining winners by forfeit...`
      );

      // Para cada partida incompleta, determina um vencedor por WO
      for (const match of pendingMatches) {
        // Garante que temos os IDs dos jogadores necessários
        if (!match.player1Id || !match.player2Id) {
          this.logger.error(
            `Match ${match.id} is missing player IDs, skipping forfeit logic`
          );
          continue;
        }

        let winnerId: string;

        if (match.status === "PENDING") {
          // Não começou: sorteia
          winnerId = Math.random() < 0.5 ? match.player1Id : match.player2Id;
          this.logger.info(
            `Match ${match.id} did not start. Random winner: ${winnerId}`
          );
        } else {
          // Em andamento: verifica o jogo
          const game = await this.prisma.game.findUnique({
            where: { game_id_text: match.gameId! },
            select: {
              white_time: true,
              black_time: true,
              white_player_id: true,
              black_player_id: true,
            },
          });

          if (game) {
            // Quem tem mais tempo vence
            winnerId =
              game.white_time > game.black_time
                ? game.white_player_id
                : game.black_player_id;
            this.logger.info(
              `Match ${match.id} in progress. Winner by time: ${winnerId}`
            );
          } else {
            // Fallback: sorteia
            winnerId = Math.random() < 0.5 ? match.player1Id : match.player2Id;
          }
        }

        // Busca APENAS o nome do vencedor
        const winner = await this.prisma.user.findUnique({
          where: { id: winnerId },
          select: { name: true },
        });

        if (!winner) {
          this.logger.error(
            `Winner ${winnerId} not found, skipping match ${match.id}`
          );
          continue;
        }

        // Atualiza a partida
        await this.prisma.tournamentMatch.update({
          where: { id: match.id },
          data: {
            winnerId,
            status: "COMPLETED",
          },
        });

        // Notifica - agora sem carregar dados desnecessários
        this.wsManager.broadcastToTournament(tournamentId, {
          type: "MATCH_COMPLETED",
          data: {
            matchId: match.id,
            round: currentRound,
            winnerId,
            winnerName: winner.name,
            player1Id: match.player1Id,
            player2Id: match.player2Id,
            forfeit: true,
          },
        });
      }
    }

    await this.advanceToNextRound(tournamentId, currentRound);
  }

  private async finalizeTournament(tournamentId: string): Promise<void> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        totalRounds: true,
      },
    });

    if (!tournament) return;

    const finalMatch = await this.prisma.tournamentMatch.findFirst({
      where: {
        tournamentId,
        round: tournament.totalRounds,
      },
      orderBy: {
        round: "desc",
      },
      select: {
        id: true,
        winnerId: true,
        player1Id: true,
        player2Id: true,
        matchNumber: true,
      },
    });

    if (!finalMatch) {
      this.logger.error(`No final match found for tournament ${tournamentId}`);
      return;
    }

    let championId: string;

    if (finalMatch.winnerId) {
      championId = finalMatch.winnerId;
    } else {
      // Se a final não terminou, determina vencedor
      if (!finalMatch.player1Id || !finalMatch.player2Id) {
        this.logger.error(`Final match ${finalMatch.id} is missing players`);
        return;
      }

      // Busca o jogo da final para ver quem tem mais tempo
      const finalGameId = `tournament-${tournamentId}-r${
        tournament.totalRounds
      }-m${finalMatch.matchNumber || 1}`;
      const finalGame = await this.prisma.game.findUnique({
        where: { game_id_text: finalGameId },
        select: {
          white_time: true,
          black_time: true,
          white_player_id: true,
          black_player_id: true,
        },
      });

      if (finalGame) {
        // Quem tem mais tempo vence
        championId =
          finalGame.white_time > finalGame.black_time
            ? finalGame.white_player_id
            : finalGame.black_player_id;
        this.logger.info(
          `Final match incomplete. Winner by time: ${championId}`
        );
      } else {
        // Fallback: sorteia
        championId =
          Math.random() < 0.5 ? finalMatch.player1Id : finalMatch.player2Id;
        this.logger.warn(
          `Final match has no game. Random champion: ${championId}`
        );
      }

      await this.prisma.tournamentMatch.update({
        where: { id: finalMatch.id },
        data: {
          winnerId: championId,
          status: "COMPLETED",
        },
      });
    }

    const championBonus = 200;

    await this.prisma.user.update({
      where: { id: championId },
      data: {
        tournamentPoints: { increment: championBonus },
      },
    });

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "FINISHED",
        winnerId: championId,
      },
    });

    // Busca o nome do campeão
    const champion = await this.prisma.user.findUnique({
      where: { id: championId },
      select: { name: true },
    });

    const championName = champion?.name || "Unknown Champion";

    this.wsManager.broadcastToTournament(tournamentId, {
      type: "TOURNAMENT_FINISHED",
      data: {
        championId,
        championName,
        totalPoints: championBonus,
      },
    });

    // Limpa todos os timers do torneio
    const timerKeys = Array.from(this.roundTimers.keys()).filter((key) =>
      key.startsWith(tournamentId)
    );
    timerKeys.forEach((key) => {
      const timer = this.roundTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.roundTimers.delete(key);
      }
    });

    this.logger.info(
      `🏆 Tournament ${tournamentId} finished! Champion: ${championName}`
    );
  }
}
