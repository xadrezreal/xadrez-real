import React, { useContext } from "react";
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
import { DollarSign, Swords } from "lucide-react";
import { toast } from "./ui/use-toast";
import { UserContext } from "../contexts/UserContext";

const wagerOptions = [2, 3, 5, 10, 20, 50, 100, 1000];

const WagerMatch = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const handlePlayWager = (amount) => {
    if (user.balance < amount) {
      toast({
        title: "Saldo Insuficiente",
        description: `Você precisa de pelo menos R$ ${amount.toFixed(
          2
        )} para jogar esta partida.`,
        variant: "destructive",
      });
      return;
    }

    navigate("/matchmaking", { state: { wager: amount, timeControl: 600 } });
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
      className="max-w-4xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="text-center mb-8" variants={itemVariants}>
        <DollarSign className="mx-auto h-16 w-16 text-yellow-400 drop-shadow-lg" />
        <h1 className="text-4xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-500">
          Jogar Apostado
        </h1>
        <p className="text-lg text-slate-400 mt-2">
          Escolha sua aposta e desafie um oponente. O vencedor leva tudo (menos
          a taxa de 20%)!
        </p>
        <p className="text-lg text-white mt-4 font-bold">
          Seu Saldo: R$ {user.balance ? user.balance.toFixed(2) : "0.00"}
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        variants={containerVariants}
      >
        {wagerOptions.map((amount) => (
          <motion.div key={amount} variants={itemVariants}>
            <Card className="bg-slate-800/50 border-slate-700 text-white hover:border-yellow-400/50 transition-colors duration-300">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-bold text-yellow-300">
                  R$ {amount.toFixed(2)}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Prêmio: R$ {(amount * 2 * 0.8).toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  onClick={() => handlePlayWager(amount)}
                >
                  <Swords className="w-4 h-4 mr-2" /> Jogar
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default WagerMatch;
