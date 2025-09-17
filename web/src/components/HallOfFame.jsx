import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "./ui/card";
import { Crown, Trophy, User, Gem } from "lucide-react";

const mockChampions = [
  { id: 1, name: "Magnus C.", score: 2830, titles: 15, isPremium: true },
  { id: 2, name: "Hikaru N.", score: 2788, titles: 12, isPremium: true },
  { id: 3, name: "Player_B", score: 1680, titles: 5, isPremium: false },
  { id: 4, name: "RookMaster", score: 1425, titles: 3, isPremium: true },
  { id: 5, name: "QueenSlayer", score: 1850, titles: 2, isPremium: false },
];

const HallOfFame = () => {
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
        <Crown className="mx-auto h-16 w-16 text-yellow-400 drop-shadow-lg" />
        <h1 className="text-4xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
          Hall da Fama
        </h1>
        <p className="text-lg text-slate-400 mt-2">
          Celebre os maiores campeões da nossa plataforma.
        </p>
      </motion.div>

      <motion.div className="space-y-4" variants={containerVariants}>
        {mockChampions
          .sort((a, b) => b.titles - a.titles)
          .map((champion, index) => (
            <motion.div key={champion.id} variants={itemVariants}>
              <Card className="bg-slate-800/50 border-slate-700 text-white hover:border-yellow-400/50 transition-colors duration-300">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-3xl font-bold text-slate-500 w-10 text-center">
                    {index + 1}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-cyan-400" />
                      <span className="font-bold text-lg text-white">
                        {champion.name}
                      </span>
                      {champion.isPremium && (
                        <Gem className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      Score: {champion.score}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Trophy className="w-6 h-6" />
                    <span className="text-2xl font-bold">
                      {champion.titles}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
      </motion.div>
    </motion.div>
  );
};

export default HallOfFame;
