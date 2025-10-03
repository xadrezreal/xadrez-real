import React from "react";
import { motion } from "framer-motion";
import { Clock, User } from "lucide-react";
import { countries } from "../lib/countries";

const PlayerInfo = ({ player, isCurrent, time, isMyPlayer = false }) => {
  const { name = "Adversário", elo = "?", country = "?" } = player || {};
  const playerCountry = countries.find((c) => c.code === country);

  const isMyTurn = isMyPlayer && isCurrent;
  const isOpponentTurn = !isMyPlayer && isCurrent;

  return (
    <motion.div
      className={`flex items-center justify-between w-full p-1.5 rounded-lg transition-all duration-300 ${
        isCurrent ? "bg-cyan-500/20 shadow-lg" : "bg-slate-800/50"
      }`}
      animate={{ scale: isCurrent ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
          {playerCountry ? (
            <img
              src={playerCountry.flag}
              alt={playerCountry.name}
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <User className="w-3 h-3 text-gray-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm truncate">{name}</p>
          <p className="text-[10px] text-slate-400">Elo: {elo}</p>
        </div>
        {isMyTurn && (
          <span className="text-[10px] text-cyan-300 font-semibold whitespace-nowrap animate-pulse ml-1">
            Sua vez!
          </span>
        )}
        {isOpponentTurn && (
          <span className="text-[10px] text-yellow-300 font-semibold whitespace-nowrap ml-1">
            Vez do oponente
          </span>
        )}
      </div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
          isCurrent ? "bg-white/10" : "bg-slate-900/50"
        }`}
      >
        <Clock
          className={`w-4 h-4 ${
            isCurrent ? "text-yellow-300 animate-pulse" : "text-slate-400"
          }`}
        />
        <span className="text-sm font-mono font-bold text-white">{time}</span>
      </div>
    </motion.div>
  );
};

export default PlayerInfo;
