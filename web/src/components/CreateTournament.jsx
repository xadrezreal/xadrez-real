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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";

const entryFees = [
  0, 1.0, 2.0, 3.0, 5.0, 7.0, 10.0, 15.0, 20.0, 25.0, 30.0, 50.0, 70.0, 100.0,
  200.0, 500.0, 1000, 2000, 5000, 10000,
];
const playerCounts = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];

const CreateTournament = () => {
  const [tournamentName, setTournamentName] = useState("");
  const [entryFee, setEntryFee] = useState("1");
  const [playerCount, setPlayerCount] = useState(8);
  const [prizeDistribution, setPrizeDistribution] = useState("SPLIT_TOP_2");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    if (!tournamentName || !startDate || !startTime) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome, data e hora do torneio.",
        variant: "destructive",
      });
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    if (startDateTime <= new Date()) {
      toast({
        title: "Data inválida",
        description: "A data e hora de início devem ser no futuro.",
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
            entryFee: fee,
            playerCount: playerCount,
            prizeDistribution: prizeDistribution,
            startTime: startDateTime.toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar torneio");
      }

      if (fee > 0) {
        setUser((prev) => ({
          ...prev,
          balance: prev.balance - fee,
        }));
      }

      toast({
        title: "Torneio Criado com Sucesso!",
        description: "Você foi automaticamente inscrito. Compartilhe o link!",
        variant: "success",
      });

      navigate(`/tournament/${data.tournament.id}`);
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

  return (
    <motion.div
      className="max-w-2xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-slate-800/50 border-slate-700 text-white">
        <CardHeader className="text-center">
          <Trophy className="mx-auto h-12 w-12 text-cyan-400" />
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
