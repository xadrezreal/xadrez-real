const API_BASE_URL = "http://localhost:3000";

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem("auth_token");
  }

  // Método para fazer requisições
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    // Adicionar token se existir
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

  // Método para registrar usuário
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

  // Método para fazer login
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

  // Método para obter dados do usuário
  async getMe() {
    return await this.request("/auth/me");
  }

  // Método para atualizar usuário
  async updateUser(userId, userData) {
    return await this.request(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  // Método para atualizar role
  async updateRole(userId, role) {
    return await this.request(`/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  // Método para logout
  logout() {
    this.token = null;
    localStorage.removeItem("auth_token");
  }

  // Método para definir token
  setToken(token) {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  // Método para verificar se está autenticado
  isAuthenticated() {
    return !!this.token;
  }
}

export const apiClient = new ApiClient();
