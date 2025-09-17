import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';

const TournamentAd = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="fixed bottom-4 left-4 z-50"
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      exit={{ opacity: 0, x: -100 }}
    >
      <div className="bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 p-1 rounded-xl shadow-2xl">
        <div className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-lg text-white max-w-xs">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-8 h-8 text-yellow-300" />
            <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400">Torneios Abertos!</h3>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            Novos campeonatos disponíveis. Inscreva-se e concorra a prêmios!
          </p>
          <Button 
            className="w-full bg-white text-amber-600 font-bold hover:bg-yellow-100"
            onClick={() => navigate('/tournament')}
          >
            Ver Detalhes
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default TournamentAd;