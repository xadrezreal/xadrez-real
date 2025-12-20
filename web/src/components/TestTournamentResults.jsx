import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import tournamentService from '../lib/tournamentService';

export default function TestTournamentResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('prizes'); // prizes, participants, stats

  useEffect(() => {
    loadTournamentData();
  }, [id]);

  const loadTournamentData = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getTournament(id);
      setTournament(data);

      // Carrega prêmios (simulado - você pode adicionar endpoint real)
      if (data.prizes) {
        setPrizes(data.prizes);
      }

      if (data.participants) {
        setParticipants(data.participants);
      }

      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar torneio:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getMedalEmoji = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}º`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando resultados...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Erro: {error}</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Torneio não encontrado</div>
      </div>
    );
  }

  const totalCollected = tournament.entryFee * participants.length;
  const netPrizePool = tournament.prizePool || (totalCollected * 0.9);
  const houseTake = tournament.houseTake || (totalCollected * 0.1);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <button
          onClick={() => navigate('/tournaments')}
          className="mb-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
        >
          ← Voltar para Torneios
        </button>

        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-8 shadow-2xl">
          <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
          <p className="text-gray-300 text-lg">
            Status: <span className="text-green-400 font-semibold">{tournament.status}</span>
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-2">Total Arrecadado</div>
          <div className="text-3xl font-bold text-green-400">{formatCurrency(totalCollected)}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-2">Pote de Prêmios</div>
          <div className="text-3xl font-bold text-blue-400">{formatCurrency(netPrizePool)}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-2">Taxa da Casa ({tournament.housePercentage}%)</div>
          <div className="text-3xl font-bold text-purple-400">{formatCurrency(houseTake)}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-sm mb-2">Participantes</div>
          <div className="text-3xl font-bold text-yellow-400">{participants.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-2 bg-gray-800 p-2 rounded-lg">
          <button
            onClick={() => setActiveTab('prizes')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition ${
              activeTab === 'prizes'
                ? 'bg-indigo-600 text-white'
                : 'bg-transparent text-gray-400 hover:text-white'
            }`}
          >
            💰 Premiação
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition ${
              activeTab === 'participants'
                ? 'bg-indigo-600 text-white'
                : 'bg-transparent text-gray-400 hover:text-white'
            }`}
          >
            👥 Participantes
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition ${
              activeTab === 'stats'
                ? 'bg-indigo-600 text-white'
                : 'bg-transparent text-gray-400 hover:text-white'
            }`}
          >
            📊 Estatísticas
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'prizes' && (
          <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span>🏆</span>
              Distribuição de Prêmios
            </h2>

            {prizes.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-xl mb-2">Prêmios ainda não foram calculados</p>
                <p className="text-sm">Os prêmios serão distribuídos quando o torneio terminar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prizes.map((prize, index) => (
                  <div
                    key={prize.id}
                    className={`flex items-center justify-between p-4 rounded-lg transition ${
                      prize.position <= 3
                        ? 'bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 border border-yellow-700/50'
                        : 'bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl w-16 text-center">
                        {getMedalEmoji(prize.position)}
                      </div>
                      <div>
                        <div className="font-bold text-lg">
                          {prize.user?.name || `Jogador #${prize.userId}`}
                        </div>
                        <div className="text-sm text-gray-400">
                          {prize.position}º Lugar
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">
                        {formatCurrency(prize.amount)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {prize.paid ? '✅ Pago' : '⏳ Pendente'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {prizes.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total Distribuído:</span>
                  <span className="text-green-400">
                    {formatCurrency(prizes.reduce((sum, p) => sum + p.amount, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span>👥</span>
              Lista de Participantes ({participants.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 text-gray-400">#</th>
                    <th className="text-left p-3 text-gray-400">Jogador</th>
                    <th className="text-left p-3 text-gray-400">Pontos</th>
                    <th className="text-left p-3 text-gray-400">Entrada</th>
                    <th className="text-left p-3 text-gray-400">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant, index) => (
                    <tr
                      key={participant.id}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition"
                    >
                      <td className="p-3 text-gray-400">{index + 1}</td>
                      <td className="p-3 font-semibold">
                        {participant.user?.name || participant.user?.email}
                      </td>
                      <td className="p-3">
                        <span className="px-3 py-1 bg-blue-900/50 rounded-full text-sm">
                          {participant.user?.tournamentPoints || 0} pts
                        </span>
                      </td>
                      <td className="p-3">
                        {participant.paidEntry ? (
                          <span className="text-green-400">✓ Pago</span>
                        ) : (
                          <span className="text-yellow-400">Gratuito</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-400 text-sm">
                        {new Date(participant.joinedAt).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Distribuição Visual */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span>📊</span>
                Distribuição do Pote
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Pote de Prêmios</span>
                    <span className="font-bold text-blue-400">
                      {formatCurrency(netPrizePool)} ({((netPrizePool / totalCollected) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-8 bg-gray-700 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ width: `${(netPrizePool / totalCollected) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Taxa da Casa</span>
                    <span className="font-bold text-purple-400">
                      {formatCurrency(houseTake)} ({((houseTake / totalCollected) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-8 bg-gray-700 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                      style={{ width: `${(houseTake / totalCollected) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Informações Gerais */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold mb-6">Informações do Torneio</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Total de Rodadas</div>
                  <div className="text-2xl font-bold">{tournament.totalRounds}</div>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Taxa de Entrada</div>
                  <div className="text-2xl font-bold">{formatCurrency(tournament.entryFee)}</div>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Início do Torneio</div>
                  <div className="text-lg font-semibold">
                    {new Date(tournament.startTime).toLocaleString('pt-BR')}
                  </div>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Campeão</div>
                  <div className="text-lg font-semibold text-yellow-400">
                    {tournament.winner?.name || 'A ser determinado'}
                  </div>
                </div>
              </div>
            </div>

            {/* Bracket Link */}
            <div className="bg-gradient-to-r from-green-900 to-teal-900 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold mb-4">Ver Bracket Completo</h2>
              <p className="text-gray-300 mb-4">
                Visualize todas as partidas e o progresso do torneio no bracket interativo
              </p>
              <button
                onClick={() => navigate(`/tournaments/${id}/bracket`)}
                className="px-6 py-3 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition"
              >
                Abrir Bracket →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
