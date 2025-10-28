const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const getAuthHeaders = (includeContentType = true) => {
  const token = localStorage.getItem("auth_token");
  const headers = {};

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const handleApiResponse = async (response) => {
  const contentType = response.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Servidor retornou resposta inválida (não JSON)`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP: ${response.status}`);
  }

  return data;
};

export const tournamentService = {
  async createTournament(tournamentData) {
    const response = await fetch(`${API_URL}/tournaments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: tournamentData.name,
        password: tournamentData.password || undefined,
        entryFee: tournamentData.entry_fee,
        playerCount: tournamentData.player_count,
        prizeDistribution: tournamentData.prize_distribution_type,
        startTime: tournamentData.start_time,
      }),
    });

    return await handleApiResponse(response);
  },

  async getTournament(tournamentId) {
    const response = await fetch(`${API_URL}/tournaments/${tournamentId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleApiResponse(response);
  },

  async getTournamentBracket(tournamentId) {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentId}/bracket`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleApiResponse(response);
  },

  async getActiveTournaments(params = {}) {
    const queryParams = new URLSearchParams({
      status: params.status || "waiting",
      page: params.page || 1,
      limit: params.limit || 20,
    });

    const url = `${API_URL}/tournaments?${queryParams}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await handleApiResponse(response);
  },

  async joinTournament(tournamentId, password = null) {
    const body = {};

    if (password !== null && password !== undefined && password !== "") {
      body.password = password;
    }

    const response = await fetch(
      `${API_URL}/tournaments/${tournamentId}/join`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      }
    );

    return await handleApiResponse(response);
  },

  async leaveTournament(tournamentId) {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentId}/leave`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    return await handleApiResponse(response);
  },

  async cancelTournament(tournamentId) {
    const response = await fetch(`${API_URL}/tournaments/${tournamentId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    return await handleApiResponse(response);
  },

  async startMatch(tournamentId, matchId) {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentId}/match/${matchId}/start`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      }
    );

    return await handleApiResponse(response);
  },
};
