import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Trophy, Users, Crown, Star } from "lucide-react";
import { Button } from "./ui/button";

const PrizeDistributionModal = ({ isOpen, onClose, playerCount }) => {
  const getDistributionType = () => {
    if (playerCount < 16) return "small";
    if (playerCount < 2048) return "medium";
    return "massive";
  };

  const distributionType = getDistributionType();

  const distributions = {
    small: {
      title: "Torneios Pequenos",
      subtitle: "Menos de 16 jogadores",
      icon: <Trophy className="w-12 h-12 text-yellow-400" />,
      gradient: "from-yellow-500/20 to-orange-500/20",
      borderColor: "border-yellow-500/30",
      features: [
        {
          icon: <Crown className="w-5 h-5 text-yellow-400" />,
          title: "TOP 4 Premiados",
          description: "Os 4 primeiros colocados recebem 70% do pote",
        },
        {
          icon: <Users className="w-5 h-5 text-green-400" />,
          title: "Participação",
          description: "Demais jogadores dividem 30% igualmente",
        },
      ],
      breakdown: [
        { position: "1º lugar", percentage: "35%" },
        { position: "2º lugar", percentage: "20%" },
        { position: "3º lugar", percentage: "10%" },
        { position: "4º lugar", percentage: "5%" },
        { position: "Demais", percentage: "30% dividido" },
      ],
    },
    medium: {
      title: "Torneios Médios",
      subtitle: "16 a 2.047 jogadores",
      icon: <Star className="w-12 h-12 text-blue-400" />,
      gradient: "from-blue-500/20 to-purple-500/20",
      borderColor: "border-blue-500/30",
      features: [
        {
          icon: <Crown className="w-5 h-5 text-yellow-400" />,
          title: "TOP 8 Premiados",
          description: "Os 8 primeiros recebem 60% do pote",
        },
        {
          icon: <Users className="w-5 h-5 text-green-400" />,
          title: "Bônus de Participação",
          description: "Todos os demais dividem 40% igualmente",
        },
      ],
      breakdown: [
        { position: "1º lugar", percentage: "35%" },
        { position: "2º lugar", percentage: "20%" },
        { position: "3º lugar", percentage: "15%" },
        { position: "4º lugar", percentage: "10%" },
        { position: "5º lugar", percentage: "8%" },
        { position: "6º lugar", percentage: "6%" },
        { position: "7º lugar", percentage: "4%" },
        { position: "8º lugar", percentage: "2%" },
        { position: "Demais", percentage: "40% dividido" },
      ],
    },
    massive: {
      title: "Torneios Massivos",
      subtitle: "2.048+ jogadores",
      icon: <Crown className="w-12 h-12 text-purple-400" />,
      gradient: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/30",
      features: [
        {
          icon: <Crown className="w-5 h-5 text-yellow-400" />,
          title: "TOP 8 Premiados",
          description: "Os 8 primeiros recebem 67% do pote",
        },
        {
          icon: <Trophy className="w-5 h-5 text-orange-400" />,
          title: "Até 2.048 Ganhadores!",
          description: "Primeiros 2.048 jogadores dividem 33% do pote como bônus",
        },
      ],
      breakdown: [
        { position: "1º lugar", percentage: "35% + bônus" },
        { position: "2º lugar", percentage: "20% + bônus" },
        { position: "3º lugar", percentage: "15% + bônus" },
        { position: "4º lugar", percentage: "10% + bônus" },
        { position: "5º lugar", percentage: "8% + bônus" },
        { position: "6º lugar", percentage: "6% + bônus" },
        { position: "7º lugar", percentage: "4% + bônus" },
        { position: "8º lugar", percentage: "2% + bônus" },
        { position: "9º - 2.048º", percentage: "Bônus igualitário" },
      ],
    },
  };

  const currentDistribution = distributions[distributionType];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            Sistema de Premiação Progressiva
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-center">
            A distribuição de prêmios é automática, baseada no número de participantes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Card da distribuição atual */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`p-6 rounded-lg border-2 bg-gradient-to-br ${currentDistribution.gradient} ${currentDistribution.borderColor}`}
          >
            <div className="flex items-center gap-4 mb-4">
              {currentDistribution.icon}
              <div>
                <h3 className="text-xl font-bold">{currentDistribution.title}</h3>
                <p className="text-sm text-slate-300">{currentDistribution.subtitle}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {currentDistribution.features.map((feature, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="mt-1">{feature.icon}</div>
                  <div>
                    <h4 className="font-semibold text-white">{feature.title}</h4>
                    <p className="text-sm text-slate-300">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela de distribuição */}
            <div className="bg-slate-800/50 rounded-lg p-4 mt-4">
              <h4 className="font-semibold mb-3 text-center">Distribuição Detalhada</h4>
              <div className="space-y-2">
                {currentDistribution.breakdown.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded"
                  >
                    <span className="text-sm font-medium">{item.position}</span>
                    <span className="text-sm text-green-400 font-semibold">
                      {item.percentage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Resumo das outras categorias */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(distributions).map(([key, dist]) => {
              const isActive = key === distributionType;
              return (
                <div
                  key={key}
                  className={`p-3 rounded-lg border ${
                    isActive
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-slate-700 bg-slate-800/50 opacity-50"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-2 opacity-60">{dist.icon}</div>
                    <h4 className="text-xs font-semibold mb-1">{dist.title}</h4>
                    <p className="text-xs text-slate-400">{dist.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pt-2">
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              Entendi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrizeDistributionModal;
