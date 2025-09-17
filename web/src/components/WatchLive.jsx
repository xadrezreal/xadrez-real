import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tv, User, Lock, Gem } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { UserContext } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const mockLiveGames = [
  { id: 1, white: { name: 'Magnus C.', score: 2830, isPremium: true }, black: { name: 'Hikaru N.', score: 2788, isPremium: true }, moves: 42 },
  { id: 2, white: { name: 'Player_A', score: 1650 }, black: { name: 'Player_B', score: 1680 }, moves: 25 },
  { id: 3, white: { name: 'ChessFan_99', score: 1400 }, black: { name: 'RookMaster', score: 1425, isPremium: true }, moves: 58 },
];

const WatchLive = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const handleWatch = () => {
    toast({
      title: "Função de Espectador",
      description: "🚧 Este recurso ainda não foi implementado. Mas não se preocupe! Você pode solicitá-lo em seu próximo prompt! 🚀",
      duration: 5000,
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (!user.isPremium) {
    return (
      <motion.div
        className="max-w-2xl mx-auto p-8 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="bg-slate-800/50 border-purple-500/50">
          <CardContent className="p-8">
            <Lock className="mx-auto h-16 w-16 text-purple-400 drop-shadow-lg mb-4" />
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Acesso Exclusivo Premium
            </h2>
            <p className="text-slate-400 mt-4 mb-6">
              Para assistir jogos ao vivo, você precisa ser um membro Premium. Desbloqueie este e muitos outros benefícios!
            </p>
            <Button onClick={() => navigate('/premium')} size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold">
              <Gem className="w-5 h-5 mr-2" />
              Seja Premium Agora
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="text-center mb-8" variants={itemVariants}>
        <Tv className="mx-auto h-16 w-16 text-purple-400 drop-shadow-lg" />
        <h1 className="text-4xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          Jogos ao Vivo
        </h1>
        <p className="text-lg text-slate-400 mt-2">Assista às partidas que estão acontecendo agora!</p>
      </motion.div>

      <motion.div className="space-y-6" variants={containerVariants}>
        {mockLiveGames.length > 0 ? (
          mockLiveGames.map(game => (
            <motion.div key={game.id} variants={itemVariants}>
              <Card className="bg-slate-800/50 border-slate-700 text-white">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-grow space-y-2">
                    <div className="flex items-center gap-4">
                      <span className="w-4 h-4 rounded-full bg-white border-2 border-slate-400"></span>
                      <div className="flex items-center gap-2 text-slate-200">
                        {game.white.isPremium && <Gem className="w-4 h-4 text-purple-400" />}
                        <User className="w-4 h-4" />
                        <span>{game.white.name} ({game.white.score})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-400"></span>
                      <div className="flex items-center gap-2 text-slate-200">
                        {game.black.isPremium && <Gem className="w-4 h-4 text-purple-400" />}
                        <User className="w-4 h-4" />
                        <span>{game.black.name} ({game.black.score})</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center px-6">
                    <p className="text-sm text-slate-400">Jogadas</p>
                    <p className="text-xl font-bold">{game.moves}</p>
                  </div>
                  <Button onClick={handleWatch} className="bg-purple-500 hover:bg-purple-600">
                    <Tv className="w-5 h-5 mr-2" />
                    Assistir
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <motion.div variants={itemVariants} className="text-center py-16">
            <p className="text-slate-400 text-lg">Nenhum jogo ao vivo no momento.</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default WatchLive;