import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "./ui/use-toast";
import {
  Swords,
  Bot,
  Gem,
  Clock,
  Trophy,
  DollarSign,
  PlusCircle,
} from "lucide-react";
import { UserContext } from "../contexts/UserContext";
import InstallPWA from "./InstallPWA";

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [timeControl, setTimeControl] = useState(600);
  const { user } = useContext(UserContext);

  const checkRegistration = (callback, isPaid = false, wager = 0) => {
    if (!user.isRegistered) {
      toast({
        title: "Cadastro Necessário",
        description: "Você precisa completar seu perfil antes de jogar.",
        action: (
          <Button onClick={() => navigate("/profile")}>Ir para Perfil</Button>
        ),
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    if (isPaid && user.balance < wager) {
      toast({
        title: "Saldo Insuficiente",
        description: `Você precisa de R$ ${wager.toFixed(2)} para jogar.`,
        action: (
          <Button onClick={() => navigate("/wallet")}>Ir para Carteira</Button>
        ),
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    callback();
  };

  const handlePlayNow = () => {
    checkRegistration(() => {
      navigate("/matchmaking", { state: { timeControl, wager: 0 } });
    });
  };

  const handleWagerMatch = () =>
    checkRegistration(() => navigate("/wager-match"));
  const handlePlayWithBot = () =>
    checkRegistration(() => navigate("/play-with-bot"));
  const handleCreateTournament = () =>
    checkRegistration(() => navigate("/create-tournament"));
  const handleTournament = () =>
    checkRegistration(() => navigate("/tournament"));
  const handlePremium = () => navigate("/premium");

  const timeOptions = [
    { label: "10 min", value: 600 },
    { label: "15 min", value: 900 },
    { label: "30 min", value: 1800 },
    { label: "60 min", value: 3600 },
    { label: "24 h", value: 86400 },
    { label: "48 h", value: 172800 },
  ];

  const containerVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  const itemVariants = {
    hidden: {
      y: 20,
      opacity: 0,
    },
    visible: {
      y: 0,
      opacity: 1,
    },
  };
  return (
    <motion.div
      className="max-w-4xl mx-auto p-4 text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-4">
          Bem-vindo ao Xadrez real Clássico
        </h1>
        <p className="text-lg text-slate-400 mb-10">
          Escolha seu modo de jogo e prepare-se para a batalha!
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="mb-8 flex flex-col sm:flex-row gap-4 justify-center items-center"
      >
        <Button
          onClick={handlePlayNow}
          size="lg"
          className="flex-grow w-full sm:w-auto h-24 text-2xl bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 shadow-lg transform hover:scale-105 transition-transform duration-300"
        >
          <Swords className="w-8 h-8 mr-4" /> Jogar Agora
        </Button>
        <InstallPWA />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-slate-800/50 border-slate-700 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-cyan-300">
              <Clock className="w-6 h-6" />
              Controle de Tempo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center flex-wrap gap-2">
            {timeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeControl === option.value ? "default" : "secondary"}
                onClick={() => setTimeControl(option.value)}
                className={`transition-all duration-200 ${
                  timeControl === option.value ? "bg-cyan-500 text-white" : ""
                }`}
              >
                {option.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="col-span-1">
          <Button
            onClick={handleCreateTournament}
            size="lg"
            className="w-full h-24 text-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            <PlusCircle className="w-6 h-6 mr-3" /> Crie seu Torneio
          </Button>
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-1">
          <Button
            onClick={handleWagerMatch}
            size="lg"
            className="w-full h-24 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            <DollarSign className="w-6 h-6 mr-3" /> Jogar Apostado
          </Button>
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-1">
          <Button
            onClick={handlePlayWithBot}
            size="lg"
            variant="outline"
            className="w-full h-24 text-lg"
          >
            <Bot className="w-6 h-6 mr-3" /> Jogar com Robô
          </Button>
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-1">
          <Button
            onClick={handleTournament}
            size="lg"
            variant="outline"
            className="w-full h-24 text-lg text-yellow-400 border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-300"
          >
            <Trophy className="w-6 h-6 mr-3" /> Entrar no Campeonato
          </Button>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="col-span-2 md:col-span-2 lg:col-span-2"
        >
          <Button
            onClick={handlePremium}
            size="lg"
            variant="outline"
            className="w-full h-24 text-lg text-purple-400 border-purple-400/50 hover:bg-purple-400/10 hover:text-purple-300"
          >
            <Gem className="w-6 h-6 mr-3" /> Seja Premium
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
export default Home;
