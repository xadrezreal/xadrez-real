import React from "react";
import { motion } from "framer-motion";
import { Clock, User } from "lucide-react";
import { countries } from "../lib/countries";

const PlayerInfo = ({ player, isCurrent, time }) => {
  const { name = "Adversário", elo = "?", country = "?" } = player || {};
  const playerCountry = countries.find((c) => c.code === country);

  return (
    <motion.div
      className={`flex items-center justify-between w-full p-2 rounded-lg transition-all duration-300 ${
        isCurrent ? "bg-cyan-500/20 shadow-lg" : "bg-slate-800/50"
      }`}
      animate={{ scale: isCurrent ? 1.05 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
          {playerCountry ? (
            <img-replace
              src={playerCountry.flag}
              alt={playerCountry.name}
              class="w-8 h-8 rounded-full"
            />
          ) : (
            <User className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div>
          <p className="font-bold text-white text-lg">{name}</p>
          <p className="text-sm text-slate-400">Elo: {elo}</p>
        </div>
      </div>
      <div
        className={`flex items-center gap-2 p-2 rounded-md ${
          isCurrent ? "bg-white/10" : "bg-slate-900/50"
        }`}
      >
        <Clock
          className={`w-5 h-5 ${
            isCurrent ? "text-yellow-300 animate-pulse" : "text-slate-400"
          }`}
        />
        <span className="text-xl font-mono font-bold text-white">{time}</span>
      </div>
    </motion.div>
  );
};

export default PlayerInfo;
