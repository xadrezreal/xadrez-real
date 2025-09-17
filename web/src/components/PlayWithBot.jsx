import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Bot, Cpu, BrainCircuit, Skull, Clock, HelpCircle } from "lucide-react";

const botLevels = [
  {
    level: "Fácil",
    icon: <Bot className="w-8 h-8" />,
    description: "Um oponente casual para aprender o básico.",
    color: "hover:border-green-400/50",
    buttonColor: "bg-green-500 hover:bg-green-600",
  },
  {
    level: "Médio",
    icon: <Cpu className="w-8 h-8" />,
    description: "Um desafio moderado para testar suas táticas.",
    color: "hover:border-cyan-400/50",
    buttonColor: "bg-cyan-500 hover:bg-cyan-600",
  },
  {
    level: "Profissional",
    icon: <BrainCircuit className="w-8 h-8" />,
    description: "Um adversário avançado para aprimorar sua estratégia.",
    color: "hover:border-purple-400/50",
    buttonColor: "bg-purple-500 hover:bg-purple-600",
  },
  {
    level: "Ultra Difícil",
    icon: <Skull className="w-8 h-8 text-red-400" />,
    description: "Um mestre de xadrez quase invencível. Boa sorte.",
    color: "hover:border-red-500/50",
    buttonColor: "bg-red-600 hover:bg-red-700",
  },
];

const timeOptions = [
  { label: "10 min", value: 600 },
  { label: "15 min", value: 900 },
  { label: "30 min", value: 1800 },
];

const PlayWithBot = () => {
  const navigate = useNavigate();
  const [timeControl, setTimeControl] = useState(600);
  const [playerColor, setPlayerColor] = useState("random");

  const handleSelectLevel = (level) => {
    let chosenColor = playerColor;
    if (playerColor === "random") {
      chosenColor = Math.random() < 0.5 ? "white" : "black";
    }

    const gameId = `bot_${Date.now()}`;
    navigate(`/game/${gameId}`, {
      state: {
        gameType: "bot",
        botLevel: level,
        timeControl,
        playerColor: chosenColor,
      },
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      className="max-w-6xl mx-auto p-4 text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
          Jogar contra o Robô
        </h1>
        <p className="text-lg text-slate-400 mb-8">
          Escolha a dificuldade, o tempo e a cor das suas peças.
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
      >
        <Card className="bg-slate-800/50 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-cyan-300">
              <Clock className="w-6 h-6" />
              Controle de Tempo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
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
        <Card className="bg-slate-800/50 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-cyan-300">
              Escolha sua Cor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              defaultValue="random"
              onValueChange={setPlayerColor}
              className="flex justify-center gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="white" id="white" />
                <Label
                  htmlFor="white"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-white border border-gray-400" />{" "}
                  Brancas
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="random" id="random" />
                <Label
                  htmlFor="random"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-6 h-6" /> Aleatório
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="black" id="black" />
                <Label
                  htmlFor="black"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-400" />{" "}
                  Pretas
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        variants={containerVariants}
      >
        {botLevels.map(({ level, icon, description, color, buttonColor }) => (
          <motion.div key={level} variants={itemVariants}>
            <Card
              className={`bg-slate-800/50 border-slate-700 text-white h-full flex flex-col justify-between hover:scale-105 transition-all duration-300 ${color}`}
            >
              <CardHeader className="items-center">
                <div
                  className={`p-4 bg-slate-700/50 rounded-full ${
                    level === "Ultra Difícil" ? "text-red-400" : "text-cyan-300"
                  } mb-4`}
                >
                  {icon}
                </div>
                <CardTitle className="text-2xl">{level}</CardTitle>
                <CardDescription className="text-slate-400 pt-2">
                  {description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleSelectLevel(level)}
                  className={`w-full ${buttonColor}`}
                >
                  Jogar Agora
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default PlayWithBot;
