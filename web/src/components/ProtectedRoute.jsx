import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children, requirePremium = false }) => {
  const { isAuthenticated, isPremium, initialLoading } = useAuth();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-slate-400 mt-2">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Verificar se está autenticado
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/profile"
        state={{
          from: location,
          message: "Você precisa estar logado para acessar esta página.",
        }}
        replace
      />
    );
  }

  // Verificar se precisa ser premium
  if (requirePremium && !isPremium) {
    return (
      <Navigate
        to="/premium"
        state={{
          from: location,
          message: "Esta funcionalidade é exclusiva para usuários Premium.",
        }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
