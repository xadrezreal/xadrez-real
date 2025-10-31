const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem("auth_token");
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro na requisição");
      }

      return { data, error: null };
    } catch (error) {
      console.error("API Error:", error);
      return { data: null, error: error.message };
    }
  }

  async register(userData) {
    const { data, error } = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (data?.token) {
      this.setToken(data.token);
    }

    return { data, error };
  }

  async login(email, password) {
    const { data, error } = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data?.token) {
      this.setToken(data.token);
    }

    return { data, error };
  }

  async getMe() {
    const { data, error } = await this.request("/auth/me");

    if (data && !data.user) {
      return { data: { user: data }, error };
    }

    return { data, error };
  }

  async updateUser(userId, userData) {
    return await this.request(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async updateRole(userId, role) {
    return await this.request(`/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async createTournament(tournamentData) {
    return await this.request("/tournaments", {
      method: "POST",
      body: JSON.stringify(tournamentData),
    });
  }

  async getTournaments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString
      ? `/tournaments?${queryString}`
      : "/tournaments";
    return await this.request(endpoint);
  }

  async getTournament(tournamentId) {
    return await this.request(`/tournaments/${tournamentId}`);
  }

  async joinTournament(tournamentId) {
    return await this.request(`/tournaments/${tournamentId}/join`, {
      method: "POST",
    });
  }

  async leaveTournament(tournamentId) {
    return await this.request(`/tournaments/${tournamentId}/leave`, {
      method: "DELETE",
    });
  }

  async deleteTournament(tournamentId) {
    return await this.request(`/tournaments/${tournamentId}`, {
      method: "DELETE",
    });
  }

  logout() {
    this.token = null;
    localStorage.removeItem("auth_token");
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  isAuthenticated() {
    return !!this.token;
  }
}

export const apiClient = new ApiClient();
