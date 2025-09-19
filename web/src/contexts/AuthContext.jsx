import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import { useToast } from "../components/ui/use-toast";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (apiClient.isAuthenticated()) {
      const { data, error } = await apiClient.getMe();
      if (data?.user) {
        setUser(data.user);
      } else if (error) {
        apiClient.logout();
      }
    }
    setInitialLoading(false);
  };

  const signUp = async (email, password, additionalData = {}) => {
    setLoading(true);
    try {
      const userData = {
        email,
        password,
        name: additionalData.username || additionalData.name || "",
      };

      const { data, error } = await apiClient.register(userData);

      if (error) {
        toast({
          title: "Erro no Cadastro",
          description: error,
          variant: "destructive",
        });
        return { error };
      }

      if (data?.user) {
        setUser(data.user);
        toast({
          title: "Cadastro realizado!",
          description: "Bem-vindo(a) ao sistema!",
          variant: "default",
        });
      }

      return { data, error: null };
    } catch (error) {
      const errorMessage = "Erro inesperado no cadastro";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.login(email, password);

      if (error) {
        toast({
          title: "Erro no Login",
          description: error,
          variant: "destructive",
        });
        return { error };
      }

      if (data?.user) {
        setUser(data.user);
        toast({
          title: "Login realizado!",
          description: `Bem-vindo(a), ${data.user.name}!`,
          variant: "default",
        });
      }

      return { data, error: null };
    } catch (error) {
      const errorMessage = "Erro inesperado no login";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    apiClient.logout();
    setUser(null);
    toast({
      title: "Logout realizado",
      description: "Até logo!",
      variant: "default",
    });
  };

  const updateUser = async (userData) => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.updateUser(user.id, userData);

      if (error) {
        toast({
          title: "Erro na Atualização",
          description: error,
          variant: "destructive",
        });
        return { error };
      }

      if (data?.user) {
        setUser(data.user);
        toast({
          title: "Perfil atualizado!",
          description: "Seus dados foram salvos com sucesso.",
          variant: "default",
        });
      }

      return { data, error: null };
    } catch (error) {
      const errorMessage = "Erro inesperado na atualização";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (role) => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.updateRole(user.id, role);

      if (error) {
        toast({
          title: "Erro na Atualização",
          description: error,
          variant: "destructive",
        });
        return { error };
      }

      if (data?.user) {
        setUser(data.user);
        toast({
          title: "Plano atualizado!",
          description: `Agora você é ${role.toLowerCase()}!`,
          variant: "default",
        });
      }

      return { data, error: null };
    } catch (error) {
      const errorMessage = "Erro inesperado na atualização do plano";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    initialLoading,
    signUp,
    signIn,
    signOut,
    updateUser,
    updateRole,
    isAuthenticated: !!user,
    isPremium: user?.role === "PREMIUM",
    isFreemium: user?.role === "FREEMIUM",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
