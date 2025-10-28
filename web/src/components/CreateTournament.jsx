import React, { useState, useContext } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useToast } from "./ui/use-toast";
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  Percent,
  Trophy,
  Info,
  Lock,
  Eye,
  EyeOff,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import { useAuth } from "../contexts/AuthContext";

const entryFees = [
  0, 1.0, 2.0, 3.0, 5.0, 7.0, 10.0, 15.0, 20.0, 25.0, 30.0, 50.0, 70.0, 100.0,
  200.0, 500.0, 1000, 2000, 5000, 10000,
];
const playerCounts = [4, 8, 16, 32, 64, 128, 256, 512];

const CreateTournament = () => {
  const [tournamentName, setTournamentName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [entryFee, setEntryFee] = useState("1");
  const [playerCount, setPlayerCount] = useState(8);
  const [prizeDistribution, setPrizeDistribution] = useState("SPLIT_TOP_2");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const { user: authUser } = useAuth();

  const isPremium = authUser?.role === "PREMIUM";

  const getDefaultDateTime = () => {
    const now = new Date();
    const futureTime = new Date(now.getTime() + 5 * 60 * 1000);

    const defaultDate = futureTime.toISOString().split("T")[0];
    const defaultTime = `${futureTime
      .getHours()
      .toString()
      .padStart(2, "0")}:${futureTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    return { defaultDate, defaultTime };
  };

  React.useEffect(() => {
    if (!startDate || !startTime) {
      const { defaultDate, defaultTime } = getDefaultDateTime();
      if (!startDate) setStartDate(defaultDate);
      if (!startTime) setStartTime(defaultTime);
    }
  }, [startDate, startTime]);

  const handleCreateTournament = async (e) => {
    e.preventDefault();

    if (!isPremium) {
      toast({
        title: "🔒 Recurso Premium",
        description:
          "Apenas usuários Premium podem criar torneios. Faça upgrade para desbloquear!",
        variant: "destructive",
      });
      navigate("/premium");
      return;
    }

    if (!tournamentName || !startDate || !startTime) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome, data e hora do torneio.",
        variant: "destructive",
      });
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const now = new Date();
    const minStartTime = new Date(now.getTime() + 5 * 60 * 1000);

    if (startDateTime < minStartTime) {
      let errorMessage =
        "O torneio deve começar pelo menos 5 minutos no futuro.";

      if (startDateTime < now) {
        errorMessage =
          "O horário selecionado já passou. Escolha um horário futuro.";
      } else {
        const minutesFromNow = Math.ceil((startDateTime - now) / 60000);
        errorMessage = `Faltam apenas ${minutesFromNow} minuto(s). O mínimo é 5 minutos.`;
      }

      toast({
        title: "Horário inválido",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    const fee = parseFloat(entryFee);
    if (fee > 0 && user.balance < fee) {
      toast({
        title: "Saldo Insuficiente",
        description: `Você precisa de R$ ${fee.toFixed(
          2
        )} para criar e entrar neste torneio.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para criar um torneio.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3000"
        }/tournaments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: tournamentName,
            password: password || undefined,
            entryFee: fee,
            playerCount: playerCount,
            prizeDistribution: prizeDistribution,
            startTime: startDateTime.toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          toast({
            title: "🔒 Recurso Premium",
            description:
              data.message ||
              "Apenas usuários Premium podem criar torneios. Faça upgrade para desbloquear!",
            variant: "destructive",
          });
          setIsLoading(false);
          navigate("/premium");
          return;
        }
        throw new Error(data.error || "Erro ao criar torneio");
      }

      const tournament = data.tournament || data;

      if (!tournament || !tournament.id) {
        console.error(
          "Estrutura completa recebida:",
          JSON.stringify(data, null, 2)
        );
        throw new Error(
          "Resposta inválida do servidor - tournament ID não encontrado"
        );
      }

      if (fee > 0) {
        setUser((prev) => ({
          ...prev,
          balance: prev.balance - fee,
        }));
      }

      toast({
        title: "Torneio Criado com Sucesso!",
        description: `Início: ${startDateTime.toLocaleString("pt-BR")}`,
        variant: "success",
      });

      navigate(`/tournament/${tournament.id}`);
    } catch (error) {
      console.error("Erro ao criar torneio:", error);
      toast({
        title: "Erro ao criar torneio",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const prizePool = (parseFloat(entryFee) * playerCount * 0.8).toFixed(2);

  const previewDateTime = () => {
    if (!startDate || !startTime) return null;

    const previewDate = new Date(`${startDate}T${startTime}`);

    return previewDate.toLocaleString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isPremium) {
    return (
      <motion.div
        className="max-w-2xl mx-auto p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-slate-800/50 border-yellow-500/50 text-white">
          <CardHeader className="text-center">
            <Crown className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
            <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Recurso Premium
            </CardTitle>
            <CardDescription className="text-slate-400 text-lg">
              Criação de torneios é exclusiva para membros Premium
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-900/50 p-6 rounded-lg space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-yellow-400 mb-2">
                    Benefícios Premium para Criadores de Torneios:
                  </h3>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-cyan-400" />
                      Crie torneios ilimitados
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      Torneios privados com senha
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      Controle total sobre regras e premiações
                    </li>
                    <li className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-cyan-400" />
                      Configure valores de entrada personalizados
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-slate-400">
                Você ainda pode participar de torneios criados por outros
                jogadores!
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate("/premium")}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Fazer Upgrade Premium
                </Button>
                <Button
                  onClick={() => navigate("/tournaments")}
                  variant="outline"
                  className="flex-1"
                >
                  Ver Torneios Disponíveis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="max-w-2xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-slate-800/50 border-slate-700 text-white">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="h-12 w-12 text-cyan-400" />
            <Crown className="h-6 w-6 text-yellow-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Criar seu Torneio
          </CardTitle>
          <CardDescription className="text-slate-400">
            Personalize as regras e convide seus amigos para a disputa!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTournament} className="space-y-6">
            <motion.div variants={itemVariants} className="space-y-2">
              <Label htmlFor="tournamentName">Nome do Torneio</Label>
              <Input
                id="tournamentName"
                placeholder="Ex: Torneio dos Campeões"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                className="bg-slate-900/50 border-slate-700"
                disabled={isLoading}
              />
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-2">
              <Label htmlFor="password">
                <Lock className="inline-block w-4 h-4 mr-1" />
                Senha do Torneio (Opcional)
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Deixe em branco para torneio público"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 pr-10"
                  disabled={isLoading}
                  maxLength={50}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {password && (
                <p className="text-xs text-yellow-400">
                  <Info className="inline w-3 h-3 mr-1" />
                  Apenas jogadores com a senha poderão entrar
                </p>
              )}
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  <Calendar className="inline-block w-4 h-4 mr-1" /> Data de
                  Início
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900/50 border-slate-700"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">
                  <Clock className="inline-block w-4 h-4 mr-1" /> Hora de Início
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-slate-900/50 border-slate-700"
                  disabled={isLoading}
                />
              </div>
            </motion.div>
            {startDate && startTime && (
              <motion.div
                variants={itemVariants}
                className="text-sm text-slate-400 p-3 bg-slate-900/30 rounded-md"
              >
                <Info className="inline w-4 h-4 mr-1 text-cyan-400" />
                Início previsto:{" "}
                <span className="font-bold text-cyan-400">
                  {previewDateTime()}
                </span>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="space-y-2">
              <Label>
                <DollarSign className="inline-block w-4 h-4 mr-1" />
                Valor da Entrada (por jogador)
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {entryFees.map((fee) => (
                  <Button
                    key={fee}
                    type="button"
                    variant={entryFee === String(fee) ? "default" : "secondary"}
                    onClick={() => setEntryFee(String(fee))}
                    className={`transition-all ${
                      entryFee === String(fee) ? "bg-cyan-500" : "bg-slate-700"
                    }`}
                    disabled={isLoading}
                  >
                    {fee === 0 ? "Grátis" : `R$ ${fee.toLocaleString("pt-BR")}`}
                  </Button>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-2">
              <Label htmlFor="playerCount">
                <Users className="inline-block w-4 h-4 mr-1" />
                Quantidade de Jogadores
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {playerCounts.map((count) => (
                  <Button
                    key={count}
                    type="button"
                    variant={playerCount === count ? "default" : "secondary"}
                    onClick={() => setPlayerCount(count)}
                    className={`transition-all ${
                      playerCount === count ? "bg-cyan-500" : "bg-slate-700"
                    }`}
                    disabled={isLoading}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-2">
              <Label>
                <Percent className="inline-block w-4 h-4 mr-1" />
                Distribuição do Prêmio
              </Label>
              <RadioGroup
                value={prizeDistribution}
                onValueChange={setPrizeDistribution}
                className="flex flex-col sm:flex-row gap-4"
                disabled={isLoading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="WINNER_TAKES_ALL" id="r1" />
                  <Label htmlFor="r1">Campeão leva tudo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SPLIT_TOP_2" id="r2" />
                  <Label htmlFor="r2">60% / 40% (Top 2)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SPLIT_TOP_4" id="r3" />
                  <Label htmlFor="r3">40% / 30% / 20% / 10% (Top 4)</Label>
                </div>
              </RadioGroup>
              <div className="mt-2 text-sm text-slate-400 p-3 bg-slate-900/30 rounded-md">
                <Info className="inline w-4 h-4 mr-1 text-cyan-400" />
                Prêmio total estimado:{" "}
                <span className="font-bold text-yellow-400">
                  R$ {prizePool}
                </span>{" "}
                (após taxa de 20%)
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full text-lg bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? "Criando..." : "Criar Torneio"}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CreateTournament;
