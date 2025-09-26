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

  console.log(`API Response Status: ${response.status}`);
  console.log(`Content-Type: ${contentType}`);

  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    console.error("Resposta não é JSON:", text);
    throw new Error(
      `Servidor retornou resposta inválida (não JSON): ${text.substring(
        0,
        200
      )}`
    );
  }

  const data = await response.json();
  console.log("Response Data:", data);

  if (!response.ok) {
    console.error(`HTTP Error ${response.status}:`, data);
    throw new Error(data.error || `Erro HTTP: ${response.status}`);
  }

  return data;
};

export const tournamentService = {
  async createTournament(tournamentData) {
    try {
      console.log("=== CREATE TOURNAMENT ===");
      console.log("Dados enviados:", tournamentData);

      const response = await fetch(`${API_URL}/tournaments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: tournamentData.name,
          entryFee: tournamentData.entry_fee,
          playerCount: tournamentData.player_count,
          prizeDistribution: tournamentData.prize_distribution_type,
          startTime: tournamentData.start_time,
        }),
      });

      return await handleApiResponse(response);
    } catch (error) {
      console.error("Erro ao criar torneio:", error);
      throw error;
    }
  },

  async getTournament(tournamentId) {
    try {
      console.log("=== GET TOURNAMENT ===");
      console.log("Tournament ID:", tournamentId);
      console.log("URL:", `${API_URL}/tournaments/${tournamentId}`);
      console.log("Headers:", getAuthHeaders());

      const response = await fetch(`${API_URL}/tournaments/${tournamentId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      console.log(`Response status: ${response.status}`);

      return await handleApiResponse(response);
    } catch (error) {
      console.error("Erro ao buscar torneio:", error);
      throw error;
    }
  },

  async getActiveTournaments(params = {}) {
    try {
      console.log("=== GET ACTIVE TOURNAMENTS ===");

      const queryParams = new URLSearchParams({
        status: params.status || "waiting",
        page: params.page || 1,
        limit: params.limit || 20,
      });

      const url = `${API_URL}/tournaments?${queryParams}`;
      console.log("URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(`Response status: ${response.status}`);

      return await handleApiResponse(response);
    } catch (error) {
      console.error("Erro ao buscar torneios:", error);

      try {
        console.log("Tentando novamente COM autenticação...");
        const queryParams = new URLSearchParams({
          status: params.status || "waiting",
          page: params.page || 1,
          limit: params.limit || 20,
        });

        const url = `${API_URL}/tournaments?${queryParams}`;

        const response = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        return await handleApiResponse(response);
      } catch (retryError) {
        console.error("Erro na segunda tentativa:", retryError);
        throw retryError;
      }
    }
  },

  async joinTournament(tournamentId) {
    try {
      console.log("=== JOIN TOURNAMENT ===");
      console.log("Tournament ID:", tournamentId);

      const response = await fetch(
        `${API_URL}/tournaments/${tournamentId}/join`,
        {
          method: "POST",
          headers: getAuthHeaders(false),
          body: JSON.stringify({}),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error("Erro ao entrar no torneio:", error);
      throw error;
    }
  },

  async leaveTournament(tournamentId) {
    try {
      console.log("=== LEAVE TOURNAMENT ===");
      console.log("Tournament ID:", tournamentId);

      const response = await fetch(
        `${API_URL}/tournaments/${tournamentId}/leave`,
        {
          method: "DELETE",
          headers: getAuthHeaders(false),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error("Erro ao sair do torneio:", error);
      throw error;
    }
  },

  async cancelTournament(tournamentId) {
    try {
      console.log("=== CANCEL TOURNAMENT ===");
      console.log("Tournament ID:", tournamentId);

      const response = await fetch(`${API_URL}/tournaments/${tournamentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(false),
      });

      return await handleApiResponse(response);
    } catch (error) {
      console.error("Erro ao cancelar torneio:", error);
      throw error;
    }
  },

  async testConnection() {
    try {
      console.log("=== TEST CONNECTION ===");
      console.log("Testing:", `${API_URL}/health`);

      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      console.log("Status da API:", data);
      return data;
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      throw new Error("Não foi possível conectar com a API");
    }
  },

  async debugSystem() {
    console.log("=== SYSTEM DEBUG ===");
    console.log("API_URL:", API_URL);
    console.log(
      "Auth Token:",
      localStorage.getItem("auth_token") ? "Presente" : "Ausente"
    );
    console.log("Environment:", import.meta.env);

    try {
      await this.testConnection();
      console.log("✅ Conexão OK");
    } catch (error) {
      console.log("❌ Conexão FALHOU:", error.message);
    }
  },
};
