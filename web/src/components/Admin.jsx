import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Shield,
  Users,
  Trophy,
  Crown,
  Search,
  MoreVertical,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "./ui/use-toast";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState("");
  const [searchTournament, setSearchTournament] = useState("");

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      navigate("/");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");

      const usersUrl = `${import.meta.env.VITE_API_URL}/admin/users`;
      const tournamentsUrl = `${import.meta.env.VITE_API_URL}/tournaments`;

      const [usersRes, tournamentsRes] = await Promise.all([
        fetch(usersUrl, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(tournamentsUrl, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      if (usersRes.ok) {
        const rawText = await usersRes.text();
        console.log("📄 RAW USERS RESPONSE:", rawText);

        try {
          const usersData = JSON.parse(rawText);
          console.log("✅ Users data:", usersData);
          setUsers(usersData.users || []);
        } catch (e) {
          console.error("❌ Erro ao parsear users:", e);
        }
      }

      if (tournamentsRes.ok) {
        const rawText = await tournamentsRes.text();
        console.log("📄 RAW TOURNAMENTS RESPONSE:", rawText);

        try {
          const tournamentsData = JSON.parse(rawText);
          console.log("✅ Tournaments data:", tournamentsData);
          setTournaments(tournamentsData.tournaments || []);
        } catch (e) {
          console.error("❌ Erro ao parsear tournaments:", e);
        }
      }
    } catch (error) {
      console.error("❌ ERRO COMPLETO:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      ADMIN: "bg-red-500/20 text-red-400 border-red-500",
      PREMIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500",
      FREEMIUM: "bg-slate-500/20 text-slate-400 border-slate-500",
    };
    return styles[role] || styles.FREEMIUM;
  };

  const getRoleIcon = (role) => {
    if (role === "ADMIN") return <Shield className="w-4 h-4" />;
    if (role === "PREMIUM") return <Crown className="w-4 h-4" />;
    return null;
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const adminTournaments = tournaments.filter((t) => {
    const creatorRole = t.creator?.role;
    return creatorRole === "ADMIN";
  });

  const filteredAdminTournaments = adminTournaments.filter((t) =>
    t.name.toLowerCase().includes(searchTournament.toLowerCase())
  );

  const stats = {
    totalUsers: users.length,
    adminUsers: users.filter((u) => u.role === "ADMIN").length,
    premiumUsers: users.filter((u) => u.role === "PREMIUM").length,
    totalTournaments: tournaments.length,
    activeTournaments: tournaments.filter(
      (t) => t.status === "WAITING" || t.status === "IN_PROGRESS"
    ).length,
  };

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-6 p-4"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-red-900/20 to-red-600/20 border-red-500/50 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-3xl">
              <Shield className="w-10 h-10 text-red-400" />
              Painel Administrativo
            </CardTitle>
            <CardDescription className="text-red-200">
              Gerencie usuários e torneios especiais
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total de Usuários</p>
                  <p className="text-3xl font-bold text-white">
                    {stats.totalUsers}
                  </p>
                </div>
                <Users className="w-10 h-10 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Usuários Premium</p>
                  <p className="text-3xl font-bold text-yellow-400">
                    {stats.premiumUsers}
                  </p>
                </div>
                <Crown className="w-10 h-10 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Torneios</p>
                  <p className="text-3xl font-bold text-white">
                    {stats.totalTournaments}
                  </p>
                </div>
                <Trophy className="w-10 h-10 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Torneios Ativos</p>
                  <p className="text-3xl font-bold text-green-400">
                    {stats.activeTournaments}
                  </p>
                </div>
                <Trophy className="w-10 h-10 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-slate-800/50 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="w-6 h-6 text-cyan-400" />
                Gerenciar Usuários
              </CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar usuário..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loading ? (
                  <p className="text-slate-400 text-center py-4">
                    Carregando...
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">
                    Nenhum usuário encontrado
                  </p>
                ) : (
                  filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{u.name}</p>
                          <Badge
                            className={`${getRoleBadge(
                              u.role
                            )} text-xs flex items-center gap-1`}
                          >
                            {getRoleIcon(u.role)}
                            {u.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">{u.email}</p>
                        <p className="text-xs text-slate-500">
                          Saldo: R$ {u.balance?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-slate-800/50 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-400" />
                Torneios Criados por Admins
              </CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar torneio..."
                  value={searchTournament}
                  onChange={(e) => setSearchTournament(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loading ? (
                  <p className="text-slate-400 text-center py-4">
                    Carregando...
                  </p>
                ) : filteredAdminTournaments.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">
                    Nenhum torneio encontrado
                  </p>
                ) : (
                  filteredAdminTournaments.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{t.name}</p>
                            <Badge
                              className={`text-xs ${
                                t.status === "WAITING"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : t.status === "IN_PROGRESS"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-slate-500/20 text-slate-400"
                              }`}
                            >
                              {t.status}
                            </Badge>
                          </div>
                          <div className="flex gap-4 mt-2 text-sm text-slate-400">
                            <span>
                              👥 {t._count?.participants || 0}/{t.playerCount}
                            </span>
                            <span>💰 R$ {t.entryFee}</span>
                            <span>🏆 R$ {t.prizePool || 0}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Por: {t.creator?.name}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
